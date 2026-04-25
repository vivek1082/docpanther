package com.docpanther.checklist.dto;

import com.docpanther.checklist.model.ItemType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record ChecklistItemRequest(
        @NotBlank String name,
        String description,
        @NotNull ItemType type,
        boolean required,
        boolean allowMultiple,
        Integer maxFileSizeMb,
        List<String> allowedFileTypes,
        int sortOrder
) {}
