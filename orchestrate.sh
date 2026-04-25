#!/bin/bash
# DocPanther — Self-Healing Parallel Backend Orchestrator
# NEVER stops on failure. Fixes, retries, logs, and keeps going.
# Wake up to logs/SUMMARY.log for the full picture.

set -uo pipefail

BASE="/Users/vivekkumar/Documents/vivi-doc-collector"
BACKEND="$BASE/backend/src/main/java/com/docpanther"
LOG_DIR="$BASE/logs"
SUMMARY="$LOG_DIR/SUMMARY.log"
mkdir -p "$LOG_DIR"
echo $$ > "$LOG_DIR/orchestrate.pid"

MAX_RETRIES=3
AGENT_TURNS=80
FIXER_TURNS=40
VALIDATOR_TURNS=20
CURRENT_WAVE=0

START_TIME=$(date +%s)
GLOBAL_FAILURES=()   # accumulates failures — never exits on failure
STATE_FILE="$LOG_DIR/orchestrate-state.txt"
touch "$STATE_FILE"

# Mark a wave done; skip_wave checks this before re-running
wave_done() { echo "WAVE_$1_COMPLETE" >> "$STATE_FILE"; }
wave_skip() { grep -q "WAVE_$1_COMPLETE" "$STATE_FILE" 2>/dev/null; }

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

IMPL_PROMPT="Implement everything described in your CLAUDE.md. Full API contract: $BASE/contracts/openapi.yaml. Field types: $BASE/contracts/models.md. Follow every rule in CLAUDE.md exactly. Do not create or modify any file outside this directory. Never touch contracts/ common/ or db/migration/."

