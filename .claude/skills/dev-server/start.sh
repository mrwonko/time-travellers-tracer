#!/usr/bin/env bash
# Idempotent: ensures the Vite dev server for Time Traveller's Tracer is
# running at http://localhost:8080 (also reachable via the machine's LAN
# IP on the same port — vite.config.ts sets server.host: true specifically
# so it can be checked from a phone/tablet on the same network). Safe to
# run even if it's already up; it just confirms and exits.
#
# --restart: kills whatever's already listening on the port first, then
# starts fresh — for when a long-running server has accumulated many
# hot-reloads and a live repro needs to be re-verified against a clean
# module graph before trusting it over the code/tests (see this
# project's own memory on that: a live bug that a restart alone resolved
# turned out to be stale Vite/HMR state, not a real regression).
set -euo pipefail

PORT=8080
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
LOG_FILE="$REPO_ROOT/.dev-server.log"

if [[ "${1:-}" == "--restart" ]]; then
  if lsof -ti:${PORT} -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Stopping existing dev server…"
    lsof -ti:${PORT} -sTCP:LISTEN | xargs -r kill
    for _ in $(seq 1 10); do
      curl -sf "http://localhost:${PORT}" >/dev/null 2>&1 || break
      sleep 1
    done
  fi
elif curl -sf "http://localhost:${PORT}" >/dev/null 2>&1; then
  echo "Dev server already running at http://localhost:${PORT}"
  exit 0
fi

echo "Starting dev server (log: $LOG_FILE)…"
cd "$REPO_ROOT"
nohup npm run dev > "$LOG_FILE" 2>&1 &
disown

for _ in $(seq 1 30); do
  if curl -sf "http://localhost:${PORT}" >/dev/null 2>&1; then
    echo "Dev server up at http://localhost:${PORT}"
    exit 0
  fi
  sleep 1
done

echo "Dev server did not come up within 30s — check $LOG_FILE" >&2
exit 1
