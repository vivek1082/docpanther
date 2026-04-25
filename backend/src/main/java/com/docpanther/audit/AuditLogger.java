package com.docpanther.audit;

import java.util.Map;
import java.util.UUID;

public interface AuditLogger extends com.docpanther.common.audit.AuditLogger {

    default void log(String action, ActorType actorType, UUID actorId,
                     UUID tenantId, UUID caseId, UUID checklistItemId,
                     Map<String, Object> metadata) {
        log(action, actorType.name(), actorId, tenantId, caseId, checklistItemId, metadata);
    }
}
