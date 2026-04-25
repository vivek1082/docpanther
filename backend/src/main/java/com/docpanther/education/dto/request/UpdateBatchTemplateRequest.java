package com.docpanther.education.dto.request;

import jakarta.validation.constraints.NotBlank;

public record UpdateBatchTemplateRequest(
        @NotBlank String name,
        String description
) {}
