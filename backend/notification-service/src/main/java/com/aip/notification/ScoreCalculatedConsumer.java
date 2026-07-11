package com.aip.notification;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * The extraction pattern (ARCHITECTURE.md Phase 2): a read-only consumer in
 * its own deployable, own consumer group, own schema. It shares nothing with
 * interview-platform except the event contract.
 */
@Component
public class ScoreCalculatedConsumer {

    private static final Logger log = LoggerFactory.getLogger(ScoreCalculatedConsumer.class);

    private final NotificationRepository notifications;
    private final ProcessedEventRepository processedEvents;
    private final ObjectMapper json;

    public ScoreCalculatedConsumer(NotificationRepository notifications,
                                   ProcessedEventRepository processedEvents,
                                   ObjectMapper json) {
        this.notifications = notifications;
        this.processedEvents = processedEvents;
        this.json = json;
    }

    @KafkaListener(topics = "evaluation.score-calculated", groupId = "${spring.application.name}")
    @Transactional
    public void onScoreCalculated(String message) throws Exception {
        JsonNode envelope = json.readTree(message);
        UUID eventId = UUID.fromString(envelope.path("id").asText());
        if (processedEvents.existsById(eventId)) {
            return;
        }

        JsonNode data = envelope.path("data");
        String rawUserId = data.path("userId").asText("");
        if (rawUserId.isBlank()) {
            // Events emitted before the userId field existed (additive evolution).
            processedEvents.save(new ProcessedEvent(eventId));
            return;
        }

        int score = data.path("overallScore").asInt();
        boolean passed = data.path("passed").asBoolean();
        String technology = data.path("technology").asText("your");
        Notification notification = new Notification(
                UUID.fromString(rawUserId),
                "INTERVIEW_EVALUATED",
                passed ? "Interview passed 🎉" : "Interview evaluated",
                "Your %s interview scored %d%% - %s. Open your results for the full breakdown."
                        .formatted(technology, score, passed ? "PASSED" : "not passed"));
        notifications.save(notification);
        processedEvents.save(new ProcessedEvent(eventId));

        // Email/push adapters land here later; the log line is the dev stand-in.
        log.info("Notification stored + email simulated for user {}: {}", rawUserId, notification.getBody());
    }
}
