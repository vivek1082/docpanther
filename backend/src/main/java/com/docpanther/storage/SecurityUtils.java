package com.docpanther.storage;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.lang.reflect.Method;
import java.util.UUID;

// The JwtAuthFilter sets principal = User entity (from auth module).
// We use reflection to avoid a compile-time import across module boundaries.
// When a common UserPrincipal interface is added to common/, replace with a cast.
final class SecurityUtils {

    private SecurityUtils() {}

    static UUID currentUserId() {
        Object principal = requirePrincipal();
        try {
            Method m = principal.getClass().getMethod("getId");
            return (UUID) m.invoke(principal);
        } catch (Exception e) {
            throw new IllegalStateException("Cannot extract userId from principal", e);
        }
    }

    static UUID currentTenantId() {
        Object principal = requirePrincipal();
        try {
            Method m = principal.getClass().getMethod("getTenantId");
            Object result = m.invoke(principal);
            return result != null ? (UUID) result : null;
        } catch (Exception e) {
            throw new IllegalStateException("Cannot extract tenantId from principal", e);
        }
    }

    private static Object requirePrincipal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new IllegalStateException("No authenticated user in SecurityContext");
        }
        return auth.getPrincipal();
    }
}
