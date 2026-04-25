package com.docpanther.superadmin.dto;

public record PlatformStatsDto(
        long totalTenants,
        long totalIndividuals,
        long totalCases,
        double totalStorageGb,
        long activePodsCount
) {}
