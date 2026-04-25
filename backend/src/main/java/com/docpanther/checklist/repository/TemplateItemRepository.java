package com.docpanther.checklist.repository;

import com.docpanther.checklist.model.TemplateItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TemplateItemRepository extends JpaRepository<TemplateItem, UUID> {

    List<TemplateItem> findAllByTemplate_IdOrderBySortOrderAsc(UUID templateId);
}
