package com.docpanther.storage;

import com.docpanther.storage.dto.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class StorageController {

    private final StorageService storageService;

    // POST /api/cases/{id}/items/{itemId}/upload-url
    @PostMapping("/api/cases/{id}/items/{itemId}/upload-url")
    public UploadUrlResponse getUploadUrl(
            @PathVariable UUID id,
            @PathVariable UUID itemId,
            @Valid @RequestBody UploadUrlRequest request) {

        UUID userId = SecurityUtils.currentUserId();
        UUID tenantId = SecurityUtils.currentTenantId();
        return storageService.generateAdminUploadUrl(id, itemId, userId, tenantId, request);
    }

    // POST /api/cases/{id}/items/{itemId}/confirm-upload
    @PostMapping("/api/cases/{id}/items/{itemId}/confirm-upload")
    @ResponseStatus(HttpStatus.CREATED)
    public DocumentResponse confirmUpload(
            @PathVariable UUID id,
            @PathVariable UUID itemId,
            @Valid @RequestBody ConfirmUploadRequest request) {

        UUID userId = SecurityUtils.currentUserId();
        UUID tenantId = SecurityUtils.currentTenantId();
        return storageService.confirmAdminUpload(id, itemId, userId, tenantId, request);
    }

    // DELETE /api/documents/{docId}
    @DeleteMapping("/api/documents/{docId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDocument(@PathVariable UUID docId) {
        UUID userId = SecurityUtils.currentUserId();
        UUID tenantId = SecurityUtils.currentTenantId();
        storageService.deleteDocument(docId, userId, tenantId);
    }
}
