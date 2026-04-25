package com.docpanther.education.dto.request;

import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

public record CreateBatchRequest(
        @NotBlank String name,
        String academicYear,
        String description,
        UUID templateId
) {}
