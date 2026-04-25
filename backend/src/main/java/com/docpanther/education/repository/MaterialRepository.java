package com.docpanther.education.repository;

import com.docpanther.education.model.Material;
import com.docpanther.education.model.MaterialStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface MaterialRepository extends JpaRepository<Material, UUID> {
    Page<Material> findAllBySubjectIdAndTenantId(UUID subjectId, UUID tenantId, Pageable pageable);
    Page<Material> findAllBySubjectIdAndTenantIdAndStatus(UUID subjectId, UUID tenantId, MaterialStatus status, Pageable pageable);
    Optional<Material> findByIdAndTenantId(UUID id, UUID tenantId);
    long countBySubjectId(UUID subjectId);
}
