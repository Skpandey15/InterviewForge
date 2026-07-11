"""Runtime configuration — env-driven, safe local defaults."""

import os

KAFKA_BOOTSTRAP = os.getenv("AIP_KAFKA_BOOTSTRAP", "localhost:9092")
TOPIC_SESSION_SUBMITTED = "interview.session-submitted"
TOPIC_SCORE_CALCULATED = "evaluation.score-calculated"
CONSUMER_GROUP = "ai-gateway"

# Provider selection: "mock" is deterministic and needs no API key.
# Set AIP_LLM_PROVIDER=openai + OPENAI_API_KEY to use a real model.
LLM_PROVIDER = os.getenv("AIP_LLM_PROVIDER", "mock")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("AIP_OPENAI_MODEL", "gpt-4o-mini")

# Prompt/pipeline revision — stamped on every output so results stay
# attributable and reproducible (ARCHITECTURE.md §6.5).
PROMPT_REV = "question-gen-v1/eval-rubric-v1"

# Retrieval coverage below this → refuse to generate for that slot
# (grounded-or-refuse, ARCHITECTURE.md §6.1).
COVERAGE_THRESHOLD = float(os.getenv("AIP_COVERAGE_THRESHOLD", "0.18"))
