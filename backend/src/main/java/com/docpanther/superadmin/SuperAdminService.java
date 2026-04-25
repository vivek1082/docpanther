package com.docpanther.superadmin;

import com.docpanther.common.audit.AuditLogger;
import com.docpanther.common.exception.ApiException;
import com.docpanther.superadmin.dto.PlatformStatsDto;
import com.docpanther.superadmin.dto.PodDto;
import com.docpanther.superadmin.dto.TenantWithStatsDto;
import com.docpanther.superadmin.dto.UserLookupDto;
import com.docpanther.superadmin.model.Pod;
import com.docpanther.superadmin.model.PodStatus;
import com.docpanther.superadmin.model.PodType;
import com.docpanther.superadmin.model.TenantAdminMetadata;
import com.docpanther.superadmin.repository.PodRepository;
import com.docpanther.superadmin.repository.TenantAdminMetadataRepository;
import com.docpanther.superadmin.repository.TenantPodAssignmentRepository;
import com.docpanther.tenant.PodDataSourceRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SuperAdminService {

    private static final List<String> VALID_PLANS = List.of("FREE", "STARTER", "GROWTH", "ENTERPRISE");

    private final JdbcTemplate jdbcTemplate;
    private final PodRepository podRepository;
    private final TenantPodAssignmentRepository tenantPodAssignmentRepository;
    private final TenantAdminMetadataRepository tenantAdminMetadataRepository;
    private final PodMigrationJob podMigrationJob;
    private final AuditLogger auditLogger;
    private final PodDataSourceRegistry podDataSourceRegistry;

    // ── Tenant management ────────────────────────────────────────────

    public List<TenantWithStatsDto> listTenants() {
        String sql = """
                SELECT t.id::text,
                       t.slug,
                       t.name,
                       t.region,
                       t.plan,
                       t.logo_url,
                       t.created_at,
                       tpa.pod_id::text AS pod_id,
                       p.region        AS pod_region,
                       COALESCE(p.storage_gb, 0) AS storage_gb
                FROM tenants t
                LEFT JOIN tenant_pod_assignments tpa ON t.id = tpa.tenant_id
                LEFT JOIN pods p ON tpa.pod_id = p.id
                ORDER BY t.created_at DESC
                """;

        return jdbcTemplate.query(sql, (rs, rowNum) -> new TenantWithStatsDto(
                rs.getString("id"),
                rs.getString("slug"),
                rs.getString("name"),
                rs.getString("region"),
                rs.getString("plan"),
                rs.getString("logo_url"),
                rs.getTimestamp("created_at") != null
                        ? rs.getTimestamp("created_at").toInstant() : null,
                rs.getString("pod_id"),
                rs.getString("pod_region"),
                rs.getDouble("storage_gb"),
                0
        ));
    }

    @Transactional
    public void changePlan(UUID actorId, UUID tenantId, String plan) {
        if (!VALID_PLANS.contains(plan)) {
            throw ApiException.badRequest("Invalid plan. Must be one of: " + String.join(", ", VALID_PLANS));
        }
        int updated = jdbcTemplate.update(
                "UPDATE tenants SET plan = ? WHERE id = ?::uuid",
                plan, tenantId.toString());
        if (updated == 0) {
            throw ApiException.notFound("Tenant");
        }
        auditLogger.log("TENANT_PLAN_CHANGED", "ADMIN", actorId, tenantId, null, null,
                Map.of("newPlan", plan));
    }

    @Transactional
    public void suspendTenant(UUID actorId, UUID tenantId, String reason) {
        requireTenantExists(tenantId);
        TenantAdminMetadata meta = tenantAdminMetadataRepository.findById(tenantId)
                .orElseGet(() -> TenantAdminMetadata.builder().tenantId(tenantId).build());
        meta.setSuspended(true);
        meta.setSuspensionReason(reason);
        meta.setSuspendedAt(Instant.now());
        tenantAdminMetadataRepository.save(meta);
        auditLogger.log("TENANT_SUSPENDED", "ADMIN", actorId, tenantId, null, null,
                Map.of("reason", reason != null ? reason : ""));
    }

    @Transactional
    public void reactivateTenant(UUID actorId, UUID tenantId) {
        requireTenantExists(tenantId);
        TenantAdminMetadata meta = tenantAdminMetadataRepository.findById(tenantId)
                .orElseGet(() -> TenantAdminMetadata.builder().tenantId(tenantId).build());
        meta.setSuspended(false);
        meta.setSuspensionReason(null);
        meta.setSuspendedAt(null);
        tenantAdminMetadataRepository.save(meta);
        auditLogger.log("TENANT_REACTIVATED", "ADMIN", actorId, tenantId, null, null, Map.of());
    }

    public void initiateTenantMove(UUID actorId, UUID tenantId, UUID targetPodId) {
        requireTenantExists(tenantId);
        podRepository.findById(targetPodId)
                .orElseThrow(() -> ApiException.notFound("Target pod"));
        podMigrationJob.migrateTenant(actorId, tenantId, targetPodId);
        auditLogger.log("TENANT_MOVE_INITIATED", "ADMIN", actorId, tenantId, null, null,
                Map.of("targetPodId", targetPodId.toString()));
    }

    // ── Pod management ───────────────────────────────────────────────

    public List<PodDto> listPods() {
        return podRepository.findAll().stream()
                .map(p -> new PodDto(
                        p.getId().toString(),
                        p.getRegion(),
                        p.getType().name(),
                        p.getStatus().name(),
                        p.getTenantCount(),
                        p.getStorageGb()))
                .toList();
    }

    @Transactional
    public PodDto provisionPod(UUID actorId, String region, String type,
                               String dbUrl, String dbUsername, String dbPassword) {
        PodType podType;
        try {
            podType = PodType.valueOf(type);
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("Invalid pod type. Must be STANDARD or PREMIUM");
        }

        Pod pod = podRepository.save(Pod.builder()
                .region(region)
                .type(podType)
                .status(PodStatus.ACTIVE)
                .dbUrl(dbUrl)
                .dbUsername(dbUsername)
                .dbPassword(dbPassword)
                .build());

        // Register the new pod's DataSource immediately — no restart needed.
        podDataSourceRegistry.registerPod(pod.getId().toString(), dbUrl, dbUsername, dbPassword);

        auditLogger.log("POD_PROVISIONED", "ADMIN", actorId, null, null, null,
                Map.of("podId", pod.getId().toString(), "region", region, "type", type));

        return new PodDto(pod.getId().toString(), pod.getRegion(),
                pod.getType().name(), pod.getStatus().name(),
                pod.getTenantCount(), pod.getStorageGb());
    }

    @Transactional
    public void setPodStatus(UUID actorId, UUID podId, String status) {
        PodStatus podStatus;
        try {
            podStatus = PodStatus.valueOf(status);
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("Invalid pod status. Must be ACTIVE, DRAINING, or FULL");
        }
        Pod pod = podRepository.findById(podId)
                .orElseThrow(() -> ApiException.notFound("Pod"));
        pod.setStatus(podStatus);
        podRepository.save(pod);
        auditLogger.log("POD_STATUS_CHANGED", "ADMIN", actorId, null, null, null,
                Map.of("podId", podId.toString(), "status", status));
    }

    // ── Platform stats ───────────────────────────────────────────────

    public PlatformStatsDto getPlatformStats() {
        long totalTenants = queryCount("SELECT COUNT(*) FROM tenants");
        long totalIndividuals = queryCount("SELECT COUNT(*) FROM users WHERE tenant_id IS NULL");
        double totalStorageGb = queryDouble("SELECT COALESCE(SUM(storage_gb), 0) FROM pods");
        long activePodsCount = podRepository.countByStatus(PodStatus.ACTIVE);
        return new PlatformStatsDto(totalTenants, totalIndividuals, 0L, totalStorageGb, activePodsCount);
    }

    // ── User lookup ──────────────────────────────────────────────────

    public UserLookupDto findUserByEmail(UUID actorId, String email) {
        String sql = """
                SELECT id::text, email, name, avatar_url, email_verified, created_at, tenant_id::text
                FROM users
                WHERE email = ?
                """;
        try {
            UserLookupDto result = jdbcTemplate.queryForObject(sql, (rs, rowNum) -> new UserLookupDto(
                    rs.getString("id"),
                    rs.getString("email"),
                    rs.getString("name"),
                    rs.getString("avatar_url"),
                    rs.getBoolean("email_verified"),
                    rs.getTimestamp("created_at") != null
                            ? rs.getTimestamp("created_at").toInstant() : null,
                    rs.getString("tenant_id")
            ), email);

            auditLogger.log("USER_LOOKUP", "ADMIN", actorId, null, null, null,
                    Map.of("queriedEmail", email));
            return result;
        } catch (EmptyResultDataAccessException e) {
            throw ApiException.notFound("User");
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────

    private void requireTenantExists(UUID tenantId) {
        Long count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM tenants WHERE id = ?::uuid", Long.class, tenantId.toString());
        if (count == null || count == 0) {
            throw ApiException.notFound("Tenant");
        }
    }

    private long queryCount(String sql) {
        Long result = jdbcTemplate.queryForObject(sql, Long.class);
        return result != null ? result : 0L;
    }

    private double queryDouble(String sql) {
        Double result = jdbcTemplate.queryForObject(sql, Double.class);
        return result != null ? result : 0.0;
    }
}
