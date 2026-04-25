package com.docpanther.auth;

/**
 * Local email interface for auth flows.
 * Replace with common/Mailer when notifications module is wired up by the control agent.
 */
public interface AuthMailer {
    void sendEmailVerification(String toEmail, String toName, String token);
    void sendPasswordReset(String toEmail, String toName, String token);
}
