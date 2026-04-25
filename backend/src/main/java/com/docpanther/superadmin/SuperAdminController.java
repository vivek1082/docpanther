package com.docpanther.superadmin;

import com.docpanther.superadmin.dto.PlatformStatsDto;
import com.docpanther.superadmin.dto.PodDto;
import com.docpanther.superadmin.dto.TenantWithStatsDto;
import com.docpanther.superadmin.dto.UserLookupDto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class SuperAdminController {

    private final SuperAdminService superAdminService;

    // ── Tenants ──────────────────────────────────────────────────────

    @GetMapping("/tenants")
    public ResponseEntity<Map<String, List<TenantWithStatsDto>>> listTenants() {
        return ResponseEntity.ok(Map.of("content", superAdminService.listTenants()));
    }

    @PostMapping("/tenants/{id}/move-pod")
    public ResponseEntity<Void> movePod(
            @AuthenticationPrincipal(expression = "id") UUID actorId,
            @PathVariable UUID id,
            @RequestBody MovePodBody body) {
        superAdminService.initiateTenantMove(actorId, id, body.targetPodId());
        return ResponseEntity.ok().build();
    }

    // ── Pods ─────────────────────────────────────────────────────────

    @GetMapping("/pods")
    public ResponseEntity<List<PodDto>> listPods() {
        return ResponseEntity.ok(superAdminService.listPods());
    }

    @PostMapping("/pods")
    public ResponseEntity<PodDto> provisionPod(
            @AuthenticationPrincipal(expression = "id") UUID actorId,
            @RequestBody ProvisionPodBody body) {
        PodDto pod = superAdminService.provisionPod(actorId, body.region(), body.type());
        return ResponseEntity.status(HttpStatus.CREATED).body(pod);
    }

    @PostMapping("/tenants/{id}/suspend")
    public ResponseEntity<Void> suspendTenant(
            @AuthenticationPrincipal(expression = "id") UUID actorId,
            @PathVariable UUID id,
            @RequestBody(required = false) SuspendBody body) {
        superAdminService.suspendTenant(actorId, id, body != null ? body.reason() : null);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/tenants/{id}/reactivate")
    public ResponseEntity<Void> reactivateTenant(
            @AuthenticationPrincipal(expression = "id") UUID actorId,
            @PathVariable UUID id) {
        superAdminService.reactivateTenant(actorId, id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/tenants/{id}/plan")
    public ResponseEntity<Void> changePlan(
            @AuthenticationPrincipal(expression = "id") UUID actorId,
            @PathVariable UUID id,
            @RequestBody ChangePlanBody body) {
        superAdminService.changePlan(actorId, id, body.plan());
        return ResponseEntity.ok().build();
    }

    // ── Pods ─────────────────────────────────────────────────────────

    @PutMapping("/pods/{id}/status")
    public ResponseEntity<Void> setPodStatus(
            @AuthenticationPrincipal(expression = "id") UUID actorId,
            @PathVariable UUID id,
            @RequestBody SetPodStatusBody body) {
        superAdminService.setPodStatus(actorId, id, body.status());
        return ResponseEntity.ok().build();
    }

    // ── Users ─────────────────────────────────────────────────────────

    @GetMapping("/users")
    public ResponseEntity<UserLookupDto> findUser(
            @AuthenticationPrincipal(expression = "id") UUID actorId,
            @RequestParam String email) {
        return ResponseEntity.ok(superAdminService.findUserByEmail(actorId, email));
    }

    // ── Stats ─────────────────────────────────────────────────────────

    @GetMapping("/stats")
    public ResponseEntity<PlatformStatsDto> getStats() {
        return ResponseEntity.ok(superAdminService.getPlatformStats());
    }

    // ── Request bodies ────────────────────────────────────────────────

    record MovePodBody(@NotNull UUID targetPodId) {}

    record ProvisionPodBody(@NotBlank String region, @NotBlank String type) {}

    record SuspendBody(String reason) {}

    record ChangePlanBody(@NotBlank String plan) {}

    record SetPodStatusBody(@NotBlank String status) {}
}
