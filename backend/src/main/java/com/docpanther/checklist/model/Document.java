package com.docpanther.checklist.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Immutable;

import java.time.Instant;
import java.util.UUID;

/**
 * Read-only projection of the documents table, written by storage-agent.
 * This module only reads to hydrate ChecklistItem responses.
 */
@Entity
@Table(name = "documents")
@Immutable
@Getter
@NoArgsConstructor
public class Document {

    @Id
    private UUID id;

    @Column(name = "checklist_item_id")
    private UUID checklistItemId;

    @Column(name = "case_id")
    private UUID caseId;

    private String filename;

    @Column(name = "content_type")
    private String contentType;

    @Column(name = "size_bytes")
    private long sizeBytes;

    @Column(name = "uploaded_at")
    private Instant uploadedAt;
}
