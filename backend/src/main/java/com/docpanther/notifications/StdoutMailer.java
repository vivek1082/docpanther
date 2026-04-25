package com.docpanther.notifications;

import com.docpanther.common.mail.Mailer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@Profile("local")
@Slf4j
public class StdoutMailer implements Mailer {

    @Override
    public void sendEmailVerification(String to, String verifyLink) {
        log.info("[MAIL] verification to={} link={}", to, verifyLink);
    }

    @Override
    public void sendPasswordReset(String to, String resetLink) {
        log.info("[MAIL] password-reset to={} link={}", to, resetLink);
    }

    @Override
    public void sendCaseInvite(String to, String caseLink, String caseName) {
        log.info("[MAIL] case-invite to={} case={} link={}", to, caseName, caseLink);
    }

    @Override
    public void sendMaterialApproved(List<String> toList, String materialName, String batchName) {
        log.info("[MAIL] material-approved to={} material={} batch={}", toList, materialName, batchName);
    }

    @Override
    public void sendGeneric(String to, String subject, String htmlBody) {
        log.info("[MAIL] generic to={} subject={}", to, subject);
    }
}
