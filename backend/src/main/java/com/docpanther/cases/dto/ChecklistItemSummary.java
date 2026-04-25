package com.docpanther.cases.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ChecklistItemSummary(
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
        List<DocumentSummary> documents,
        Instant createdAt
) {
    public record DocumentSummary(
            UUID id,
            String filename,
            String contentType,
            long sizeBytes,
            Instant uploadedAt
    ) {}
}
