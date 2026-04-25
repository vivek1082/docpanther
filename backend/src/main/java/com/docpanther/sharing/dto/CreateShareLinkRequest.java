package com.docpanther.sharing.dto;

import java.time.Instant;
import java.util.UUID;

public record CreateShareLinkRequest(
    String  password,
    Instant expiresAt,
    Integer maxViews,
    UUID    caseId
) {}
