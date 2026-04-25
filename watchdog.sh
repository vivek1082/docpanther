#!/bin/bash
# DocPanther Build Watchdog — monitors build and restarts if stopped
# Run: nohup bash watchdog.sh >> logs/watchdog.log 2>&1 &

BASE="/Users/vivekkumar/Documents/vivi-doc-collector"
LOG_DIR="$BASE/logs"
WATCH_LOG="$LOG_DIR/watchdog.log"
CHECK_INTERVAL=120

mkdir -p "$LOG_DIR"

_wlog() { echo "[$(date '+%H:%M:%S')] $*" | tee -a "$WATCH_LOG"; }

# Use pgrep to check for running process — more reliable than PID files
backend_running() { pgrep -f "orchestrate.sh" > /dev/null 2>&1; }
web_running()     { pgrep -f "orchestrate-web.sh" > /dev/null 2>&1; }

backend_complete() {
  grep -q "BACKEND BUILD COMPLETE" "$LOG_DIR/SUMMARY.log" 2>/dev/null ||
  grep -q "BACKEND BUILD COMPLETE" "$LOG_DIR/nohup.log"   2>/dev/null
}

web_complete() {
  grep -q "ALL PHASES COMPLETE\|WEB BUILD COMPLETE" "$LOG_DIR/MORNING-REPORT.log" 2>/dev/null ||
  grep -q "ALL PHASES COMPLETE\|WEB BUILD COMPLETE" "$LOG_DIR/nohup-web.log"       2>/dev/null
}

start_backend() {
  _wlog "Starting orchestrate.sh (backend)..."
  (cd "$BASE" && nohup bash orchestrate.sh >> "$LOG_DIR/nohup.log" 2>&1) &
  _wlog "  → PID $!"
}

start_web() {
  _wlog "Starting orchestrate-web.sh (frontend)..."
  (cd "$BASE" && nohup bash orchestrate-web.sh >> "$LOG_DIR/nohup-web.log" 2>&1) &
  _wlog "  → PID $!"
}

_wlog "=== Watchdog started (PID $$) — checking every ${CHECK_INTERVAL}s ==="

while true; do
  if backend_complete && web_complete; then
    _wlog "ALL PHASES COMPLETE — watchdog done."
    break
  fi

  if ! backend_complete; then
    if backend_running; then
      _wlog "Backend running — OK"
    else
      _wlog "Backend not running and not complete — restarting!"
      start_backend
    fi
  else
    _wlog "Backend complete — OK"
  fi

  if backend_complete && ! web_complete; then
    if web_running; then
      _wlog "Web running — OK"
    else
      _wlog "Web not running and not complete — starting!"
      start_web
    fi
  fi

  sleep "$CHECK_INTERVAL"
done
