package com.docpanther.storage;

import com.docpanther.common.audit.AuditLogger;
import com.docpanther.common.checklist.ChecklistService;
import com.docpanther.common.exception.ApiException;
import com.docpanther.common.storage.FileStorage;
import com.docpanther.common.storage.FileStorage.PresignedUpload;
import com.docpanther.storage.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Array;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StorageService {

    private final StorageDocumentRepository documentRepository;
    private final FileStorage fileStorage;
    private final ChecklistService checklistService;
    private final AuditLogger auditLogger;
    private final JdbcTemplate jdbc;

    @Value("${app.s3.presigned-url-expiry-minutes:15}")
    private int presignExpiryMinutes;

    // ── Admin endpoints ──────────────────────────────────────────────

    public UploadUrlResponse generateAdminUploadUrl(
            UUID caseId, UUID itemId, UUID userId, UUID tenantId,
            UploadUrlRequest req) {

        Map<String, Object> item = requireItem(caseId, itemId);
        Map<String, Object> caseRow = requireCase(caseId, tenantId);

        validateMimeType(req.mimeType(), effectiveAllowedTypes(item, caseRow));
        validateSizeBytes(req.sizeBytes(), effectiveMaxSizeMb(item, caseRow));

        String s3Key = buildObjectKey(tenantId, caseId, itemId, req.filename());
        PresignedUpload upload = fileStorage.generateUploadUrl(tenantId, s3Key, req.mimeType(), req.sizeBytes());

        return new UploadUrlResponse(upload.uploadUrl(), upload.objectKey(), presignExpiry());
    }

    @Transactional
    public DocumentResponse confirmAdminUpload(
            UUID caseId, UUID itemId, UUID userId, UUID tenantId,
            ConfirmUploadRequest req) {

        requireItem(caseId, itemId);
        requireCase(caseId, tenantId);

        Document doc = Document.builder()
                .id(UUID.randomUUID())
                .checklistItemId(itemId)
                .caseId(caseId)
                .tenantId(tenantId)
                .s3Key(req.s3Key())
                .filename(req.filename())
                .contentType(req.mimeType())
                .sizeBytes(req.sizeBytes())
                .build();

        documentRepository.save(doc);
        checklistService.markUploaded(itemId);
        auditLogger.log("FILE_UPLOADED", "ADMIN", userId, tenantId, caseId, itemId,
                Map.of("docId", doc.getId(), "filename", req.filename()));

        return DocumentResponse.from(doc);
    }

    @Transactional
    public void deleteDocument(UUID docId, UUID userId, UUID tenantId) {
        Document doc = documentRepository.findByIdAndTenantId(docId, tenantId)
                .orElseThrow(() -> ApiException.notFound("Document"));

        fileStorage.delete(doc.getS3Key());
        documentRepository.delete(doc);

        auditLogger.log("FILE_DELETED", "ADMIN", userId, tenantId, doc.getCaseId(), doc.getChecklistItemId(),
                Map.of("docId", docId, "filename", doc.getFilename()));
    }

    // ── Upload portal endpoints ──────────────────────────────────────

    @Transactional(readOnly = true)
    public UploadPortalCaseResponse getPortalCase(String token) {
        Map<String, Object> caseRow = requireCaseByToken(token);
        UUID caseId = (UUID) caseRow.get("id");

        List<Map<String, Object>> items = queryItems(caseId);
        List<ChecklistItemResponse> checklist = items.stream()
                .map(item -> buildChecklistItemResponse(item, caseId))
                .collect(Collectors.toList());

        return new UploadPortalCaseResponse(
                (String) caseRow.get("reference_no"),
                (String) caseRow.get("customer_name"),
                (String) caseRow.get("status"),
                toInstant(caseRow.get("expires_at")),
                checklist
        );
    }

    public UploadUrlResponse generatePortalUploadUrl(
            String token, UUID itemId, UploadUrlRequest req) {

        Map<String, Object> caseRow = requireCaseByToken(token);
        requireNotExpired(caseRow);

        UUID caseId = (UUID) caseRow.get("id");
        UUID tenantId = (UUID) caseRow.get("tenant_id");

        Map<String, Object> item = requireItem(caseId, itemId);
        requireItemNotApproved(item);
        validateMimeType(req.mimeType(), effectiveAllowedTypes(item, caseRow));
        validateSizeBytes(req.sizeBytes(), effectiveMaxSizeMb(item, caseRow));

        String s3Key = buildObjectKey(tenantId, caseId, itemId, req.filename());
        PresignedUpload upload = fileStorage.generateUploadUrl(tenantId, s3Key, req.mimeType(), req.sizeBytes());

        return new UploadUrlResponse(upload.uploadUrl(), upload.objectKey(), presignExpiry());
    }

    @Transactional
    public DocumentResponse confirmPortalUpload(
            String token, UUID itemId, ConfirmUploadRequest req) {

        Map<String, Object> caseRow = requireCaseByToken(token);
        requireNotExpired(caseRow);

        UUID caseId = (UUID) caseRow.get("id");
        UUID tenantId = (UUID) caseRow.get("tenant_id");

        requireItem(caseId, itemId);

        Document doc = Document.builder()
                .id(UUID.randomUUID())
                .checklistItemId(itemId)
                .caseId(caseId)
                .tenantId(tenantId)
                .s3Key(req.s3Key())
                .filename(req.filename())
                .contentType(req.mimeType())
                .sizeBytes(req.sizeBytes())
                .build();

        documentRepository.save(doc);
        checklistService.markUploaded(itemId);
        auditLogger.log("FILE_UPLOADED", "CUSTOMER", null, tenantId, caseId, itemId,
                Map.of("docId", doc.getId(), "filename", req.filename()));

        return DocumentResponse.from(doc);
    }

    @Transactional
    public ChecklistItemResponse submitPortalText(String token, UUID itemId, String value) {
        Map<String, Object> caseRow = requireCaseByToken(token);
        requireNotExpired(caseRow);

        UUID caseId = (UUID) caseRow.get("id");
        UUID tenantId = (UUID) caseRow.get("tenant_id");

        Map<String, Object> item = requireItem(caseId, itemId);
        if (!"TEXT_INPUT".equals(item.get("type"))) {
            throw ApiException.badRequest("Item is not a TEXT_INPUT type");
        }

        jdbc.update(
                "UPDATE checklist_items SET text_value = ?, status = 'UPLOADED' WHERE id = ?::uuid AND case_id = ?::uuid",
                value, itemId.toString(), caseId.toString()
        );

        checklistService.markUploaded(itemId);
        auditLogger.log("TEXT_SUBMITTED", "CUSTOMER", null, tenantId, caseId, itemId,
                Map.of("itemId", itemId));

        // Reload updated item
        Map<String, Object> updatedItem = requireItem(caseId, itemId);
        List<DocumentResponse> docs = documentRepository.findByChecklistItemId(itemId)
                .stream().map(DocumentResponse::from).collect(Collectors.toList());

        return mapToChecklistItemResponse(updatedItem, docs);
    }

    // ── Private helpers ──────────────────────────────────────────────

    private Map<String, Object> requireCase(UUID caseId, UUID tenantId) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT id, tenant_id, expires_at, max_file_size_mb, allowed_file_types, status " +
                "FROM cases WHERE id = ?::uuid AND tenant_id = ?::uuid",
                caseId.toString(), tenantId.toString()
        );
        if (rows.isEmpty()) throw ApiException.notFound("Case");
        return flattenArrays(rows.get(0));
    }

    private Map<String, Object> requireCaseByToken(String token) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT id, tenant_id, reference_no, customer_name, status, expires_at, " +
                "max_file_size_mb, allowed_file_types " +
                "FROM cases WHERE upload_token = ?",
                token
        );
        if (rows.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Upload link not found");
        }
        return flattenArrays(rows.get(0));
    }

    private Map<String, Object> requireItem(UUID caseId, UUID itemId) {
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT id, case_id, name, description, type, required, allow_multiple, status, " +
                "text_value, max_file_size_mb, allowed_file_types, sort_order, created_at " +
                "FROM checklist_items WHERE id = ?::uuid AND case_id = ?::uuid",
                itemId.toString(), caseId.toString()
        );
        if (rows.isEmpty()) throw ApiException.notFound("ChecklistItem");
        return flattenArrays(rows.get(0));
    }

    private List<Map<String, Object>> queryItems(UUID caseId) {
        return jdbc.queryForList(
                "SELECT id, case_id, name, description, type, required, allow_multiple, status, " +
                "text_value, max_file_size_mb, allowed_file_types, sort_order, created_at " +
                "FROM checklist_items WHERE case_id = ?::uuid ORDER BY sort_order ASC",
                caseId.toString()
        ).stream().map(this::flattenArrays).collect(Collectors.toList());
    }

    private void requireNotExpired(Map<String, Object> caseRow) {
        Instant expiresAt = toInstant(caseRow.get("expires_at"));
        if (expiresAt != null && Instant.now().isAfter(expiresAt)) {
            throw new ApiException(HttpStatus.GONE, "LINK_EXPIRED", "Upload link has expired");
        }
    }

    private void requireItemNotApproved(Map<String, Object> item) {
        if ("APPROVED".equals(item.get("status"))) {
            throw ApiException.conflict("Item is already approved");
        }
    }

    private void validateMimeType(String mimeType, List<String> allowedTypes) {
        if (allowedTypes.isEmpty()) return;
        boolean allowed = allowedTypes.stream().anyMatch(t ->
                t.equals(mimeType) || t.equals("*/*") || mimeType.startsWith(t.replace("*", "")));
        if (!allowed) {
            throw ApiException.badRequest("File type " + mimeType + " is not allowed");
        }
    }

    private void validateSizeBytes(long sizeBytes, int maxSizeMb) {
        long maxBytes = (long) maxSizeMb * 1024 * 1024;
        if (sizeBytes > maxBytes) {
            throw ApiException.badRequest("File size exceeds " + maxSizeMb + " MB limit");
        }
    }

    @SuppressWarnings("unchecked")
    private List<String> effectiveAllowedTypes(Map<String, Object> item, Map<String, Object> caseRow) {
        Object itemTypes = item.get("allowed_file_types");
        if (itemTypes instanceof List<?> list && !list.isEmpty()) {
            return (List<String>) list;
        }
        Object caseTypes = caseRow.get("allowed_file_types");
        if (caseTypes instanceof List<?> list) {
            return (List<String>) list;
        }
        return List.of();
    }

    private int effectiveMaxSizeMb(Map<String, Object> item, Map<String, Object> caseRow) {
        Object itemMax = item.get("max_file_size_mb");
        if (itemMax instanceof Number n && n.intValue() > 0) return n.intValue();
        Object caseMax = caseRow.get("max_file_size_mb");
        if (caseMax instanceof Number n) return n.intValue();
        return 25; // default
    }

    private ChecklistItemResponse buildChecklistItemResponse(Map<String, Object> item, UUID caseId) {
        UUID itemId = toUUID(item.get("id"));
        List<DocumentResponse> docs = documentRepository.findByChecklistItemId(itemId)
                .stream().map(DocumentResponse::from).collect(Collectors.toList());
        return mapToChecklistItemResponse(item, docs);
    }

    @SuppressWarnings("unchecked")
    private ChecklistItemResponse mapToChecklistItemResponse(Map<String, Object> item, List<DocumentResponse> docs) {
        Object types = item.get("allowed_file_types");
        List<String> allowedTypes = types instanceof List<?> l
                ? (List<String>) l
                : List.of();

        return new ChecklistItemResponse(
                toUUID(item.get("id")),
                toUUID(item.get("case_id")),
                (String) item.get("name"),
                (String) item.get("description"),
                (String) item.get("type"),
                Boolean.TRUE.equals(item.get("required")),
                Boolean.TRUE.equals(item.get("allow_multiple")),
                (String) item.get("status"),
                (String) item.get("text_value"),
                item.get("max_file_size_mb") != null ? ((Number) item.get("max_file_size_mb")).intValue() : null,
                allowedTypes,
                item.get("sort_order") != null ? ((Number) item.get("sort_order")).intValue() : 0,
                docs,
                toInstant(item.get("created_at"))
        );
    }

    // JdbcTemplate returns SQL arrays as java.sql.Array; unwrap them to List<String>
    private Map<String, Object> flattenArrays(Map<String, Object> row) {
        Map<String, Object> result = new LinkedHashMap<>(row);
        result.replaceAll((key, val) -> {
            if (val instanceof Array sqlArray) {
                try {
                    Object arr = sqlArray.getArray();
                    if (arr instanceof String[] strArr) return Arrays.asList(strArr);
                    if (arr instanceof Object[] objArr) {
                        return Arrays.stream(objArr).map(Object::toString).collect(Collectors.toList());
                    }
                } catch (SQLException e) {
                    log.warn("Failed to unwrap SQL array for column {}", key, e);
                }
            }
            return val;
        });
        return result;
    }

    private static UUID toUUID(Object val) {
        if (val instanceof UUID u) return u;
        if (val instanceof String s) return UUID.fromString(s);
        throw new IllegalArgumentException("Cannot convert " + val + " to UUID");
    }

    private static Instant toInstant(Object val) {
        if (val == null) return null;
        if (val instanceof Instant i) return i;
        if (val instanceof Timestamp ts) return ts.toInstant();
        if (val instanceof java.util.Date d) return d.toInstant();
        return null;
    }

    private String buildObjectKey(UUID tenantId, UUID caseId, UUID itemId, String filename) {
        return String.format("%s/%s/%s/%s-%s", tenantId, caseId, itemId, UUID.randomUUID(), filename);
    }

    private Instant presignExpiry() {
        return Instant.now().plus(Duration.ofMinutes(presignExpiryMinutes));
    }
}
