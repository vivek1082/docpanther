package com.docpanther.audit;

import java.time.Instant;
import java.util.Map;

public record AuditLogResponse(
        String id,
        String action,
        String actorType,
        String actorId,
        Map<String, Object> metadata,
        Instant createdAt
) {
    static AuditLogResponse from(AuditLog log) {
        return new AuditLogResponse(
                log.getId().toString(),
                log.getAction(),
                log.getActorType().name(),
                log.getActorId() != null ? log.getActorId().toString() : null,
                log.getMetadata(),
                log.getCreatedAt());
    }
}
