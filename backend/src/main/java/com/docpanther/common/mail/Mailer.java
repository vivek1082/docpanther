package com.docpanther.common.mail;

import java.util.List;

public interface Mailer {
    void sendEmailVerification(String to, String verifyLink);
    void sendPasswordReset(String to, String resetLink);
    void sendCaseInvite(String to, String caseLink, String caseName);
    void sendMaterialApproved(List<String> toList, String materialName, String batchName);
    void sendGeneric(String to, String subject, String htmlBody);
}
