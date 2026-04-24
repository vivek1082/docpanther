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
- `audit/AuditLogger` — log REMINDER_SENT
