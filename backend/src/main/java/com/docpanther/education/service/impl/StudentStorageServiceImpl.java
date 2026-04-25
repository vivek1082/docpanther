package com.docpanther.education.service.impl;

import com.docpanther.common.audit.AuditLogger;
import com.docpanther.common.storage.FileStorage;
import com.docpanther.education.EducationGuard;
import com.docpanther.education.SecurityHelper;
import com.docpanther.education.dto.request.ConfirmUploadRequest;
import com.docpanther.education.dto.request.StudentUploadUrlRequest;
import com.docpanther.education.dto.response.StudentFileResponse;
import com.docpanther.education.dto.response.StudentStorageResponse;
import com.docpanther.education.dto.response.UploadUrlResponse;
import com.docpanther.education.model.StudentFile;
import com.docpanther.education.model.StudentStorage;
import com.docpanther.education.repository.StudentFileRepository;
import com.docpanther.education.repository.StudentStorageRepository;
import com.docpanther.education.service.StudentStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StudentStorageServiceImpl implements StudentStorageService {

    private final StudentStorageRepository storageRepo;
    private final StudentFileRepository fileRepo;
    private final FileStorage fileStorage;
    private final AuditLogger auditLogger;
    private final EducationGuard educationGuard;

    private static final long DEFAULT_QUOTA_BYTES = 5_368_709_120L; // 5 GB

    @Override
    @Transactional(readOnly = true)
    public StudentStorageResponse getStudentStorage() {
        UUID userId = SecurityHelper.currentUserId();
        UUID tenantId = SecurityHelper.currentTenantId();
        educationGuard.requireEnabled(tenantId);

        StudentStorage storage = loadOrCreate(userId, tenantId);
        return new StudentStorageResponse(userId, tenantId, storage.getUsedBytes(), storage.getQuotaBytes());
    }

    @Override
    @Transactional
    public UploadUrlResponse getUploadUrl(StudentUploadUrlRequest req) {
        UUID userId = SecurityHelper.currentUserId();
        UUID tenantId = SecurityHelper.currentTenantId();
        educationGuard.requireEnabled(tenantId);

        StudentStorage storage = loadOrCreate(userId, tenantId);
        if (storage.getUsedBytes() + req.sizeBytes() > storage.getQuotaBytes()) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Storage quota exceeded");
        }

        String s3Key = String.format("tenant/%s/students/%s/%s", tenantId, userId, req.filename());
        FileStorage.PresignedUpload presigned = fileStorage.generateUploadUrl(
                tenantId, s3Key, req.contentType(), req.sizeBytes());

        return new UploadUrlResponse(presigned.uploadUrl(), presigned.confirmToken(), presigned.objectKey());
    }

    @Override
    @Transactional
    public StudentFileResponse confirmUpload(ConfirmUploadRequest req) {
        UUID userId = SecurityHelper.currentUserId();
        UUID tenantId = SecurityHelper.currentTenantId();

        StudentStorage storage = loadOrCreate(userId, tenantId);
        if (storage.getUsedBytes() + req.sizeBytes() > storage.getQuotaBytes()) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Storage quota exceeded");
        }

        String s3Key = String.format("tenant/%s/students/%s/%s", tenantId, userId, req.filename());

        StudentFile file = StudentFile.builder()
                .userId(userId)
                .tenantId(tenantId)
                .filename(req.filename())
                .contentType(req.contentType())
                .s3Key(s3Key)
                .sizeBytes(req.sizeBytes())
                .build();
        StudentFile saved = fileRepo.save(file);

        storageRepo.incrementUsedBytes(userId, tenantId, req.sizeBytes());
        auditLogger.log("STUDENT_FILE_UPLOADED", "USER", userId, tenantId, null, null,
                Map.of("fileId", saved.getId(), "sizeBytes", req.sizeBytes()));

        return toFileResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<StudentFileResponse> listFiles(Pageable pageable) {
        UUID userId = SecurityHelper.currentUserId();
        UUID tenantId = SecurityHelper.currentTenantId();
        return fileRepo.findAllByUserIdAndTenantId(userId, tenantId, pageable).map(this::toFileResponse);
    }

    @Override
    @Transactional
    public void deleteFile(UUID id) {
        UUID userId = SecurityHelper.currentUserId();
        UUID tenantId = SecurityHelper.currentTenantId();

        StudentFile file = fileRepo.findByIdAndUserIdAndTenantId(id, userId, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found"));

        fileStorage.delete(file.getS3Key());
        fileRepo.delete(file);
        storageRepo.decrementUsedBytes(userId, tenantId, file.getSizeBytes());
        auditLogger.log("STUDENT_FILE_DELETED", "USER", userId, tenantId, null, null,
                Map.of("fileId", id, "sizeBytes", file.getSizeBytes()));
    }

    private StudentStorage loadOrCreate(UUID userId, UUID tenantId) {
        var storageId = new StudentStorage.StudentStorageId(userId, tenantId);
        return storageRepo.findById(storageId).orElseGet(() -> {
            StudentStorage fresh = StudentStorage.builder()
                    .id(storageId)
                    .quotaBytes(DEFAULT_QUOTA_BYTES)
                    .usedBytes(0L)
                    .build();
            return storageRepo.save(fresh);
        });
    }

    private StudentFileResponse toFileResponse(StudentFile f) {
        return new StudentFileResponse(
                f.getId(), f.getUserId(), f.getFilename(),
                f.getContentType(), f.getS3Key(), f.getSizeBytes(), f.getUploadedAt());
    }
}
