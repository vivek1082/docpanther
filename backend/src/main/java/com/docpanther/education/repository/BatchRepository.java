package com.docpanther.education.repository;

import com.docpanther.education.model.Batch;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BatchRepository extends JpaRepository<Batch, UUID> {
    Page<Batch> findAllByTenantId(UUID tenantId, Pageable pageable);
    Optional<Batch> findByIdAndTenantId(UUID id, UUID tenantId);
    List<Batch> findAllByIdInAndTenantId(List<UUID> ids, UUID tenantId);
}
