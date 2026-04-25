package com.docpanther.filesystem.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public record ConfirmUploadRequest(
        @NotBlank String filename,
        @Positive long   sizeBytes,
        @NotBlank String s3Key,
        @NotBlank String mimeType
) {}
