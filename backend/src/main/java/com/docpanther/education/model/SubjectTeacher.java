package com.docpanther.education.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(
    name = "subject_teachers",
    uniqueConstraints = @UniqueConstraint(columnNames = {"subject_id", "user_id"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubjectTeacher {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "subject_id", nullable = false)
    private UUID subjectId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "is_primary", nullable = false)
    private boolean primary;
}
