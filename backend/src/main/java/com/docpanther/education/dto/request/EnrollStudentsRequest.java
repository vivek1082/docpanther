package com.docpanther.education.dto.request;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;
import java.util.UUID;

public record EnrollStudentsRequest(
        @NotEmpty List<UUID> studentIds
) {}
