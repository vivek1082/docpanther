package com.docpanther.checklist.dto;

import java.time.Instant;
import java.util.UUID;

public record DocumentResponse(
        UUID id,
        UUID checklistItemId,
        UUID caseId,
        String filename,
        String contentType,
        long sizeBytes,
        Instant uploadedAt
) {}
