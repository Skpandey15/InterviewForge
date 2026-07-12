package com.aip.interview.config;

import org.apache.kafka.common.TopicPartition;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

/**
 * Kafka consumer error handling. A record that keeps failing is retried a few
 * times and then published to a dead-letter topic ({@code <topic>.DLT}) rather
 * than blocking the partition or being silently skipped. Spring Boot wires this
 * single {@code CommonErrorHandler} bean into the listener container factory, so
 * it covers every {@code @KafkaListener} (e.g. evaluation.score-calculated).
 */
@Configuration
public class KafkaErrorHandlingConfig {

    private static final Logger log = LoggerFactory.getLogger(KafkaErrorHandlingConfig.class);

    @Bean
    public DefaultErrorHandler kafkaErrorHandler(KafkaTemplate<String, String> template) {
        DeadLetterPublishingRecoverer recoverer = new DeadLetterPublishingRecoverer(
                template,
                (record, exception) -> {
                    log.error("Routing record from topic {} to DLT after retries exhausted: {}",
                            record.topic(), exception.getMessage());
                    return new TopicPartition(record.topic() + ".DLT", record.partition());
                });
        // Retry 3 times, 1s apart, then dead-letter and move on.
        return new DefaultErrorHandler(recoverer, new FixedBackOff(1000L, 3L));
    }
}
