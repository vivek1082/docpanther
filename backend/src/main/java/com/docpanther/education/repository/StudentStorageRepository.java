package com.docpanther.education.repository;

import com.docpanther.education.model.StudentStorage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.UUID;

public interface StudentStorageRepository extends JpaRepository<StudentStorage, StudentStorage.StudentStorageId> {

    @Modifying
    @Query("UPDATE StudentStorage s SET s.usedBytes = s.usedBytes + :delta WHERE s.id.userId = :userId AND s.id.tenantId = :tenantId")
    void incrementUsedBytes(UUID userId, UUID tenantId, long delta);

    @Modifying
    @Query("UPDATE StudentStorage s SET s.usedBytes = s.usedBytes - :delta WHERE s.id.userId = :userId AND s.id.tenantId = :tenantId AND s.usedBytes >= :delta")
    int decrementUsedBytes(UUID userId, UUID tenantId, long delta);
}
