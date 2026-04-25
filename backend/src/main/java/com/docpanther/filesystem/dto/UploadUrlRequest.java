package com.docpanther.filesystem.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public record UploadUrlRequest(
        @NotBlank String filename,
        @Positive long   sizeBytes,
        @NotBlank String mimeType
) {}
