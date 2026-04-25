package com.docpanther.notifications;

import com.docpanther.common.mail.Mailer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.ses.SesClient;
import software.amazon.awssdk.services.ses.model.*;

import java.util.List;
import java.util.Map;

@Service
@Primary
@Profile("!local")
@RequiredArgsConstructor
@Slf4j
public class SesMailer implements Mailer {

    @Value("${app.mail.from-address}")
    private String from;

    private final SesClient sesClient;
    private final EmailTemplateService emailTemplateService;

    @Override
    public void sendEmailVerification(String to, String verifyLink) {
        var vars = Map.of("uploadUrl", verifyLink);
        send(to, "EMAIL_VERIFICATION", vars);
    }

    @Override
    public void sendPasswordReset(String to, String resetLink) {
        var vars = Map.of("uploadUrl", resetLink);
        send(to, "PASSWORD_RESET", vars);
    }

    @Override
    public void sendCaseInvite(String to, String caseLink, String caseName) {
        var vars = Map.of("uploadUrl", caseLink, "referenceNo", caseName);
        send(to, "CASE_INVITE", vars);
    }

    @Override
    public void sendMaterialApproved(List<String> toList, String materialName, String batchName) {
        var vars = Map.of("referenceNo", materialName, "tenantName", batchName);
        for (String to : toList) {
            send(to, "MATERIAL_APPROVED", vars);
        }
    }

    @Override
    public void sendGeneric(String to, String subject, String htmlBody) {
        sendHtml(to, subject, htmlBody);
    }

    private void send(String to, String type, Map<String, String> vars) {
        String subject = emailTemplateService.renderSubject(type, null, vars);
        String body    = emailTemplateService.renderBody(type, null, vars);
        sendHtml(to, subject, body);
    }

    private void sendHtml(String to, String subject, String htmlBody) {
        try {
            SendEmailRequest request = SendEmailRequest.builder()
                .source(from)
                .destination(Destination.builder().toAddresses(to).build())
                .message(Message.builder()
                    .subject(Content.builder().data(subject).charset("UTF-8").build())
                    .body(Body.builder()
                        .html(Content.builder().data(htmlBody).charset("UTF-8").build())
                        .build())
                    .build())
                .build();
            sesClient.sendEmail(request);
        } catch (Exception e) {
            log.error("[SES] Failed to send email to {}: {}", to, e.getMessage(), e);
        }
    }
}
