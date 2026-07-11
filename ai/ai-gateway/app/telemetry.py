"""Observability for the AI gateway (ARCHITECTURE.md §10):
- OTLP traces (FastAPI auto-instrumented; Kafka work joins the Java trace
  via the envelope's W3C traceparent)
- Prometheus metrics with the non-negotiable AI series: tokens, turn
  latency, evaluations, groundedness.
"""

import os
from contextlib import contextmanager

from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator
from prometheus_client import Counter, Gauge, Histogram, make_asgi_app

OTLP_ENDPOINT = os.getenv("AIP_OTLP_ENDPOINT", "http://127.0.0.1:4318/v1/traces")

# ---------- Metrics (scraped at /metrics) ----------

AI_TOKENS = Counter(
    "ai_tokens_total",
    "Tokens processed by the AI provider (mock provider approximates by words)",
    ["operation", "provider", "direction"],
)
AI_TURN_DURATION = Histogram(
    "ai_turn_duration_seconds",
    "Wall-clock duration of one interviewer turn",
    buckets=(0.5, 1, 2, 4, 8, 15, 30),
)
AI_EVALUATIONS = Counter("ai_evaluations_total", "Interview evaluations completed", ["provider"])
AI_GROUNDEDNESS = Gauge(
    "ai_evaluation_groundedness",
    "Groundedness of the most recent evaluation (share of judgments backed by matched rubric points)",
)
AI_REFUSALS = Counter(
    "ai_generation_refusals_total",
    "Question generations refused for insufficient KB coverage (grounded-or-refuse)",
    ["technology"],
)

metrics_app = make_asgi_app()

# ---------- Traces ----------

_provider = TracerProvider(resource=Resource.create({"service.name": "ai-gateway"}))
_provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(endpoint=OTLP_ENDPOINT)))
trace.set_tracer_provider(_provider)
tracer = trace.get_tracer("ai-gateway")

_propagator = TraceContextTextMapPropagator()


@contextmanager
def span_from_traceparent(name: str, traceparent: str | None, **attributes):
    """Continue the caller's trace across the Kafka boundary. The Java side
    stamps the envelope with the submit request's traceparent; this makes the
    async evaluation appear in the same Jaeger trace."""
    context = _propagator.extract({"traceparent": traceparent}) if traceparent else None
    with tracer.start_as_current_span(name, context=context) as span:
        for key, value in attributes.items():
            span.set_attribute(key, value)
        yield span


def count_tokens(text: str) -> int:
    """Mock-provider approximation (words). A real provider reports exact
    usage from the API response; the metric shape stays identical."""
    return max(1, len(text.split()))


def instrument_fastapi(app) -> None:
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

    FastAPIInstrumentor.instrument_app(app, excluded_urls="healthz,metrics")
