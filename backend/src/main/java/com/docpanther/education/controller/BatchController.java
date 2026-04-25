package com.docpanther.education.controller;

import com.docpanther.education.dto.request.CreateBatchRequest;
import com.docpanther.education.dto.request.EnrollStudentsRequest;
import com.docpanther.education.dto.request.UpdateBatchRequest;
import com.docpanther.education.dto.response.BatchDetailResponse;
import com.docpanther.education.dto.response.BatchResponse;
import com.docpanther.education.service.BatchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/edu/batches")
@RequiredArgsConstructor
public class BatchController {

    private final BatchService batchService;

    @GetMapping
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<Page<BatchResponse>> listBatches(Pageable pageable) {
        return ResponseEntity.ok(batchService.listBatches(pageable));
    }

    @PostMapping
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<BatchDetailResponse> createBatch(@Valid @RequestBody CreateBatchRequest req) {
        return ResponseEntity.status(201).body(batchService.createBatch(req));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<BatchDetailResponse> getBatch(@PathVariable UUID id) {
        return ResponseEntity.ok(batchService.getBatch(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<BatchResponse> updateBatch(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateBatchRequest req) {
        return ResponseEntity.ok(batchService.updateBatch(id, req));
    }

    @PostMapping("/{id}/enroll")
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<Void> enrollStudents(
            @PathVariable UUID id,
            @Valid @RequestBody EnrollStudentsRequest req) {
        batchService.enrollStudents(id, req);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/enroll/{studentId}")
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<Void> unenrollStudent(@PathVariable UUID id, @PathVariable UUID studentId) {
        batchService.unenrollStudent(id, studentId);
        return ResponseEntity.noContent().build();
    }
}
