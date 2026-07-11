"""Deterministic lexical retrieval with a coverage score.

Stands in for pgvector similarity search; the contract (ranked chunks +
coverage in [0,1]) is what the generation pipeline depends on. Coverage
below threshold means "do not improvise" — the caller refuses or degrades
instead of asking a model to guess (ARCHITECTURE.md §6.1).
"""

import math
import re
from collections import Counter

from .kb import Chunk, chunks_for

_TOKEN_RE = re.compile(r"[a-z0-9]+")


def _tokens(text: str) -> Counter:
    return Counter(_TOKEN_RE.findall(text.lower()))


def _cosine(a: Counter, b: Counter) -> float:
    common = set(a) & set(b)
    dot = sum(a[t] * b[t] for t in common)
    norm = math.sqrt(sum(v * v for v in a.values())) * math.sqrt(sum(v * v for v in b.values()))
    return dot / norm if norm else 0.0


def retrieve(technology: str, query: str, top_k: int = 6) -> tuple[list[tuple[Chunk, float]], float]:
    """Returns (ranked [(chunk, similarity)], coverage score).

    Coverage answers "does the KB actually cover this technology?", not
    "does the query phrase resemble chunk prose":
    - technology-specific chunks exist → coverage scales with how many
      (3+ dedicated chunks = full coverage);
    - none exist → best lexical similarity across the whole KB, which is
      ~0 for a genuinely unknown technology and triggers refusal.
    """
    from .kb import KNOWLEDGE_BASE

    exact = [c for c in KNOWLEDGE_BASE if c.technology == technology]
    pool = exact if exact else list(KNOWLEDGE_BASE)

    query_vec = _tokens(f"{technology} {query}")
    scored = [(chunk, _cosine(query_vec, _tokens(f"{chunk.topic} {chunk.text}"))) for chunk in pool]
    scored.sort(key=lambda pair: pair[1], reverse=True)
    top = scored[:top_k]

    if exact:
        coverage = min(1.0, len(exact) / 3)
        # rank order still comes from lexical similarity; every exact chunk
        # is a legitimate grounding source even at similarity ~0
        top = [(chunk, max(score, 0.01)) for chunk, score in top]
    else:
        coverage = max((score for _, score in top), default=0.0)
    return top, round(coverage, 4)
