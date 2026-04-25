package com.docpanther.checklist;

import com.docpanther.checklist.dto.ChecklistItemRequest;
import com.docpanther.checklist.dto.ChecklistItemResponse;
import com.docpanther.checklist.dto.ChecklistItemUpdateRequest;
import com.docpanther.checklist.dto.DocumentResponse;
import com.docpanther.checklist.model.ChecklistItem;
import com.docpanther.checklist.model.Document;
import com.docpanther.checklist.model.ItemStatus;
import com.docpanther.checklist.repository.ChecklistItemRepository;
import com.docpanther.checklist.repository.DocumentRepository;
import com.docpanther.common.audit.AuditLogger;
import com.docpanther.common.cases.CaseService;
import com.docpanther.common.exception.ApiException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChecklistItemServiceImpl
        implements ChecklistItemService, com.docpanther.common.checklist.ChecklistService {

    private final ChecklistItemRepository itemRepo;
    private final DocumentRepository documentRepo;
    private final CaseService caseService;
    private final AuditLogger auditLogger;

    // ── Internal service methods ──────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<ChecklistItemResponse> getItems(UUID caseId) {
        List<ChecklistItem> items = itemRepo.findAllByCaseIdOrderBySortOrderAsc(caseId);
        return toResponses(items);
    }

    @Override
    @Transactional
    public ChecklistItemResponse addItem(UUID caseId, ChecklistItemRequest req) {
        ChecklistItem item = ChecklistItem.builder()
                .caseId(caseId)
                .name(req.name())
                .description(req.description())
                .type(req.type())
                .required(req.required())
                .allowMultiple(req.allowMultiple())
                .maxFileSizeMb(req.maxFileSizeMb())
                .allowedFileTypes(toArray(req.allowedFileTypes()))
                .sortOrder(req.sortOrder())
                .status(ItemStatus.PENDING)
                .build();
        item = itemRepo.saveAndFlush(item);

        UUID userId = SecurityUtils.currentUserId();
        UUID tenantId = SecurityUtils.currentTenantId();
        auditLogger.log("CHECKLIST_ITEM_CREATED", "ADMIN", userId, tenantId, caseId, item.getId(),
                Map.of("name", item.getName(), "type", item.getType().name()));

        caseService.recalculateStatus(caseId);
        return toResponse(item, List.of());
    }

    @Override
    @Transactional
    public ChecklistItemResponse updateItem(UUID caseId, UUID itemId, ChecklistItemUpdateRequest req) {
        ChecklistItem item = itemRepo.findByIdAndCaseId(itemId, caseId)
                .orElseThrow(() -> ApiException.notFound("ChecklistItem"));

        UUID userId = SecurityUtils.currentUserId();
        UUID tenantId = SecurityUtils.currentTenantId();

        if (req.status() != null) {
            ItemStatus newStatus = ItemStatus.valueOf(req.status());
            validateStatusTransition(item, newStatus);
            String previousStatus = item.getStatus().name();
            item.setStatus(newStatus);

            String action = newStatus == ItemStatus.APPROVED
                    ? "CHECKLIST_FILE_APPROVED"
                    : "CHECKLIST_FILE_REJECTED";
            auditLogger.log(action, "ADMIN", userId, tenantId, caseId, itemId,
                    Map.of("previousStatus", previousStatus));

            caseService.recalculateStatus(caseId);
        }

        if (req.name() != null) {
            item.setName(req.name());
        }
        if (req.required() != null) {
            item.setRequired(req.required());
        }

        item = itemRepo.saveAndFlush(item);

        if (req.name() != null || req.required() != null) {
            auditLogger.log("CHECKLIST_ITEM_UPDATED", "ADMIN", userId, tenantId, caseId, itemId,
                    Map.of("name", item.getName()));
        }

        List<Document> docs = documentRepo.findAllByChecklistItemIdIn(List.of(item.getId()));
        return toResponse(item, docs);
    }

    @Override
    @Transactional
    public void deleteItem(UUID caseId, UUID itemId) {
        ChecklistItem item = itemRepo.findByIdAndCaseId(itemId, caseId)
                .orElseThrow(() -> ApiException.notFound("ChecklistItem"));
        itemRepo.delete(item);

        UUID userId = SecurityUtils.currentUserId();
        UUID tenantId = SecurityUtils.currentTenantId();
        auditLogger.log("CHECKLIST_ITEM_DELETED", "ADMIN", userId, tenantId, caseId, itemId,
                Map.of("name", item.getName()));

        caseService.recalculateStatus(caseId);
    }

    // ── common.checklist.ChecklistService ────────────────────────────

    @Override
    @Transactional
    public void markUploaded(UUID itemId) {
        ChecklistItem item = itemRepo.findById(itemId)
                .orElseThrow(() -> ApiException.notFound("ChecklistItem"));

        if (item.getStatus() == ItemStatus.APPROVED) {
            throw ApiException.conflict("Cannot re-upload an approved item");
        }

        item.setStatus(ItemStatus.UPLOADED);
        itemRepo.saveAndFlush(item);

        auditLogger.log("FILE_UPLOADED", "CUSTOMER", null, null, item.getCaseId(), item.getId(),
                Map.of());

        caseService.recalculateStatus(item.getCaseId());
    }

    @Override
    public void recalculateCase(UUID caseId) {
        caseService.recalculateStatus(caseId);
    }

    // ── Mapping helpers ───────────────────────────────────────────────

    private List<ChecklistItemResponse> toResponses(List<ChecklistItem> items) {
        if (items.isEmpty()) return List.of();

        List<UUID> itemIds = items.stream().map(ChecklistItem::getId).toList();
        List<Document> allDocs = documentRepo.findAllByChecklistItemIdIn(itemIds);
        Map<UUID, List<Document>> docsByItem = allDocs.stream()
                .collect(Collectors.groupingBy(Document::getChecklistItemId));

        return items.stream()
                .map(item -> toResponse(item, docsByItem.getOrDefault(item.getId(), List.of())))
                .toList();
    }

    private ChecklistItemResponse toResponse(ChecklistItem item, List<Document> docs) {
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
                docs.stream().map(this::toDocResponse).toList(),
                item.getCreatedAt()
        );
    }

    private DocumentResponse toDocResponse(Document doc) {
        return new DocumentResponse(
                doc.getId(),
                doc.getChecklistItemId(),
                doc.getCaseId(),
                doc.getFilename(),
                doc.getContentType(),
                doc.getSizeBytes(),
                doc.getUploadedAt()
        );
    }

    private void validateStatusTransition(ChecklistItem item, ItemStatus newStatus) {
        if (item.getStatus() != ItemStatus.UPLOADED) {
            throw ApiException.badRequest(
                    "Can only approve/reject items in UPLOADED status, current: " + item.getStatus());
        }
    }

    private String[] toArray(List<String> list) {
        if (list == null || list.isEmpty()) return new String[0];
        return list.toArray(new String[0]);
    }
}
