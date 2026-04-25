package com.docpanther.filesystem.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
    name = "file_node_permissions",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_file_node_permissions_node_user",
        columnNames = {"node_id", "user_id"}
    ),
    indexes = {
        @Index(name = "idx_file_node_permissions_node", columnList = "node_id"),
        @Index(name = "idx_file_node_permissions_user", columnList = "user_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileNodePermission {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "node_id", nullable = false)
    private UUID nodeId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "permission_role")
    private PermissionRole role;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
