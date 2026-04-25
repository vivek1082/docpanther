package com.docpanther.auth;

import com.docpanther.auth.model.*;
import com.docpanther.auth.repository.EmailVerificationRepository;
import com.docpanther.auth.repository.PasswordResetRepository;
import com.docpanther.auth.repository.UserRepository;
import com.docpanther.common.audit.AuditLogger;
import com.docpanther.common.exception.ApiException;
import com.docpanther.tenant.PodRoutingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final EmailVerificationRepository emailVerificationRepository;
    private final PasswordResetRepository passwordResetRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthMailer authMailer;
    private final AuditLogger auditLogger;
    private final JdbcTemplate jdbcTemplate;
    private final PodRoutingService podRoutingService;

    @Transactional
    public void register(RegisterRequest req) {
        if (req.name() == null || req.name().isBlank()) {
            throw ApiException.badRequest("name is required");
        }
        if (req.email() == null || req.email().isBlank()) {
            throw ApiException.badRequest("email is required");
        }
        if (req.password() == null || req.password().length() < 8) {
            throw ApiException.badRequest("password must be at least 8 characters");
        }
        if (req.mode() == null) {
            throw ApiException.badRequest("mode is required");
        }
        if (userRepository.findByEmail(req.email()).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "EMAIL_TAKEN", "Email already registered");
        }

        if (req.mode() == RegistrationMode.ENTERPRISE && (req.orgName() == null || req.orgName().isBlank())) {
            throw ApiException.badRequest("orgName is required for ENTERPRISE registration");
        }

        User user = User.builder()
            .email(req.email())
            .name(req.name())
            .passwordHash(passwordEncoder.encode(req.password()))
            .emailVerified(false)
            .registrationMode(req.mode())
            .orgName(req.orgName())
            .orgSlug(req.orgSlug())
            .orgRegion(req.region())
            .build();

        user = userRepository.saveAndFlush(user);

        if (req.mode() == RegistrationMode.ENTERPRISE && req.orgSlug() != null) {
            UUID tenantId = UUID.randomUUID();
            String region = req.region() != null ? req.region() : "ap-south-1";
            jdbcTemplate.update(
                "INSERT INTO tenants (id, slug, name, region, plan) VALUES (?, ?, ?, CAST(? AS tenant_region), CAST('FREE' AS tenant_plan))",
                tenantId, req.orgSlug(), req.orgName(), region
            );
            jdbcTemplate.update(
                "INSERT INTO user_tenant_roles (user_id, tenant_id, role) VALUES (?, ?, CAST('TENANT_ADMIN' AS user_role))",
                user.getId(), tenantId
            );
            jdbcTemplate.update("UPDATE users SET tenant_id = ? WHERE id = ?", tenantId, user.getId());
            user.setTenantId(tenantId);
            assignTenantToDefaultPod(tenantId);
        } else if (req.mode() == RegistrationMode.INDIVIDUAL) {
            // Create a personal tenant so the user can use the filesystem
            UUID tenantId = UUID.randomUUID();
            String slug = "personal-" + user.getId().toString().substring(0, 8);
            jdbcTemplate.update(
                "INSERT INTO tenants (id, slug, name, region, plan) VALUES (?, ?, ?, CAST('ap-south-1' AS tenant_region), CAST('FREE' AS tenant_plan))",
                tenantId, slug, user.getName()
            );
            jdbcTemplate.update("UPDATE users SET tenant_id = ? WHERE id = ?", tenantId, user.getId());
            UUID folderId = UUID.randomUUID();
            jdbcTemplate.update(
                "INSERT INTO file_nodes (id, tenant_id, parent_id, name, type, created_by) VALUES (?, ?, NULL, 'My Files', 'FOLDER', ?)",
                folderId, tenantId, user.getId()
            );
            jdbcTemplate.update(
                "INSERT INTO file_node_permissions (node_id, user_id, role) VALUES (?, ?, CAST('OWNER' AS permission_role))",
                folderId, user.getId()
            );
            user.setTenantId(tenantId);
            assignTenantToDefaultPod(tenantId);
        }

        String token = UUID.randomUUID().toString();
        EmailVerification ev = EmailVerification.builder()
            .userId(user.getId())
            .token(token)
            .expiresAt(Instant.now().plus(24, ChronoUnit.HOURS))
            .build();
        emailVerificationRepository.save(ev);

        authMailer.sendEmailVerification(user.getEmail(), user.getName(), token);
        auditLogger.log("USER_REGISTERED", "ADMIN",
            user.getId(), user.getTenantId(), null, null,
            Map.of("email", user.getEmail(), "mode", req.mode().name()));
    }

    @Transactional
    public Map<String, String> verifyEmail(String token) {
        if (token == null || token.isBlank()) {
            throw ApiException.badRequest("token is required");
        }
        EmailVerification ev = emailVerificationRepository.findByToken(token)
            .orElseThrow(() -> ApiException.badRequest("Invalid verification token"));

        if (ev.isUsed()) {
            throw ApiException.badRequest("Verification token already used");
        }
        if (ev.getExpiresAt().isBefore(Instant.now())) {
            throw ApiException.badRequest("Verification token expired");
        }

        User user = userRepository.findById(ev.getUserId())
            .orElseThrow(() -> ApiException.notFound("User"));

        user.setEmailVerified(true);
        userRepository.save(user);

        ev.setUsed(true);
        emailVerificationRepository.save(ev);

        auditLogger.log("EMAIL_VERIFIED", "ADMIN",
            user.getId(), user.getTenantId(), null, null,
            Map.of("email", user.getEmail()));
        return issueTokenPair(user);
    }

    @Transactional
    public Map<String, String> login(String email, String password) {
        if (email == null || password == null) {
            throw ApiException.unauthorized("Invalid credentials");
        }
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> ApiException.unauthorized("Invalid credentials"));

        if (user.getPasswordHash() == null) {
            throw ApiException.unauthorized("Invalid credentials");
        }
        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw ApiException.unauthorized("Invalid credentials");
        }
        if (!user.isEmailVerified()) {
            throw ApiException.unauthorized("Email not verified");
        }

        auditLogger.log("USER_LOGGED_IN", "ADMIN",
            user.getId(), user.getTenantId(), null, null,
            Map.of("email", email));
        return issueTokenPair(user);
    }

    @Transactional
    public void forgotPassword(String email) {
        if (email == null || email.isBlank()) {
            return;
        }
        userRepository.findByEmail(email).ifPresent(user -> {
            String token = UUID.randomUUID().toString();
            PasswordReset pr = PasswordReset.builder()
                .userId(user.getId())
                .token(token)
                .expiresAt(Instant.now().plus(1, ChronoUnit.HOURS))
                .build();
            passwordResetRepository.save(pr);
            authMailer.sendPasswordReset(user.getEmail(), user.getName(), token);
            auditLogger.log("PASSWORD_RESET_REQUESTED", "ADMIN",
                user.getId(), user.getTenantId(), null, null,
                Map.of("email", user.getEmail()));
        });
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        if (token == null || newPassword == null || newPassword.length() < 8) {
            throw ApiException.badRequest("token and newPassword (min 8 chars) are required");
        }
        PasswordReset pr = passwordResetRepository.findByToken(token)
            .orElseThrow(() -> ApiException.badRequest("Invalid or expired token"));

        if (pr.isUsed()) {
            throw ApiException.badRequest("Reset token already used");
        }
        if (pr.getExpiresAt().isBefore(Instant.now())) {
            throw ApiException.badRequest("Reset token expired");
        }

        User user = userRepository.findById(pr.getUserId())
            .orElseThrow(() -> ApiException.notFound("User"));

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        pr.setUsed(true);
        passwordResetRepository.save(pr);

        auditLogger.log("PASSWORD_RESET", "ADMIN",
            user.getId(), user.getTenantId(), null, null,
            Map.of("email", user.getEmail()));
    }

    public Map<String, String> refresh(String refreshToken) {
        if (refreshToken == null) {
            throw ApiException.badRequest("refresh_token is required");
        }
        String userId = jwtService.validateRefreshToken(refreshToken);
        if (userId == null) {
            throw ApiException.unauthorized("Invalid or expired refresh token");
        }
        User user = userRepository.findById(UUID.fromString(userId))
            .orElseThrow(() -> ApiException.unauthorized("User not found"));
        jwtService.revokeRefreshToken(refreshToken);
        Map<String, String> tokens = issueTokenPair(user);
        auditLogger.log("TOKEN_REFRESHED", "ADMIN",
            UUID.fromString(userId), user.getTenantId(), null, null, Map.of());
        return tokens;
    }

    @Transactional
    public User updateProfile(UUID userId, String name, String avatarUrl, String currentPassword, String newPassword) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> ApiException.notFound("User"));

        if (name != null && !name.isBlank()) {
            user.setName(name);
        }
        if (avatarUrl != null) {
            user.setAvatarUrl(avatarUrl.isBlank() ? null : avatarUrl);
        }
        if (newPassword != null && !newPassword.isBlank()) {
            if (currentPassword == null || !passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
                throw ApiException.badRequest("Current password is incorrect");
            }
            if (newPassword.length() < 8) {
                throw ApiException.badRequest("newPassword must be at least 8 characters");
            }
            user.setPasswordHash(passwordEncoder.encode(newPassword));
        }

        user = userRepository.save(user);
        auditLogger.log("USER_PROFILE_UPDATED", "ADMIN",
            userId, user.getTenantId(), null, null, Map.of());
        return user;
    }

    public void logout(String refreshToken) {
        if (refreshToken == null) return;
        String userId = jwtService.validateRefreshToken(refreshToken);
        jwtService.revokeRefreshToken(refreshToken);
        UUID actorId = userId != null ? UUID.fromString(userId) : null;
        auditLogger.log("USER_LOGGED_OUT", "ADMIN",
            actorId, null, null, null, Map.of());
    }

    private Map<String, String> issueTokenPair(User user) {
        String userId = user.getId().toString();
        String tenantId = user.getTenantId() != null ? user.getTenantId().toString() : null;
        String role = null;
        if (user.getTenantId() != null) {
            try {
                role = jdbcTemplate.queryForObject(
                    "SELECT role FROM user_tenant_roles WHERE user_id = ? AND tenant_id = ? LIMIT 1",
                    String.class, user.getId(), user.getTenantId());
            } catch (Exception ignored) {}
        }
        String access = jwtService.generateAccessToken(userId, user.getEmail(), tenantId, role);
        String refresh = jwtService.generateRefreshToken(userId);
        return Map.of("access_token", access, "refresh_token", refresh);
    }

    /**
     * Assigns a new tenant to the default pod and caches the route in Redis.
     * Uses a best-effort approach — if no ACTIVE pod exists, the tenant falls
     * back to the control-plane DataSource via the router's default.
     */
    private void assignTenantToDefaultPod(UUID tenantId) {
        try {
            UUID podId = jdbcTemplate.query(
                "SELECT id FROM pods WHERE status = 'ACTIVE' ORDER BY tenant_count ASC, created_at ASC LIMIT 1",
                rs -> rs.next() ? UUID.fromString(rs.getString("id")) : null
            );
            if (podId == null) return;

            jdbcTemplate.update(
                "INSERT INTO tenant_pod_assignments (id, tenant_id, pod_id) VALUES (gen_random_uuid(), ?, ?) ON CONFLICT DO NOTHING",
                tenantId, podId
            );
            jdbcTemplate.update(
                "UPDATE pods SET tenant_count = tenant_count + 1 WHERE id = ?", podId
            );
            podRoutingService.cachePodRoute(tenantId, podId.toString());
        } catch (Exception e) {
            // Non-fatal — tenant will route to control-plane fallback
            org.slf4j.LoggerFactory.getLogger(AuthService.class)
                .warn("Could not assign tenant {} to pod: {}", tenantId, e.getMessage());
        }
    }

    record RegisterRequest(
        RegistrationMode mode,
        String name,
        String email,
        String password,
        String orgName,
        String orgSlug,
        String region,
        String billingAddress,
        String country
    ) {}
}
