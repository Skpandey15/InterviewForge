"""ai-gateway — the only process that talks to LLM providers.

Sync surface:  POST /v1/question-sets (grounded-or-refuse generation)
Async surface: Kafka interview.session-submitted → evaluation.score-calculated
"""

import logging
import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse

from . import config, telemetry
from .events import EvaluationWorker
from .interviewer import TurnRequest, interviewer_turn
from .pipeline import generate_question_set
from .providers import build_provider
from .schemas import QuestionSetRequest, QuestionSetResponse

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("ai-gateway")

provider = build_provider(config)


@asynccontextmanager
async def lifespan(app: FastAPI):
    worker = EvaluationWorker(provider)
    worker.start()
    log.info("ai-gateway up — provider=%s promptRev=%s", provider.name, config.PROMPT_REV)
    yield
    worker.stop()


app = FastAPI(title="AI Gateway", version="1.0.0", lifespan=lifespan)
telemetry.instrument_fastapi(app)
app.mount("/metrics", telemetry.metrics_app)

# Browser-facing surface is only /healthz (Help & Support status panel);
# service-to-service calls don't need CORS.
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.getenv("AIP_CORS_ORIGINS", "http://localhost:3000").split(",")],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/healthz")
def healthz() -> dict:
    return {"status": "ok", "provider": provider.name, "promptRev": config.PROMPT_REV}


@app.post("/v1/question-sets", response_model=QuestionSetResponse)
def question_sets(request: QuestionSetRequest) -> QuestionSetResponse:
    try:
        result = generate_question_set(
            provider, request.technology, request.level, request.difficulty, request.count)
        generated = " ".join(q.text for q in result.questions)
        telemetry.AI_TOKENS.labels("question-generation", provider.name, "out").inc(
            telemetry.count_tokens(generated))
        return result
    except LookupError as error:
        # Grounded-or-refuse: 422 tells the caller to use its curated fallback.
        telemetry.AI_REFUSALS.labels(request.technology).inc()
        raise HTTPException(status_code=422, detail=str(error))


async def _observed_turn(turn: TurnRequest):
    started = time.monotonic()
    telemetry.AI_TOKENS.labels("interview-turn", provider.name, "in").inc(
        telemetry.count_tokens(turn.answerText or ""))
    out_tokens = 0
    async for frame in interviewer_turn(provider, turn):
        if frame.startswith("event: token"):
            out_tokens += 1
        yield frame
    telemetry.AI_TOKENS.labels("interview-turn", provider.name, "out").inc(max(out_tokens, 1))
    telemetry.AI_TURN_DURATION.observe(time.monotonic() - started)


@app.post("/v1/interview-turns")
def interview_turns(turn: TurnRequest) -> StreamingResponse:
    """Live interviewer turn — token/control SSE stream (ARCHITECTURE.md §5:
    the synchronous path; Kafka never sits in the candidate's latency path)."""
    return StreamingResponse(
        _observed_turn(turn),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
