package com.docpanther.notifications;

import com.docpanther.common.audit.AuditLogger;
import com.docpanther.notifications.model.Notification;
import com.docpanther.notifications.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final int PAGE_SIZE = 20;

    private final NotificationRepository notificationRepository;
    private final AuditLogger auditLogger;

    public Page<Notification> listForUser(UUID userId, int page) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(
            userId, PageRequest.of(page, PAGE_SIZE));
    }

    @Transactional
    public void markRead(List<UUID> ids, UUID userId, UUID tenantId) {
        if (ids == null || ids.isEmpty()) return;
        List<Notification> notifications = notificationRepository.findByIdInAndUserId(ids, userId);
        notifications.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(notifications);
        auditLogger.log("NOTIFICATIONS_MARKED_READ", "USER", userId, tenantId, null, null,
                Map.of("count", notifications.size()));
    }

    @Transactional
    public Notification create(UUID userId, UUID tenantId, String type, String title, String body) {
        Notification n = Notification.builder()
            .userId(userId)
            .tenantId(tenantId)
            .type(type)
            .title(title)
            .body(body)
            .build();
        Notification saved = notificationRepository.save(n);
        auditLogger.log("NOTIFICATION_CREATED", "SYSTEM", userId, tenantId, null, saved.getId(),
                Map.of("type", type));
        return saved;
    }
}
