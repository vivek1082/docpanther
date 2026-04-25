package com.docpanther.storage;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StorageDocumentRepository extends JpaRepository<Document, UUID> {
    List<Document> findByChecklistItemId(UUID checklistItemId);
    List<Document> findByCaseId(UUID caseId);
    Optional<Document> findByIdAndTenantId(UUID id, UUID tenantId);
}
