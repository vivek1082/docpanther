# CLAUDE.md — Backend (Spring Boot Monolith)

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack
- Java 17, Spring Boot 3.2, Maven
- PostgreSQL (via Flyway migrations), Redis
- AWS SDK v2 (S3, SES, Secrets Manager)

## Run locally
```bash
# Requires: Java 17, PostgreSQL on :5432, Redis on :6379
mvn spring-boot:run -Dspring-boot.run.profiles=local

# Run tests
mvn test

# Compile check
mvn compile -q
```

## Package layout
```
com.docpanther
├── auth/           ← auth-agent owns this
├── tenant/         ← tenant-agent owns this
├── filesystem/     ← filesystem-agent owns this
├── cases/          ← cases-agent owns this
├── checklist/      ← checklist-agent owns this
├── storage/        ← storage-agent owns this
├── sharing/        ← sharing-agent owns this
├── notifications/  ← notifications-agent owns this
├── audit/          ← audit-agent owns this
└── common/         ← CONTROL AGENT ONLY — do not modify
```

## DB migrations
`src/main/resources/db/migration/` — CONTROL AGENT ONLY. Sub-agents must NOT create migration files. Propose schema changes in your CLAUDE.md and wait for control agent to write the migration.

## Invariants ALL agents must follow
1. Controllers only validate input and call service methods — no business logic in controllers
2. Services call `AuditService.log(action, actorType, actorId, metadata)` after every write
3. Extract current user from `SecurityContextHolder` — never trust userId from request body
4. Extract tenantId from JWT claim `tenantId` — never from request body
5. Use `PodDataSourceRouter` (in common/) to get the correct DataSource — never inject DataSource directly
6. All API responses must match `../../contracts/openapi.yaml`
7. All paginated responses must use `Page<T>` from Spring Data

## Cross-module rules
- Import only interfaces from `common/` — never import from another module's package
- AuditService is in `audit/` — inject via interface `AuditLogger` from `common/`
- S3Service is in `storage/` — inject via interface `FileStorage` from `common/`
- EmailService is in `notifications/` — inject via interface `Mailer` from `common/`
