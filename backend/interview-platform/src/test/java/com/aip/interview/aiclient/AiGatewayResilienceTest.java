package com.aip.interview.aiclient;

import com.aip.interview.aiclient.QuestionGenerationPort.GeneratedQuestionSet;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifies the Resilience4j wiring end-to-end (retry + circuit breaker + the
 * name-resolved fallbackMethod) WITHOUT a running ai-gateway, Postgres or Kafka:
 * the base URL points at a dead port, so every call fails and the client must
 * degrade to the curated fallback bank instead of throwing.
 */
@SpringBootTest(classes = AiGatewayResilienceTest.TestApp.class)
@TestPropertySource(properties = {
        "aip.ai-gateway.base-url=http://127.0.0.1:59999",   // nothing listening → fails fast
        "aip.ai-gateway.timeout=PT1S",
        "spring.flyway.enabled=false",
        "spring.autoconfigure.exclude="
                + "org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration,"
                + "org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration,"
                + "org.springframework.boot.autoconfigure.data.jpa.JpaRepositoriesAutoConfiguration,"
                + "org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration,"
                + "org.springframework.boot.autoconfigure.kafka.KafkaAutoConfiguration"
})
class AiGatewayResilienceTest {

    @SpringBootConfiguration
    @EnableAutoConfiguration
    @Import({AiGatewayQuestionClient.class, FallbackQuestionBank.class})
    static class TestApp {
    }

    @Autowired
    QuestionGenerationPort client;

    @Test
    void degradesToCuratedBankWhenGatewayUnavailable() {
        GeneratedQuestionSet set = client.generate("java-backend", "senior", "hard", 5);

        // Retries were exhausted / breaker engaged → the fallback method ran.
        assertThat(set.source()).isEqualTo("fallback-bank");
        assertThat(set.questions()).isNotEmpty();
    }
}
