package com.docpanther.storage.dto;

import jakarta.validation.constraints.NotBlank;

public record TextSubmitRequest(
        @NotBlank String value
) {}
