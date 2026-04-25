package com.docpanther.storage;

import com.docpanther.common.storage.FileStorage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Base64;
import java.util.UUID;

/**
 * Disk-backed FileStorage for local development. Activated via app.s3.local-mode=true.
 * Files are stored under /tmp/docpanther-uploads/ and served by LocalStorageController.
 */
@Service
@Primary
@Slf4j
@ConditionalOnProperty(name = "app.s3.local-mode", havingValue = "true")
public class LocalFileStorage implements FileStorage {

    private final String baseUrl;
    private final Path storageRoot;

    public LocalFileStorage(@Value("${app.s3.local-base-url:http://localhost:8080}") String baseUrl) {
        this.baseUrl = baseUrl;
        this.storageRoot = Paths.get(System.getProperty("java.io.tmpdir"), "docpanther-uploads");
        try {
            Files.createDirectories(storageRoot);
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot create local upload directory", e);
        }
        log.info("LocalFileStorage active — files stored at {}", storageRoot);
    }

    @Override
    public PresignedUpload generateUploadUrl(UUID tenantId, String objectKey, String mimeType, long maxSizeBytes) {
        String encodedKey = Base64.getUrlEncoder().withoutPadding().encodeToString(objectKey.getBytes());
        String token = UUID.randomUUID().toString().replace("-", "");
        String uploadUrl = baseUrl + "/_local-storage/put/" + encodedKey + "?token=" + token;
        log.debug("Local presigned PUT URL for key={}: {}", objectKey, uploadUrl);
        return new PresignedUpload(uploadUrl, token, objectKey);
    }

    @Override
    public String generateDownloadUrl(String objectKey, int expirySeconds) {
        String encodedKey = Base64.getUrlEncoder().withoutPadding().encodeToString(objectKey.getBytes());
        return baseUrl + "/_local-storage/get/" + encodedKey;
    }

    @Override
    public void delete(String objectKey) {
        Path filePath = resolveKey(objectKey);
        try {
            Files.deleteIfExists(filePath);
            log.debug("Deleted local file: {}", filePath);
        } catch (IOException e) {
            log.warn("Failed to delete local file {}: {}", filePath, e.getMessage());
        }
    }

    Path resolveKey(String objectKey) {
        // Sanitize: replace any path traversal characters
        String safe = objectKey.replace("..", "__").replace("\\", "/");
        return storageRoot.resolve(safe);
    }
}
