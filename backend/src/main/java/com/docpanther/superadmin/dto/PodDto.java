package com.docpanther.superadmin.dto;

public record PodDto(
        String id,
        String region,
        String type,
        String status,
        int tenantCount,
        double storageGb
) {}
