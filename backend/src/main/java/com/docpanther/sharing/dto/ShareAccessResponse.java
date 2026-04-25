package com.docpanther.sharing.dto;

import java.time.Instant;

public record ShareAccessResponse(
    String  downloadUrl,
    Instant expiresAt
) {}
