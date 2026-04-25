#!/bin/bash
# DocPanther — Master Orchestrator
# Builds the entire product end to end, then starts it locally.
# Run this and go to sleep. Check logs/MORNING-REPORT.log when you wake up.
#
# Usage:
#   ./run-all.sh              — build + start locally
#   ./run-all.sh --no-start   — build only, don't start Docker

set -uo pipefail

BASE="/Users/vivekkumar/Documents/vivi-doc-collector"
LOG_DIR="$BASE/logs"
REPORT="$LOG_DIR/MORNING-REPORT.log"
mkdir -p "$LOG_DIR"

AUTO_START=true
if [[ "${1:-}" == "--no-start" ]]; then
  AUTO_START=false
fi

START_TIME=$(date +%s)
PHASE_FAILURES=()

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()  { echo -e "${CYAN}[$(date +%H:%M:%S)] $*${NC}"; echo "[$(date +%H:%M:%S)] $*" >> "$REPORT"; }
ok()   { echo -e "${GREEN}[$(date +%H:%M:%S)] ✅ $*${NC}"; echo "[$(date +%H:%M:%S)] ✅ $*" >> "$REPORT"; }
err()  { echo -e "${RED}[$(date +%H:%M:%S)] ❌ $*${NC}"; echo "[$(date +%H:%M:%S)] ❌ $*" >> "$REPORT"; }
warn() { echo -e "${YELLOW}[$(date +%H:%M:%S)] ⚠  $*${NC}"; echo "[$(date +%H:%M:%S)] ⚠  $*" >> "$REPORT"; }
hdr()  { echo -e "\n${BOLD}${YELLOW}══ $* ══${NC}"; echo "" >> "$REPORT"; echo "══ $* ══" >> "$REPORT"; }

# ── Banner ───────────────────────────────────────────────────────────
echo -e "${BOLD}${CYAN}"
cat << 'BANNER'
╔═══════════════════════════════════════════════════════════╗
║         DocPanther — Full Build Orchestrator              ║
╚═══════════════════════════════════════════════════════════╝
BANNER
echo -e "${NC}"
echo "Started: $(date)" | tee "$REPORT"
echo "" | tee -a "$REPORT"

# ════════════════════════════════════════════════════════════════
# PHASE 1 — Backend (Waves 1, 2, 3)
# ════════════════════════════════════════════════════════════════
hdr "PHASE 1 — Backend"

if bash "$BASE/orchestrate.sh" 2>&1 | tee -a "$REPORT"; then
  ok "PHASE 1 complete"
else
  warn "PHASE 1 finished with some issues (see SUMMARY.log)"
  PHASE_FAILURES+=("Backend")
fi

# ════════════════════════════════════════════════════════════════
# PHASE 2 — Frontend (Waves 4, 5)
# ════════════════════════════════════════════════════════════════
hdr "PHASE 2 — Frontend"

if bash "$BASE/orchestrate-web.sh" 2>&1 | tee -a "$REPORT"; then
  ok "PHASE 2 complete"
else
  warn "PHASE 2 finished with some issues (see SUMMARY-web.log)"
  PHASE_FAILURES+=("Frontend")
fi

