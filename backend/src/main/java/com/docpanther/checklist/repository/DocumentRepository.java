package com.docpanther.checklist.repository;

import com.docpanther.checklist.model.Document;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DocumentRepository extends JpaRepository<Document, UUID> {

    List<Document> findAllByChecklistItemIdIn(List<UUID> checklistItemIds);
}
