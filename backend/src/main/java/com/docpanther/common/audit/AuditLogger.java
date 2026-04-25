package com.docpanther.common.audit;

import java.util.Map;
import java.util.UUID;

public interface AuditLogger {
    void log(String action, String actorType, UUID actorId,
             UUID tenantId, UUID caseId, UUID checklistItemId,
             Map<String, Object> metadata);
}
