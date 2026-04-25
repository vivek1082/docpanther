package com.docpanther.education.repository;

import com.docpanther.education.model.StudentFile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface StudentFileRepository extends JpaRepository<StudentFile, UUID> {
    Page<StudentFile> findAllByUserIdAndTenantId(UUID userId, UUID tenantId, Pageable pageable);
    Optional<StudentFile> findByIdAndUserIdAndTenantId(UUID id, UUID userId, UUID tenantId);
}
