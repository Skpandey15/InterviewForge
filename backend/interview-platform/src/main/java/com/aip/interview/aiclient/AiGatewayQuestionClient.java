package com.aip.interview.aiclient;

import com.aip.interview.interview.dto.InterviewDtos.Question;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.List;

/**
 * Adapter for the Python ai-gateway, wrapped in Resilience4j (ARCHITECTURE.md §5):
 * bounded retry on transient failures, then a circuit breaker that trips on a
 * sustained failure rate. Either way the fallback method serves the curated
 * bank, so a degraded AI dependency never blocks starting an interview and a
 * wedged gateway stops being hammered.
 */
@Component
public class AiGatewayQuestionClient implements QuestionGenerationPort {

    static final String AI_GATEWAY = "ai-gateway";

    private static final Logger log = LoggerFactory.getLogger(AiGatewayQuestionClient.class);

    private final RestClient restClient;
    private final FallbackQuestionBank fallback;

    public AiGatewayQuestionClient(
            @Value("${aip.ai-gateway.base-url:http://localhost:8090}") String baseUrl,
            @Value("${aip.ai-gateway.timeout:PT10S}") Duration timeout,
            FallbackQuestionBank fallback) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(2_000);
        requestFactory.setReadTimeout((int) timeout.toMillis());
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .build();
        this.fallback = fallback;
    }

    record GatewayQuestion(int index, String text, List<String> sourceRefs, List<String> idealAnswerPoints) {
    }

    record GatewayResponse(List<GatewayQuestion> questions, double coverageScore, String provider) {
    }

    record GatewayRequest(String technology, String level, String difficulty, int count) {
    }

    /**
     * @Retry is the outer aspect (retries transient failures), @CircuitBreaker
     * the inner one (records the failure rate and trips open). The fallback on
     * @Retry fires once retries are exhausted OR the breaker is open — it serves
     * the curated bank. The breaker's CallNotPermittedException is not retried
     * (see application.yml), so an open breaker fails over immediately.
     */
    @Override
    @Retry(name = AI_GATEWAY, fallbackMethod = "generateFallback")
    @CircuitBreaker(name = AI_GATEWAY)
    public GeneratedQuestionSet generate(String technology, String level, String difficulty, int count) {
        GatewayResponse response = restClient.post()
                .uri("/v1/question-sets")
                .body(new GatewayRequest(technology, level, difficulty, count))
                .retrieve()
                .body(GatewayResponse.class);
        if (response == null || response.questions() == null || response.questions().isEmpty()) {
            throw new IllegalStateException("ai-gateway returned an empty question set");
        }
        List<Question> questions = response.questions().stream()
                .map(q -> new Question(q.index(), q.text(), q.sourceRefs(), q.idealAnswerPoints()))
                .toList();
        return new GeneratedQuestionSet(questions, "ai-gateway:" + response.provider(), response.coverageScore());
    }

    /** Resilience4j fallback (matching signature + trailing Throwable). */
    @SuppressWarnings("unused")
    GeneratedQuestionSet generateFallback(String technology, String level, String difficulty, int count, Throwable cause) {
        log.warn("ai-gateway degraded ({}); serving curated fallback bank", cause.toString());
        return new GeneratedQuestionSet(fallback.questionsFor(technology, count), "fallback-bank", 1.0);
    }
}
