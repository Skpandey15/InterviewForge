package com.aip.interview.aiclient;

import com.aip.interview.interview.dto.InterviewDtos.Question;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

/**
 * Curated, human-reviewed questions served when the ai-gateway is down.
 * Deliberately boring: correctness over novelty.
 */
@Component
public class FallbackQuestionBank {

    private static final Map<String, List<String>> BANK = Map.of(
            "java-backend", List.of(
                    "Explain how HashMap works internally in Java and what changed in Java 8.",
                    "What are the differences between checked and unchecked exceptions, and when do you use each?",
                    "How does the JVM garbage collector decide what to collect? Compare G1 and ZGC.",
                    "Explain @Transactional propagation levels with a scenario where REQUIRES_NEW is wrong.",
                    "How would you diagnose a memory leak in a production Spring Boot service?"),
            "spring-boot", List.of(
                    "Walk through what happens at Spring Boot startup from main() to serving requests.",
                    "How does Spring Boot auto-configuration work and how do you override it?",
                    "Compare constructor vs field injection and justify the recommended practice.",
                    "How do you version and evolve a REST API without breaking existing clients?",
                    "Explain how you would secure service-to-service calls between Spring services."),
            "system-design", List.of(
                    "Design a rate limiter for a public API handling 10k requests per second.",
                    "Design the storage layer for a URL shortener with 100M new links per month.",
                    "How would you keep two datastores consistent without distributed transactions?",
                    "Design a notification system that supports email, SMS and push with retries.",
                    "Explain how you would shard a relational database and handle resharding."));

    private static final List<String> GENERIC = List.of(
            "Describe a production incident you owned end-to-end and what you changed afterwards.",
            "How do you decide between synchronous REST and asynchronous messaging for an integration?",
            "Explain idempotency and how you enforce it in an event-driven system.",
            "What does observability mean beyond logging? Describe metrics and traces you rely on.",
            "How do you approach testing a service that depends on an external AI model?");

    public List<Question> questionsFor(String technology, int count) {
        List<String> pool = BANK.getOrDefault(technology, GENERIC);
        return IntStream.range(0, Math.min(count, pool.size()))
                .mapToObj(i -> new Question(i, pool.get(i), List.of("curated:fallback-bank"), List.of()))
                .toList();
    }
}
