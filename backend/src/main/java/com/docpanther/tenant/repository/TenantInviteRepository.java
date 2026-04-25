package com.docpanther.tenant.repository;

import com.docpanther.tenant.model.TenantInvite;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface TenantInviteRepository extends JpaRepository<TenantInvite, UUID> {
    Optional<TenantInvite> findByToken(String token);
    Optional<TenantInvite> findByTenantIdAndEmailAndAcceptedFalse(UUID tenantId, String email);
}
