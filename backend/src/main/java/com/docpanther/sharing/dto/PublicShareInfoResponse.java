package com.docpanther.sharing.dto;

import java.time.Instant;

public record PublicShareInfoResponse(
    boolean isPasswordProtected,
    Instant expiresAt,
    String  filename
) {}
