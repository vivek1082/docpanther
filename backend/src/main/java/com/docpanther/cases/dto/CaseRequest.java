package com.docpanther.cases.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CaseRequest(
        UUID folderId,
        @NotBlank String referenceNo,
        @NotBlank String customerName,
        @Email @NotBlank String customerEmail,
        List<String> tags,
        String storageMode,
        Instant expiresAt,
        Integer maxFileSizeMb,
        List<String> allowedFileTypes
) {}
