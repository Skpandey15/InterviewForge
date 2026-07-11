"""Structured-output contracts. Nothing crosses the service boundary as free
prose — every AI output validates against these models or is rejected."""

from pydantic import BaseModel, Field


class QuestionSetRequest(BaseModel):
    technology: str
    level: str
    difficulty: str
    count: int = Field(ge=1, le=30)


class GeneratedQuestion(BaseModel):
    index: int
    text: str
    sourceRefs: list[str] = Field(min_length=1, description="KB chunk ids grounding this question")
    idealAnswerPoints: list[str]


class QuestionSetResponse(BaseModel):
    questions: list[GeneratedQuestion]
    coverageScore: float
    provider: str
    promptRev: str


class CriterionScore(BaseModel):
    key: str
    label: str
    score: int = Field(ge=0, le=100)


class EvaluationResult(BaseModel):
    sessionId: str
    userId: str = ""
    technology: str = ""
    overallScore: int = Field(ge=0, le=100)
    passed: bool
    performanceLabel: str
    criteria: list[CriterionScore]
    strengths: list[str]
    improvements: list[str]
    model: str
    promptRev: str
    groundedness: float = Field(ge=0.0, le=1.0)
