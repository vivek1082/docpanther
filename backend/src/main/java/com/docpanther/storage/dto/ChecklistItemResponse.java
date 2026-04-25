package com.docpanther.storage.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ChecklistItemResponse(
        UUID id,
        UUID caseId,
        String name,
        String description,
        String type,
        boolean required,
        boolean allowMultiple,
        String status,
        String textValue,
        Integer maxFileSizeMb,
        List<String> allowedFileTypes,
        int sortOrder,
        List<DocumentResponse> documents,
        Instant createdAt
) {}
