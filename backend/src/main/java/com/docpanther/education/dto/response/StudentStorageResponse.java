package com.docpanther.education.dto.response;

import java.util.UUID;

public record StudentStorageResponse(
        UUID userId,
        UUID tenantId,
        long usedBytes,
        long quotaBytes
) {}
