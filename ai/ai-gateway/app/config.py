"""Runtime configuration — env-driven, safe local defaults."""

import os

KAFKA_BOOTSTRAP = os.getenv("AIP_KAFKA_BOOTSTRAP", "localhost:9092")
TOPIC_SESSION_SUBMITTED = "interview.session-submitted"
TOPIC_SCORE_CALCULATED = "evaluation.score-calculated"
# Poison / repeatedly-failing session-submitted messages land here after
# retries are exhausted, instead of being silently skipped.
TOPIC_SESSION_SUBMITTED_DLQ = TOPIC_SESSION_SUBMITTED + ".dlq"
CONSUMER_GROUP = "ai-gateway"

# Provider selection: "mock" is deterministic and needs no API key.
# Set AIP_LLM_PROVIDER=openai + OPENAI_API_KEY to use a real model.
LLM_PROVIDER = os.getenv("AIP_LLM_PROVIDER", "mock")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("AIP_OPENAI_MODEL", "gpt-4o-mini")

# Fallback provider: tried when the primary provider errors after retries
# (ARCHITECTURE.md §5 resilience). "mock" is always appended as the terminal,
# never-failing fallback so evaluation degrades instead of hard-failing.
LLM_FALLBACK_PROVIDER = os.getenv("AIP_LLM_FALLBACK_PROVIDER", "mock")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("AIP_ANTHROPIC_MODEL", "claude-3-5-haiku-latest")

# Bounded retry (with exponential backoff) on transient provider errors
# before failing over to the next provider.
LLM_RETRY_ATTEMPTS = int(os.getenv("AIP_LLM_RETRY_ATTEMPTS", "3"))
LLM_RETRY_BASE_DELAY = float(os.getenv("AIP_LLM_RETRY_BASE_DELAY", "0.5"))

# Prompt/pipeline revision — stamped on every output so results stay
# attributable and reproducible (ARCHITECTURE.md §6.5).
PROMPT_REV = "question-gen-v1/eval-rubric-v1"

# Retrieval coverage below this → refuse to generate for that slot
# (grounded-or-refuse, ARCHITECTURE.md §6.1).
COVERAGE_THRESHOLD = float(os.getenv("AIP_COVERAGE_THRESHOLD", "0.18"))
