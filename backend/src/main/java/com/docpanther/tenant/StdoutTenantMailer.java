package com.docpanther.tenant;

import com.docpanther.common.config.AppProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class StdoutTenantMailer implements TenantMailer {

    private final AppProperties appProperties;

    @Override
    public void sendInvite(String toEmail, String tenantName, String role, String token) {
        String link = appProperties.getFrontendUrl() + "/invite/accept?token=" + token;
        log.info("[EMAIL] Team invite → {} | tenant: {} | role: {} | link: {}", toEmail, tenantName, role, link);
    }
}
