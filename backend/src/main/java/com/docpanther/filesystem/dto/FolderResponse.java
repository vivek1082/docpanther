package com.docpanther.filesystem.dto;

import java.time.Instant;
import java.util.UUID;

public record FolderResponse(
        UUID    id,
        UUID    parentId,
        String  name,
        UUID    ownerId,
        String  permission,
        long    childCount,
        long    caseCount,
        long    fileCount,
        Instant createdAt
) {}
