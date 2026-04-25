#!/bin/bash
# DocPanther — Self-Healing Parallel Web Orchestrator
# NEVER stops on failure. Fixes, retries, logs, and keeps going.

set -uo pipefail

BASE="/Users/vivekkumar/Documents/vivi-doc-collector"
WEB="$BASE/web"
WEB_APP="$WEB/app"
LOG_DIR="$BASE/logs"
SUMMARY="$LOG_DIR/SUMMARY-web.log"
mkdir -p "$LOG_DIR"

MAX_RETRIES=3
AGENT_TURNS=80
FIXER_TURNS=40
VALIDATOR_TURNS=20
CURRENT_WAVE=0

START_TIME=$(date +%s)
GLOBAL_FAILURES=()

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

_log() { local msg="$1"; echo -e "$msg"; echo "$(echo "$msg" | sed 's/\x1b\[[0-9;]*m//g')" >> "$SUMMARY"; }
log()  { _log "${CYAN}[$(date +%H:%M:%S)] $*${NC}"; }
ok()   { _log "${GREEN}[$(date +%H:%M:%S)] ✅ $*${NC}"; }
err()  { _log "${RED}[$(date +%H:%M:%S)] ❌ $*${NC}"; }
warn() { _log "${YELLOW}[$(date +%H:%M:%S)] ⚠  $*${NC}"; }
hdr()  { _log "\n${BOLD}${YELLOW}══════ $* ══════${NC}"; }

IMPL_PROMPT="Implement everything in your CLAUDE.md. Design system (Geist font, orange-500 brand) is in $WEB/CLAUDE.md. API contracts: $BASE/contracts/openapi.yaml. Field types: $BASE/contracts/models.md. Do not touch $WEB/lib/ $WEB/store/ $WEB/components/ui/ $WEB/app/layout.tsx or any file outside this directory."

run_agent() {
  local module=$1
  local dir=$2
  local logkey="${module//\//-}"
  local logfile="$LOG_DIR/web-${logkey}.log"
  log "START web/$module"
  (
    for attempt in 1 2; do
      cd "$dir"
      if claude -p --dangerously-skip-permissions --max-turns $AGENT_TURNS "$IMPL_PROMPT" >> "$logfile" 2>&1; then
        echo "[AGENT DONE] $module" >> "$logfile"
        exit 0
      fi
      echo "[AGENT RETRY $attempt] $module" >> "$logfile"
      sleep 5
    done
    echo "[AGENT ERROR] $module — giving up after 2 attempts" >> "$logfile"
    exit 1
  ) &
}

wait_wave() {
  wait || true
  for module in "$@"; do
    local logkey="${module//\//-}"
    if grep -q "\[AGENT ERROR\]" "$LOG_DIR/web-${logkey}.log" 2>/dev/null; then
      warn "Web agent $module had errors — fixer will repair at build gate"
    fi
  done
}

build_with_fix() {
  local wave_label="Wave $CURRENT_WAVE build"
  for attempt in $(seq 1 $MAX_RETRIES); do
    log "[$wave_label] Build attempt $attempt/$MAX_RETRIES..."
    local blog="$LOG_DIR/web-build-wave${CURRENT_WAVE}-attempt${attempt}.log"

    if (cd "$WEB" && npm run build) > "$blog" 2>&1; then
      ok "[$wave_label] Build PASSED (attempt $attempt)"
      return 0
    fi

    err "[$wave_label] Build FAILED (attempt $attempt/$MAX_RETRIES)"

    if [ "$attempt" -lt "$MAX_RETRIES" ]; then
      local errors
      errors=$(tail -80 "$blog")
      local flog="$LOG_DIR/web-build-fix-wave${CURRENT_WAVE}-attempt${attempt}.log"
      log "[$wave_label] Launching build fixer..."

      local fix_prompt="Fix Next.js/TypeScript build errors in DocPanther web.

ERRORS:
$errors

Rules:
- Fix ONLY files named in the errors
- Never touch $WEB/lib/ $WEB/store/ $WEB/components/ui/ $WEB/app/layout.tsx
- Never store access_token in localStorage — use Zustand store
- Font: Geist via font-sans class. Primary color: orange-500
- API field names must match $BASE/contracts/models.md exactly
- Stop after fixing — do not run build yourself"

      (cd "$BASE" && claude -p --dangerously-skip-permissions --max-turns $FIXER_TURNS "$fix_prompt") \
        >> "$flog" 2>&1 || true
    fi

    sleep 3
  done

  err "[$wave_label] Build STILL FAILING after $MAX_RETRIES attempts — continuing"
  GLOBAL_FAILURES+=("BUILD Wave $CURRENT_WAVE — see web-build-wave${CURRENT_WAVE}-attempt${MAX_RETRIES}.log")
}

