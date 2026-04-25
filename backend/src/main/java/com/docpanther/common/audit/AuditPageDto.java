package com.docpanther.common.audit;

import java.util.List;

public record AuditPageDto(
        List<AuditLogDto> content,
        int page,
        int size,
        long totalElements,
        int totalPages
) {}
