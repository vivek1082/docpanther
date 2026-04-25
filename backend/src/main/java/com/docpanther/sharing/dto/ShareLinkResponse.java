package com.docpanther.sharing.dto;

import java.time.Instant;
import java.util.UUID;

public record ShareLinkResponse(
    UUID    id,
    UUID    documentId,
    String  token,
    boolean isPasswordProtected,
    Instant expiresAt,
    Integer maxViews,
    int     viewCount,
    Instant createdAt
) {}
