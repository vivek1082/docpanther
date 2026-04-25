package com.docpanther.filesystem.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record MoveFileRequest(@NotNull UUID folderId) {}
