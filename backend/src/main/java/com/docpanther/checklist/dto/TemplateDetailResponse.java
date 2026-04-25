package com.docpanther.checklist.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record TemplateDetailResponse(
        UUID id,
        String name,
        String tag,
        boolean isGlobal,
        int itemCount,
        Instant createdAt,
        List<ChecklistItemResponse> items
) {}
