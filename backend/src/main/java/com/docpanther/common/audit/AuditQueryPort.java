package com.docpanther.common.audit;

import java.util.UUID;

public interface AuditQueryPort {
    AuditPageDto getPagedCaseAuditLog(UUID caseId, int page);
}
