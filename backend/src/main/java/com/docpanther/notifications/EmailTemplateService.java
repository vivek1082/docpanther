package com.docpanther.notifications;

import com.docpanther.notifications.model.EmailTemplate;
import com.docpanther.notifications.repository.EmailTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EmailTemplateService {

    private final EmailTemplateRepository emailTemplateRepository;

    public String renderSubject(String type, UUID tenantId, Map<String, String> vars) {
        return interpolate(
            resolve(type, tenantId).map(EmailTemplate::getSubject).orElse(defaultSubject(type)),
            vars
        );
    }

    public String renderBody(String type, UUID tenantId, Map<String, String> vars) {
        return interpolate(
            resolve(type, tenantId).map(EmailTemplate::getHtmlBody).orElse(defaultBody(type)),
            vars
        );
    }

    private Optional<EmailTemplate> resolve(String type, UUID tenantId) {
        if (tenantId != null) {
            Optional<EmailTemplate> t = emailTemplateRepository.findByTenantIdAndType(tenantId, type);
            if (t.isPresent()) return t;
        }
        return emailTemplateRepository.findByTenantIdIsNullAndType(type);
    }

    private String interpolate(String template, Map<String, String> vars) {
        if (template == null || vars == null) return template;
        String result = template;
        for (Map.Entry<String, String> e : vars.entrySet()) {
            result = result.replace("{{" + e.getKey() + "}}", e.getValue() != null ? e.getValue() : "");
        }
        return result;
    }

    private String defaultSubject(String type) {
        return switch (type) {
            case "CASE_INVITE"         -> "Your documents are ready to upload — {{referenceNo}}";
            case "REMINDER"            -> "Reminder: Please upload your documents — {{referenceNo}}";
            case "TEAM_INVITE"         -> "You've been invited to join {{tenantName}} on DocPanther";
            case "COMPLETION"          -> "All documents received for case {{referenceNo}}";
            case "EMAIL_VERIFICATION"  -> "Verify your DocPanther account";
            case "PASSWORD_RESET"      -> "Reset your DocPanther password";
            case "MATERIAL_APPROVED"   -> "Material approved: {{referenceNo}}";
            default                    -> "DocPanther notification";
        };
    }

    private String defaultBody(String type) {
        return switch (type) {
            case "CASE_INVITE" -> """
                <p>Hello {{customerName}},</p>
                <p>Please upload your documents for case <strong>{{referenceNo}}</strong>.</p>
                <p><a href="{{uploadUrl}}">Click here to upload</a></p>
                <p>Regards,<br>{{tenantName}}</p>
                """;
            case "REMINDER" -> """
                <p>Hello {{customerName}},</p>
                <p>This is a reminder to upload your outstanding documents for case <strong>{{referenceNo}}</strong>.</p>
                <p><a href="{{uploadUrl}}">Upload now</a></p>
                <p>Regards,<br>{{tenantName}}</p>
                """;
            case "TEAM_INVITE" -> """
                <p>You have been invited to join <strong>{{tenantName}}</strong> on DocPanther.</p>
                <p><a href="{{uploadUrl}}">Accept invitation</a></p>
                """;
            case "COMPLETION" -> """
                <p>All documents for case <strong>{{referenceNo}}</strong> have been received.</p>
                <p>Customer: {{customerName}}</p>
                """;
            case "EMAIL_VERIFICATION" -> """
                <p>Please verify your DocPanther account by clicking the link below.</p>
                <p><a href="{{uploadUrl}}">Verify email</a></p>
                """;
            case "PASSWORD_RESET" -> """
                <p>Click the link below to reset your DocPanther password.</p>
                <p><a href="{{uploadUrl}}">Reset password</a></p>
                <p>This link expires in 1 hour.</p>
                """;
            case "MATERIAL_APPROVED" -> """
                <p>The material <strong>{{referenceNo}}</strong> in batch <strong>{{tenantName}}</strong> has been approved.</p>
                """;
            default -> "<p>You have a new notification from DocPanther.</p>";
        };
    }
}
