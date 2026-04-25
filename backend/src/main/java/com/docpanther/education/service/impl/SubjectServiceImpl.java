package com.docpanther.education.service.impl;

import com.docpanther.common.audit.AuditLogger;
import com.docpanther.education.SecurityHelper;
import com.docpanther.education.dto.request.AddSubjectRequest;
import com.docpanther.education.dto.request.AssignTeacherRequest;
import com.docpanther.education.dto.request.UpdateSubjectRequest;
import com.docpanther.education.dto.response.BatchSubjectResponse;
import com.docpanther.education.model.BatchSubject;
import com.docpanther.education.model.SubjectTeacher;
import com.docpanther.education.repository.BatchEnrollmentRepository;
import com.docpanther.education.repository.BatchRepository;
import com.docpanther.education.repository.BatchSubjectRepository;
import com.docpanther.education.repository.MaterialRepository;
import com.docpanther.education.repository.SubjectTeacherRepository;
import com.docpanther.education.service.SubjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SubjectServiceImpl implements SubjectService {

    private final BatchRepository batchRepo;
    private final BatchSubjectRepository subjectRepo;
    private final SubjectTeacherRepository teacherRepo;
    private final MaterialRepository materialRepo;
    private final AuditLogger auditLogger;

    @Override
    @Transactional(readOnly = true)
    public List<BatchSubjectResponse> listSubjects(UUID batchId) {
        UUID tenantId = SecurityHelper.currentTenantId();
        batchRepo.findByIdAndTenantId(batchId, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Batch not found"));
        return subjectRepo.findAllByBatchIdOrderBySortOrderAsc(batchId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public BatchSubjectResponse addSubject(UUID batchId, AddSubjectRequest req) {
        UUID userId = SecurityHelper.currentUserId();
        UUID tenantId = SecurityHelper.currentTenantId();

        batchRepo.findByIdAndTenantId(batchId, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Batch not found"));

        BatchSubject subject = BatchSubject.builder()
                .batchId(batchId)
                .name(req.name())
                .description(req.description())
                .sortOrder(req.order())
                .build();

        BatchSubject saved = subjectRepo.save(subject);
        auditLogger.log("SUBJECT_ADDED", "USER", userId, tenantId, null, null,
                Map.of("subjectId", saved.getId(), "batchId", batchId));
        return toResponse(saved);
    }

    @Override
    @Transactional
    public BatchSubjectResponse updateSubject(UUID id, UpdateSubjectRequest req) {
        UUID userId = SecurityHelper.currentUserId();
        UUID tenantId = SecurityHelper.currentTenantId();

        BatchSubject subject = loadSubjectForTenant(id, tenantId);
        subject.setName(req.name());
        subject.setDescription(req.description());

        BatchSubject saved = subjectRepo.save(subject);
        auditLogger.log("SUBJECT_UPDATED", "USER", userId, tenantId, null, null,
                Map.of("subjectId", id));
        return toResponse(saved);
    }

    @Override
    @Transactional
    public void deleteSubject(UUID id) {
        UUID userId = SecurityHelper.currentUserId();
        UUID tenantId = SecurityHelper.currentTenantId();

        BatchSubject subject = loadSubjectForTenant(id, tenantId);
        subjectRepo.delete(subject);
        auditLogger.log("SUBJECT_DELETED", "USER", userId, tenantId, null, null,
                Map.of("subjectId", id));
    }

    @Override
    @Transactional
    public void assignTeacher(UUID subjectId, AssignTeacherRequest req) {
        UUID userId = SecurityHelper.currentUserId();
        UUID tenantId = SecurityHelper.currentTenantId();

        loadSubjectForTenant(subjectId, tenantId);

        if (teacherRepo.existsBySubjectIdAndUserId(subjectId, req.userId())) {
            return; // idempotent
        }

        SubjectTeacher assignment = SubjectTeacher.builder()
                .subjectId(subjectId)
                .userId(req.userId())
                .primary(req.primary())
                .build();
        teacherRepo.save(assignment);
        auditLogger.log("TEACHER_ASSIGNED", "USER", userId, tenantId, null, null,
                Map.of("subjectId", subjectId, "teacherId", req.userId()));
    }

    @Override
    @Transactional
    public void removeTeacher(UUID subjectId, UUID teacherUserId) {
        UUID userId = SecurityHelper.currentUserId();
        UUID tenantId = SecurityHelper.currentTenantId();

        loadSubjectForTenant(subjectId, tenantId);
        teacherRepo.deleteBySubjectIdAndUserId(subjectId, teacherUserId);
        auditLogger.log("TEACHER_REMOVED", "USER", userId, tenantId, null, null,
                Map.of("subjectId", subjectId, "teacherId", teacherUserId));
    }

    private BatchSubject loadSubjectForTenant(UUID subjectId, UUID tenantId) {
        BatchSubject subject = subjectRepo.findById(subjectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subject not found"));
        batchRepo.findByIdAndTenantId(subject.getBatchId(), tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Subject not found"));
        return subject;
    }

    BatchSubjectResponse toResponse(BatchSubject s) {
        List<UUID> teacherIds = teacherRepo.findAllBySubjectId(s.getId()).stream()
                .map(SubjectTeacher::getUserId)
                .toList();
        long materialCount = materialRepo.countBySubjectId(s.getId());
        return new BatchSubjectResponse(s.getId(), s.getBatchId(), s.getName(), teacherIds, materialCount);
    }
}
