package com.docpanther.auth;

import com.docpanther.auth.model.User;
import com.docpanther.auth.model.RegistrationMode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    @PreAuthorize("permitAll()")
    public ResponseEntity<Void> register(@RequestBody RegisterBody body) {
        authService.register(new AuthService.RegisterRequest(
            body.mode(), body.name(), body.email(), body.password(),
            body.orgName(), body.orgSlug(), body.region(),
            body.billingAddress(), body.country()
        ));
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PostMapping("/verify-email")
    @PreAuthorize("permitAll()")
    public ResponseEntity<Map<String, String>> verifyEmail(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(authService.verifyEmail(body.get("token")));
    }

    @PostMapping("/login")
    @PreAuthorize("permitAll()")
    public ResponseEntity<Map<String, String>> login(@RequestBody LoginBody body) {
        return ResponseEntity.ok(authService.login(body.email(), body.password()));
    }

    @PostMapping("/forgot-password")
    @PreAuthorize("permitAll()")
    public ResponseEntity<Void> forgotPassword(@RequestBody Map<String, String> body) {
        authService.forgotPassword(body.get("email"));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/reset-password")
    @PreAuthorize("permitAll()")
    public ResponseEntity<Void> resetPassword(@RequestBody ResetPasswordBody body) {
        authService.resetPassword(body.token(), body.newPassword());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/refresh")
    @PreAuthorize("permitAll()")
    public ResponseEntity<Map<String, String>> refresh(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(authService.refresh(body.get("refresh_token")));
    }

    @PostMapping("/logout")
    @PreAuthorize("permitAll()")
    public ResponseEntity<Void> logout(@RequestBody Map<String, String> body) {
        authService.logout(body.get("refresh_token"));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserDto> me(@AuthenticationPrincipal User user) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        String role = auth.getAuthorities().stream()
            .map(a -> a.getAuthority())
            .filter(a -> a.startsWith("ROLE_") && !a.equals("ROLE_USER"))
            .map(a -> a.substring(5))
            .findFirst()
            .orElse(null);
        return ResponseEntity.ok(UserDto.from(user, role));
    }

    @PutMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserDto> updateMe(
            @AuthenticationPrincipal User user,
            @RequestBody UpdateProfileBody body) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        String role = auth.getAuthorities().stream()
            .map(a -> a.getAuthority())
            .filter(a -> a.startsWith("ROLE_") && !a.equals("ROLE_USER"))
            .map(a -> a.substring(5))
            .findFirst()
            .orElse(null);
        return ResponseEntity.ok(UserDto.from(authService.updateProfile(user.getId(), body.name(), body.avatarUrl(), body.currentPassword(), body.newPassword()), role));
    }

    // ── DTOs ─────────────────────────────────────────────────────────

    record RegisterBody(
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

    record LoginBody(String email, String password) {}

    record ResetPasswordBody(String token, String newPassword) {}

    record UpdateProfileBody(String name, String avatarUrl, String currentPassword, String newPassword) {}

    record UserDto(
        String id,
        String email,
        String name,
        String avatarUrl,
        boolean emailVerified,
        Instant createdAt,
        String role,
        String orgSlug
    ) {
        static UserDto from(User u, String role) {
            return new UserDto(
                u.getId().toString(),
                u.getEmail(),
                u.getName(),
                u.getAvatarUrl(),
                u.isEmailVerified(),
                u.getCreatedAt(),
                role,
                u.getOrgSlug()
            );
        }
    }
}
