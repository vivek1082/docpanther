package com.docpanther.checklist;

import com.docpanther.checklist.dto.ChecklistItemResponse;
import com.docpanther.checklist.dto.TemplateDetailResponse;
import com.docpanther.checklist.dto.TemplateRequest;
import com.docpanther.checklist.dto.TemplateResponse;
import com.docpanther.checklist.dto.TemplateUpdateRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/templates")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class TemplateController {

    private final TemplateService templateService;

    @GetMapping
    public List<TemplateResponse> listTemplates() {
        return templateService.listTemplates();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TemplateResponse createTemplate(@Valid @RequestBody TemplateRequest request) {
        return templateService.createTemplate(request);
    }

    @GetMapping("/{id}")
    public TemplateDetailResponse getTemplate(@PathVariable UUID id) {
        return templateService.getTemplate(id);
    }

    @PutMapping("/{id}")
    public TemplateResponse updateTemplate(
            @PathVariable UUID id,
            @RequestBody TemplateUpdateRequest request) {
        return templateService.updateTemplate(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTemplate(@PathVariable UUID id) {
        templateService.deleteTemplate(id);
    }

    @PostMapping("/{id}/apply/{caseId}")
    public List<ChecklistItemResponse> applyTemplate(
            @PathVariable UUID id,
            @PathVariable UUID caseId) {
        return templateService.applyTemplate(id, caseId);
    }
}
