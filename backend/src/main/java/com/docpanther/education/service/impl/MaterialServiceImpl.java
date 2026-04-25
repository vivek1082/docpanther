package com.docpanther.education.service.impl;

import com.docpanther.common.audit.AuditLogger;
import com.docpanther.common.mail.Mailer;
import com.docpanther.common.storage.FileStorage;
import com.docpanther.education.EducationGuard;
import com.docpanther.education.SecurityHelper;
import com.docpanther.education.dto.request.CreateMaterialRequest;
import com.docpanther.education.dto.request.RejectMaterialRequest;
import com.docpanther.education.dto.response.MaterialResponse;
import com.docpanther.education.dto.response.MaterialUploadResponse;
import com.docpanther.education.model.Material;
import com.docpanther.education.model.MaterialStatus;
import com.docpanther.education.repository.BatchEnrollmentRepository;
import com.docpanther.education.repository.BatchRepository;
import com.docpanther.education.repository.BatchSubjectRepository;
import com.docpanther.education.repository.MaterialRepository;
import com.docpanther.education.service.MaterialService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class MaterialServiceImpl implements MaterialService {

    private final MaterialRepository materialRepo;
    private final BatchSubjectRepository subjectRepo;
    private final BatchRepository batchRepo;
    private final BatchEnrollmentRepository enrollmentRepo;
    private final FileStorage fileStorage;
    private final Mailer mailer;
    private final AuditLogger auditLogger;
    private final EducationGuard educationGuard;

    @Override
    @Transactional(readOnly = true)
    public Page<MaterialResponse> listMaterials(UUID subjectId, Pageable pageable) {
        UUID tenantId = SecurityHelper.currentTenantId();
        educationGuard.requireEnabled(tenantId);
        return materialRepo.findAllBySubjectIdAndTenantId(subjectId, tenantId, pageable)
                .map(this::toResponse);
    }

    @Override
    @Transactional
    public MaterialUploadResponse createUploadRequest(CreateMaterialRequest req) {
        UUID userId = SecurityHelper.currentUserId();
        UUID tenantId = SecurityHelper.currentTenantId();
        educationGuard.requireEnabled(tenantId);

        var subject = subjectRepo.findById(req.subjectId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subject not found"));
        batchRepo.findByIdAndTenantId(subject.getBatchId(), tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subject not found"));

        UUID materialId = UUID.randomUUID();
        String s3Key = String.format("tenant/%s/subjects/%s/materials/%s/%s",
                tenantId, req.subjectId(), materialId, req.filename());

        FileStorage.PresignedUpload presigned = fileStorage.generateUploadUrl(
                tenantId, s3Key, req.contentType(), req.sizeBytes());

        Material material = Material.builder()
                .id(materialId)
                .subjectId(req.subjectId())
                .batchId(subject.getBatchId())
                .tenantId(tenantId)
                .title(req.title())
                .description(req.description())
                .uploadedBy(userId)
                .s3Key(presigned.objectKey())
                .filename(req.filename())
                .contentType(req.contentType())
                .sizeBytes(req.sizeBytes())
                .status(MaterialStatus.PENDING_REVIEW)
                .build();

        Material saved = materialRepo.save(material);
        auditLogger.log("MATERIAL_UPLOADED", "USER", userId, tenantId, null, null,
                Map.of("materialId", saved.getId(), "subjectId", req.subjectId()));

        return new MaterialUploadResponse(toResponse(saved), presigned.uploadUrl());
    }

    @Override
    @Transactional(readOnly = true)
    public MaterialResponse getMaterial(UUID id) {
        UUID tenantId = SecurityHelper.currentTenantId();
        return materialRepo.findByIdAndTenantId(id, tenantId)
                .map(this::toResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Material not found"));
    }

    @Override
    @Transactional
    public MaterialResponse approveMaterial(UUID id) {
        UUID userId = SecurityHelper.currentUserId();
        UUID tenantId = SecurityHelper.currentTenantId();

        Material material = materialRepo.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Material not found"));

        material.setStatus(MaterialStatus.APPROVED);
        material.setApprovedBy(userId);
        material.setApprovedAt(Instant.now());

        Material saved = materialRepo.save(material);
        auditLogger.log("MATERIAL_APPROVED", "USER", userId, tenantId, null, null,
                Map.of("materialId", id));

        sendApprovalEmailsAsync(saved);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public MaterialResponse rejectMaterial(UUID id, RejectMaterialRequest req) {
        UUID userId = SecurityHelper.currentUserId();
        UUID tenantId = SecurityHelper.currentTenantId();

        Material material = materialRepo.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Material not found"));

        material.setStatus(MaterialStatus.REJECTED);
        material.setRejectionNote(req.reason());

        Material saved = materialRepo.save(material);
        auditLogger.log("MATERIAL_REJECTED", "USER", userId, tenantId, null, null,
                Map.of("materialId", id, "reason", req.reason()));
        return toResponse(saved);
    }

    @Override
    @Transactional
    public void deleteMaterial(UUID id) {
        UUID userId = SecurityHelper.currentUserId();
        UUID tenantId = SecurityHelper.currentTenantId();

        Material material = materialRepo.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Material not found"));

        fileStorage.delete(material.getS3Key());
        materialRepo.delete(material);
        auditLogger.log("MATERIAL_DELETED", "USER", userId, tenantId, null, null,
                Map.of("materialId", id));
    }

    // Runs in a separate thread — does not block the approve response.
    // Requires a UserEmailLookup service in common/ to resolve student emails from IDs.
    // Until that interface exists, logs a warning and skips the blast.
    @Async
    protected void sendApprovalEmailsAsync(Material material) {
        try {
            List<UUID> studentIds = enrollmentRepo.findStudentIdsByBatchId(material.getBatchId());
            if (studentIds.isEmpty()) {
                return;
            }
            // TODO: replace with UserEmailLookup from common/ once available
            log.warn("Material approval email blast skipped: UserEmailLookup not yet in common/. " +
                    "batchId={} materialId={} studentCount={}", material.getBatchId(), material.getId(), studentIds.size());
        } catch (Exception e) {
            log.error("Failed to send material approval emails for materialId={}", material.getId(), e);
        }
    }

    private MaterialResponse toResponse(Material m) {
        return new MaterialResponse(
                m.getId(), m.getSubjectId(), m.getBatchId(),
                m.getTitle(), m.getDescription(), m.getS3Key(),
                m.getFilename(), m.getContentType(), m.getSizeBytes(),
                m.getStatus(), m.getUploadedBy(), m.getApprovedBy(),
                m.getApprovedAt(), m.getRejectionNote(), m.getCreatedAt());
    }
}
