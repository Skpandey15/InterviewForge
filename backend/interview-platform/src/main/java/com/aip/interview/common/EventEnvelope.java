package com.aip.interview.common;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.Instant;
import java.util.UUID;

/**
 * CloudEvents-style envelope shared by every topic. Additive-only evolution
 * within a schemaVersion; consumers must tolerate unknown fields.
 * traceparent carries the W3C trace context across the async (outbox→Kafka)
 * boundary so the evaluation joins the original request's trace.
 */
public record EventEnvelope(
        UUID id,
        String type,
        String source,
        Instant time,
        int schemaVersion,
        String traceparent,
        JsonNode data) {

    public static EventEnvelope of(String type, String source, String traceparent, JsonNode data) {
        return new EventEnvelope(UUID.randomUUID(), type, source, Instant.now(), 1, traceparent, data);
    }
}
