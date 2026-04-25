package com.docpanther.filesystem;

import com.docpanther.common.audit.AuditLogger;
import com.docpanther.common.exception.ApiException;
import com.docpanther.filesystem.dto.*;
import com.docpanther.filesystem.model.FileNode;
import com.docpanther.filesystem.model.FileNodePermission;
import com.docpanther.filesystem.model.NodeType;
import com.docpanther.filesystem.model.PermissionRole;
import com.docpanther.filesystem.repository.FileNodePermissionRepository;
import com.docpanther.filesystem.repository.FileNodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FolderService {

    private final FileNodeRepository            nodeRepository;
    private final FileNodePermissionRepository  permissionRepository;
    private final FileSystemPermissionService   permissionService;
    private final FileSystemMapper              mapper;
    private final CaseQueryHelper               caseQueryHelper;
    private final AuditLogger                   auditLogger;
    private final JdbcTemplate                  jdbcTemplate;

    // ── Listing ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public RootContentsResponse listRootContents(UUID userId, UUID tenantId) {
        final UUID tid = resolvetenantId(userId, tenantId);

        List<FileNode> rootFolders =
                nodeRepository.findByTenantIdAndParentIdIsNullAndType(tid, NodeType.FOLDER);

        List<FolderResponse> folders = rootFolders.stream()
                .map(f -> mapper.toFolderResponse(f, userId, tid))
                .toList();

        List<CaseSummaryDto> cases = caseQueryHelper.listForTenant(tid);

        // FileNodes always belong to a named folder; root has no direct files
        return new RootContentsResponse(folders, cases, List.of());
    }

    @Transactional(readOnly = true)
    public FolderContentsResponse listFolderContents(UUID userId, UUID tenantId, UUID folderId) {
        final UUID tid = resolvetenantId(userId, tenantId);
        FileNode folder = permissionService.requireFolderAccess(folderId, NodeType.FOLDER);
        permissionService.requireRole(userId, tid, folderId, PermissionRole.VIEWER);

        FolderResponse folderResponse = mapper.toFolderResponse(folder, userId, tid);

        List<FolderResponse> subFolders =
                nodeRepository.findByParentIdAndType(folderId, NodeType.FOLDER).stream()
                        .map(f -> mapper.toFolderResponse(f, userId, tid))
                        .toList();

        List<FileNodeResponse> files =
                nodeRepository.findByParentIdAndType(folderId, NodeType.FILE).stream()
                        .map(mapper::toFileNodeResponse)
                        .toList();

        // Cases are not associated with folders in the current schema
        return new FolderContentsResponse(folderResponse, subFolders, List.of(), files);
    }

    // ── CRUD ─────────────────────────────────────────────────────────────────

    @Transactional
    public FolderResponse createFolder(UUID userId, UUID tenantId, CreateFolderRequest req) {
        tenantId = resolvetenantId(userId, tenantId);

        if (req.parentId() != null) {
            permissionService.requireFolderAccess(req.parentId(), NodeType.FOLDER);
            permissionService.requireRole(userId, tenantId, req.parentId(), PermissionRole.EDITOR);
        }

        FileNode folder = nodeRepository.save(FileNode.builder()
                .tenantId(tenantId)
                .parentId(req.parentId())
                .name(req.name())
                .type(NodeType.FOLDER)
                .createdBy(userId)
                .build());

        permissionRepository.save(FileNodePermission.builder()
                .nodeId(folder.getId())
                .userId(userId)
                .role(PermissionRole.OWNER)
                .build());

        auditLogger.log("FOLDER_CREATED", "ADMIN", userId, tenantId, null, null,
                Map.of("folderId", folder.getId().toString(), "name", folder.getName()));

        return mapper.toFolderResponse(folder, userId, tenantId);
    }

    @Transactional
    public FolderResponse renameFolder(UUID userId, UUID tenantId, UUID folderId, RenameFolderRequest req) {
        tenantId = resolvetenantId(userId, tenantId);
        FileNode folder = permissionService.requireFolderAccess(folderId, NodeType.FOLDER);
        permissionService.requireRole(userId, tenantId, folderId, PermissionRole.EDITOR);

        folder.setName(req.name());
        folder = nodeRepository.save(folder);

        auditLogger.log("FOLDER_UPDATED", "ADMIN", userId, tenantId, null, null,
                Map.of("folderId", folderId.toString(), "name", req.name()));

        return mapper.toFolderResponse(folder, userId, tenantId);
    }

    @Transactional
    public void deleteFolder(UUID userId, UUID tenantId, UUID folderId) {
        tenantId = resolvetenantId(userId, tenantId);
        FileNode folder = permissionService.requireFolderAccess(folderId, NodeType.FOLDER);
        permissionService.requireRole(userId, tenantId, folderId, PermissionRole.OWNER);

        deleteFolderRecursive(folder);

        auditLogger.log("FOLDER_DELETED", "ADMIN", userId, tenantId, null, null,
                Map.of("folderId", folderId.toString()));
    }

    @Transactional
    public FolderResponse moveFolder(UUID userId, UUID tenantId, UUID folderId, MoveFolderRequest req) {
        tenantId = resolvetenantId(userId, tenantId);
        FileNode folder = permissionService.requireFolderAccess(folderId, NodeType.FOLDER);
        permissionService.requireRole(userId, tenantId, folderId, PermissionRole.OWNER);

        if (req.parentId() != null) {
            if (req.parentId().equals(folderId)) {
                throw ApiException.badRequest("A folder cannot be its own parent");
            }
            permissionService.requireFolderAccess(req.parentId(), NodeType.FOLDER);
            permissionService.requireRole(userId, tenantId, req.parentId(), PermissionRole.EDITOR);
            if (permissionService.isDescendantOf(req.parentId(), folderId)) {
                throw ApiException.badRequest("Cannot move a folder into its own descendant");
            }
        }

        folder.setParentId(req.parentId());
        folder = nodeRepository.save(folder);

        auditLogger.log("FOLDER_MOVED", "ADMIN", userId, tenantId, null, null,
                Map.of("folderId", folderId.toString(),
                       "newParentId", req.parentId() != null ? req.parentId().toString() : "null"));

        return mapper.toFolderResponse(folder, userId, tenantId);
    }

    // ── Permissions ───────────────────────────────────────────────────────────

    @Transactional
    public void grantPermission(UUID userId, UUID tenantId, UUID folderId, GrantPermissionRequest req) {
        tenantId = resolvetenantId(userId, tenantId);
        permissionService.requireFolderAccess(folderId, NodeType.FOLDER);
        permissionService.requireRole(userId, tenantId, folderId, PermissionRole.OWNER);

        PermissionRole role = PermissionRole.fromApiRole(req.permission());

        Optional<FileNodePermission> existing =
                permissionRepository.findByNodeIdAndUserId(folderId, req.userId());
        if (existing.isPresent()) {
            existing.get().setRole(role);
            permissionRepository.save(existing.get());
        } else {
            permissionRepository.save(FileNodePermission.builder()
                    .nodeId(folderId)
                    .userId(req.userId())
                    .role(role)
                    .build());
        }

        auditLogger.log("PERMISSION_GRANTED", "ADMIN", userId, tenantId, null, null,
                Map.of("folderId", folderId.toString(),
                       "targetUserId", req.userId().toString(),
                       "permission", req.permission()));
    }

    @Transactional
    public void revokePermission(UUID userId, UUID tenantId, UUID folderId, UUID targetUserId) {
        tenantId = resolvetenantId(userId, tenantId);
        permissionService.requireFolderAccess(folderId, NodeType.FOLDER);
        permissionService.requireRole(userId, tenantId, folderId, PermissionRole.OWNER);

        permissionRepository.deleteByNodeIdAndUserId(folderId, targetUserId);

        auditLogger.log("PERMISSION_REVOKED", "ADMIN", userId, tenantId, null, null,
                Map.of("folderId", folderId.toString(),
                       "targetUserId", targetUserId.toString()));
    }

    // ── Internals ─────────────────────────────────────────────────────────────

    private void deleteFolderRecursive(FileNode folder) {
        List<FileNode> children = nodeRepository.findByParentId(folder.getId());
        for (FileNode child : children) {
            if (child.getType() == NodeType.FOLDER) {
                deleteFolderRecursive(child);
            } else {
                permissionRepository.deleteByNodeId(child.getId());
                nodeRepository.delete(child);
            }
        }
        permissionRepository.deleteByNodeId(folder.getId());
        nodeRepository.delete(folder);
    }

    /**
     * Returns the effective tenant ID for the given user.
     * When the JWT carries null (individual users), looks up the user's personal tenant in DB.
     */
    UUID resolvetenantId(UUID userId, UUID tenantId) {
        if (tenantId != null) return tenantId;
        try {
            UUID personal = jdbcTemplate.queryForObject(
                "SELECT tenant_id FROM users WHERE id = ? AND tenant_id IS NOT NULL",
                UUID.class, userId);
            if (personal != null) return personal;
        } catch (EmptyResultDataAccessException ignored) {}
        throw ApiException.badRequest("The filesystem feature requires an organisation account");
    }

    private static void requireTenant(UUID tenantId) {
        if (tenantId == null) {
            throw ApiException.badRequest("The filesystem feature requires an organisation account");
        }
    }
}
