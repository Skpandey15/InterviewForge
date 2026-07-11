"""Live interviewer turns — the streaming half of the AI subsystem.

Stateless per turn: interview-platform (Java) owns the workflow and passes
everything the turn needs. The interviewer decides ONE thing — follow up or
move on — and even that is bounded by flags Java sets (max follow-ups,
whether a next question exists). Follow-ups are grounded: they always target
a rubric point the candidate's answer missed, never invented curiosity.
"""

import asyncio
import json
from collections.abc import AsyncIterator
from typing import Literal, Optional

from pydantic import BaseModel, Field

from .providers import LLMProvider


class TurnQuestion(BaseModel):
    index: int
    text: str
    idealAnswerPoints: list[str] = []


class TurnRequest(BaseModel):
    sessionId: str
    kind: Literal["start", "answer"]
    candidateName: str = "there"
    technology: str = ""
    question: Optional[TurnQuestion] = None
    nextQuestion: Optional[TurnQuestion] = None
    answerText: str = ""
    followUpsUsed: int = 0
    followUpEnabled: bool = True
    questionNumber: int = Field(default=1, ge=1)
    totalQuestions: int = Field(default=1, ge=1)


_ACKS = [
    "Thanks, that's a solid answer.",
    "Good — I can see your reasoning.",
    "Understood, thanks for walking me through that.",
    "Alright, noted.",
]

_STREAM_DELAY_S = 0.025  # feels like typing without wasting wall-clock


def _sse(event: str, payload: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(payload)}\n\n"


async def _stream_text(text: str) -> AsyncIterator[str]:
    """Word-by-word token events — same shape a real LLM stream produces."""
    for word in text.split(" "):
        yield _sse("token", {"text": word + " "})
        await asyncio.sleep(_STREAM_DELAY_S)


async def interviewer_turn(provider: LLMProvider, turn: TurnRequest) -> AsyncIterator[str]:
    if turn.kind == "start":
        question = turn.question
        greeting = (
            f"Hello {turn.candidateName}! I'm your AI interviewer for this {turn.technology} session. "
            f"We have {turn.totalQuestions} questions; answer in your own words and explain your reasoning — "
            f"I may ask a follow-up if something is worth digging into. Let's begin.\n\n"
            f"Question {turn.questionNumber}: {question.text if question else ''}"
        )
        async for frame in _stream_text(greeting):
            yield frame
        yield _sse("control", {"action": "ask", "questionNumber": turn.questionNumber,
                               "totalQuestions": turn.totalQuestions})
        return

    question = turn.question or TurnQuestion(index=0, text="")
    judgment = provider.judge_answer(question.text, question.idealAnswerPoints, turn.answerText)
    matched = set(judgment.get("matched_points", []))
    missed = [p for p in question.idealAnswerPoints if p not in matched]

    ack = _ACKS[turn.questionNumber % len(_ACKS)]
    substantial = len(turn.answerText.strip()) >= 40

    if turn.followUpEnabled and turn.followUpsUsed == 0 and missed and substantial:
        # Grounded follow-up: probe exactly one rubric point the answer missed.
        text = (
            f"{ack} One thing I'd like to dig into: you didn't touch on "
            f"\"{missed[0]}\". Can you elaborate on that aspect?"
        )
        async for frame in _stream_text(text):
            yield frame
        yield _sse("control", {"action": "follow-up", "questionNumber": turn.questionNumber,
                               "totalQuestions": turn.totalQuestions})
        return

    if turn.nextQuestion is not None:
        text = (
            f"{ack} Let's move on.\n\n"
            f"Question {turn.questionNumber + 1}: {turn.nextQuestion.text}"
        )
        async for frame in _stream_text(text):
            yield frame
        yield _sse("control", {"action": "next", "questionNumber": turn.questionNumber + 1,
                               "totalQuestions": turn.totalQuestions})
        return

    text = (
        f"{ack} That was the final question — thank you for your time! "
        f"I'm sending your answers for evaluation now; your detailed scorecard will be ready in under a minute."
    )
    async for frame in _stream_text(text):
        yield frame
    yield _sse("control", {"action": "complete", "questionNumber": turn.questionNumber,
                           "totalQuestions": turn.totalQuestions})
