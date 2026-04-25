package com.docpanther.storage;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Base64;

/**
 * Serves presigned-style PUT/GET for local development (activated with app.s3.local-mode=true).
 * The browser PUTs the file here exactly like it would to a real S3 presigned URL.
 */
@RestController
@Slf4j
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.s3.local-mode", havingValue = "true")
public class LocalStorageController {

    private final LocalFileStorage localFileStorage;

    @PutMapping("/_local-storage/put/{encodedKey}")
    public ResponseEntity<Void> putObject(
            @PathVariable String encodedKey,
            @RequestParam(required = false) String token,
            InputStream body) throws IOException {

        String objectKey = new String(Base64.getUrlDecoder().decode(encodedKey));
        Path target = localFileStorage.resolveKey(objectKey);
        Files.createDirectories(target.getParent());
        Files.copy(body, target, StandardCopyOption.REPLACE_EXISTING);
        log.debug("Local storage PUT: key={} size={}bytes", objectKey, Files.size(target));
        return ResponseEntity.ok().build();
    }

    @GetMapping("/_local-storage/get/{encodedKey}")
    public ResponseEntity<byte[]> getObject(@PathVariable String encodedKey) throws IOException {
        String objectKey = new String(Base64.getUrlDecoder().decode(encodedKey));
        Path filePath = localFileStorage.resolveKey(objectKey);
        if (!Files.exists(filePath)) {
            return ResponseEntity.notFound().build();
        }
        byte[] bytes = Files.readAllBytes(filePath);
        String contentType = Files.probeContentType(filePath);
        return ResponseEntity.ok()
                .header("Content-Type", contentType != null ? contentType : "application/octet-stream")
                .body(bytes);
    }
}
