package com.docpanther.education.repository;

import com.docpanther.education.model.BatchSubject;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BatchSubjectRepository extends JpaRepository<BatchSubject, UUID> {
    List<BatchSubject> findAllByBatchIdOrderBySortOrderAsc(UUID batchId);
    long countByBatchId(UUID batchId);
    void deleteByIdAndBatchId(UUID id, UUID batchId);
}
