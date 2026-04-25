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
@PreAuthorize("permitAll()")
public class UploadPortalController {

    private final StorageService storageService;

    // GET /api/upload/{token}
    @GetMapping("/api/upload/{token}")
    public UploadPortalCaseResponse getCase(@PathVariable String token) {
        return storageService.getPortalCase(token);
    }

    // POST /api/upload/{token}/items/{itemId}/upload-url
    @PostMapping("/api/upload/{token}/items/{itemId}/upload-url")
    public UploadUrlResponse getUploadUrl(
            @PathVariable String token,
            @PathVariable UUID itemId,
            @Valid @RequestBody UploadUrlRequest request) {

        return storageService.generatePortalUploadUrl(token, itemId, request);
    }

    // POST /api/upload/{token}/items/{itemId}/confirm
    @PostMapping("/api/upload/{token}/items/{itemId}/confirm")
    @ResponseStatus(HttpStatus.CREATED)
    public DocumentResponse confirmUpload(
            @PathVariable String token,
            @PathVariable UUID itemId,
            @Valid @RequestBody ConfirmUploadRequest request) {

        return storageService.confirmPortalUpload(token, itemId, request);
    }

    // POST /api/upload/{token}/items/{itemId}/text
    @PostMapping("/api/upload/{token}/items/{itemId}/text")
    public ChecklistItemResponse submitText(
            @PathVariable String token,
            @PathVariable UUID itemId,
            @Valid @RequestBody TextSubmitRequest request) {

        return storageService.submitPortalText(token, itemId, request.value());
    }
}
