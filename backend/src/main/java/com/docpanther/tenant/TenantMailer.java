package com.docpanther.tenant;

/**
 * Local email interface for tenant invite flows.
 * Replace with common/Mailer when notifications module is wired up by the control agent.
 */
public interface TenantMailer {
    void sendInvite(String toEmail, String tenantName, String role, String token);
}
