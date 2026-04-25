package com.docpanther.cases;

import com.docpanther.cases.model.Case;
import com.docpanther.cases.model.CaseStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CaseRepository extends JpaRepository<Case, UUID> {

    Page<Case> findByTenantId(UUID tenantId, Pageable pageable);

    Page<Case> findByTenantIdAndFolderId(UUID tenantId, UUID folderId, Pageable pageable);

    Page<Case> findByTenantIdAndStatus(UUID tenantId, CaseStatus status, Pageable pageable);

    Page<Case> findByTenantIdAndFolderIdAndStatus(UUID tenantId, UUID folderId, CaseStatus status, Pageable pageable);

    @Query("SELECT c FROM Case c WHERE c.tenantId = :tenantId AND c.folderId IS NULL")
    Page<Case> findRootCasesByTenantId(@Param("tenantId") UUID tenantId, Pageable pageable);

    @Query("SELECT c FROM Case c WHERE c.tenantId = :tenantId AND c.folderId IS NULL AND c.status = :status")
    Page<Case> findRootCasesByTenantIdAndStatus(@Param("tenantId") UUID tenantId,
                                                @Param("status") CaseStatus status, Pageable pageable);

    Optional<Case> findByUploadToken(String uploadToken);
}
