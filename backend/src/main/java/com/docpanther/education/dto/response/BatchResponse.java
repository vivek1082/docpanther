package com.docpanther.education.dto.response;

import java.time.Instant;
import java.util.UUID;

public record BatchResponse(
        UUID id,
        UUID tenantId,
        String name,
        String academicYear,
        UUID templateId,
        long enrollmentCount,
        long subjectCount,
        Instant createdAt
) {}
