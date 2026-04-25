package com.docpanther.filesystem.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.util.UUID;

public record GrantPermissionRequest(
        @NotNull UUID userId,
        @NotNull @Pattern(regexp = "VIEW|EDIT") String permission
) {}
