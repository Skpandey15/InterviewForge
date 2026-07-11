"""Seed knowledge base.

Phase 1 keeps chunks in-process; the retrieval interface matches what a
pgvector-backed store will expose, so swapping is a repository change.
Every chunk has a stable id — the provenance unit for citations.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Chunk:
    id: str
    technology: str
    topic: str
    text: str
    ideal_points: tuple[str, ...]


KNOWLEDGE_BASE: list[Chunk] = [
    Chunk(
        id="kb:java:hashmap-internals",
        technology="java-backend",
        topic="collections",
        text=(
            "HashMap stores entries in an array of buckets indexed by hash. Since Java 8, a bucket "
            "converts from a linked list to a red-black tree when it exceeds 8 entries (TREEIFY_THRESHOLD), "
            "bounding worst-case lookup at O(log n). Resizing doubles capacity at the load factor (default 0.75)."
        ),
        ideal_points=(
            "bucket array indexed by hash of the key",
            "Java 8 treeifies buckets beyond 8 entries (red-black tree)",
            "worst-case lookup improves from O(n) to O(log n)",
            "resize doubles capacity at load factor 0.75",
        ),
    ),
    Chunk(
        id="kb:java:gc-g1-zgc",
        technology="java-backend",
        topic="jvm",
        text=(
            "G1 divides the heap into regions and collects the most garbage-rich regions first, targeting "
            "a pause-time goal. ZGC performs concurrent relocation using colored pointers and load barriers, "
            "keeping pauses in the sub-millisecond range even on multi-terabyte heaps."
        ),
        ideal_points=(
            "G1 is region-based with a pause-time target",
            "ZGC uses colored pointers and load barriers",
            "ZGC relocates objects concurrently; pauses stay sub-millisecond",
        ),
    ),
    Chunk(
        id="kb:java:transactional-propagation",
        technology="java-backend",
        topic="spring-tx",
        text=(
            "Spring @Transactional propagation controls how a method joins transactions: REQUIRED joins or "
            "creates, REQUIRES_NEW suspends the caller's transaction and commits independently, which breaks "
            "atomicity if the caller later rolls back. Self-invocation bypasses the proxy so no transaction applies."
        ),
        ideal_points=(
            "REQUIRED joins an existing transaction or starts one",
            "REQUIRES_NEW suspends the caller and commits independently",
            "REQUIRES_NEW breaks caller atomicity on rollback",
            "self-invocation bypasses the proxy",
        ),
    ),
    Chunk(
        id="kb:spring:autoconfiguration",
        technology="spring-boot",
        topic="startup",
        text=(
            "Spring Boot auto-configuration registers beans conditionally via @ConditionalOnClass, "
            "@ConditionalOnMissingBean and friends, imported from AutoConfiguration.imports. User-defined "
            "beans win because auto-configurations back off when a bean of the same type already exists."
        ),
        ideal_points=(
            "conditional annotations drive registration",
            "AutoConfiguration.imports lists candidates",
            "user beans win — auto-config backs off via @ConditionalOnMissingBean",
        ),
    ),
    Chunk(
        id="kb:kafka:consumer-rebalance",
        technology="kafka",
        topic="consumers",
        text=(
            "A Kafka consumer group rebalances when membership or subscribed partitions change. During an "
            "eager rebalance every consumer stops and rejoins; cooperative (incremental) rebalancing lets "
            "consumers keep unaffected partitions. Static group membership avoids rebalances on restarts."
        ),
        ideal_points=(
            "rebalance triggers: membership or partition changes",
            "eager rebalance stops all consumers",
            "cooperative rebalancing moves only affected partitions",
            "static membership avoids restart rebalances",
        ),
    ),
    Chunk(
        id="kb:sysdesign:rate-limiter",
        technology="system-design",
        topic="scalability",
        text=(
            "A distributed rate limiter typically uses token bucket or sliding window counters in Redis with "
            "atomic Lua scripts. Local in-process buckets with periodic sync trade accuracy for latency. "
            "Return 429 with Retry-After; place enforcement at the gateway to shed load early."
        ),
        ideal_points=(
            "token bucket or sliding window algorithm",
            "Redis + Lua for atomic distributed counters",
            "429 with Retry-After header",
            "enforce at the gateway to shed load early",
        ),
    ),
    Chunk(
        id="kb:sysdesign:url-shortener-storage",
        technology="system-design",
        topic="storage",
        text=(
            "URL shortener storage: 100M links/month is write-light and read-heavy. Use a key-generation "
            "service or base62 of a sequence, store mappings in a sharded key-value store, cache hot links "
            "in Redis with a high hit ratio, and shard by short-code hash to spread load evenly."
        ),
        ideal_points=(
            "base62 short codes from a sequence or KGS",
            "read-heavy: cache hot links",
            "shard by hash of short code",
        ),
    ),
    Chunk(
        id="kb:react:reconciliation-keys",
        technology="react",
        topic="rendering",
        text=(
            "React reconciles lists by key: stable identity keys let it move DOM nodes instead of recreating "
            "them. Array-index keys break when items reorder — state sticks to positions, causing wrong input "
            "values and lost focus. Keys must be stable, unique among siblings, and derived from data identity."
        ),
        ideal_points=(
            "keys give list items stable identity for reconciliation",
            "index keys break on reorder (state sticks to position)",
            "keys must be stable and unique among siblings",
        ),
    ),
]


def chunks_for(technology: str) -> list[Chunk]:
    exact = [c for c in KNOWLEDGE_BASE if c.technology == technology]
    return exact if exact else list(KNOWLEDGE_BASE)
