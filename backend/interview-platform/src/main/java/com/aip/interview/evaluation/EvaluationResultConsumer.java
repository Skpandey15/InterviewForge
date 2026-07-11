package com.aip.interview.evaluation;

import com.aip.interview.inbox.ProcessedEvent;
import com.aip.interview.inbox.ProcessedEventRepository;
import com.aip.interview.interview.InterviewSession;
import com.aip.interview.interview.InterviewSessionRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Applies evaluation.score-calculated events produced by the ai-gateway.
 * Idempotent: repeated deliveries (at-least-once semantics) are no-ops.
 */
@Component
public class EvaluationResultConsumer {

    public static final String TOPIC_SCORE_CALCULATED = "evaluation.score-calculated";

    private static final Logger log = LoggerFactory.getLogger(EvaluationResultConsumer.class);

    private final InterviewSessionRepository sessions;
    private final ProcessedEventRepository processedEvents;
    private final ObjectMapper json;

    public EvaluationResultConsumer(InterviewSessionRepository sessions,
                                    ProcessedEventRepository processedEvents,
                                    ObjectMapper json) {
        this.sessions = sessions;
        this.processedEvents = processedEvents;
        this.json = json;
    }

    @KafkaListener(topics = TOPIC_SCORE_CALCULATED, groupId = "${spring.application.name}")
    @Transactional
    public void onScoreCalculated(String message) throws Exception {
        JsonNode envelope = json.readTree(message);
        UUID eventId = UUID.fromString(envelope.path("id").asText());

        if (processedEvents.existsById(eventId)) {
            log.debug("Skipping already-processed event {}", eventId);
            return;
        }

        JsonNode data = envelope.path("data");
        UUID sessionId = UUID.fromString(data.path("sessionId").asText());
        InterviewSession session = sessions.findById(sessionId).orElse(null);
        if (session == null) {
            log.warn("Evaluation event {} references unknown session {}; ignoring", eventId, sessionId);
            processedEvents.save(new ProcessedEvent(eventId));
            return;
        }

        var evaluation = json.createObjectNode();
        evaluation.set("criteria", data.path("criteria"));
        evaluation.set("strengths", data.path("strengths"));
        evaluation.set("improvements", data.path("improvements"));
        evaluation.put("model", data.path("model").asText("unknown"));
        evaluation.put("promptRev", data.path("promptRev").asText("unknown"));
        evaluation.put("groundedness", data.path("groundedness").asDouble(0.0));

        session.applyEvaluation(
                data.path("overallScore").asInt(),
                data.path("passed").asBoolean(),
                data.path("performanceLabel").asText("Evaluated"),
                json.writeValueAsString(evaluation));
        processedEvents.save(new ProcessedEvent(eventId));

        log.info("Session {} evaluated: {}% ({})",
                sessionId, data.path("overallScore").asInt(), data.path("performanceLabel").asText());
    }
}
