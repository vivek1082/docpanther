package com.docpanther.education.service;

import com.docpanther.education.dto.request.CreateBatchRequest;
import com.docpanther.education.dto.request.EnrollStudentsRequest;
import com.docpanther.education.dto.request.UpdateBatchRequest;
import com.docpanther.education.dto.response.BatchDetailResponse;
import com.docpanther.education.dto.response.BatchResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface BatchService {
    Page<BatchResponse> listBatches(Pageable pageable);
    BatchDetailResponse createBatch(CreateBatchRequest req);
    BatchDetailResponse getBatch(UUID id);
    BatchResponse updateBatch(UUID id, UpdateBatchRequest req);
    void enrollStudents(UUID batchId, EnrollStudentsRequest req);
    void unenrollStudent(UUID batchId, UUID studentId);
    List<BatchResponse> getEnrolledBatches();
    BatchDetailResponse getStudentBatchDetail(UUID batchId);
}
