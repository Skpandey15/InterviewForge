package com.aip.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.context.annotation.Bean;
import reactor.core.publisher.Mono;

@SpringBootApplication
public class GatewayServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(GatewayServiceApplication.class, args);
    }

    /**
     * Rate-limit key: the caller's bearer token when present (per-user limits,
     * ARCHITECTURE.md §9), else the client IP.
     */
    @Bean
    KeyResolver principalKeyResolver() {
        return exchange -> {
            String authorization = exchange.getRequest().getHeaders().getFirst("Authorization");
            if (authorization != null && !authorization.isBlank()) {
                return Mono.just(Integer.toHexString(authorization.hashCode()));
            }
            var remote = exchange.getRequest().getRemoteAddress();
            return Mono.just(remote == null ? "anonymous" : remote.getAddress().getHostAddress());
        };
    }
}
