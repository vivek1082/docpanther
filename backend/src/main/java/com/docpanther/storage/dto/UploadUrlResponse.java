package com.docpanther.storage.dto;

import java.time.Instant;

public record UploadUrlResponse(
        String presignedUrl,
        String s3Key,
        Instant expiresAt
) {}
