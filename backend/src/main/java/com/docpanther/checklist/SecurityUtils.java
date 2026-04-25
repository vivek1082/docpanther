package com.docpanther.checklist;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.lang.reflect.Method;
import java.util.UUID;

public final class SecurityUtils {

    private SecurityUtils() {}

    public static UUID currentUserId() {
        Object principal = getAuthentication().getPrincipal();
        try {
            Method getId = principal.getClass().getMethod("getId");
            Object id = getId.invoke(principal);
            if (id instanceof UUID) return (UUID) id;
            if (id != null) return UUID.fromString(id.toString());
        } catch (Exception ignored) {}
        return UUID.fromString(getAuthentication().getName());
    }

    public static UUID currentTenantId() {
        Object principal = getAuthentication().getPrincipal();
        try {
            Method getTenantId = principal.getClass().getMethod("getTenantId");
            Object tenantId = getTenantId.invoke(principal);
            if (tenantId instanceof UUID) return (UUID) tenantId;
            if (tenantId != null) return UUID.fromString(tenantId.toString());
        } catch (Exception ignored) {}
        return null;
    }

    private static Authentication getAuthentication() {
        return SecurityContextHolder.getContext().getAuthentication();
    }
}
