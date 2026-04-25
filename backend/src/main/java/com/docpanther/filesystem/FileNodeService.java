package com.docpanther.filesystem;

import com.docpanther.common.audit.AuditLogger;
import com.docpanther.common.config.AppProperties;
import com.docpanther.common.storage.FileStorage;
import com.docpanther.filesystem.dto.*;
import com.docpanther.filesystem.model.FileNode;
import com.docpanther.filesystem.model.NodeType;
import com.docpanther.filesystem.model.PermissionRole;
import com.docpanther.filesystem.repository.FileNodePermissionRepository;
import com.docpanther.filesystem.repository.FileNodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FileNodeService {

    private static final long DEFAULT_MAX_SIZE_BYTES = 100L * 1024 * 1024; // 100 MB

    private final FileNodeRepository           nodeRepository;
    private final FileNodePermissionRepository permissionRepository;
    private final FileSystemPermissionService  permissionService;
    private final FileSystemMapper             mapper;
    private final FileStorage                  fileStorage;
    private final AppProperties                appProperties;
    private final AuditLogger                  auditLogger;
    private final JdbcTemplate                 jdbcTemplate;

    UUID resolveTenantId(UUID userId, UUID tenantId) {
        if (tenantId != null) return tenantId;
        try {
            UUID t = jdbcTemplate.queryForObject(
                "SELECT tenant_id FROM users WHERE id = ? AND tenant_id IS NOT NULL", UUID.class, userId);
            if (t != null) return t;
        } catch (EmptyResultDataAccessException ignored) {}
        throw com.docpanther.common.exception.ApiException.badRequest(
            "The filesystem feature requires an organisation account");
    }

    // ── Upload flow ───────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PresignedUrlResponse getUploadUrl(UUID userId, UUID tenantId,
                                             UUID folderId, UploadUrlRequest req) {
        tenantId = resolveTenantId(userId, tenantId);
        permissionService.requireFolderAccess(folderId, NodeType.FOLDER);
        permissionService.requireRole(userId, tenantId, folderId, PermissionRole.EDITOR);

        String objectKey = tenantId + "/files/" + UUID.randomUUID() + "/" + req.filename();
        FileStorage.PresignedUpload result =
                fileStorage.generateUploadUrl(tenantId, objectKey, req.mimeType(), DEFAULT_MAX_SIZE_BYTES);

        long expirySeconds = (long) appProperties.getS3().getPresignedUrlExpiryMinutes() * 60;
        Instant expiresAt = Instant.now().plusSeconds(expirySeconds);

        return new PresignedUrlResponse(result.uploadUrl(), result.objectKey(), expiresAt);
    }

    @Transactional
    public FileNodeResponse confirmUpload(UUID userId, UUID tenantId,
                                          UUID folderId, ConfirmUploadRequest req) {
        tenantId = resolveTenantId(userId, tenantId);
        permissionService.requireFolderAccess(folderId, NodeType.FOLDER);
        permissionService.requireRole(userId, tenantId, folderId, PermissionRole.EDITOR);

        FileNode file = nodeRepository.save(FileNode.builder()
                .tenantId(tenantId)
                .parentId(folderId)
                .name(req.filename())
                .type(NodeType.FILE)
                .s3Key(req.s3Key())
                .mimeType(req.mimeType())
                .sizeBytes(req.sizeBytes())
                .createdBy(userId)
                .build());

        auditLogger.log("FILE_UPLOADED", "ADMIN", userId, tenantId, null, null,
                Map.of("fileId", file.getId().toString(),
                       "folderId", folderId.toString(),
                       "name", req.filename(),
                       "sizeBytes", req.sizeBytes()));

        return mapper.toFileNodeResponse(file);
    }

    // ── File operations ───────────────────────────────────────────────────────

    @Transactional
    public FileNodeResponse renameFile(UUID userId, UUID tenantId,
                                       UUID fileNodeId, RenameFileRequest req) {
        tenantId = resolveTenantId(userId, tenantId);
        FileNode file = permissionService.requireFolderAccess(fileNodeId, NodeType.FILE);
        permissionService.requireRole(userId, tenantId, file.getParentId(), PermissionRole.EDITOR);

        file.setName(req.name());
        file = nodeRepository.save(file);

        auditLogger.log("FILE_RENAMED", "ADMIN", userId, tenantId, null, null,
                Map.of("fileId", fileNodeId.toString(), "name", req.name()));

        return mapper.toFileNodeResponse(file);
    }

    @Transactional
    public void deleteFile(UUID userId, UUID tenantId, UUID fileNodeId) {
        tenantId = resolveTenantId(userId, tenantId);
        FileNode file = permissionService.requireFolderAccess(fileNodeId, NodeType.FILE);
        permissionService.requireRole(userId, tenantId, file.getParentId(), PermissionRole.EDITOR);

        if (file.getS3Key() != null) {
            fileStorage.delete(file.getS3Key());
        }
        permissionRepository.deleteByNodeId(file.getId());
        nodeRepository.delete(file);

        auditLogger.log("FILE_DELETED", "ADMIN", userId, tenantId, null, null,
                Map.of("fileId", fileNodeId.toString()));
    }

    @Transactional
    public FileNodeResponse moveFile(UUID userId, UUID tenantId,
                                     UUID fileNodeId, MoveFileRequest req) {
        tenantId = resolveTenantId(userId, tenantId);
        FileNode file = permissionService.requireFolderAccess(fileNodeId, NodeType.FILE);
        permissionService.requireRole(userId, tenantId, file.getParentId(), PermissionRole.EDITOR);

        permissionService.requireFolderAccess(req.folderId(), NodeType.FOLDER);
        permissionService.requireRole(userId, tenantId, req.folderId(), PermissionRole.EDITOR);

        file.setParentId(req.folderId());
        file = nodeRepository.save(file);

        auditLogger.log("FILE_MOVED", "ADMIN", userId, tenantId, null, null,
                Map.of("fileId", fileNodeId.toString(),
                       "targetFolderId", req.folderId().toString()));

        return mapper.toFileNodeResponse(file);
    }
}
