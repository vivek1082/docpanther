package com.docpanther.education.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "batch_template_subjects")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BatchTemplateSubject {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false)
    private BatchTemplate template;

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(name = "sort_order")
    private int sortOrder;

    @Column(name = "default_teacher_id")
    private UUID defaultTeacherId;
}
