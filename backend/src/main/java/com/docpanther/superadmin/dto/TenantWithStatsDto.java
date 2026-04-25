package com.docpanther.superadmin.dto;

import java.time.Instant;

public record TenantWithStatsDto(
        String id,
        String slug,
        String name,
        String region,
        String plan,
        String logoUrl,
        Instant createdAt,
        String podId,
        String podRegion,
        double storageGb,
        int casesTotal
) {}
