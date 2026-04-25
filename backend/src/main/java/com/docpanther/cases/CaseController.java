package com.docpanther.cases;

import com.docpanther.cases.dto.*;
import com.docpanther.cases.model.CaseStatus;
import com.docpanther.common.audit.AuditPageDto;
import com.docpanther.common.audit.AuditQueryPort;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.UUID;

@RestController
@RequestMapping("/api/cases")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class CaseController {

    private final CaseServiceImpl caseService;
    private final AuditQueryPort auditQueryPort;

    @GetMapping
    public ResponseEntity<PagedResponse<CaseResponse>> list(
            @RequestParam(required = false) UUID folderId,
            @RequestParam(required = false) CaseStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal(expression = "id") UUID userId,
            @AuthenticationPrincipal(expression = "tenantId") UUID tenantId,
            @AuthenticationPrincipal(expression = "orgSlug") String tenantSlug) {

        return ResponseEntity.ok(caseService.list(folderId, status, page, size, userId, tenantId, tenantSlug));
    }

    @PostMapping
    public ResponseEntity<CaseResponse> create(
            @Valid @RequestBody CaseRequest req,
            @AuthenticationPrincipal(expression = "id") UUID userId,
            @AuthenticationPrincipal(expression = "tenantId") UUID tenantId,
            @AuthenticationPrincipal(expression = "orgSlug") String tenantSlug) {

        return ResponseEntity.status(HttpStatus.CREATED).body(caseService.create(req, userId, tenantId, tenantSlug));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CaseDetailResponse> getById(
            @PathVariable UUID id,
            @AuthenticationPrincipal(expression = "id") UUID userId,
            @AuthenticationPrincipal(expression = "tenantId") UUID tenantId,
            @AuthenticationPrincipal(expression = "orgSlug") String tenantSlug) {

        return ResponseEntity.ok(caseService.getById(id, userId, tenantId, tenantSlug));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CaseResponse> update(
            @PathVariable UUID id,
            @RequestBody CaseUpdateRequest req,
            @AuthenticationPrincipal(expression = "id") UUID userId,
            @AuthenticationPrincipal(expression = "tenantId") UUID tenantId,
            @AuthenticationPrincipal(expression = "orgSlug") String tenantSlug) {

        return ResponseEntity.ok(caseService.update(id, req, userId, tenantId, tenantSlug));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal(expression = "id") UUID userId,
            @AuthenticationPrincipal(expression = "tenantId") UUID tenantId) {

        caseService.delete(id, userId, tenantId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/move")
    public ResponseEntity<CaseResponse> move(
            @PathVariable UUID id,
            @RequestBody CaseMoveRequest req,
            @AuthenticationPrincipal(expression = "id") UUID userId,
            @AuthenticationPrincipal(expression = "tenantId") UUID tenantId,
            @AuthenticationPrincipal(expression = "orgSlug") String tenantSlug) {

        return ResponseEntity.ok(caseService.move(id, req, userId, tenantId, tenantSlug));
    }

    @PostMapping("/{id}/remind")
    public ResponseEntity<Void> remind(
            @PathVariable UUID id,
            @AuthenticationPrincipal(expression = "id") UUID userId,
            @AuthenticationPrincipal(expression = "tenantId") UUID tenantId,
            @AuthenticationPrincipal(expression = "orgSlug") String tenantSlug) {

        caseService.sendReminder(id, userId, tenantId, tenantSlug);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/download")
    public void download(
            @PathVariable UUID id,
            @AuthenticationPrincipal(expression = "id") UUID userId,
            @AuthenticationPrincipal(expression = "tenantId") UUID tenantId,
            HttpServletResponse response) throws IOException {

        caseService.streamZip(id, userId, tenantId, response);
    }

    @GetMapping("/{id}/audit")
    public ResponseEntity<AuditPageDto> getAudit(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "0") int page,
            @AuthenticationPrincipal(expression = "id") UUID userId,
            @AuthenticationPrincipal(expression = "tenantId") UUID tenantId,
            @AuthenticationPrincipal(expression = "orgSlug") String tenantSlug) {

        caseService.getById(id, userId, tenantId, tenantSlug);
        return ResponseEntity.ok(auditQueryPort.getPagedCaseAuditLog(id, page));
    }
}
