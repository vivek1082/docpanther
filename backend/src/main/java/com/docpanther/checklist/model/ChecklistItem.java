package com.docpanther.checklist.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "checklist_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChecklistItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "case_id", nullable = false)
    private UUID caseId;

    @Column(nullable = false)
    private String name;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ItemType type = ItemType.FILE_UPLOAD;

    @Column(nullable = false)
    private boolean required = true;

    @Column(name = "allow_multiple", nullable = false)
    private boolean allowMultiple = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ItemStatus status = ItemStatus.PENDING;

    @Column(name = "text_value", columnDefinition = "TEXT")
    private String textValue;

    @Column(name = "max_file_size_mb")
    private Integer maxFileSizeMb;

    @Column(name = "allowed_file_types", columnDefinition = "text[]")
    private String[] allowedFileTypes = new String[0];

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    @ElementCollection
    @CollectionTable(name = "checklist_item_documents", joinColumns = @JoinColumn(name = "checklist_item_id"))
    @Column(name = "document_id")
    @Builder.Default
    private List<UUID> documentIds = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
