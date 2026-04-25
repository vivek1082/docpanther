package com.docpanther.notifications.repository;

import com.docpanther.notifications.model.EmailTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface EmailTemplateRepository extends JpaRepository<EmailTemplate, UUID> {
    Optional<EmailTemplate> findByTenantIdAndType(UUID tenantId, String type);
    Optional<EmailTemplate> findByTenantIdIsNullAndType(String type);
}
