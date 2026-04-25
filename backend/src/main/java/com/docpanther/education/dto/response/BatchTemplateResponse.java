package com.docpanther.education.dto.response;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record BatchTemplateResponse(
        UUID id,
        UUID tenantId,
        String name,
        String description,
        int subjectCount,
        List<BatchTemplateSubjectResponse> subjects,
        Instant createdAt
) {}
