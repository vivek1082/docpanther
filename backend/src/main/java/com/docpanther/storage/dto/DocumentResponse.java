package com.docpanther.storage.dto;

import com.docpanther.storage.Document;

import java.time.Instant;
import java.util.UUID;

public record DocumentResponse(
        UUID id,
        UUID checklistItemId,
        UUID caseId,
        String filename,
        String contentType,
        long sizeBytes,
        Instant uploadedAt
) {
    public static DocumentResponse from(Document doc) {
        return new DocumentResponse(
                doc.getId(),
                doc.getChecklistItemId(),
                doc.getCaseId(),
                doc.getFilename(),
                doc.getContentType(),
                doc.getSizeBytes(),
                doc.getUploadedAt()
        );
    }
}
