package com.docpanther.education.dto.request;

import jakarta.validation.constraints.NotBlank;

public record AddSubjectRequest(
        @NotBlank String name,
        String description,
        int order
) {}
