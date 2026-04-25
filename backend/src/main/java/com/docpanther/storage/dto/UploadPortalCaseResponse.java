package com.docpanther.storage.dto;

import java.time.Instant;
import java.util.List;

public record UploadPortalCaseResponse(
        String referenceNo,
        String customerName,
        String status,
        Instant expiresAt,
        List<ChecklistItemResponse> checklist
) {}
