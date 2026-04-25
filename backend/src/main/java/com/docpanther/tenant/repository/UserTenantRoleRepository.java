package com.docpanther.tenant.repository;

import com.docpanther.tenant.model.UserTenantRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserTenantRoleRepository extends JpaRepository<UserTenantRole, UUID> {
    Optional<UserTenantRole> findByUserIdAndTenantId(UUID userId, UUID tenantId);
    void deleteByUserIdAndTenantId(UUID userId, UUID tenantId);
}
