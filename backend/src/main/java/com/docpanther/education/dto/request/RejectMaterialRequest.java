package com.docpanther.education.dto.request;

import jakarta.validation.constraints.NotBlank;

public record RejectMaterialRequest(
        @NotBlank String reason
) {}
