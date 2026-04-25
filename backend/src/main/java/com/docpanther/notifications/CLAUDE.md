# CLAUDE.md — notifications-agent

## Scope
Own ONLY `com.docpanther.notifications.*`. Do not touch any other package.

## What to build
- `Mailer` interface implementation (in `common/`) using AWS SES
- In-app notification creation and listing
- Email templates stored in DB, customizable per tenant
- Specific email types:
  - Case created → send upload link to customer
  - Reminder → send reminder email to customer
  - Team invite → send invite link to member
  - All items complete → notify case owner
- Mark notifications as read

## API contract
Read `../../../../../../../../../../contracts/openapi.yaml` paths tagged `notifications`.

## Key classes to create
- `NotificationController` — `/api/notifications/**`
- `SesMailer` implements `Mailer` (interface in `common/`)
- `NotificationService` — create in-app notifications, mark read
- `EmailTemplateService` — render templates with Mustache/Thymeleaf
- `Notification` entity → `notifications` table
- `EmailTemplate` entity → `email_templates` table

## SES setup
- Use `SesV2Client` from AWS SDK v2
- Template variables: `{{customerName}}`, `{{uploadUrl}}`, `{{referenceNo}}`, `{{tenantName}}`
- From address: `noreply@docpanther.com`
- Fall back to default template if no tenant-specific template found

## Do NOT
- Write Flyway migrations — propose to control agent
- Trigger emails from business logic — other modules call `Mailer` interface; this module only implements it

## Dependencies allowed
- `common.audit.AuditLogger (`import com.docpanther.common.audit.AuditLogger`)` — log REMINDER_SENT

## Proposed DB migrations (for control agent)

### notifications table
```sql
CREATE TABLE notifications (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL,
    tenant_id  UUID,
    type       VARCHAR(64) NOT NULL,
    title      TEXT        NOT NULL,
    body       TEXT        NOT NULL,
    read       BOOLEAN     NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_id   ON notifications(user_id);
CREATE INDEX idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

### email_templates table
```sql
CREATE TABLE email_templates (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id  UUID,
    type       VARCHAR(64) NOT NULL,
    subject    TEXT        NOT NULL,
    html_body  TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_email_templates_tenant_type ON email_templates(tenant_id, type);
```

## Implementation notes
- `SesMailer` uses `SesClient` (AWS SDK v2 `ses` artifact already in pom.xml).
  To use `SesV2Client` as specified, control agent must add `software.amazon.awssdk:sesv2`
  to pom.xml and update `SesConfig` + `SesMailer` accordingly.
- Template rendering uses simple `{{variable}}` string interpolation (no external engine needed).
- `SesMailer.send()` passes `null` tenantId — caller context is not available through
  the `Mailer` interface. Tenant-specific templates will be selected when `NotificationService`
  is called directly with a tenantId from controller context.
