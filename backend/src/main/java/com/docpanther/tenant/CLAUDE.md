# CLAUDE.md — tenant-agent

## Scope
Own ONLY `com.docpanther.tenant.*`. Do not touch any other package.

## What to build
- Tenant CRUD (create org, update name/logo)
- Team member invites (email invite → accept link → join org)
- Member role management (change role, remove member)
- Pod routing: given a tenant_id, look up pod connection URL from control plane DB (cache in Redis)
- `PodDataSourceRouter` — a Spring `AbstractRoutingDataSource` that switches DataSource per request

## API contract
Read `../../../../../../../../../../contracts/openapi.yaml` paths tagged `tenant`.

## Key classes to create
- `TenantController` — REST endpoints at `/api/tenants/me`
- `TenantService` — CRUD, invite logic
- `PodDataSourceRouter` — extends `AbstractRoutingDataSource`, reads tenant→pod from Redis/control plane
- `TenantContextHolder` — ThreadLocal holding current tenantId and podId
- `Tenant` entity → `tenants` table (control plane)
- `TenantInvite` entity → `tenant_invites` table
- `UserTenantRole` entity → `user_tenant_roles` table

## Do NOT
- Write Flyway migrations — propose to control agent
- Handle JWT — tenant is extracted from JWT by JwtAuthFilter (in auth package)
- Modify `PodDataSourceRouter` once control agent reviews it — it is a shared infrastructure component

## Dependencies allowed
- `common/` interfaces only
- `audit/AuditLogger` — log MEMBER_INVITED, MEMBER_REMOVED events
- `notifications/Mailer` — send invite email
