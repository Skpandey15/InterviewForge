"""Kafka wiring: consume interview.session-submitted, produce
evaluation.score-calculated. Runs on a daemon thread; at-least-once with
per-event error isolation. A message that fails processing is routed to the
dead-letter topic (interview.session-submitted.dlq) with error metadata rather
than being silently dropped, so nothing is lost and operators can alert on it."""

import json
import logging
import threading
import time
import uuid
from datetime import datetime, timezone

from kafka import KafkaConsumer, KafkaProducer

from . import config, telemetry
from .pipeline import evaluate_session
from .providers import LLMProvider

log = logging.getLogger("ai-gateway.events")


def _envelope(event_type: str, data: dict, traceparent: str | None = None) -> dict:
    return {
        "id": str(uuid.uuid4()),
        "type": event_type,
        "source": "ai-gateway",
        "time": datetime.now(timezone.utc).isoformat(),
        "schemaVersion": 1,
        "traceparent": traceparent,
        "data": data,
    }


class EvaluationWorker:
    def __init__(self, provider: LLMProvider):
        self._provider = provider
        self._stop = threading.Event()
        self._thread = threading.Thread(target=self._run, name="evaluation-consumer", daemon=True)

    def start(self) -> None:
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()

    def _run(self) -> None:
        while not self._stop.is_set():
            try:
                self._consume_loop()
            except Exception as error:  # broker down, rebalance storm, …
                log.warning("Consumer loop error (%s); retrying in 5s", error)
                time.sleep(5)

    def _consume_loop(self) -> None:
        consumer = KafkaConsumer(
            config.TOPIC_SESSION_SUBMITTED,
            bootstrap_servers=config.KAFKA_BOOTSTRAP,
            group_id=config.CONSUMER_GROUP,
            value_deserializer=lambda raw: raw.decode("utf-8"),
            auto_offset_reset="earliest",
            enable_auto_commit=True,
            consumer_timeout_ms=2000,
        )
        producer = KafkaProducer(
            bootstrap_servers=config.KAFKA_BOOTSTRAP,
            value_serializer=lambda value: json.dumps(value).encode("utf-8"),
            key_serializer=lambda key: key.encode("utf-8"),
            acks="all",
        )
        log.info("Evaluation consumer online (bootstrap=%s)", config.KAFKA_BOOTSTRAP)
        try:
            while not self._stop.is_set():
                for message in consumer:
                    self._handle(producer, message.value)
                    if self._stop.is_set():
                        break
        finally:
            consumer.close()
            producer.close()

    def _handle(self, producer: KafkaProducer, raw: str) -> None:
        try:
            envelope = json.loads(raw)
            session = envelope["data"]
            traceparent = envelope.get("traceparent")
            log.info("Evaluating session %s (%s answers)",
                     session.get("sessionId"), len(session.get("answers", [])))

            # Joins the submit request's trace across the Kafka boundary.
            with telemetry.span_from_traceparent(
                    "evaluate-session", traceparent,
                    **{"aip.session_id": session.get("sessionId", ""),
                       "aip.provider": self._provider.name}) as span:
                answers_text = " ".join(a.get("text") or "" for a in session.get("answers", []))
                telemetry.AI_TOKENS.labels("evaluation", self._provider.name, "in").inc(
                    telemetry.count_tokens(answers_text))

                result = evaluate_session(self._provider, session)

                span.set_attribute("aip.overall_score", result.overallScore)
                span.set_attribute("aip.groundedness", result.groundedness)
                telemetry.AI_EVALUATIONS.labels(self._provider.name).inc()
                telemetry.AI_GROUNDEDNESS.set(result.groundedness)

            out = _envelope(config.TOPIC_SCORE_CALCULATED, result.model_dump(), traceparent)
            producer.send(config.TOPIC_SCORE_CALCULATED, key=result.sessionId, value=out).get(timeout=10)
            log.info("Session %s scored %s%% (groundedness %.2f)",
                     result.sessionId, result.overallScore, result.groundedness)
        except Exception as error:
            self._dead_letter(producer, raw, error)

    def _dead_letter(self, producer: KafkaProducer, raw: str, error: Exception) -> None:
        """Route an unprocessable message to the dead-letter topic with error
        metadata, so it is retained for inspection and alertable, not dropped."""
        log.error("Failed to process message (%s); routing to DLQ %s. Payload head: %.120s",
                  error, config.TOPIC_SESSION_SUBMITTED_DLQ, raw)
        telemetry.AI_DEAD_LETTER.labels(config.TOPIC_SESSION_SUBMITTED).inc()
        dlq_record = {
            "originalTopic": config.TOPIC_SESSION_SUBMITTED,
            "error": str(error),
            "failedAt": datetime.now(timezone.utc).isoformat(),
            "payload": raw,
        }
        try:
            producer.send(config.TOPIC_SESSION_SUBMITTED_DLQ,
                          key=str(uuid.uuid4()), value=dlq_record).get(timeout=10)
        except Exception as publish_error:  # noqa: BLE001 — never wedge the loop on DLQ failure
            log.error("Dead-letter publish failed (%s); message dropped", publish_error)
