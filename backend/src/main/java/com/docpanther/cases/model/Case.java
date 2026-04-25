package com.docpanther.cases.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "cases")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Case {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_id")
    private UUID tenantId;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Column(name = "folder_id")
    private UUID folderId;

    @Column(name = "reference_no", nullable = false)
    private String referenceNo;

    @Column(name = "customer_name", nullable = false)
    private String customerName;

    @Column(name = "customer_email", nullable = false)
    private String customerEmail;

    @Column(columnDefinition = "text[]")
    @Builder.Default
    private String[] tags = new String[0];

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private CaseStatus status = CaseStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "storage_mode", nullable = false)
    @Builder.Default
    private StorageMode storageMode = StorageMode.STRUCTURED;

    @Column(name = "upload_token", nullable = false, unique = true, length = 32)
    private String uploadToken;

    @Column(name = "s3_folder")
    private String s3Folder;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "max_file_size_mb", nullable = false)
    @Builder.Default
    private int maxFileSizeMb = 25;

    @Column(name = "allowed_file_types", columnDefinition = "text[]")
    @Builder.Default
    private String[] allowedFileTypes = new String[0];

    @Column(name = "total_items", nullable = false)
    @Builder.Default
    private int totalItems = 0;

    @Column(name = "uploaded_items", nullable = false)
    @Builder.Default
    private int uploadedItems = 0;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
