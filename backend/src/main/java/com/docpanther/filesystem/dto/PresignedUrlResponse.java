package com.docpanther.filesystem.dto;

import java.time.Instant;

public record PresignedUrlResponse(
        String  presignedUrl,
        String  s3Key,
        Instant expiresAt
) {}
