package com.docpanther.superadmin.repository;

import com.docpanther.superadmin.model.TenantAdminMetadata;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface TenantAdminMetadataRepository extends JpaRepository<TenantAdminMetadata, UUID> {}
