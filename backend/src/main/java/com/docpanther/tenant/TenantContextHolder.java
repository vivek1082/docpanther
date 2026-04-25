package com.docpanther.tenant;

import java.util.UUID;

public final class TenantContextHolder {

    private static final ThreadLocal<UUID> TENANT_ID = new ThreadLocal<>();
    private static final ThreadLocal<String> POD_ID   = new ThreadLocal<>();

    private TenantContextHolder() {}

    public static void setTenantId(UUID tenantId) { TENANT_ID.set(tenantId); }
    public static UUID getTenantId()               { return TENANT_ID.get(); }

    public static void setPodId(String podId) { POD_ID.set(podId); }
    public static String getPodId()           { return POD_ID.get(); }

    public static void clear() {
        TENANT_ID.remove();
        POD_ID.remove();
    }
}
