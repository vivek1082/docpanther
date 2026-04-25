package com.docpanther.filesystem.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CaseSummaryDto(
        UUID        id,
        UUID        folderId,
        String      referenceNo,
        String      customerName,
        String      customerEmail,
        List<String> tags,
        String      status,
        String      storageMode,
        Instant     createdAt,
        Instant     updatedAt
) {}
