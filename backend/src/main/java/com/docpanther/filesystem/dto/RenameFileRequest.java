package com.docpanther.filesystem.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RenameFileRequest(@NotBlank @Size(max = 512) String name) {}
