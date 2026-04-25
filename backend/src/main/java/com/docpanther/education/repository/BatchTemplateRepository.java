package com.docpanther.education.repository;

import com.docpanther.education.model.BatchTemplate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface BatchTemplateRepository extends JpaRepository<BatchTemplate, UUID> {
    Page<BatchTemplate> findAllByTenantId(UUID tenantId, Pageable pageable);
    Optional<BatchTemplate> findByIdAndTenantId(UUID id, UUID tenantId);
}