# ──────────────────────────────────────────────────────────────
# run_agent: launch one agent as a background job with auto-retry
# ──────────────────────────────────────────────────────────────
run_agent() {
  local module=$1
  local dir=$2
  local logfile="$LOG_DIR/${module}.log"
  log "START $module"
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

# ──────────────────────────────────────────────────────────────
# wait_wave: wait for all background jobs; warn but NEVER exit
# ──────────────────────────────────────────────────────────────
wait_wave() {
  wait || true
  for module in "$@"; do
    if grep -q "\[AGENT ERROR\]" "$LOG_DIR/${module}.log" 2>/dev/null; then
      warn "Agent $module had errors — fixer will repair during compile/validate gates"
    fi
  done
}

# ──────────────────────────────────────────────────────────────
# compile_with_fix: compile → fix → retry. Never exits.
# ──────────────────────────────────────────────────────────────
compile_with_fix() {
  local wave_label="Wave $CURRENT_WAVE compile"
  for attempt in $(seq 1 $MAX_RETRIES); do
    log "[$wave_label] Compile attempt $attempt/$MAX_RETRIES..."
    local clog="$LOG_DIR/compile-wave${CURRENT_WAVE}-attempt${attempt}.log"

    if (cd "$BASE/backend" && mvn compile -q) > "$clog" 2>&1; then
      ok "[$wave_label] Compile PASSED (attempt $attempt)"
      return 0
    fi

    err "[$wave_label] Compile FAILED (attempt $attempt/$MAX_RETRIES)"

    if [ "$attempt" -lt "$MAX_RETRIES" ]; then
      local errors
      errors=$(tail -80 "$clog")
      local flog="$LOG_DIR/compile-fix-wave${CURRENT_WAVE}-attempt${attempt}.log"
      log "[$wave_label] Launching compile fixer..."

      local fix_prompt="Fix Java compile errors in the DocPanther backend.

ERRORS:
$errors

Rules:
- Fix ONLY files mentioned in the errors above
- Source root: $BACKEND
- Never touch contracts/ common/ db/migration/ pom.xml
- Use @RequiredArgsConstructor (constructor injection), never @Autowired
- Keep all @PreAuthorize annotations
- Match field names exactly from $BASE/contracts/models.md
- After fixing, stop — do not run build yourself"

      (cd "$BASE" && claude -p --dangerously-skip-permissions --max-turns $FIXER_TURNS "$fix_prompt") \
        >> "$flog" 2>&1 || true
    fi

    sleep 3
  done

  err "[$wave_label] Compile STILL FAILING after $MAX_RETRIES attempts — continuing to next wave"
  GLOBAL_FAILURES+=("COMPILE Wave $CURRENT_WAVE — see compile-wave${CURRENT_WAVE}-attempt${MAX_RETRIES}.log")
}

# ──────────────────────────────────────────────────────────────
# validate_with_fix: validate → fix → retry. Never exits.
# ──────────────────────────────────────────────────────────────
validate_with_fix() {
  local modules=("$@")
  local joined
  joined=$(IFS=", "; echo "${modules[*]}")
  local wave_label="Wave $CURRENT_WAVE validate"

  for attempt in $(seq 1 $MAX_RETRIES); do
    log "[$wave_label] Validation attempt $attempt/$MAX_RETRIES for: $joined"
    local vlog="$LOG_DIR/validate-wave${CURRENT_WAVE}-attempt${attempt}.log"

    local result
    result=$(cd "$BASE" && claude -p --dangerously-skip-permissions --max-turns $VALIDATOR_TURNS \
      "Read $BASE/validator/CLAUDE.md for rules. Validate backend modules: $joined. Source: $BACKEND. Contract: $BASE/contracts/openapi.yaml. Output strictly: PASS or FAIL per module with filename+method for each issue.") || true

    echo "$result" | tee "$vlog"

    if ! echo "$result" | grep -qi "^FAIL"; then
      ok "[$wave_label] Validation PASSED (attempt $attempt)"
      return 0
    fi

    err "[$wave_label] Validation FAILED (attempt $attempt/$MAX_RETRIES)"

    if [ "$attempt" -lt "$MAX_RETRIES" ]; then
      local flog="$LOG_DIR/validate-fix-wave${CURRENT_WAVE}-attempt${attempt}.log"
      log "[$wave_label] Launching validation fixer..."

      local fix_prompt="Fix these DocPanther backend validation failures.

FAILURES:
$result

Fix rules:
- Edit ONLY the specific files and methods named above
- Never touch contracts/ common/ db/migration/
- Check 1 (wrong path): fix @GetMapping/@PostMapping value to match openapi.yaml exactly
- Check 2 (cross-module import): remove it — use the interface from common/ instead
- Check 3 (business logic in controller): move logic into the service class
- Check 4 (missing audit): add auditLogger.log() after the state change in the service
- Check 5 (missing @PreAuthorize): add the annotation matching the module's CLAUDE.md role rules
- Check 6 (@Autowired field): convert to constructor injection + add @RequiredArgsConstructor
- Stop after fixing — do not re-validate yourself"

      (cd "$BASE" && claude -p --dangerously-skip-permissions --max-turns $FIXER_TURNS "$fix_prompt") \
        >> "$flog" 2>&1 || true

      # Re-compile after fix before re-validating
      compile_with_fix
    fi

    sleep 3
  done

  err "[$wave_label] Validation STILL FAILING after $MAX_RETRIES attempts — logging and continuing"
  GLOBAL_FAILURES+=("VALIDATE Wave $CURRENT_WAVE ($joined) — see validate-wave${CURRENT_WAVE}-attempt${MAX_RETRIES}.log")
}

# ═══════════════════════════════════════════════════════════════════════
printf "" > "$SUMMARY"
hdr "DocPanther Backend Build — $(date)"
# ═══════════════════════════════════════════════════════════════════════

# ── WAVE 1: audit + auth + docker-agent (all independent) ───────────
CURRENT_WAVE=1
if wave_skip 1; then
  hdr "WAVE 1 — SKIPPED (already complete)"
else
  hdr "WAVE 1 — audit, auth, docker-setup"
  run_agent "audit"  "$BACKEND/audit"
  run_agent "auth"   "$BACKEND/auth"
  run_agent "docker" "$BASE/docker"
  wait_wave "audit" "auth" "docker"
  compile_with_fix
  validate_with_fix "audit" "auth"
  wave_done 1
fi

# ── WAVE 2: tenant + filesystem ─────────────────────────────────────
CURRENT_WAVE=2
if wave_skip 2; then
  hdr "WAVE 2 — SKIPPED (already complete)"
else
  hdr "WAVE 2 — tenant, filesystem"
  run_agent "tenant"     "$BACKEND/tenant"
  run_agent "filesystem" "$BACKEND/filesystem"
  wait_wave "tenant" "filesystem"
  compile_with_fix
  validate_with_fix "tenant" "filesystem"
  wave_done 2
fi

# ── WAVE 3: everything else ─────────────────────────────────────────
CURRENT_WAVE=3
if wave_skip 3; then
  hdr "WAVE 3 — SKIPPED (already complete)"
else
  hdr "WAVE 3 — cases, checklist, storage, sharing, notifications, superadmin, education, infra"
  run_agent "cases"         "$BACKEND/cases"
  run_agent "checklist"     "$BACKEND/checklist"
  run_agent "storage"       "$BACKEND/storage"
  run_agent "sharing"       "$BACKEND/sharing"
  run_agent "notifications" "$BACKEND/notifications"
  run_agent "superadmin"    "$BACKEND/superadmin"
  run_agent "education"     "$BACKEND/education"
  run_agent "infra"         "$BASE/infra"
  wait_wave "cases" "checklist" "storage" "sharing" "notifications" "superadmin" "education" "infra"
  compile_with_fix
  validate_with_fix "cases" "checklist" "storage" "sharing" "notifications" "superadmin" "education"
  wave_done 3
fi

# ═══════════════════════════════════════════════════════════════════════
END_TIME=$(date +%s)
ELAPSED=$(( (END_TIME - START_TIME) / 60 ))

hdr "BACKEND BUILD COMPLETE — ${ELAPSED} min"

if [ ${#GLOBAL_FAILURES[@]} -eq 0 ]; then
  ok "ALL MODULES PASSED — backend is ready"
else
  warn "${#GLOBAL_FAILURES[@]} issue(s) need attention:"
  for f in "${GLOBAL_FAILURES[@]}"; do
    err "  → $f"
  done
fi

echo ""
log "Backend log: $SUMMARY"
