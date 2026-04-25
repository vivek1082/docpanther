package com.docpanther.education.model;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.util.UUID;

@Entity
@Table(name = "student_storage")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentStorage {

    @EmbeddedId
    private StudentStorageId id;

    @Column(name = "quota_bytes", nullable = false)
    @Builder.Default
    private long quotaBytes = 5_368_709_120L; // 5 GB

    @Column(name = "used_bytes", nullable = false)
    @Builder.Default
    private long usedBytes = 0L;

    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class StudentStorageId implements Serializable {

        @Column(name = "user_id")
        private UUID userId;

        @Column(name = "tenant_id")
        private UUID tenantId;
    }
}
