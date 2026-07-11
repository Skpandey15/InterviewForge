package com.aip.interview.outbox;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.concurrent.TimeUnit;

/**
 * Polling publisher half of the transactional outbox (upgrade path: Debezium
 * CDC — the table contract stays identical). At-least-once by design; all
 * consumers are idempotent.
 */
@Component
public class OutboxRelay {

    private static final Logger log = LoggerFactory.getLogger(OutboxRelay.class);

    private final OutboxRepository outbox;
    private final KafkaTemplate<String, String> kafka;

    public OutboxRelay(OutboxRepository outbox, KafkaTemplate<String, String> kafka) {
        this.outbox = outbox;
        this.kafka = kafka;
    }

    @Scheduled(fixedDelayString = "${aip.outbox.poll-interval-ms:1000}")
    @Transactional
    public void publishPending() {
        for (OutboxEvent event : outbox.claimUnpublishedBatch()) {
            try {
                kafka.send(event.getEventType(), event.getAggregateId(), event.getPayload())
                        .get(10, TimeUnit.SECONDS);
                event.markPublished();
                log.info("Published outbox event {} to topic {}", event.getId(), event.getEventType());
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException("Interrupted while publishing outbox batch", e);
            } catch (Exception e) {
                // Leave unpublished; the next poll retries. Broker downtime therefore
                // delays events but never loses them.
                log.warn("Failed to publish outbox event {} ({}); will retry", event.getId(), e.getMessage());
                throw new IllegalStateException("Outbox publish failed; rolling back batch", e);
            }
        }
    }
}
