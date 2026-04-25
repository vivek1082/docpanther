package com.docpanther.checklist.dto;

import com.docpanther.checklist.model.ItemStatus;
import com.docpanther.checklist.model.ItemType;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ChecklistItemResponse(
        UUID id,
        UUID caseId,
        String name,
        String description,
        ItemType type,
        boolean required,
        boolean allowMultiple,
        ItemStatus status,
        String textValue,
        Integer maxFileSizeMb,
        List<String> allowedFileTypes,
        int sortOrder,
        List<DocumentResponse> documents,
        Instant createdAt
) {}
