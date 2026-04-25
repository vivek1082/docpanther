package com.docpanther.tenant;

import java.time.Instant;
import java.util.UUID;

public record MemberDto(
        UUID userId,
        String email,
        String name,
        String role,
        Instant joinedAt
) {}
