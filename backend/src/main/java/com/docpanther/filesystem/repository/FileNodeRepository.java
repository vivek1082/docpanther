package com.docpanther.filesystem.repository;

import com.docpanther.filesystem.model.FileNode;
import com.docpanther.filesystem.model.NodeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface FileNodeRepository extends JpaRepository<FileNode, UUID> {

    List<FileNode> findByTenantIdAndParentIdIsNullAndType(UUID tenantId, NodeType type);

    List<FileNode> findByParentIdAndType(UUID parentId, NodeType type);

    List<FileNode> findByParentId(UUID parentId);

    long countByParentIdAndType(UUID parentId, NodeType type);

    @Query("""
        SELECT f FROM FileNode f
        WHERE f.tenantId = :tenantId
          AND f.type     = :type
          AND LOWER(f.name) LIKE LOWER(CONCAT('%', :q, '%'))
        ORDER BY f.name
        """)
    List<FileNode> searchByName(
            @Param("tenantId") UUID tenantId,
            @Param("type") NodeType type,
            @Param("q") String q);
}
