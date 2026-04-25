package com.docpanther.superadmin.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "pods")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Pod {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String region;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private PodType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    @Builder.Default
    private PodStatus status = PodStatus.ACTIVE;

    @Column(name = "tenant_count", nullable = false)
    @Builder.Default
    private int tenantCount = 0;

    @Column(name = "storage_gb", nullable = false)
    @Builder.Default
    private double storageGb = 0.0;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
