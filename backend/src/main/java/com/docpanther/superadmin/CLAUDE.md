# CLAUDE.md — superadmin-agent

## Scope
Own ONLY `com.docpanther.superadmin.*`. All endpoints require SUPER_ADMIN role.

## What to build
Internal operations portal for Vivek (DocPanther operator) to manage the platform.

### Tenant management
- List all tenants with usage stats (storage GB, case count, pod info)
- View tenant details, billing plan, region
- Manually change a tenant's plan
- Suspend / reactivate a tenant

### Pod management
- List all pods with health metrics (tenant count, storage, DB size, status)
- Provision new pod (triggers Terraform via SNS event or webhook)
- Move tenant to a different pod (fires background migration job)
- Mark pod as DRAINING (no new tenants assigned, existing ones migrate out)

### Platform stats dashboard data
- Total tenants, individuals, cases, storage, MRR

### User lookup
- Find user by email across control plane DB
- Impersonate a tenant (generates short-lived impersonation token for debugging — logged to audit)

## API contract
Read `../../../../../../../../../../contracts/openapi.yaml` paths tagged `superadmin`.

## Key classes to create
- `SuperAdminController` — all endpoints at `/api/admin/**`
- `SuperAdminService` — business logic for above operations
- `PodMigrationJob` — background job (Spring `@Async`) that moves tenant data between pods

## Security
ALL endpoints must check: `user.role == SUPER_ADMIN`. Use `@PreAuthorize("hasRole('SUPER_ADMIN')")`.
Never expose these endpoints via CloudFront — they go through a separate internal ALB (planned in infra).

## Do NOT
- Modify tenant business data — only metadata (plan, status, pod mapping)
- Write Flyway migrations
- Access pod DB directly — use control plane DB only for pod registry

## Dependencies allowed
- `common.audit.AuditLogger (`import com.docpanther.common.audit.AuditLogger`)` — log every superadmin action (TENANT_SUSPENDED, POD_PROVISIONED, TENANT_MOVED, IMPERSONATION_STARTED)
