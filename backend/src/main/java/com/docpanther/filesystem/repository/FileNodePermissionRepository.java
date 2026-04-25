package com.docpanther.filesystem.repository;

import com.docpanther.filesystem.model.FileNodePermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

public interface FileNodePermissionRepository extends JpaRepository<FileNodePermission, UUID> {

    Optional<FileNodePermission> findByNodeIdAndUserId(UUID nodeId, UUID userId);

    @Transactional
    void deleteByNodeIdAndUserId(UUID nodeId, UUID userId);

    @Transactional
    void deleteByNodeId(UUID nodeId);
}
