package com.docpanther.education.service;

import com.docpanther.education.dto.request.ConfirmUploadRequest;
import com.docpanther.education.dto.request.StudentUploadUrlRequest;
import com.docpanther.education.dto.response.StudentFileResponse;
import com.docpanther.education.dto.response.StudentStorageResponse;
import com.docpanther.education.dto.response.UploadUrlResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface StudentStorageService {
    StudentStorageResponse getStudentStorage();
    UploadUrlResponse getUploadUrl(StudentUploadUrlRequest req);
    StudentFileResponse confirmUpload(ConfirmUploadRequest req);
    Page<StudentFileResponse> listFiles(Pageable pageable);
    void deleteFile(UUID id);
}
