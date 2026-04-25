package com.docpanther.education.controller;

import com.docpanther.education.dto.request.AddSubjectRequest;
import com.docpanther.education.dto.request.AssignTeacherRequest;
import com.docpanther.education.dto.request.UpdateSubjectRequest;
import com.docpanther.education.dto.response.BatchSubjectResponse;
import com.docpanther.education.service.SubjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class SubjectController {

    private final SubjectService subjectService;

    @GetMapping("/api/edu/subjects")
    @PreAuthorize("hasAnyRole('TEACHER','TENANT_ADMIN')")
    public ResponseEntity<List<BatchSubjectResponse>> listSubjects(@RequestParam UUID batchId) {
        return ResponseEntity.ok(subjectService.listSubjects(batchId));
    }

    @PostMapping("/api/edu/batches/{batchId}/subjects")
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<BatchSubjectResponse> addSubject(
            @PathVariable UUID batchId,
            @Valid @RequestBody AddSubjectRequest req) {
        return ResponseEntity.status(201).body(subjectService.addSubject(batchId, req));
    }

    @PutMapping("/api/edu/subjects/{id}")
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<BatchSubjectResponse> updateSubject(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateSubjectRequest req) {
        return ResponseEntity.ok(subjectService.updateSubject(id, req));
    }

    @DeleteMapping("/api/edu/subjects/{id}")
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<Void> deleteSubject(@PathVariable UUID id) {
        subjectService.deleteSubject(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/edu/subjects/{id}/teachers")
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<Void> assignTeacher(
            @PathVariable UUID id,
            @Valid @RequestBody AssignTeacherRequest req) {
        subjectService.assignTeacher(id, req);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/api/edu/subjects/{id}/teachers/{userId}")
    @PreAuthorize("hasRole('TENANT_ADMIN')")
    public ResponseEntity<Void> removeTeacher(@PathVariable UUID id, @PathVariable UUID userId) {
        subjectService.removeTeacher(id, userId);
        return ResponseEntity.noContent().build();
    }
}
