package com.docpanther.education.service.impl;

import com.docpanther.common.audit.AuditLogger;
import com.docpanther.education.EducationGuard;
import com.docpanther.education.SecurityHelper;
import com.docpanther.education.dto.request.CreateBatchRequest;
import com.docpanther.education.dto.request.EnrollStudentsRequest;
import com.docpanther.education.dto.request.UpdateBatchRequest;
import com.docpanther.education.dto.response.BatchDetailResponse;
import com.docpanther.education.dto.response.BatchResponse;
import com.docpanther.education.dto.response.BatchSubjectResponse;
import com.docpanther.education.model.Batch;
import com.docpanther.education.model.BatchEnrollment;
import com.docpanther.education.model.BatchSubject;
import com.docpanther.education.model.BatchTemplateSubject;
import com.docpanther.education.model.SubjectTeacher;
import com.docpanther.education.repository.BatchEnrollmentRepository;
import com.docpanther.education.repository.BatchRepository;
import com.docpanther.education.repository.BatchSubjectRepository;
import com.docpanther.education.repository.BatchTemplateRepository;
import com.docpanther.education.repository.SubjectTeacherRepository;
import com.docpanther.education.service.BatchService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BatchServiceImpl implements BatchService {

    private final BatchRepository batchRepo;
    private final BatchTemplateRepository templateRepo;
    private final BatchSubjectRepository subjectRepo;
    private final SubjectTeacherRepository teacherRepo;
    private final BatchEnrollmentRepository enrollmentRepo;
    private final SubjectServiceImpl subjectService;
    private final AuditLogger auditLogger;
    private final EducationGuard educationGuard;

    @Override
    @Transactional(readOnly = true)
    public Page<BatchResponse> listBatches(Pageable pageable) {
        UUID tenantId = SecurityHelper.currentTenantId();
        educationGuard.requireEnabled(tenantId);
        return batchRepo.findAllByTenantId(tenantId, pageable).map(this::toSummaryResponse);
    }

    @Override
    @Transactional
    public BatchDetailResponse createBatch(CreateBatchRequest req) {
        UUID userId = SecurityHelper.currentUserId();
        UUID tenantId = SecurityHelper.currentTenantId();
        educationGuard.requireEnabled(tenantId);

        Batch batch = Batch.builder()
                .tenantId(tenantId)
                .name(req.name())
                .academicYear(req.academicYear())
                .description(req.description())
                .batchTemplateId(req.templateId())
                .createdBy(userId)
                .build();
        Batch saved = batchRepo.save(batch);

        if (req.templateId() != null) {
            applyTemplate(saved, req.templateId(), tenantId);
        }

        auditLogger.log("BATCH_CREATED", "USER", userId, tenantId, null, null,
                Map.of("batchId", saved.getId(), "name", saved.getName()));
        return toDetailResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public BatchDetailResponse getBatch(UUID id) {
        UUID tenantId = SecurityHelper.currentTenantId();
        Batch batch = batchRepo.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Batch not found"));
        return toDetailResponse(batch);
    }

    @Override
    @Transactional
    public BatchResponse updateBatch(UUID id, UpdateBatchRequest req) {
        UUID userId = SecurityHelper.currentUserId();
        UUID tenantId = SecurityHelper.currentTenantId();

        Batch batch = batchRepo.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Batch not found"));

        batch.setName(req.name());
        batch.setAcademicYear(req.academicYear());
        batch.setDescription(req.description());

        Batch saved = batchRepo.save(batch);
        auditLogger.log("BATCH_UPDATED", "USER", userId, tenantId, null, null,
                Map.of("batchId", id));
        return toSummaryResponse(saved);
    }

    @Override
    @Transactional
    public void enrollStudents(UUID batchId, EnrollStudentsRequest req) {
        UUID userId = SecurityHelper.currentUserId();
        UUID tenantId = SecurityHelper.currentTenantId();

        batchRepo.findByIdAndTenantId(batchId, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Batch not found"));

        List<BatchEnrollment> enrollments = new ArrayList<>();
        for (UUID studentId : req.studentIds()) {
            if (!enrollmentRepo.existsByBatchIdAndStudentId(batchId, studentId)) {
                enrollments.add(BatchEnrollment.builder()
                        .batchId(batchId)
                        .studentId(studentId)
                        .build());
            }
        }
        enrollmentRepo.saveAll(enrollments);
        auditLogger.log("STUDENT_ENROLLED", "USER", userId, tenantId, null, null,
                Map.of("batchId", batchId, "count", enrollments.size()));
    }

    @Override
    @Transactional
    public void unenrollStudent(UUID batchId, UUID studentId) {
        UUID userId = SecurityHelper.currentUserId();
        UUID tenantId = SecurityHelper.currentTenantId();

        batchRepo.findByIdAndTenantId(batchId, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Batch not found"));

        enrollmentRepo.deleteByBatchIdAndStudentId(batchId, studentId);
        auditLogger.log("STUDENT_UNENROLLED", "USER", userId, tenantId, null, null,
                Map.of("batchId", batchId, "studentId", studentId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<BatchResponse> getEnrolledBatches() {
        UUID studentId = SecurityHelper.currentUserId();
        UUID tenantId = SecurityHelper.currentTenantId();

        List<UUID> batchIds = enrollmentRepo.findAllByStudentId(studentId).stream()
                .map(BatchEnrollment::getBatchId)
                .toList();
        if (batchIds.isEmpty()) {
            return List.of();
        }
        return batchRepo.findAllByIdInAndTenantId(batchIds, tenantId).stream()
                .map(this::toSummaryResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public BatchDetailResponse getStudentBatchDetail(UUID batchId) {
        UUID studentId = SecurityHelper.currentUserId();
        UUID tenantId = SecurityHelper.currentTenantId();

        if (!enrollmentRepo.existsByBatchIdAndStudentId(batchId, studentId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not enrolled in this batch");
        }
        Batch batch = batchRepo.findByIdAndTenantId(batchId, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Batch not found"));
        return toDetailResponse(batch);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private void applyTemplate(Batch batch, UUID templateId, UUID tenantId) {
        templateRepo.findByIdAndTenantId(templateId, tenantId).ifPresent(template -> {
            List<BatchTemplateSubject> templateSubjects = template.getSubjects();
            if (templateSubjects == null || templateSubjects.isEmpty()) {
                return;
            }
            for (BatchTemplateSubject ts : templateSubjects) {
                BatchSubject subject = BatchSubject.builder()
                        .batchId(batch.getId())
                        .name(ts.getName())
                        .description(ts.getDescription())
                        .sortOrder(ts.getSortOrder())
                        .build();
                BatchSubject saved = subjectRepo.save(subject);

                if (ts.getDefaultTeacherId() != null) {
                    teacherRepo.save(SubjectTeacher.builder()
                            .subjectId(saved.getId())
                            .userId(ts.getDefaultTeacherId())
                            .primary(true)
                            .build());
                }
            }
        });
    }

    private BatchResponse toSummaryResponse(Batch b) {
        long enrollmentCount = enrollmentRepo.countByBatchId(b.getId());
        long subjectCount = subjectRepo.countByBatchId(b.getId());
        return new BatchResponse(b.getId(), b.getTenantId(), b.getName(), b.getAcademicYear(),
                b.getBatchTemplateId(), enrollmentCount, subjectCount, b.getCreatedAt());
    }

    private BatchDetailResponse toDetailResponse(Batch b) {
        long enrollmentCount = enrollmentRepo.countByBatchId(b.getId());
        List<BatchSubjectResponse> subjects = subjectRepo.findAllByBatchIdOrderBySortOrderAsc(b.getId()).stream()
                .map(subjectService::toResponse)
                .toList();
        // open cases integration requires common/CaseQueryService — returns empty until wired
        return new BatchDetailResponse(b.getId(), b.getTenantId(), b.getName(), b.getAcademicYear(),
                b.getBatchTemplateId(), enrollmentCount, subjects.size(), b.getCreatedAt(),
                subjects, List.of());
    }
}
