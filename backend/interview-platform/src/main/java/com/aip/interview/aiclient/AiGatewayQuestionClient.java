package com.aip.interview.aiclient;

import com.aip.interview.interview.dto.InterviewDtos.Question;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.List;

/**
 * Adapter for the Python ai-gateway. Hard timeout + fallback to the curated
 * bank: a degraded AI dependency must never block starting an interview.
 */
@Component
public class AiGatewayQuestionClient implements QuestionGenerationPort {

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

    @Override
    public GeneratedQuestionSet generate(String technology, String level, String difficulty, int count) {
        try {
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
        } catch (Exception e) {
            log.warn("ai-gateway unavailable ({}); serving fallback question bank", e.getMessage());
            return new GeneratedQuestionSet(fallback.questionsFor(technology, count), "fallback-bank", 1.0);
        }
    }
}
