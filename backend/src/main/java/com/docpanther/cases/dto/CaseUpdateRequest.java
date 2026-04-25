package com.docpanther.cases.dto;

import java.time.Instant;
import java.util.List;

public record CaseUpdateRequest(
        String customerName,
        String customerEmail,
        List<String> tags,
        Instant expiresAt,
        Integer maxFileSizeMb,
        List<String> allowedFileTypes
) {}
