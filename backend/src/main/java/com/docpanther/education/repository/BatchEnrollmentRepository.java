package com.docpanther.education.repository;

import com.docpanther.education.model.BatchEnrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface BatchEnrollmentRepository extends JpaRepository<BatchEnrollment, UUID> {
    List<BatchEnrollment> findAllByStudentId(UUID studentId);
    long countByBatchId(UUID batchId);
    boolean existsByBatchIdAndStudentId(UUID batchId, UUID studentId);
    void deleteByBatchIdAndStudentId(UUID batchId, UUID studentId);

    @Query("SELECT be.studentId FROM BatchEnrollment be WHERE be.batchId = :batchId")
    List<UUID> findStudentIdsByBatchId(UUID batchId);
}
