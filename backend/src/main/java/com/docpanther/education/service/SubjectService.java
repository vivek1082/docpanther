package com.docpanther.education.service;

import com.docpanther.education.dto.request.AddSubjectRequest;
import com.docpanther.education.dto.request.AssignTeacherRequest;
import com.docpanther.education.dto.request.UpdateSubjectRequest;
import com.docpanther.education.dto.response.BatchSubjectResponse;

import java.util.List;
import java.util.UUID;

public interface SubjectService {
    List<BatchSubjectResponse> listSubjects(UUID batchId);
    BatchSubjectResponse addSubject(UUID batchId, AddSubjectRequest req);
    BatchSubjectResponse updateSubject(UUID id, UpdateSubjectRequest req);
    void deleteSubject(UUID id);
    void assignTeacher(UUID subjectId, AssignTeacherRequest req);
    void removeTeacher(UUID subjectId, UUID userId);
}
