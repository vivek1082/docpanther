package com.docpanther.education.dto.response;

import java.time.Instant;
import java.util.UUID;

public record StudentFileResponse(
        UUID id,
        UUID userId,
        String filename,
        String contentType,
        String s3Key,
        long sizeBytes,
        Instant uploadedAt
) {}
