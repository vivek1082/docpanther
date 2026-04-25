package com.docpanther.education.dto.response;

import com.docpanther.education.model.MaterialStatus;

import java.time.Instant;
import java.util.UUID;

public record MaterialResponse(
        UUID id,
        UUID subjectId,
        UUID batchId,
        String title,
        String description,
        String s3Key,
        String filename,
        String contentType,
        long sizeBytes,
        MaterialStatus status,
        UUID uploadedBy,
        UUID approvedBy,
        Instant approvedAt,
        String rejectionReason,
        Instant uploadedAt
) {}
