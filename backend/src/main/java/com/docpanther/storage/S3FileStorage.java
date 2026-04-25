package com.docpanther.storage;

import com.docpanther.common.config.AppProperties;
import com.docpanther.common.storage.FileStorage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

@Service
@Primary
@Slf4j
@ConditionalOnProperty(name = "app.s3.local-mode", havingValue = "false", matchIfMissing = true)
public class S3FileStorage implements FileStorage {

    private final S3Presigner presigner;
    private final S3Client s3Client;
    private final String bucket;
    private final int presignExpiryMinutes;

    public S3FileStorage(
            S3Presigner presigner,
            S3Client s3Client,
            @Value("${app.s3.bucket:docpanther}") String bucket,
            AppProperties appProperties) {
        this.presigner = presigner;
        this.s3Client = s3Client;
        this.bucket = bucket;
        this.presignExpiryMinutes = appProperties.getS3().getPresignedUrlExpiryMinutes();
    }

    @Override
    public PresignedUpload generateUploadUrl(UUID tenantId, String objectKey, String mimeType, long maxSizeBytes) {
        // Content-Length is set on the signed request so S3 enforces exact-size PUT.
        // S3 presigned PUT does not support content-length-range; size is validated
        // server-side before this URL is issued.
        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .putObjectRequest(PutObjectRequest.builder()
                        .bucket(bucket)
                        .key(objectKey)
                        .contentType(mimeType)
                        .contentLength(maxSizeBytes)
                        .build())
                .signatureDuration(Duration.ofMinutes(presignExpiryMinutes))
                .build();

        String uploadUrl = presigner.presignPutObject(presignRequest).url().toString();
        return new PresignedUpload(uploadUrl, objectKey, objectKey);
    }

    @Override
    public String generateDownloadUrl(String objectKey, int expirySeconds) {
        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .getObjectRequest(GetObjectRequest.builder()
                        .bucket(bucket)
                        .key(objectKey)
                        .build())
                .signatureDuration(Duration.ofSeconds(expirySeconds))
                .build();
        return presigner.presignGetObject(presignRequest).url().toString();
    }

    @Override
    public void delete(String objectKey) {
        s3Client.deleteObject(DeleteObjectRequest.builder()
                .bucket(bucket)
                .key(objectKey)
                .build());
        log.debug("Deleted S3 object: {}", objectKey);
    }

    String buildObjectKey(UUID tenantId, UUID caseId, UUID itemId, String filename) {
        return String.format("%s/%s/%s/%s-%s", tenantId, caseId, itemId, UUID.randomUUID(), filename);
    }

    Instant presignExpiry() {
        return Instant.now().plus(Duration.ofMinutes(presignExpiryMinutes));
    }
}
