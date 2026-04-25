package com.docpanther.tenant;



import com.docpanther.common.audit.AuditLogger;
import com.docpanther.common.exception.ApiException;
import com.docpanther.tenant.model.Tenant;
import com.docpanther.tenant.model.TenantInvite;
import com.docpanther.tenant.model.TenantRole;
import com.docpanther.tenant.model.UserTenantRole;
import com.docpanther.tenant.repository.TenantInviteRepository;
import com.docpanther.tenant.repository.TenantRepository;
import com.docpanther.tenant.repository.UserTenantRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TenantService {

    private final TenantRepository tenantRepository;
    private final TenantInviteRepository tenantInviteRepository;
    private final UserTenantRoleRepository userTenantRoleRepository;
    private final TenantMailer tenantMailer;
    private final AuditLogger auditLogger;
    private final JdbcTemplate jdbcTemplate;

    public Tenant getCurrentTenant(UUID tenantId) {
        if (tenantId == null) {
            throw ApiException.notFound("Tenant");
        }
        return tenantRepository.findById(tenantId)
            .orElseThrow(() -> ApiException.notFound("Tenant"));
    }

    @Transactional
    public Tenant updateTenant(UUID userId, UUID tenantId, String name, String logoUrl, Boolean educationEnabled) {
        Tenant tenant = getCurrentTenant(tenantId);
        requireAdminRole(userId, tenantId);

        if (name != null && !name.isBlank()) {
            tenant.setName(name);
        }
        if (logoUrl != null) {
            tenant.setLogoUrl(logoUrl.isBlank() ? null : logoUrl);
        }
        if (educationEnabled != null) {
            boolean isEnterprise = "ENTERPRISE".equals(tenant.getPlan());
            if (educationEnabled && !isEnterprise) {
                throw ApiException.badRequest("Education module is only available on the ENTERPRISE plan");
            }
            tenant.setEducationEnabled(educationEnabled);
        }
        tenant = tenantRepository.save(tenant);

        auditLogger.log("TENANT_UPDATED", "ADMIN",
            userId, tenant.getId(), null, null,
            Map.of("name", tenant.getName()));
        return tenant;
    }

    public UsageDto getUsage(UUID tenantId) {
        if (tenantId == null) throw ApiException.notFound("Tenant");
        Long storageBytesUsed = jdbcTemplate.queryForObject(
            "SELECT COALESCE(SUM(size_bytes), 0) FROM file_nodes WHERE tenant_id = ?",
            Long.class, tenantId);
        Long docBytesUsed = jdbcTemplate.queryForObject(
            "SELECT COALESCE(SUM(size_bytes), 0) FROM documents WHERE tenant_id = ?",
            Long.class, tenantId);
        Long caseCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM cases WHERE tenant_id = ?",
            Long.class, tenantId);
        return new UsageDto(
            (storageBytesUsed == null ? 0L : storageBytesUsed) + (docBytesUsed == null ? 0L : docBytesUsed),
            caseCount == null ? 0L : caseCount
        );
    }

    public record UsageDto(long storageBytesUsed, long caseCount) {}

    @Transactional
    public void inviteMember(UUID userId, UUID tenantId, String email, TenantRole role) {
        if (tenantId == null) {
            throw ApiException.forbidden();
        }
        requireAdminRole(userId, tenantId);

        Tenant tenant = tenantRepository.findById(tenantId)
            .orElseThrow(() -> ApiException.notFound("Tenant"));

        tenantInviteRepository
            .findByTenantIdAndEmailAndAcceptedFalse(tenant.getId(), email)
            .ifPresent(existing -> { throw ApiException.conflict("Invite already pending for this email"); });

        String token = UUID.randomUUID().toString();
        TenantInvite invite = TenantInvite.builder()
            .tenantId(tenant.getId())
            .email(email)
            .role(role)
            .token(token)
            .expiresAt(Instant.now().plus(7, ChronoUnit.DAYS))
            .build();
        tenantInviteRepository.save(invite);

        tenantMailer.sendInvite(email, tenant.getName(), role.name(), token);

        auditLogger.log("MEMBER_INVITED", "ADMIN",
            userId, tenant.getId(), null, null,
            Map.of("email", email, "role", role.name()));
    }

    @Transactional
    public void updateMemberRole(UUID userId, UUID tenantId, UUID targetUserId, TenantRole role) {
        if (tenantId == null) {
            throw ApiException.forbidden();
        }
        requireAdminRole(userId, tenantId);

        UserTenantRole utr = userTenantRoleRepository
            .findByUserIdAndTenantId(targetUserId, tenantId)
            .orElseThrow(() -> ApiException.notFound("Member"));

        utr.setRole(role);
        userTenantRoleRepository.save(utr);

        auditLogger.log("MEMBER_ROLE_UPDATED", "ADMIN",
            userId, tenantId, null, null,
            Map.of("targetUserId", targetUserId.toString(), "role", role.name()));
    }

    @Transactional
    public void removeMember(UUID userId, UUID tenantId, UUID targetUserId) {
        if (tenantId == null) {
            throw ApiException.forbidden();
        }
        requireAdminRole(userId, tenantId);

        userTenantRoleRepository
            .findByUserIdAndTenantId(targetUserId, tenantId)
            .orElseThrow(() -> ApiException.notFound("Member"));

        userTenantRoleRepository.deleteByUserIdAndTenantId(targetUserId, tenantId);

        auditLogger.log("MEMBER_REMOVED", "ADMIN",
            userId, tenantId, null, null,
            Map.of("targetUserId", targetUserId.toString()));
    }

    public List<MemberDto> listMembers(UUID tenantId) {
        return jdbcTemplate.query(
            "SELECT u.id, u.email, u.name, utr.role, utr.created_at " +
            "FROM user_tenant_roles utr JOIN users u ON u.id = utr.user_id " +
            "WHERE utr.tenant_id = ? ORDER BY utr.created_at",
            (rs, n) -> new MemberDto(
                UUID.fromString(rs.getString("id")),
                rs.getString("email"),
                rs.getString("name"),
                rs.getString("role"),
                rs.getObject("created_at", Timestamp.class).toInstant()
            ),
            tenantId
        );
    }

    private void requireAdminRole(UUID userId, UUID tenantId) {
        userTenantRoleRepository
            .findByUserIdAndTenantId(userId, tenantId)
            .filter(utr -> utr.getRole() == TenantRole.TENANT_ADMIN)
            .orElseThrow(ApiException::forbidden);
    }
}
