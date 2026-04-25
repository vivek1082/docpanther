package com.docpanther.checklist;

import com.docpanther.checklist.dto.ChecklistItemResponse;
import com.docpanther.checklist.dto.TemplateDetailResponse;
import com.docpanther.checklist.dto.TemplateItemRequest;
import com.docpanther.checklist.dto.TemplateRequest;
import com.docpanther.checklist.dto.TemplateResponse;
import com.docpanther.checklist.dto.TemplateUpdateRequest;
import com.docpanther.checklist.model.ChecklistItem;
import com.docpanther.checklist.model.ItemStatus;
import com.docpanther.checklist.model.Template;
import com.docpanther.checklist.model.TemplateItem;
import com.docpanther.checklist.repository.ChecklistItemRepository;
import com.docpanther.checklist.repository.TemplateRepository;
import com.docpanther.common.audit.AuditLogger;
import com.docpanther.common.cases.CaseService;
import com.docpanther.common.exception.ApiException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class TemplateServiceImpl implements TemplateService {

    private final TemplateRepository templateRepo;
    private final ChecklistItemRepository itemRepo;
    private final CaseService caseService;
    private final AuditLogger auditLogger;

    @Override
    @Transactional(readOnly = true)
    public List<TemplateResponse> listTemplates() {
        UUID tenantId = SecurityUtils.currentTenantId();
        return templateRepo.findAllByTenantIdOrIsGlobalTrueOrderByCreatedAtDesc(tenantId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public TemplateResponse createTemplate(TemplateRequest req) {
        UUID userId = SecurityUtils.currentUserId();
        UUID tenantId = SecurityUtils.currentTenantId();

        Template template = Template.builder()
                .name(req.name())
                .tag(req.tag())
                .tenantId(tenantId)
                .createdBy(userId)
                .isGlobal(false)
                .build();

        if (req.items() != null) {
            for (TemplateItemRequest itemReq : req.items()) {
                TemplateItem ti = buildTemplateItem(itemReq, template);
                template.getItems().add(ti);
            }
        }

        template = templateRepo.save(template);
        auditLogger.log("TEMPLATE_CREATED", "ADMIN", userId, tenantId, null, null,
                Map.of("name", template.getName()));
        return toResponse(template);
    }

    @Override
    @Transactional(readOnly = true)
    public TemplateDetailResponse getTemplate(UUID id) {
        Template template = findForCurrentTenant(id);
        return toDetailResponse(template);
    }

    @Override
    @Transactional
    public TemplateResponse updateTemplate(UUID id, TemplateUpdateRequest req) {
        Template template = findForCurrentTenant(id);

        if (req.name() != null) template.setName(req.name());
        if (req.tag() != null) template.setTag(req.tag());

        template = templateRepo.save(template);
        auditLogger.log("TEMPLATE_UPDATED", "ADMIN", SecurityUtils.currentUserId(),
                SecurityUtils.currentTenantId(), null, null, Map.of("templateId", id.toString()));
        return toResponse(template);
    }

    @Override
    @Transactional
    public void deleteTemplate(UUID id) {
        Template template = findForCurrentTenant(id);
        templateRepo.delete(template);
        auditLogger.log("TEMPLATE_DELETED", "ADMIN", SecurityUtils.currentUserId(),
                SecurityUtils.currentTenantId(), null, null, Map.of("templateId", id.toString()));
    }

    @Override
    @Transactional
    public List<ChecklistItemResponse> applyTemplate(UUID templateId, UUID caseId) {
        Template template = findForCurrentTenant(templateId);

        List<ChecklistItem> created = template.getItems().stream()
                .map(ti -> ChecklistItem.builder()
                        .caseId(caseId)
                        .name(ti.getName())
                        .description(ti.getDescription())
                        .type(ti.getType())
                        .required(ti.isRequired())
                        .allowMultiple(ti.isAllowMultiple())
                        .maxFileSizeMb(ti.getMaxFileSizeMb())
                        .allowedFileTypes(ti.getAllowedFileTypes() != null
                                ? ti.getAllowedFileTypes().clone() : new String[0])
                        .sortOrder(ti.getSortOrder())
                        .status(ItemStatus.PENDING)
                        .build())
                .map(itemRepo::save)
                .toList();

        UUID userId = SecurityUtils.currentUserId();
        UUID tenantId = SecurityUtils.currentTenantId();
        auditLogger.log("TEMPLATE_APPLIED", "ADMIN", userId, tenantId, caseId, null,
                Map.of("templateId", templateId.toString(), "itemsCreated", created.size()));

        caseService.recalculateStatus(caseId);

        return created.stream()
                .map(this::toChecklistItemResponse)
                .toList();
    }

    // ── Helpers ───────────────────────────────────────────────────────

    private Template findForCurrentTenant(UUID id) {
        UUID tenantId = SecurityUtils.currentTenantId();
        return templateRepo.findById(id)
                .filter(t -> Boolean.TRUE.equals(t.getIsGlobal())
                        || (tenantId != null && tenantId.equals(t.getTenantId()))
                        || (tenantId == null && t.getTenantId() == null))
                .orElseThrow(() -> ApiException.notFound("Template"));
    }

    private TemplateItem buildTemplateItem(TemplateItemRequest req, Template template) {
        return TemplateItem.builder()
                .template(template)
                .name(req.name())
                .description(req.description())
                .type(req.type())
                .required(req.required())
                .allowMultiple(req.allowMultiple())
                .maxFileSizeMb(req.maxFileSizeMb())
                .allowedFileTypes(toArray(req.allowedFileTypes()))
                .sortOrder(req.sortOrder())
                .build();
    }

    private TemplateResponse toResponse(Template t) {
        return new TemplateResponse(
                t.getId(),
                t.getName(),
                t.getTag(),
                Boolean.TRUE.equals(t.getIsGlobal()),
                t.getItems().size(),
                t.getCreatedAt()
        );
    }

    private TemplateDetailResponse toDetailResponse(Template t) {
        List<ChecklistItemResponse> items = t.getItems().stream()
                .map(ti -> toChecklistItemResponse(ti))
                .toList();
        return new TemplateDetailResponse(
                t.getId(),
                t.getName(),
                t.getTag(),
                Boolean.TRUE.equals(t.getIsGlobal()),
                t.getItems().size(),
                t.getCreatedAt(),
                items
        );
    }

    private ChecklistItemResponse toChecklistItemResponse(TemplateItem ti) {
        return new ChecklistItemResponse(
                ti.getId(),
                null,
                ti.getName(),
                ti.getDescription(),
                ti.getType(),
                ti.isRequired(),
                ti.isAllowMultiple(),
                ItemStatus.PENDING,
                null,
                ti.getMaxFileSizeMb(),
                Arrays.asList(ti.getAllowedFileTypes() != null ? ti.getAllowedFileTypes() : new String[0]),
                ti.getSortOrder(),
                List.of(),
                ti.getCreatedAt()
        );
    }

    private ChecklistItemResponse toChecklistItemResponse(ChecklistItem item) {
        return new ChecklistItemResponse(
                item.getId(),
                item.getCaseId(),
                item.getName(),
                item.getDescription(),
                item.getType(),
                item.isRequired(),
                item.isAllowMultiple(),
                item.getStatus(),
                item.getTextValue(),
                item.getMaxFileSizeMb(),
                Arrays.asList(item.getAllowedFileTypes() != null ? item.getAllowedFileTypes() : new String[0]),
                item.getSortOrder(),
                List.of(),
                item.getCreatedAt()
        );
    }

    private String[] toArray(java.util.List<String> list) {
        if (list == null || list.isEmpty()) return new String[0];
        return list.toArray(new String[0]);
    }
}
