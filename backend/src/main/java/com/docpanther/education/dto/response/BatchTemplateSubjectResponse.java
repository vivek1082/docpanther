package com.docpanther.education.dto.response;

import java.util.UUID;

public record BatchTemplateSubjectResponse(
        UUID id,
        UUID templateId,
        String name,
        String description,
        int order,
        UUID defaultTeacherId
) {}
