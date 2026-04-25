package com.docpanther.education.dto.request;

import jakarta.validation.constraints.NotBlank;

public record UpdateBatchRequest(
        @NotBlank String name,
        String academicYear,
        String description
) {}
