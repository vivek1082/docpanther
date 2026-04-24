# CLAUDE.md — audit-agent

## Scope
Own ONLY `com.docpanther.audit.*`. Do not touch any other package.

## What to build
- `AuditLogger` interface implementation — called by ALL other modules after every write
- Audit log is append-only — rows are never updated or deleted
- `AuditLog` entity → `audit_logs` table
- Async writes (use `@Async`) — audit logging must never slow down the main request

## AuditLogger interface (in common/ — you implement it here)
```java
void log(String action, ActorType actorType, UUID actorId,
         UUID tenantId, UUID caseId, UUID checklistItemId,
         Map<String, Object> metadata);
```

## Actions
See `contracts/openapi.yaml` — AuditLog.action field. All constants are in `AuditAction` enum.

## Key classes to create
- `AuditLoggerImpl` implements `AuditLogger` (from `common/`)
- `AuditLog` entity → `audit_logs` table
- `AuditRepository` (JpaRepository)

## Do NOT
- Expose any write endpoints — audit log is internal only
- Write Flyway migrations — propose to control agent
- Make any external calls

## Note on async
Use `@Async` + Spring's `TaskExecutor`. If audit write fails, log the error but DO NOT propagate the exception to the caller — audit failure must never fail the main business operation.
