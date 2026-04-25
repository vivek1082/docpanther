package com.docpanther.cases.dto;

import com.docpanther.cases.model.Case;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

public record CaseResponse(
        UUID id,
        UUID folderId,
        String referenceNo,
        String customerName,
        String customerEmail,
        List<String> tags,
        String status,
        String storageMode,
        String uploadUrl,
        Instant expiresAt,
        int maxFileSizeMb,
        List<String> allowedFileTypes,
        int totalItems,
        int uploadedItems,
        Instant createdAt,
        Instant updatedAt
) {
    public static CaseResponse from(Case c, String tenantSlug, String uploadPortalDomain) {
        String uploadUrl = (tenantSlug != null)
            ? tenantSlug + "." + uploadPortalDomain + "/" + c.getUploadToken()
            : uploadPortalDomain + "/upload/" + c.getUploadToken();
        return new CaseResponse(
                c.getId(),
                c.getFolderId(),
                c.getReferenceNo(),
                c.getCustomerName(),
                c.getCustomerEmail(),
                c.getTags() != null ? Arrays.asList(c.getTags()) : List.of(),
                c.getStatus().name(),
                c.getStorageMode().name(),
                uploadUrl,
                c.getExpiresAt(),
                c.getMaxFileSizeMb(),
                c.getAllowedFileTypes() != null ? Arrays.asList(c.getAllowedFileTypes()) : List.of(),
                c.getTotalItems(),
                c.getUploadedItems(),
                c.getCreatedAt(),
                c.getUpdatedAt()
        );
    }
}
