package com.docpanther.auth;

import com.docpanther.common.config.AppProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class StdoutAuthMailer implements AuthMailer {

    private final AppProperties appProperties;

    @Override
    public void sendEmailVerification(String toEmail, String toName, String token) {
        String link = appProperties.getFrontendUrl() + "/verify-email?token=" + token;
        log.info("[EMAIL] Verification → {} | link: {}", toEmail, link);
    }

    @Override
    public void sendPasswordReset(String toEmail, String toName, String token) {
        String link = appProperties.getFrontendUrl() + "/reset-password?token=" + token;
        log.info("[EMAIL] Password reset → {} | link: {}", toEmail, link);
    }
}
