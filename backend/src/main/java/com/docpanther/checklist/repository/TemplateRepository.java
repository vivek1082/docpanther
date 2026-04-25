package com.docpanther.checklist.repository;

import com.docpanther.checklist.model.Template;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TemplateRepository extends JpaRepository<Template, UUID> {

    List<Template> findAllByTenantIdOrIsGlobalTrueOrderByCreatedAtDesc(UUID tenantId);

    Optional<Template> findByIdAndTenantId(UUID id, UUID tenantId);
}
