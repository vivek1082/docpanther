package com.docpanther.filesystem;

import com.docpanther.filesystem.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * REST controller for the filesystem module.
 *
 * Principal fields are extracted via SpEL from the User entity set by JwtAuthFilter:
 *   @AuthenticationPrincipal(expression = "id")       → User.getId()
 *   @AuthenticationPrincipal(expression = "tenantId") → User.getTenantId()
 */
@RestController
@RequestMapping("/api/fs")
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
public class FileSystemController {

    private final FolderService          folderService;
    private final FileNodeService        fileNodeService;
    private final FileSystemSearchService searchService;

    // ── Root listing ──────────────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<RootContentsResponse> listRoot(
            @AuthenticationPrincipal(expression = "id")       UUID userId,
            @AuthenticationPrincipal(expression = "tenantId") UUID tenantId) {

        return ResponseEntity.ok(folderService.listRootContents(userId, tenantId));
    }

    // ── Folder contents ───────────────────────────────────────────────────────

    @GetMapping("/{folderId}")
    public ResponseEntity<FolderContentsResponse> listFolder(
            @PathVariable UUID folderId,
            @AuthenticationPrincipal(expression = "id")       UUID userId,
            @AuthenticationPrincipal(expression = "tenantId") UUID tenantId) {

        return ResponseEntity.ok(folderService.listFolderContents(userId, tenantId, folderId));
    }

    // ── Folder CRUD ───────────────────────────────────────────────────────────

    @PostMapping("/folders")
    public ResponseEntity<FolderResponse> createFolder(
            @Valid @RequestBody CreateFolderRequest req,
            @AuthenticationPrincipal(expression = "id")       UUID userId,
            @AuthenticationPrincipal(expression = "tenantId") UUID tenantId) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(folderService.createFolder(userId, tenantId, req));
    }

    @PutMapping("/folders/{id}")
    public ResponseEntity<FolderResponse> renameFolder(
            @PathVariable UUID id,
            @Valid @RequestBody RenameFolderRequest req,
            @AuthenticationPrincipal(expression = "id")       UUID userId,
            @AuthenticationPrincipal(expression = "tenantId") UUID tenantId) {

        return ResponseEntity.ok(folderService.renameFolder(userId, tenantId, id, req));
    }

    @DeleteMapping("/folders/{id}")
    public ResponseEntity<Void> deleteFolder(
            @PathVariable UUID id,
            @AuthenticationPrincipal(expression = "id")       UUID userId,
            @AuthenticationPrincipal(expression = "tenantId") UUID tenantId) {

        folderService.deleteFolder(userId, tenantId, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/folders/{id}/move")
    public ResponseEntity<FolderResponse> moveFolder(
            @PathVariable UUID id,
            @Valid @RequestBody MoveFolderRequest req,
            @AuthenticationPrincipal(expression = "id")       UUID userId,
            @AuthenticationPrincipal(expression = "tenantId") UUID tenantId) {

        return ResponseEntity.ok(folderService.moveFolder(userId, tenantId, id, req));
    }

    // ── Upload flow ───────────────────────────────────────────────────────────

    @PostMapping("/folders/{id}/upload-url")
    public ResponseEntity<PresignedUrlResponse> getUploadUrl(
            @PathVariable UUID id,
            @Valid @RequestBody UploadUrlRequest req,
            @AuthenticationPrincipal(expression = "id")       UUID userId,
            @AuthenticationPrincipal(expression = "tenantId") UUID tenantId) {

        return ResponseEntity.ok(fileNodeService.getUploadUrl(userId, tenantId, id, req));
    }

    @PostMapping("/folders/{id}/confirm-upload")
    public ResponseEntity<FileNodeResponse> confirmUpload(
            @PathVariable UUID id,
            @Valid @RequestBody ConfirmUploadRequest req,
            @AuthenticationPrincipal(expression = "id")       UUID userId,
            @AuthenticationPrincipal(expression = "tenantId") UUID tenantId) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(fileNodeService.confirmUpload(userId, tenantId, id, req));
    }

    // ── Folder permissions ────────────────────────────────────────────────────

    @PostMapping("/folders/{id}/permissions")
    public ResponseEntity<Void> grantPermission(
            @PathVariable UUID id,
            @Valid @RequestBody GrantPermissionRequest req,
            @AuthenticationPrincipal(expression = "id")       UUID userId,
            @AuthenticationPrincipal(expression = "tenantId") UUID tenantId) {

        folderService.grantPermission(userId, tenantId, id, req);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/folders/{id}/permissions/{userId}")
    public ResponseEntity<Void> revokePermission(
            @PathVariable("id")     UUID folderId,
            @PathVariable("userId") UUID targetUserId,
            @AuthenticationPrincipal(expression = "id")       UUID currentUserId,
            @AuthenticationPrincipal(expression = "tenantId") UUID tenantId) {

        folderService.revokePermission(currentUserId, tenantId, folderId, targetUserId);
        return ResponseEntity.noContent().build();
    }

    // ── File operations ───────────────────────────────────────────────────────

    @PutMapping("/files/{id}")
    public ResponseEntity<FileNodeResponse> renameFile(
            @PathVariable UUID id,
            @Valid @RequestBody RenameFileRequest req,
            @AuthenticationPrincipal(expression = "id")       UUID userId,
            @AuthenticationPrincipal(expression = "tenantId") UUID tenantId) {

        return ResponseEntity.ok(fileNodeService.renameFile(userId, tenantId, id, req));
    }

    @DeleteMapping("/files/{id}")
    public ResponseEntity<Void> deleteFile(
            @PathVariable UUID id,
            @AuthenticationPrincipal(expression = "id")       UUID userId,
            @AuthenticationPrincipal(expression = "tenantId") UUID tenantId) {

        fileNodeService.deleteFile(userId, tenantId, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/files/{id}/move")
    public ResponseEntity<FileNodeResponse> moveFile(
            @PathVariable UUID id,
            @Valid @RequestBody MoveFileRequest req,
            @AuthenticationPrincipal(expression = "id")       UUID userId,
            @AuthenticationPrincipal(expression = "tenantId") UUID tenantId) {

        return ResponseEntity.ok(fileNodeService.moveFile(userId, tenantId, id, req));
    }

    // ── Search ────────────────────────────────────────────────────────────────

    @GetMapping("/search")
    public ResponseEntity<SearchResponse> search(
            @RequestParam String q,
            @AuthenticationPrincipal(expression = "id")       UUID userId,
            @AuthenticationPrincipal(expression = "tenantId") UUID tenantId) {

        return ResponseEntity.ok(searchService.search(userId, tenantId, q));
    }
}
