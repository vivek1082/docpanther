package com.docpanther.cases;

import com.docpanther.cases.dto.*;
import com.docpanther.cases.model.Case;
import com.docpanther.cases.model.CaseStatus;
import com.docpanther.cases.model.StorageMode;
import com.docpanther.common.audit.AuditLogger;
import com.docpanther.common.exception.ApiException;
import com.docpanther.common.mail.Mailer;
import com.docpanther.common.storage.FileStorage;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CaseServiceImpl implements com.docpanther.common.cases.CaseService {

    private final CaseRepository caseRepository;
    private final AuditLogger auditLogger;
    private final Mailer mailer;
    private final FileStorage fileStorage;
    private final JdbcTemplate jdbcTemplate;
    private final Optional<CaseDocumentPort> documentPort;

    @Value("${app.upload-portal-domain:docpanther.com}")
    private String uploadPortalDomain;

    // ── CRUD ────────────────────────────────────────────────────────

    public CaseResponse create(CaseRequest req, UUID userId, UUID tenantId, String tenantSlug) {
        StorageMode mode = req.storageMode() != null
                ? StorageMode.valueOf(req.storageMode())
                : StorageMode.STRUCTURED;

        Case c = Case.builder()
                .tenantId(tenantId)
                .createdBy(userId)
                .folderId(req.folderId())
                .referenceNo(req.referenceNo())
                .customerName(req.customerName())
                .customerEmail(req.customerEmail())
                .tags(req.tags() != null ? req.tags().toArray(new String[0]) : new String[0])
                .status(CaseStatus.PENDING)
                .storageMode(mode)
                .uploadToken(TokenGenerator.generate())
                .expiresAt(req.expiresAt())
                .maxFileSizeMb(req.maxFileSizeMb() != null ? req.maxFileSizeMb() : 25)
                .allowedFileTypes(req.allowedFileTypes() != null
                        ? req.allowedFileTypes().toArray(new String[0]) : new String[0])
                .build();

        Case saved = caseRepository.save(c);

        auditLogger.log("CASE_CREATED", "ADMIN", userId,
                tenantId, saved.getId(), null,
                Map.of("referenceNo", saved.getReferenceNo(), "customerEmail", saved.getCustomerEmail()));

        return CaseResponse.from(saved, tenantSlug, uploadPortalDomain);
    }

    @Transactional(readOnly = true)
    public PagedResponse<CaseResponse> list(UUID folderId, CaseStatus status, int page, int size,
                                            UUID userId, UUID tenantId, String tenantSlug) {
        org.springframework.data.domain.Pageable pageable =
                PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Case> result;

        if (folderId != null && status != null) {
            result = caseRepository.findByTenantIdAndFolderIdAndStatus(tenantId, folderId, status, pageable);
        } else if (folderId != null) {
            result = caseRepository.findByTenantIdAndFolderId(tenantId, folderId, pageable);
        } else if (status != null) {
            result = caseRepository.findByTenantIdAndStatus(tenantId, status, pageable);
        } else {
            result = caseRepository.findByTenantId(tenantId, pageable);
        }

        return PagedResponse.from(result, c -> CaseResponse.from(c, tenantSlug, uploadPortalDomain));
    }

    @Transactional(readOnly = true)
    public CaseDetailResponse getById(UUID id, UUID userId, UUID tenantId, String tenantSlug) {
        Case c = findForTenant(id, tenantId);
        List<ChecklistItemSummary> checklist = fetchChecklist(id);
        return CaseDetailResponse.from(c, tenantSlug, uploadPortalDomain, checklist);
    }

    private List<ChecklistItemSummary> fetchChecklist(UUID caseId) {
        // Fetch items + documents in one query; aggregate per item in memory
        String sql = """
            SELECT
              ci.id, ci.case_id, ci.name, ci.description, ci.type, ci.required,
              ci.allow_multiple, ci.status, ci.text_value, ci.max_file_size_mb,
              ci.allowed_file_types, ci.sort_order, ci.created_at,
              d.id AS doc_id, d.filename, d.content_type, d.size_bytes, d.uploaded_at
            FROM checklist_items ci
            LEFT JOIN documents d ON d.checklist_item_id = ci.id
            WHERE ci.case_id = ?
            ORDER BY ci.sort_order, d.uploaded_at NULLS LAST
            """;

        java.util.LinkedHashMap<UUID, ChecklistItemSummary> itemMap = new java.util.LinkedHashMap<>();
        java.util.Map<UUID, java.util.List<ChecklistItemSummary.DocumentSummary>> docsMap = new java.util.HashMap<>();

        jdbcTemplate.query(sql, rs -> {
            UUID itemId = rs.getObject("id", UUID.class);
            if (!itemMap.containsKey(itemId)) {
                String[] types = (String[]) rs.getArray("allowed_file_types").getArray();
                itemMap.put(itemId, new ChecklistItemSummary(
                    itemId,
                    rs.getObject("case_id", UUID.class),
                    rs.getString("name"),
                    rs.getString("description"),
                    rs.getString("type"),
                    rs.getBoolean("required"),
                    rs.getBoolean("allow_multiple"),
                    rs.getString("status"),
                    rs.getString("text_value"),
                    rs.getObject("max_file_size_mb") != null ? rs.getInt("max_file_size_mb") : null,
                    types != null ? List.of(types) : List.of(),
                    rs.getInt("sort_order"),
                    new java.util.ArrayList<>(),
                    rs.getTimestamp("created_at") != null
                        ? rs.getTimestamp("created_at").toInstant() : null
                ));
                docsMap.put(itemId, (java.util.List<ChecklistItemSummary.DocumentSummary>)
                    ((ChecklistItemSummary) itemMap.get(itemId)).documents());
            }
            UUID docId = rs.getObject("doc_id", UUID.class);
            if (docId != null) {
                docsMap.get(itemId).add(new ChecklistItemSummary.DocumentSummary(
                    docId,
                    rs.getString("filename"),
                    rs.getString("content_type"),
                    rs.getLong("size_bytes"),
                    rs.getTimestamp("uploaded_at").toInstant()
                ));
            }
        }, caseId);

        return new java.util.ArrayList<>(itemMap.values());
    }

    public CaseResponse update(UUID id, CaseUpdateRequest req, UUID userId, UUID tenantId, String tenantSlug) {
        Case c = findForTenant(id, tenantId);

        if (req.customerName() != null) c.setCustomerName(req.customerName());
        if (req.customerEmail() != null) c.setCustomerEmail(req.customerEmail());
        if (req.tags() != null) c.setTags(req.tags().toArray(new String[0]));
        if (req.expiresAt() != null) c.setExpiresAt(req.expiresAt());
        if (req.maxFileSizeMb() != null) c.setMaxFileSizeMb(req.maxFileSizeMb());
        if (req.allowedFileTypes() != null) c.setAllowedFileTypes(req.allowedFileTypes().toArray(new String[0]));

        Case saved = caseRepository.save(c);

        auditLogger.log("CASE_UPDATED", "ADMIN", userId,
                tenantId, saved.getId(), null,
                Map.of("referenceNo", saved.getReferenceNo()));

        return CaseResponse.from(saved, tenantSlug, uploadPortalDomain);
    }

    public void delete(UUID id, UUID userId, UUID tenantId) {
        Case c = findForTenant(id, tenantId);
        caseRepository.delete(c);

        auditLogger.log("CASE_DELETED", "ADMIN", userId,
                tenantId, id, null,
                Map.of("referenceNo", c.getReferenceNo()));
    }

    public CaseResponse move(UUID id, CaseMoveRequest req, UUID userId, UUID tenantId, String tenantSlug) {
        Case c = findForTenant(id, tenantId);
        c.setFolderId(req.folderId());
        Case saved = caseRepository.save(c);

        auditLogger.log("CASE_UPDATED", "ADMIN", userId,
                tenantId, saved.getId(), null,
                Map.of("movedToFolder", String.valueOf(req.folderId())));

        return CaseResponse.from(saved, tenantSlug, uploadPortalDomain);
    }

    public void sendReminder(UUID id, UUID userId, UUID tenantId, String tenantSlug) {
        Case c = findForTenant(id, tenantId);
        String uploadUrl = tenantSlug + "." + uploadPortalDomain + "/" + c.getUploadToken();
        mailer.sendCaseInvite(c.getCustomerEmail(), uploadUrl, c.getReferenceNo());

        auditLogger.log("REMINDER_SENT", "ADMIN", userId,
                tenantId, id, null,
                Map.of("customerEmail", c.getCustomerEmail()));
    }

    public void streamZip(UUID id, UUID userId, UUID tenantId, HttpServletResponse response) throws IOException {
        Case c = findForTenant(id, tenantId);

        if (documentPort.isEmpty()) {
            throw ApiException.unprocessable("ZIP download not available: storage module not connected");
        }

        List<CaseDocumentPort.DocumentSummary> docs = documentPort.get().getDocumentsByCaseId(id);

        response.setContentType("application/zip");
        response.setHeader("Content-Disposition",
                "attachment; filename=\"case-" + c.getReferenceNo() + ".zip\"");

        try (ZipOutputStream zos = new ZipOutputStream(response.getOutputStream())) {
            for (CaseDocumentPort.DocumentSummary doc : docs) {
                String presignedUrl = fileStorage.generateDownloadUrl(doc.s3Key(), 300);
                ZipEntry entry = new ZipEntry(doc.filename());
                zos.putNextEntry(entry);
                try (InputStream is = URI.create(presignedUrl).toURL().openStream()) {
                    is.transferTo(zos);
                }
                zos.closeEntry();
            }
        }
    }

    // ── CaseService interface (called by checklist module) ───────────

    @Override
    public void recalculateStatus(UUID caseId) {
        Case c = caseRepository.findById(caseId)
                .orElseThrow(() -> ApiException.notFound("Case"));

        Integer[] counts = jdbcTemplate.queryForObject(
                "SELECT COUNT(*), " +
                "COUNT(CASE WHEN status IN ('UPLOADED','APPROVED') THEN 1 END), " +
                "COUNT(CASE WHEN required = true THEN 1 END), " +
                "COUNT(CASE WHEN required = true AND status = 'APPROVED' THEN 1 END) " +
                "FROM checklist_items WHERE case_id = ?",
                (rs, n) -> new Integer[]{
                        rs.getInt(1), rs.getInt(2), rs.getInt(3), rs.getInt(4)
                },
                caseId);

        int total = counts[0];
        int uploadedOrApproved = counts[1];
        int totalRequired = counts[2];
        int requiredApproved = counts[3];

        CaseStatus newStatus;
        if (totalRequired > 0 && requiredApproved == totalRequired) {
            newStatus = CaseStatus.COMPLETE;
        } else if (uploadedOrApproved > 0) {
            newStatus = CaseStatus.PARTIAL;
        } else {
            newStatus = CaseStatus.PENDING;
        }

        c.setStatus(newStatus);
        c.setTotalItems(total);
        c.setUploadedItems(uploadedOrApproved);
        caseRepository.save(c);
    }

    // ── Helpers ──────────────────────────────────────────────────────

    private Case findForTenant(UUID id, UUID tenantId) {
        Case c = caseRepository.findById(id).orElseThrow(() -> ApiException.notFound("Case"));
        if (tenantId != null && !tenantId.equals(c.getTenantId())) {
            throw ApiException.forbidden();
        }
        return c;
    }
}
