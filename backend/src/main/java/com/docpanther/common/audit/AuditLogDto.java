package com.docpanther.common.audit;

import java.time.Instant;
import java.util.Map;

public record AuditLogDto(
        String id,
        String action,
        String actorType,
        String actorId,
        Map<String, Object> metadata,
        Instant createdAt
) {}
