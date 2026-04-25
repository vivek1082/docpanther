package com.docpanther.checklist;

import com.docpanther.checklist.dto.ChecklistItemResponse;
import com.docpanther.checklist.dto.TemplateDetailResponse;
import com.docpanther.checklist.dto.TemplateRequest;
import com.docpanther.checklist.dto.TemplateResponse;
import com.docpanther.checklist.dto.TemplateUpdateRequest;

import java.util.List;
import java.util.UUID;

public interface TemplateService {

    List<TemplateResponse> listTemplates();

    TemplateResponse createTemplate(TemplateRequest request);

    TemplateDetailResponse getTemplate(UUID id);

    TemplateResponse updateTemplate(UUID id, TemplateUpdateRequest request);

    void deleteTemplate(UUID id);

    List<ChecklistItemResponse> applyTemplate(UUID templateId, UUID caseId);
}
