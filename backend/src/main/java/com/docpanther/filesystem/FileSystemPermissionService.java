package com.docpanther.filesystem;

import com.docpanther.common.exception.ApiException;
import com.docpanther.filesystem.model.FileNode;
import com.docpanther.filesystem.model.FileNodePermission;
import com.docpanther.filesystem.model.NodeType;
import com.docpanther.filesystem.model.PermissionRole;
import com.docpanther.filesystem.repository.FileNodePermissionRepository;
import com.docpanther.filesystem.repository.FileNodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FileSystemPermissionService {

    private final FileNodeRepository nodeRepository;
    private final FileNodePermissionRepository permissionRepository;
    private final JdbcTemplate jdbcTemplate;

    /**
     * Effective permission resolution (highest wins):
     * 1. TENANT_ADMIN → implicit OWNER over all tenant nodes
     * 2. Creator of the node → OWNER
     * 3. Explicit entry in file_node_permissions
     * 4. Inherited from nearest ancestor with a permission entry
     * 5. Same tenant but no explicit grant → VIEWER (read-only default)
     */
    public PermissionRole getEffectiveRole(UUID userId, UUID tenantId, UUID nodeId) {
        if (tenantId != null && isTenantAdmin(userId, tenantId)) {
            return PermissionRole.OWNER;
        }

        FileNode node = nodeRepository.findById(nodeId)
                .orElseThrow(() -> ApiException.notFound("Node"));

        if (node.getCreatedBy().equals(userId)) {
            return PermissionRole.OWNER;
        }

        Optional<FileNodePermission> explicit = permissionRepository.findByNodeIdAndUserId(nodeId, userId);
        if (explicit.isPresent()) {
            return explicit.get().getRole();
        }

        if (node.getParentId() != null) {
            return getEffectiveRole(userId, tenantId, node.getParentId());
        }

        // Root node with no explicit grant — default VIEW for same-tenant members
        if (tenantId != null && tenantId.equals(node.getTenantId())) {
            return PermissionRole.VIEWER;
        }

        return null;
    }

    public void requireRole(UUID userId, UUID tenantId, UUID nodeId, PermissionRole required) {
        PermissionRole effective = getEffectiveRole(userId, tenantId, nodeId);
        if (effective == null || !effective.includes(required)) {
            throw ApiException.forbidden();
        }
    }

    public FileNode requireFolderAccess(UUID folderId, NodeType expectedType) {
        FileNode node = nodeRepository.findById(folderId)
                .orElseThrow(() -> ApiException.notFound(
                        expectedType == NodeType.FOLDER ? "Folder" : "File"));
        if (node.getType() != expectedType) {
            throw ApiException.notFound(expectedType == NodeType.FOLDER ? "Folder" : "File");
        }
        return node;
    }

    public boolean isTenantAdmin(UUID userId, UUID tenantId) {
        if (tenantId == null) return false;
        Boolean result = jdbcTemplate.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM user_tenant_roles WHERE user_id = ? AND tenant_id = ? AND role = 'TENANT_ADMIN')",
                Boolean.class, userId, tenantId);
        return Boolean.TRUE.equals(result);
    }

    /**
     * Guards against moving a folder into one of its own descendants.
     */
    public boolean isDescendantOf(UUID candidateId, UUID ancestorId) {
        UUID current = candidateId;
        while (current != null) {
            Optional<FileNode> node = nodeRepository.findById(current);
            if (node.isEmpty()) break;
            UUID parent = node.get().getParentId();
            if (ancestorId.equals(parent)) return true;
            current = parent;
        }
        return false;
    }
}
