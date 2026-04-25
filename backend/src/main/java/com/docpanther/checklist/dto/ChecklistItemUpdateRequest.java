package com.docpanther.checklist.dto;

import jakarta.validation.constraints.Pattern;

public record ChecklistItemUpdateRequest(
        @Pattern(regexp = "APPROVED|REJECTED", message = "status must be APPROVED or REJECTED")
        String status,
        String name,
        Boolean required
) {}
