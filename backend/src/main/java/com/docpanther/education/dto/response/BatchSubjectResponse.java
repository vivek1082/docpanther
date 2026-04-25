package com.docpanther.education.dto.response;

import java.util.List;
import java.util.UUID;

public record BatchSubjectResponse(
        UUID id,
        UUID batchId,
        String name,
        List<UUID> teacherIds,
        long materialCount
) {}
