package com.docpanther.checklist.repository;

import com.docpanther.checklist.model.ChecklistItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChecklistItemRepository extends JpaRepository<ChecklistItem, UUID> {

    List<ChecklistItem> findAllByCaseIdOrderBySortOrderAsc(UUID caseId);

    Optional<ChecklistItem> findByIdAndCaseId(UUID id, UUID caseId);
}
