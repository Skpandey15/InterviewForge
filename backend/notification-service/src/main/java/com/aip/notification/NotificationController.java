package com.aip.notification;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    public record NotificationResponse(String id, String type, String title, String body, Instant createdAt) {
    }

    private final NotificationRepository notifications;

    public NotificationController(NotificationRepository notifications) {
        this.notifications = notifications;
    }

    @GetMapping
    public List<NotificationResponse> myNotifications(@AuthenticationPrincipal Jwt jwt) {
        return notifications.findTop20ByUserIdOrderByCreatedAtDesc(UUID.fromString(jwt.getSubject())).stream()
                .map(n -> new NotificationResponse(
                        n.getId().toString(), n.getType(), n.getTitle(), n.getBody(), n.getCreatedAt()))
                .toList();
    }
}
