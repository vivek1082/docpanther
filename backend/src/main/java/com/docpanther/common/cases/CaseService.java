package com.docpanther.common.cases;

import java.util.UUID;

public interface CaseService {
    void recalculateStatus(UUID caseId);
}
