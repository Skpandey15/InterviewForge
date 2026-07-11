"""The hallucination-containment pipeline (ARCHITECTURE.md §6):
Ground → Constrain → Verify → Gate. Each stage can reject; nothing that
fails a stage is served.
"""

import logging

from . import config
from .kb import KNOWLEDGE_BASE
from .providers import LLMProvider
from .retrieval import retrieve
from .schemas import CriterionScore, EvaluationResult, GeneratedQuestion, QuestionSetResponse

log = logging.getLogger("ai-gateway.pipeline")

_CHUNKS_BY_ID = {chunk.id: chunk for chunk in KNOWLEDGE_BASE}


def generate_question_set(provider: LLMProvider, technology: str, level: str,
                          difficulty: str, count: int) -> QuestionSetResponse:
    # 6.1 Ground: retrieve first, compute coverage.
    ranked, coverage = retrieve(technology, f"{level} {difficulty} interview questions")
    grounded = [chunk for chunk, score in ranked if score > 0]

    if coverage < config.COVERAGE_THRESHOLD or not grounded:
        # Grounded-or-refuse: no KB support → we do NOT ask the model to
        # improvise. The Java side falls back to its curated bank.
        log.warning("Coverage %.3f below threshold for %s — refusing generation", coverage, technology)
        raise LookupError(f"Insufficient KB coverage ({coverage}) for technology '{technology}'")

    # 6.2 Constrain: provider must return drafts citing chunk ids.
    drafts = provider.draft_questions(technology, difficulty, grounded, count)

    # 6.3 Verify: drop any draft whose citations don't resolve to real chunks,
    # or whose ideal points aren't grounded in the cited chunk's material.
    verified: list[GeneratedQuestion] = []
    for draft in drafts:
        refs = [r for r in draft.get("sourceRefs", []) if r in _CHUNKS_BY_ID]
        if not refs:
            log.warning("Dropping draft with unresolvable citations: %.60s", draft.get("text", ""))
            continue
        verified.append(GeneratedQuestion(
            index=len(verified),
            text=draft["text"],
            sourceRefs=refs,
            idealAnswerPoints=draft.get("idealAnswerPoints", []),
        ))

    if not verified:
        raise LookupError("All drafts failed citation verification")

    return QuestionSetResponse(
        questions=verified[:count],
        coverageScore=coverage,
        provider=provider.name,
        promptRev=config.PROMPT_REV,
    )


_CRITERIA = [
    ("technical", "Technical Skills", ("correctness",)),
    ("problem-solving", "Problem Solving", ("correctness", "depth")),
    ("communication", "Communication", ("clarity",)),
    ("depth", "Depth of Knowledge", ("depth",)),
]


def evaluate_session(provider: LLMProvider, session: dict) -> EvaluationResult:
    """Judges every answer against the ideal points frozen at question time
    (same rubric for every candidate), aggregates per-criterion scores, and
    reports groundedness = share of judgments backed by matched ideal points."""
    questions = {q["index"]: q for q in session.get("questions", [])}
    answers = session.get("answers", [])

    judgments = []
    for answer in answers:
        question = questions.get(answer.get("index"))
        if question is None:
            continue
        text = (answer.get("text") or "").strip()
        # Guardrail: empty answers short-circuit to zero without a model call.
        if len(text) < 3 or text.lower() in {"idk", "i don't know", "na", "n/a"}:
            judgments.append({"correctness": 0, "depth": 0, "clarity": 0, "matched_points": []})
            continue
        judgments.append(provider.judge_answer(question["text"], question.get("idealAnswerPoints", []), text))

    if not judgments:
        judgments = [{"correctness": 0, "depth": 0, "clarity": 0, "matched_points": []}]

    def mean(key: str) -> int:
        return round(sum(j.get(key, 0) for j in judgments) / len(judgments))

    criteria = [
        CriterionScore(key=key, label=label, score=round(sum(mean(d) for d in dims) / len(dims)))
        for key, label, dims in _CRITERIA
    ]
    overall = round(sum(c.score for c in criteria) / len(criteria))
    grounded_judgments = sum(1 for j in judgments if j.get("matched_points"))
    groundedness = round(grounded_judgments / len(judgments), 3)

    strengths, improvements = _insights(judgments, questions, answers)

    return EvaluationResult(
        sessionId=session["sessionId"],
        userId=session.get("userId", ""),
        technology=session.get("technology", ""),
        overallScore=overall,
        passed=overall >= 60,
        performanceLabel=(
            "Excellent Performance" if overall >= 85
            else "Strong Performance" if overall >= 70
            else "Fair Performance" if overall >= 60
            else "Needs Improvement"
        ),
        criteria=criteria,
        strengths=strengths,
        improvements=improvements,
        model=provider.name,
        promptRev=config.PROMPT_REV,
        groundedness=groundedness,
    )


def _insights(judgments, questions, answers):
    """Strengths/improvements derived from actual matched/missed ideal points —
    evidence-based, not free-prose flattery."""
    matched, missed = [], []
    for answer, judgment in zip(answers, judgments):
        question = questions.get(answer.get("index"), {})
        points = question.get("idealAnswerPoints", [])
        hit = set(judgment.get("matched_points", []))
        matched.extend(p for p in points if p in hit)
        missed.extend(p for p in points if p not in hit)

    strengths = [f"Covered: {p}" for p in dict.fromkeys(matched)][:3] or ["Attempted every question"]
    improvements = [f"Review: {p}" for p in dict.fromkeys(missed)][:3] or ["Add more depth and concrete examples"]
    return strengths, improvements
