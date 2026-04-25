package com.docpanther.sharing.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
    name = "share_links",
    indexes = {
        @Index(name = "idx_share_links_token",   columnList = "token",      unique = true),
        @Index(name = "idx_share_links_case_id", columnList = "case_id"),
        @Index(name = "idx_share_links_doc_id",  columnList = "document_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShareLink {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "document_id", nullable = false)
    private UUID documentId;

    @Column(name = "case_id")
    private UUID caseId;

    @Column(nullable = false, unique = true, length = 64)
    private String token;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "max_views")
    private Integer maxViews;

    @Column(name = "view_count", nullable = false)
    @Builder.Default
    private int viewCount = 0;

    @Column(name = "s3_key", nullable = false, length = 1024)
    private String s3Key;

    @Column(nullable = false, length = 512)
    private String filename;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
