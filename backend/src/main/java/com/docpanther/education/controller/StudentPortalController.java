package com.docpanther.education.controller;

import com.docpanther.education.dto.request.ConfirmUploadRequest;
import com.docpanther.education.dto.request.StudentUploadUrlRequest;
import com.docpanther.education.dto.response.BatchDetailResponse;
import com.docpanther.education.dto.response.BatchResponse;
import com.docpanther.education.dto.response.StudentFileResponse;
import com.docpanther.education.dto.response.StudentStorageResponse;
import com.docpanther.education.dto.response.UploadUrlResponse;
import com.docpanther.education.service.BatchService;
import com.docpanther.education.service.StudentStorageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/edu/my")
@RequiredArgsConstructor
public class StudentPortalController {

    private final BatchService batchService;
    private final StudentStorageService storageService;

    @GetMapping("/batches")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<List<BatchResponse>> myBatches() {
        return ResponseEntity.ok(batchService.getEnrolledBatches());
    }

    @GetMapping("/batches/{id}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<BatchDetailResponse> myBatchDetail(@PathVariable UUID id) {
        return ResponseEntity.ok(batchService.getStudentBatchDetail(id));
    }

    @GetMapping("/storage")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<StudentStorageResponse> myStorage() {
        return ResponseEntity.ok(storageService.getStudentStorage());
    }

    @PostMapping("/storage/upload-url")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<UploadUrlResponse> getUploadUrl(@Valid @RequestBody StudentUploadUrlRequest req) {
        return ResponseEntity.ok(storageService.getUploadUrl(req));
    }

    @PostMapping("/storage/confirm")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<StudentFileResponse> confirmUpload(@Valid @RequestBody ConfirmUploadRequest req) {
        return ResponseEntity.status(201).body(storageService.confirmUpload(req));
    }

    @GetMapping("/storage/files")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Page<StudentFileResponse>> myFiles(Pageable pageable) {
        return ResponseEntity.ok(storageService.listFiles(pageable));
    }

    @DeleteMapping("/storage/files/{id}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<Void> deleteFile(@PathVariable UUID id) {
        storageService.deleteFile(id);
        return ResponseEntity.noContent().build();
    }
}
