package com.docpanther.common.storage;

import java.util.List;
import java.util.UUID;

public interface FileStorage {
    PresignedUpload generateUploadUrl(UUID tenantId, String objectKey, String mimeType, long maxSizeBytes);
    String generateDownloadUrl(String objectKey, int expirySeconds);
    void delete(String objectKey);

    record PresignedUpload(String uploadUrl, String objectKey, String confirmToken) {}
}
