package com.docpanther.cases;

import java.util.List;
import java.util.UUID;

/**
 * Port interface implemented by the storage module.
 * Cases module declares what document data it needs; storage module provides it.
 */
public interface CaseDocumentPort {

    List<DocumentSummary> getDocumentsByCaseId(UUID caseId);

    record DocumentSummary(UUID id, String filename, String contentType, String s3Key) {}
}
