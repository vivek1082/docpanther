package com.docpanther.superadmin.repository;

import com.docpanther.superadmin.model.TenantPodAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TenantPodAssignmentRepository extends JpaRepository<TenantPodAssignment, UUID> {
    Optional<TenantPodAssignment> findByTenantId(UUID tenantId);
    List<TenantPodAssignment> findByPodId(UUID podId);
    long countByPodId(UUID podId);
}
