package com.docpanther.filesystem.dto;

import java.time.Instant;
import java.util.UUID;

public record FileNodeResponse(
        UUID    id,
        UUID    folderId,
        String  name,
        String  contentType,
        long    sizeBytes,
        UUID    uploadedBy,
        Instant uploadedAt
) {}
