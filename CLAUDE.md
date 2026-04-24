# CLAUDE.md — DocPanther Root (Control Agent)

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repo Is

DocPanther is a multi-tenant document collection SaaS. Businesses create checklists, share a link, and customers upload documents against each item. Full plan: `PLAN.md`.

## Monorepo Layout

```
docpanther/
├── contracts/          API contracts — single source of truth for ALL agents
├── demo-website/       Next.js static marketing + demo (DONE — do not modify)
├── web/                Next.js product frontend (agent: web/)
├── backend/            Java Spring Boot monolith (agents: one per module)
└── infra/              Terraform AWS infrastructure (agent: infra/)
```

## Multi-Agent Architecture

This repo is worked on by **independent sub-agents**, one per module. Each sub-agent operates only within its directory. A **control agent** (you, when running from root) oversees all agents.

### Sub-agent directories and their scope

| Agent | Directory | Owns |
|---|---|---|
| auth-agent | `backend/src/main/java/com/docpanther/auth/` | Registration, login, JWT, OAuth, email verify |
| tenant-agent | `backend/src/main/java/com/docpanther/tenant/` | Org setup, team invites, pod routing |
| filesystem-agent | `backend/src/main/java/com/docpanther/filesystem/` | Folders, file_nodes, permissions, search |
| cases-agent | `backend/src/main/java/com/docpanther/cases/` | Case CRUD, upload token generation |
| checklist-agent | `backend/src/main/java/com/docpanther/checklist/` | Checklist items, templates |
| storage-agent | `backend/src/main/java/com/docpanther/storage/` | S3 presigned URLs, confirm upload, ZIP |
| sharing-agent | `backend/src/main/java/com/docpanther/sharing/` | Share links, password protection |
| notifications-agent | `backend/src/main/java/com/docpanther/notifications/` | SES email, in-app alerts, reminders |
| audit-agent | `backend/src/main/java/com/docpanther/audit/` | Audit log writes (called by all modules) |
| web-agent | `web/` | Next.js frontend |
| infra-agent | `infra/` | Terraform AWS resources |

### What sub-agents MUST NOT do
- Modify `contracts/openapi.yaml` or `contracts/models.md` without control agent approval
- Modify `backend/src/main/java/com/docpanther/common/` (shared utilities — control agent owns this)
- Modify `backend/src/main/resources/db/migration/` (Flyway migrations — control agent owns this)
- Import from another module's internal classes — only use `common/` shared interfaces
- Change another module's entity/model classes
- Change `pom.xml` without control agent approval

### What the control agent does
- Owns `contracts/`, `common/`, `db/migration/`, `pom.xml`
- Reviews sub-agent output for API contract compliance
- Runs `mvn compile` after each module to catch cross-module breaks
- Keeps `contracts/openapi.yaml` as ground truth — if a sub-agent's controller doesn't match the spec, reject it
- Manages Flyway migrations — sub-agents propose DB changes, control agent writes the migration file

## How to Run

```bash
# Backend (requires Java 17, PostgreSQL, Redis running locally)
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=local

# Frontend
cd web
npm install && npm run dev

# Run tests
cd backend && mvn test
```

## Key Invariants (enforce these across all agents)

1. **No business logic in controllers** — controllers only validate input and call service methods
2. **All DB calls go through the pod DataSource** — never use a hardcoded datasource
3. **Audit every write action** — call `AuditService.log()` after every state change
4. **Files never touch the backend** — always use S3 presigned URLs
5. **JWT subject = userId (UUID string)** — all agents extract user from `SecurityContextHolder`
6. **Tenant ID comes from JWT claim `tenantId`** — never trust it from request body
7. **API responses match `contracts/openapi.yaml`** — no undocumented fields

## Contract Enforcement

Before accepting any sub-agent output, verify:
```bash
# Check a controller's endpoints match the OpenAPI spec
grep -r "@GetMapping\|@PostMapping\|@PutMapping\|@DeleteMapping" backend/src/main/java/com/docpanther/{module}/
# Compare against contracts/openapi.yaml paths
```