validate_web_with_fix() {
  local modules=("$@")
  local joined
  joined=$(IFS=", "; echo "${modules[*]}")
  local wave_label="Wave $CURRENT_WAVE validate"

  for attempt in $(seq 1 $MAX_RETRIES); do
    log "[$wave_label] Validation attempt $attempt/$MAX_RETRIES for: $joined"
    local vlog="$LOG_DIR/web-validate-wave${CURRENT_WAVE}-attempt${attempt}.log"

    local result
    result=$(cd "$BASE" && claude -p --dangerously-skip-permissions --max-turns $VALIDATOR_TURNS \
      "Read $BASE/validator/CLAUDE.md web validation rules. Validate web modules: $joined. Source: $WEB_APP. Contract: $BASE/contracts/openapi.yaml. Design system: $WEB/CLAUDE.md. Output: PASS or FAIL per module with filename+line for each issue.") || true

    echo "$result" | tee "$vlog"

    if ! echo "$result" | grep -qi "^FAIL"; then
      ok "[$wave_label] Validation PASSED (attempt $attempt)"
      return 0
    fi

    err "[$wave_label] Validation FAILED (attempt $attempt/$MAX_RETRIES)"

    if [ "$attempt" -lt "$MAX_RETRIES" ]; then
      local flog="$LOG_DIR/web-validate-fix-wave${CURRENT_WAVE}-attempt${attempt}.log"
      log "[$wave_label] Launching web validation fixer..."

      local fix_prompt="Fix DocPanther web validation failures.

FAILURES:
$result

Fix rules:
- Edit ONLY the specific files and lines named above
- Never touch $WEB/lib/ $WEB/store/ $WEB/components/ui/ $WEB/app/layout.tsx
- W1 (wrong API URL): fix axios/fetch call to match contracts/openapi.yaml path exactly
- W2 (token in localStorage): remove it, use useAuthStore from store/ instead
- W3 (wrong color on primary button): replace with bg-orange-500 / hover:bg-orange-600
- W4 (backend import): delete the import, get data via API call
- W5 (hardcoded URL): use process.env.NEXT_PUBLIC_API_URL or import api from lib/api.ts
- Stop after fixing — do not re-validate yourself"

      (cd "$BASE" && claude -p --dangerously-skip-permissions --max-turns $FIXER_TURNS "$fix_prompt") \
        >> "$flog" 2>&1 || true

      build_with_fix
    fi

    sleep 3
  done

  err "[$wave_label] Validation STILL FAILING after $MAX_RETRIES attempts — logging and continuing"
  GLOBAL_FAILURES+=("VALIDATE Wave $CURRENT_WAVE ($joined) — see web-validate-wave${CURRENT_WAVE}-attempt${MAX_RETRIES}.log")
}

# ═══════════════════════════════════════════════════════════════════════
printf "" > "$SUMMARY"
hdr "DocPanther Web Build — $(date)"
# ═══════════════════════════════════════════════════════════════════════

# ── WAVE 4: auth-web, upload, shared ───────────────────────────────
CURRENT_WAVE=4
hdr "WAVE 4 — auth-web, upload-portal, shared-viewer"
run_agent "(auth)"  "$WEB_APP/(auth)"
run_agent "upload"  "$WEB_APP/upload"
run_agent "shared"  "$WEB_APP/shared"
wait_wave "(auth)" "upload" "shared"
build_with_fix
validate_web_with_fix "auth" "upload" "shared"

# ── WAVE 5: dashboard, cases, settings, education ──────────────────
CURRENT_WAVE=5
hdr "WAVE 5 — dashboard-web, cases-web, settings-web, education-web"
run_agent "(app)/dashboard" "$WEB_APP/(app)/dashboard"
run_agent "(app)/cases"     "$WEB_APP/(app)/cases"
run_agent "(app)/settings"  "$WEB_APP/(app)/settings"
run_agent "(app)/education" "$WEB_APP/(app)/education"
wait_wave "(app)/dashboard" "(app)/cases" "(app)/settings" "(app)/education"
build_with_fix
validate_web_with_fix "dashboard" "cases" "settings" "education"

# ═══════════════════════════════════════════════════════════════════════
END_TIME=$(date +%s)
ELAPSED=$(( (END_TIME - START_TIME) / 60 ))

hdr "WEB BUILD COMPLETE — ${ELAPSED} min"

if [ ${#GLOBAL_FAILURES[@]} -eq 0 ]; then
  ok "ALL WEB MODULES PASSED"
else
  warn "${#GLOBAL_FAILURES[@]} web issue(s) need attention:"
  for f in "${GLOBAL_FAILURES[@]}"; do
    err "  → $f"
  done
fi

log "Web log: $SUMMARY"
