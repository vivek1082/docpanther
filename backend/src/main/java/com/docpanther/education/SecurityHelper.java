package com.docpanther.education;

import org.springframework.security.core.context.SecurityContextHolder;

import java.lang.reflect.Method;
import java.util.UUID;

public class SecurityHelper {

    private SecurityHelper() {}

    public static UUID currentUserId() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        try {
            Method getId = principal.getClass().getMethod("getId");
            Object id = getId.invoke(principal);
            if (id instanceof UUID) return (UUID) id;
            if (id != null) return UUID.fromString(id.toString());
        } catch (Exception ignored) {}
        return UUID.fromString(SecurityContextHolder.getContext().getAuthentication().getName());
    }

    public static UUID currentTenantId() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        try {
            Method getTenantId = principal.getClass().getMethod("getTenantId");
            Object tenantId = getTenantId.invoke(principal);
            if (tenantId instanceof UUID) return (UUID) tenantId;
        } catch (Exception ignored) {}
        return null;
    }
}
