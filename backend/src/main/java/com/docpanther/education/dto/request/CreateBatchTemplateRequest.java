package com.docpanther.education.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record CreateBatchTemplateRequest(
        @NotBlank String name,
        String description,
        @NotNull List<@Valid SubjectEntry> subjects
) {
    public record SubjectEntry(
            @NotBlank String name,
            String description,
            int order,
            UUID defaultTeacherId
    ) {}
}
