package com.aip.auth.config;

import com.aip.auth.user.Role;
import com.aip.auth.user.User;
import com.aip.auth.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.UUID;

/**
 * Seeds the demo accounts the frontend advertises on its login screen.
 * Local/dev profile only — never active in production.
 */
@Configuration
@Profile("local")
public class DemoUserSeeder {

    private static final Logger log = LoggerFactory.getLogger(DemoUserSeeder.class);

    @Bean
    CommandLineRunner seedDemoUsers(UserRepository users, PasswordEncoder encoder) {
        return args -> {
            seed(users, encoder, "sunil@demo.com", "Sunil Kumar", "+91 98765 43210", "Demo@123", Role.CANDIDATE);
            seed(users, encoder, "admin@demo.com", "Priya Sharma", "+91 99887 76655", "Admin@123", Role.ADMIN);
            seed(users, encoder, "interviewer@demo.com", "Rahul Mehta", "+91 98111 22334", "Interview@123",
                    Role.INTERVIEWER);
        };
    }

    private void seed(UserRepository users, PasswordEncoder encoder,
                      String email, String name, String mobile, String rawPassword, Role role) {
        if (users.existsByEmailIgnoreCase(email)) {
            return;
        }
        users.save(new User(UUID.randomUUID(), email, name, mobile, encoder.encode(rawPassword), role));
        log.info("Seeded demo {} account: {}", role, email);
    }
}
