package com.docpanther.notifications;

import com.docpanther.notifications.model.Notification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.function.Function;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PageResponse<NotificationDto>> list(
            @AuthenticationPrincipal(expression = "id") UUID userId,
            @RequestParam(defaultValue = "0") int page) {
        Page<Notification> result = notificationService.listForUser(userId, page);
        return ResponseEntity.ok(PageResponse.of(result, NotificationDto::from));
    }

    @PostMapping("/read")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> markRead(
            @AuthenticationPrincipal(expression = "id")       UUID userId,
            @AuthenticationPrincipal(expression = "tenantId") UUID tenantId,
            @RequestBody MarkReadBody body) {
        notificationService.markRead(body.ids(), userId, tenantId);
        return ResponseEntity.ok().build();
    }

    // ── DTOs ─────────────────────────────────────────────────────────

    record NotificationDto(
        String id,
        String type,
        String title,
        String body,
        boolean read,
        Instant createdAt
    ) {
        static NotificationDto from(Notification n) {
            return new NotificationDto(
                n.getId().toString(),
                n.getType(),
                n.getTitle(),
                n.getBody(),
                n.isRead(),
                n.getCreatedAt()
            );
        }
    }

    record MarkReadBody(List<UUID> ids) {}

    record PageResponse<T>(
        List<T> content,
        int page,
        int size,
        long totalElements,
        int totalPages
    ) {
        static <T, E> PageResponse<T> of(Page<E> p, Function<E, T> mapper) {
            return new PageResponse<>(
                p.getContent().stream().map(mapper).toList(),
                p.getNumber(),
                p.getSize(),
                p.getTotalElements(),
                p.getTotalPages()
            );
        }
    }
}
