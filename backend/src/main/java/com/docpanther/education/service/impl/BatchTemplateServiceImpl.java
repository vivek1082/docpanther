package com.docpanther.education.service.impl;

import com.docpanther.common.audit.AuditLogger;
import com.docpanther.education.SecurityHelper;
import com.docpanther.education.dto.request.CreateBatchTemplateRequest;
import com.docpanther.education.dto.request.UpdateBatchTemplateRequest;
import com.docpanther.education.dto.response.BatchTemplateResponse;
import com.docpanther.education.dto.response.BatchTemplateSubjectResponse;
import com.docpanther.education.model.BatchTemplate;
import com.docpanther.education.model.BatchTemplateSubject;
import com.docpanther.education.repository.BatchTemplateRepository;
import com.docpanther.education.service.BatchTemplateService;
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
public class BatchTemplateServiceImpl implements BatchTemplateService {

    private final BatchTemplateRepository templateRepo;
    private final AuditLogger auditLogger;

    @Override
    @Transactional(readOnly = true)
    public Page<BatchTemplateResponse> listTemplates(Pageable pageable) {
        UUID tenantId = SecurityHelper.currentTenantId();
        return templateRepo.findAllByTenantId(tenantId, pageable).map(this::toResponse);
    }

    @Override
    @Transactional
    public BatchTemplateResponse createTemplate(CreateBatchTemplateRequest req) {
        UUID userId = SecurityHelper.currentUserId();
        UUID tenantId = SecurityHelper.currentTenantId();

        var template = BatchTemplate.builder()
                .tenantId(tenantId)
                .name(req.name())
                .description(req.description())
                .createdBy(userId)
                .subjects(new ArrayList<>())
                .build();

        if (req.subjects() != null) {
            List<BatchTemplateSubject> subjects = new ArrayList<>();
            for (int i = 0; i < req.subjects().size(); i++) {
                var s = req.subjects().get(i);
                subjects.add(BatchTemplateSubject.builder()
                        .template(template)
                        .name(s.name())
                        .description(s.description())
                        .sortOrder(s.order() > 0 ? s.order() : i)
                        .defaultTeacherId(s.defaultTeacherId())
                        .build());
            }
            template.setSubjects(subjects);
        }

        BatchTemplate saved = templateRepo.save(template);
        auditLogger.log("BATCH_TEMPLATE_CREATED", "USER", userId, tenantId, null, null,
                Map.of("templateId", saved.getId(), "name", saved.getName()));
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public BatchTemplateResponse getTemplate(UUID id) {
        UUID tenantId = SecurityHelper.currentTenantId();
        return templateRepo.findByIdAndTenantId(id, tenantId)
                .map(this::toResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Template not found"));
    }

    @Override
    @Transactional
    public BatchTemplateResponse updateTemplate(UUID id, UpdateBatchTemplateRequest req) {
        UUID userId = SecurityHelper.currentUserId();
        UUID tenantId = SecurityHelper.currentTenantId();

        BatchTemplate template = templateRepo.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Template not found"));

        template.setName(req.name());
        template.setDescription(req.description());

        BatchTemplate saved = templateRepo.save(template);
        auditLogger.log("BATCH_TEMPLATE_UPDATED", "USER", userId, tenantId, null, null,
                Map.of("templateId", id));
        return toResponse(saved);
    }

    @Override
    @Transactional
    public void deleteTemplate(UUID id) {
        UUID userId = SecurityHelper.currentUserId();
        UUID tenantId = SecurityHelper.currentTenantId();

        BatchTemplate template = templateRepo.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Template not found"));

        templateRepo.delete(template);
        auditLogger.log("BATCH_TEMPLATE_DELETED", "USER", userId, tenantId, null, null,
                Map.of("templateId", id));
    }

    private BatchTemplateResponse toResponse(BatchTemplate t) {
        List<BatchTemplateSubjectResponse> subjects = t.getSubjects() == null ? List.of() :
                t.getSubjects().stream()
                        .map(s -> new BatchTemplateSubjectResponse(
                                s.getId(), t.getId(), s.getName(), s.getDescription(),
                                s.getSortOrder(), s.getDefaultTeacherId()))
                        .toList();
        return new BatchTemplateResponse(
                t.getId(), t.getTenantId(), t.getName(), t.getDescription(),
                subjects.size(), subjects, t.getCreatedAt());
    }
}
