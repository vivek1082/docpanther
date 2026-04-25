package com.docpanther.checklist.dto;

import java.time.Instant;
import java.util.UUID;

public record TemplateResponse(
        UUID id,
        String name,
        String tag,
        boolean isGlobal,
        int itemCount,
        Instant createdAt
) {}
