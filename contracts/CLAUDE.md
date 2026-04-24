# CLAUDE.md — Contracts Agent

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

This directory is the **single source of truth** for all API contracts between frontend, backend modules, and external clients. All sub-agents must read and follow these contracts. Changes here must be approved by the control agent.

## Files

- `openapi.yaml` — all REST endpoint definitions (request/response schemas, status codes)
- `models.md` — shared data model field names and types

## Rules for modifying contracts

1. **Sub-agents propose, control agent approves** — if a module needs a new field or endpoint, propose it here first, don't just add it to the controller
2. **Backwards compatibility** — never remove or rename a field that is already in use; add new fields as optional
3. **Versioning** — breaking changes require a new API version prefix (`/api/v2/...`)
4. **Sync check** — after any change to openapi.yaml, run the sync check:
   ```bash
   # Find all controllers and verify endpoints exist in openapi.yaml
   grep -rh "@GetMapping\|@PostMapping\|@PutMapping\|@DeleteMapping\|@PatchMapping" \
     ../backend/src/main/java/ | sort
   ```

## How sub-agents use contracts

Every sub-agent's CLAUDE.md references specific sections of openapi.yaml. Sub-agents:
- **READ** the relevant paths from openapi.yaml to know what their controller must return
- **DO NOT WRITE** to openapi.yaml (control agent only)
- **DO NOT** add response fields not in the spec
- **DO** flag to control agent if the spec is missing something they need
