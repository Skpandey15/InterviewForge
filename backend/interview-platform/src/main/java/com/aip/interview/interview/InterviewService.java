package com.aip.interview.interview;

import com.aip.interview.aiclient.QuestionGenerationPort;
import com.aip.interview.aiclient.QuestionGenerationPort.GeneratedQuestionSet;
import com.aip.interview.common.EventEnvelope;
import com.aip.interview.interview.dto.InterviewDtos.CriterionScore;
import com.aip.interview.interview.dto.InterviewDtos.Question;
import com.aip.interview.interview.dto.InterviewDtos.ResultResponse;
import com.aip.interview.interview.dto.InterviewDtos.SessionResponse;
import com.aip.interview.interview.dto.InterviewDtos.StartInterviewRequest;
import com.aip.interview.interview.dto.InterviewDtos.SubmitAnswersRequest;
import com.aip.interview.outbox.OutboxEvent;
import com.aip.interview.outbox.OutboxRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.micrometer.tracing.TraceContext;
import io.micrometer.tracing.Tracer;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
public class InterviewService {

    public static final String TOPIC_SESSION_SUBMITTED = "interview.session-submitted";
    private static final String SOURCE = "interview-platform";

    private final InterviewSessionRepository sessions;
    private final OutboxRepository outbox;
    private final QuestionGenerationPort questionGeneration;
    private final ObjectMapper json;
    private final ObjectProvider<Tracer> tracer;

    public InterviewService(InterviewSessionRepository sessions,
                            OutboxRepository outbox,
                            QuestionGenerationPort questionGeneration,
                            ObjectMapper json,
                            ObjectProvider<Tracer> tracer) {
        this.sessions = sessions;
        this.outbox = outbox;
        this.questionGeneration = questionGeneration;
        this.json = json;
        this.tracer = tracer;
    }

    /** W3C traceparent of the current span; null when tracing is off. */
    public String currentTraceparent() {
        Tracer t = tracer.getIfAvailable();
        if (t == null || t.currentSpan() == null) return null;
        TraceContext context = t.currentSpan().context();
        return "00-" + context.traceId() + "-" + context.spanId() + "-01";
    }

    @Transactional
    public SessionResponse start(UUID userId, StartInterviewRequest request) {
        GeneratedQuestionSet generated = questionGeneration.generate(
                request.technology(), request.level(), request.difficulty(), request.questionCount());

        InterviewSession session = new InterviewSession(
                userId,
                request.technology(),
                request.level(),
                request.difficulty(),
                toJson(generated.questions()),
                generated.source());
        sessions.save(session);
        return toSessionResponse(session);
    }

    /**
     * Stores answers, transitions to SUBMITTED, and appends the
     * interview.session-submitted event to the outbox — all in one
     * transaction. The relay handles delivery; we never dual-write.
     */
    @Transactional
    public ResultResponse submit(UUID userId, UUID sessionId, SubmitAnswersRequest request) {
        return submit(userId, sessionId, request, currentTraceparent());
    }

    /**
     * Variant for callers off the request thread (live turns run on an
     * executor): the traceparent captured on the original thread rides in
     * explicitly so the async evaluation still joins that trace.
     */
    @Transactional
    public ResultResponse submit(UUID userId, UUID sessionId, SubmitAnswersRequest request, String traceparent) {
        InterviewSession session = ownedSession(userId, sessionId);
        try {
            session.recordAnswers(json.writeValueAsString(request.answers()));
            session.submit();
        } catch (IllegalStateException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize answers", e);
        }

        ObjectNode data = json.createObjectNode();
        data.put("sessionId", session.getId().toString());
        data.put("userId", session.getUserId().toString());
        data.put("technology", session.getTechnology());
        data.put("level", session.getLevel());
        data.put("difficulty", session.getDifficulty());
        data.set("questions", readTree(session.getQuestions()));
        data.set("answers", readTree(session.getAnswers()));

        EventEnvelope envelope = EventEnvelope.of(TOPIC_SESSION_SUBMITTED, SOURCE, traceparent, data);
        outbox.save(new OutboxEvent(session.getId().toString(), TOPIC_SESSION_SUBMITTED, toJson(envelope)));

        return toResultResponse(session);
    }

    @Transactional(readOnly = true)
    public SessionResponse getSession(UUID userId, UUID sessionId) {
        return toSessionResponse(ownedSession(userId, sessionId));
    }

    @Transactional(readOnly = true)
    public ResultResponse getResult(UUID userId, UUID sessionId) {
        return toResultResponse(ownedSession(userId, sessionId));
    }

    @Transactional(readOnly = true)
    public List<ResultResponse> history(UUID userId) {
        return sessions.findTop20ByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResultResponse)
                .toList();
    }

    private InterviewSession ownedSession(UUID userId, UUID sessionId) {
        return sessions.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Interview session not found."));
    }

    private SessionResponse toSessionResponse(InterviewSession session) {
        return new SessionResponse(
                session.getId().toString(),
                session.getStatus().name(),
                session.getTechnology(),
                session.getLevel(),
                session.getDifficulty(),
                session.getQuestionSource(),
                fromJson(session.getQuestions(), new TypeReference<List<Question>>() {}));
    }

    private ResultResponse toResultResponse(InterviewSession session) {
        List<CriterionScore> criteria = List.of();
        List<String> strengths = List.of();
        List<String> improvements = List.of();
        if (session.getEvaluation() != null) {
            JsonNode eval = readTree(session.getEvaluation());
            criteria = fromJson(eval.path("criteria").toString(), new TypeReference<List<CriterionScore>>() {});
            strengths = fromJson(eval.path("strengths").toString(), new TypeReference<List<String>>() {});
            improvements = fromJson(eval.path("improvements").toString(), new TypeReference<List<String>>() {});
        }
        return new ResultResponse(
                session.getId().toString(),
                session.getStatus().name(),
                session.getTechnology(),
                session.getLevel(),
                session.getCreatedAt().toString(),
                session.getOverallScore(),
                session.getPassed(),
                session.getPerformanceLabel(),
                criteria,
                strengths,
                improvements);
    }

    private String toJson(Object value) {
        try {
            return json.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("JSON serialization failed", e);
        }
    }

    private <T> T fromJson(String raw, TypeReference<T> type) {
        try {
            return json.readValue(raw, type);
        } catch (Exception e) {
            throw new IllegalStateException("JSON deserialization failed", e);
        }
    }

    private JsonNode readTree(String raw) {
        try {
            return json.readTree(raw);
        } catch (Exception e) {
            throw new IllegalStateException("JSON parse failed", e);
        }
    }
}
