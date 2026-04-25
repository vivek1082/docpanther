package com.docpanther.common.checklist;

import java.util.UUID;

public interface ChecklistService {
    void markUploaded(UUID itemId);
    void recalculateCase(UUID caseId);
}
