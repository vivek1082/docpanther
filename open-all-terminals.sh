#!/bin/bash
# DocPanther — Open All 20 Agent Terminals
# Opens each agent in its own macOS Terminal window for manual supervision.
# Usage: ./open-all-terminals.sh

BASE="/Users/vivekkumar/Documents/vivi-doc-collector"
BACKEND="$BASE/backend/src/main/java/com/docpanther"

open_terminal() {
  local title=$1
  local dir=$2
  osascript -e "
    tell application \"Terminal\"
      set w to do script \"printf '\\\\033]0;$title\\\\007' && cd '$dir' && echo '=== $title ===' && claude\"
      activate
    end tell" > /dev/null 2>&1
  sleep 0.4
}

echo "Opening 20 terminal windows..."

# ── Terminal 1: Control agent (repo root) ──────────────────────
open_terminal "CONTROL"          "$BASE"

# ── Wave 1: no deps ───────────────────────────────────────────
open_terminal "audit"            "$BACKEND/audit"
open_terminal "auth"             "$BACKEND/auth"

# ── Wave 2: needs auth ────────────────────────────────────────
open_terminal "tenant"           "$BACKEND/tenant"
open_terminal "filesystem"       "$BACKEND/filesystem"

# ── Wave 3: needs Wave 2 ──────────────────────────────────────
open_terminal "cases"            "$BACKEND/cases"
open_terminal "checklist"        "$BACKEND/checklist"
open_terminal "storage"          "$BACKEND/storage"
open_terminal "sharing"          "$BACKEND/sharing"
open_terminal "notifications"    "$BACKEND/notifications"
open_terminal "superadmin"       "$BACKEND/superadmin"
open_terminal "education"        "$BACKEND/education"

# ── Infra: fully independent ──────────────────────────────────
open_terminal "infra"            "$BASE/infra"

# ── Wave 4: web, no inter-deps ────────────────────────────────
open_terminal "auth-web"         "$BASE/web/app/(auth)"
open_terminal "upload-web"       "$BASE/web/app/upload"
open_terminal "shared-web"       "$BASE/web/app/shared"

# ── Wave 5: web, needs auth-web done ──────────────────────────
open_terminal "dashboard-web"    "$BASE/web/app/(app)/dashboard"
open_terminal "cases-web"        "$BASE/web/app/(app)/cases"
open_terminal "settings-web"     "$BASE/web/app/(app)/settings"
open_terminal "education-web"    "$BASE/web/app/(app)/education"

echo ""
echo "20 terminals opened."
echo ""
echo "BUILD ORDER (start these groups simultaneously):"
echo "  Group 1 first:  audit, auth"
echo "  Group 2 next:   tenant, filesystem"
echo "  Group 3 last:   cases, checklist, storage, sharing, notifications, superadmin, education, infra"
echo "  Web Group 1:    auth-web, upload-web, shared-web"
echo "  Web Group 2:    dashboard-web, cases-web, settings-web, education-web"
echo ""
echo "In each terminal, paste this prompt:"
echo '  "Implement everything in your CLAUDE.md. Contracts at '"$BASE"'/contracts/openapi.yaml."'
