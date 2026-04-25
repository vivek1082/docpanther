package com.docpanther.education.controller;

import com.docpanther.education.dto.request.CreateMaterialRequest;
import com.docpanther.education.dto.request.RejectMaterialRequest;
import com.docpanther.education.dto.response.MaterialResponse;
import com.docpanther.education.dto.response.MaterialUploadResponse;
import com.docpanther.education.service.MaterialService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/edu/materials")
@RequiredArgsConstructor
public class MaterialController {

    private final MaterialService materialService;

    @GetMapping
    @PreAuthorize("hasAnyRole('TEACHER','TENANT_ADMIN')")
    public ResponseEntity<Page<MaterialResponse>> listMaterials(@RequestParam UUID subjectId, Pageable pageable) {
        return ResponseEntity.ok(materialService.listMaterials(subjectId, pageable));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('TEACHER','TENANT_ADMIN')")
    public ResponseEntity<MaterialUploadResponse> uploadMaterial(@Valid @RequestBody CreateMaterialRequest req) {
        return ResponseEntity.status(201).body(materialService.createUploadRequest(req));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('TEACHER','TENANT_ADMIN')")
    public ResponseEntity<MaterialResponse> getMaterial(@PathVariable UUID id) {
        return ResponseEntity.ok(materialService.getMaterial(id));
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<MaterialResponse> approveMaterial(@PathVariable UUID id) {
        return ResponseEntity.ok(materialService.approveMaterial(id));
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<MaterialResponse> rejectMaterial(
            @PathVariable UUID id,
            @Valid @RequestBody RejectMaterialRequest req) {
        return ResponseEntity.ok(materialService.rejectMaterial(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<Void> deleteMaterial(@PathVariable UUID id) {
        materialService.deleteMaterial(id);
        return ResponseEntity.noContent().build();
    }
}
