package com.docpanther.education.service;

import com.docpanther.education.dto.request.CreateMaterialRequest;
import com.docpanther.education.dto.request.RejectMaterialRequest;
import com.docpanther.education.dto.response.MaterialResponse;
import com.docpanther.education.dto.response.MaterialUploadResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface MaterialService {
    Page<MaterialResponse> listMaterials(UUID subjectId, Pageable pageable);
    MaterialUploadResponse createUploadRequest(CreateMaterialRequest req);
    MaterialResponse getMaterial(UUID id);
    MaterialResponse approveMaterial(UUID id);
    MaterialResponse rejectMaterial(UUID id, RejectMaterialRequest req);
    void deleteMaterial(UUID id);
}
