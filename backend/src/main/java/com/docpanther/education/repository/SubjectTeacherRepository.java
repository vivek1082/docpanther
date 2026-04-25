package com.docpanther.education.repository;

import com.docpanther.education.model.SubjectTeacher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface SubjectTeacherRepository extends JpaRepository<SubjectTeacher, UUID> {
    List<SubjectTeacher> findAllBySubjectId(UUID subjectId);

    @Modifying
    @Query("DELETE FROM SubjectTeacher st WHERE st.subjectId = :subjectId AND st.userId = :userId")
    void deleteBySubjectIdAndUserId(UUID subjectId, UUID userId);

    boolean existsBySubjectIdAndUserId(UUID subjectId, UUID userId);
}
