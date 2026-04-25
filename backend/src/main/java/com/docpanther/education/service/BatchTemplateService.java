package com.docpanther.education.service;

import com.docpanther.education.dto.request.CreateBatchTemplateRequest;
import com.docpanther.education.dto.request.UpdateBatchTemplateRequest;
import com.docpanther.education.dto.response.BatchTemplateResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface BatchTemplateService {
    Page<BatchTemplateResponse> listTemplates(Pageable pageable);
    BatchTemplateResponse createTemplate(CreateBatchTemplateRequest req);
    BatchTemplateResponse getTemplate(UUID id);
    BatchTemplateResponse updateTemplate(UUID id, UpdateBatchTemplateRequest req);
    void deleteTemplate(UUID id);
}
