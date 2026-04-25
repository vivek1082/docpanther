package com.docpanther.education.dto.request;

import jakarta.validation.constraints.NotBlank;

public record UpdateSubjectRequest(
        @NotBlank String name,
        String description
) {}
