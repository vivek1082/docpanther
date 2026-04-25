package com.docpanther.education.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.util.UUID;

public record CreateMaterialRequest(
        @NotNull UUID subjectId,
        @NotBlank String title,
        String description,
        @NotBlank String filename,
        @NotBlank String contentType,
        @Positive long sizeBytes
) {}
