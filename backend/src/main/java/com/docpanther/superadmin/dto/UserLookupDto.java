package com.docpanther.superadmin.dto;

import java.time.Instant;

public record UserLookupDto(
        String id,
        String email,
        String name,
        String avatarUrl,
        boolean emailVerified,
        Instant createdAt,
        String tenantId
) {}
