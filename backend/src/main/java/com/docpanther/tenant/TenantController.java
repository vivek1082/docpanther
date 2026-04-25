package com.docpanther.tenant;

import com.docpanther.tenant.model.Tenant;
import com.docpanther.tenant.model.TenantRole;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.UUID;

@RestController
@RequestMapping("/api/tenants")
@RequiredArgsConstructor
public class TenantController {

    private final TenantService tenantService;

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<TenantDto> getTenant(
            @AuthenticationPrincipal(expression = "tenantId") UUID tenantId) {
        return ResponseEntity.ok(TenantDto.from(tenantService.getCurrentTenant(tenantId)));
    }

    @PutMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<TenantDto> updateTenant(
            @AuthenticationPrincipal(expression = "id")       UUID userId,
            @AuthenticationPrincipal(expression = "tenantId") UUID tenantId,
            @RequestBody UpdateTenantBody body) {
        return ResponseEntity.ok(TenantDto.from(tenantService.updateTenant(userId, tenantId, body.name(), body.logoUrl(), body.educationEnabled())));
    }

    @GetMapping("/me/usage")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<TenantService.UsageDto> getUsage(
            @AuthenticationPrincipal(expression = "tenantId") UUID tenantId) {
        return ResponseEntity.ok(tenantService.getUsage(tenantId));
    }

    @GetMapping("/me/members")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<java.util.List<MemberDto>> listMembers(
            @AuthenticationPrincipal(expression = "tenantId") UUID tenantId) {
        return ResponseEntity.ok(tenantService.listMembers(tenantId));
    }

    @PostMapping("/me/members")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> inviteMember(
            @AuthenticationPrincipal(expression = "id")       UUID userId,
            @AuthenticationPrincipal(expression = "tenantId") UUID tenantId,
            @Valid @RequestBody InviteMemberBody body) {
        tenantService.inviteMember(userId, tenantId, body.email(), body.role());
        return ResponseEntity.ok().build();
    }

    @PutMapping("/me/members/{userId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> updateMemberRole(
            @AuthenticationPrincipal(expression = "id")       UUID actorId,
            @AuthenticationPrincipal(expression = "tenantId") UUID tenantId,
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateRoleBody body) {
        tenantService.updateMemberRole(actorId, tenantId, userId, body.role());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/me/members/{userId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> removeMember(
            @AuthenticationPrincipal(expression = "id")       UUID actorId,
            @AuthenticationPrincipal(expression = "tenantId") UUID tenantId,
            @PathVariable UUID userId) {
        tenantService.removeMember(actorId, tenantId, userId);
        return ResponseEntity.noContent().build();
    }

    // ── DTOs ─────────────────────────────────────────────────────────

    record TenantDto(
            String id,
            String slug,
            String name,
            String region,
            String plan,
            String logoUrl,
            boolean educationEnabled,
            Instant createdAt) {

        static TenantDto from(Tenant t) {
            return new TenantDto(
                    t.getId().toString(),
                    t.getSlug(),
                    t.getName(),
                    t.getRegion(),
                    t.getPlan(),
                    t.getLogoUrl(),
                    t.isEducationEnabled(),
                    t.getCreatedAt());
        }
    }

    record UpdateTenantBody(String name, String logoUrl, Boolean educationEnabled) {}

    record InviteMemberBody(
            @NotBlank @Email String email,
            @NotNull TenantRole role) {}

    record UpdateRoleBody(@NotNull TenantRole role) {}
}
