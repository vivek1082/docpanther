package com.docpanther.education.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record AssignTeacherRequest(
        @NotNull UUID userId,
        boolean primary
) {}