# ════════════════════════════════════════════════════════════════
# PHASE 3 — Start local environment with Docker Compose
# ════════════════════════════════════════════════════════════════
if [ "$AUTO_START" = true ]; then
  hdr "PHASE 3 — Starting local environment"

  cd "$BASE"

  # Copy env file if not already present
  if [ ! -f ".env.local" ] && [ -f ".env.local.example" ]; then
    cp .env.local.example .env.local
    warn ".env.local not found — copied from .env.local.example"
    warn "Edit .env.local with your real API keys before using Google OAuth or S3"
  fi

  # Check Docker is running
  if ! docker info > /dev/null 2>&1; then
    err "Docker is not running — start Docker Desktop and re-run Phase 3:"
    err "  cd $BASE && docker-compose up --build -d"
    PHASE_FAILURES+=("Docker-not-running")
  else
    log "Building Docker images and starting services..."
    log "This may take 5-10 minutes on first run (Maven + npm build inside containers)..."

    if docker-compose --env-file .env.local up --build -d 2>&1 | tee -a "$REPORT"; then
      ok "Docker Compose started"

      # ── Health check loop (backend) ──────────────────────────────
      log "Waiting for backend to be healthy..."
      HEALTH_TIMEOUT=180   # 3 minutes
      ELAPSED=0
      BACKEND_READY=false

      while [ $ELAPSED -lt $HEALTH_TIMEOUT ]; do
        if curl -sf http://localhost:8080/actuator/health > /dev/null 2>&1; then
          BACKEND_READY=true
          break
        fi
        sleep 5
        ELAPSED=$((ELAPSED + 5))
        log "  Backend starting... (${ELAPSED}s / ${HEALTH_TIMEOUT}s)"
      done

      if [ "$BACKEND_READY" = true ]; then
        ok "Backend is healthy at http://localhost:8080"
      else
        warn "Backend did not respond within ${HEALTH_TIMEOUT}s — may still be starting"
        warn "Check: docker-compose logs backend"
        PHASE_FAILURES+=("Backend-health-timeout")
      fi

      # ── Health check loop (frontend) ─────────────────────────────
      log "Waiting for frontend to be ready..."
      ELAPSED=0
      WEB_READY=false

      while [ $ELAPSED -lt 60 ]; do
        if curl -sf http://localhost:3000 > /dev/null 2>&1; then
          WEB_READY=true
          break
        fi
        sleep 5
        ELAPSED=$((ELAPSED + 5))
      done

      if [ "$WEB_READY" = true ]; then
        ok "Frontend is ready at http://localhost:3000"
      else
        warn "Frontend did not respond within 60s"
        warn "Check: docker-compose logs web"
      fi

    else
      err "docker-compose up failed"
      err "Check: docker-compose logs"
      PHASE_FAILURES+=("Docker-compose-up")
    fi
  fi
fi

# ════════════════════════════════════════════════════════════════
# MORNING REPORT
# ════════════════════════════════════════════════════════════════
END_TIME=$(date +%s)
TOTAL_ELAPSED=$(( (END_TIME - START_TIME) / 60 ))

echo "" | tee -a "$REPORT"
echo "════════════════════════════════════════════════════" | tee -a "$REPORT"
echo "TOTAL BUILD TIME: ${TOTAL_ELAPSED} minutes" | tee -a "$REPORT"
echo "Finished: $(date)" | tee -a "$REPORT"
echo "" | tee -a "$REPORT"

echo -e "${BOLD}"
if [ ${#PHASE_FAILURES[@]} -eq 0 ]; then
  echo -e "${GREEN}"
  cat << 'DONE'
╔═══════════════════════════════════════════════════════════╗
║               GOOD MORNING! 🌅  Everything built.         ║
╚═══════════════════════════════════════════════════════════╝
DONE
  echo -e "${NC}${BOLD}"
  echo "  Frontend:  http://localhost:3000"
  echo "  Backend:   http://localhost:8080"
  echo "  API docs:  http://localhost:8080/swagger-ui.html"
  echo "  DB:        localhost:5432  (user: docpanther / pass: localdev123)"
  echo ""
  echo "  Full log:  logs/MORNING-REPORT.log"
else
  echo -e "${YELLOW}"
  cat << 'WARN'
╔═══════════════════════════════════════════════════════════╗
║          GOOD MORNING! 🌅  Build done with issues.        ║
╚═══════════════════════════════════════════════════════════╝
WARN
  echo -e "${NC}${BOLD}"
  echo "  Issues in these phases:"
  for f in "${PHASE_FAILURES[@]}"; do
    echo -e "  ${RED}→ $f${NC}"
  done
  echo ""
  echo "  To inspect failures:"
  echo "    grep '❌' logs/MORNING-REPORT.log"
  echo "    grep '❌' logs/SUMMARY.log"
  echo "    grep '❌' logs/SUMMARY-web.log"
  echo ""
  echo "  To restart services after fixing:"
  echo "    cd $BASE && docker-compose up --build -d"
fi

echo -e "${NC}"
echo ""
echo "Useful commands:"
echo "  docker-compose logs -f backend    — watch backend logs"
echo "  docker-compose logs -f web        — watch frontend logs"
echo "  docker-compose down               — stop everything"
echo "  docker-compose up -d              — restart (no rebuild)"
echo "  docker-compose up --build -d      — restart with rebuild"
echo ""
echo "Deploy to Hostinger VPS:"
echo "  docker-compose -f docker-compose.hostinger.yml up --build -d"
