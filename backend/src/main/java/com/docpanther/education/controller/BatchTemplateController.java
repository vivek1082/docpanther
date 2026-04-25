package com.docpanther.education.controller;

import com.docpanther.education.dto.request.CreateBatchTemplateRequest;
import com.docpanther.education.dto.request.UpdateBatchTemplateRequest;
import com.docpanther.education.dto.response.BatchTemplateResponse;
import com.docpanther.education.service.BatchTemplateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/edu/templates")
@RequiredArgsConstructor
public class BatchTemplateController {

    private final BatchTemplateService templateService;

    @GetMapping
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<Page<BatchTemplateResponse>> listTemplates(Pageable pageable) {
        return ResponseEntity.ok(templateService.listTemplates(pageable));
    }

    @PostMapping
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<BatchTemplateResponse> createTemplate(@Valid @RequestBody CreateBatchTemplateRequest req) {
        return ResponseEntity.status(201).body(templateService.createTemplate(req));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<BatchTemplateResponse> getTemplate(@PathVariable UUID id) {
        return ResponseEntity.ok(templateService.getTemplate(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<BatchTemplateResponse> updateTemplate(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateBatchTemplateRequest req) {
        return ResponseEntity.ok(templateService.updateTemplate(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<Void> deleteTemplate(@PathVariable UUID id) {
        templateService.deleteTemplate(id);
        return ResponseEntity.noContent().build();
    }
}
