#!/usr/bin/env bash
#
# Start the kakilleAI stack for local development:
#   - Postgres (pgvector)        — docker compose
#   - admin-service (RAG builder)— docker compose (migrations run in-container)
#   - frontend (Next.js)         — pnpm dev on the host
#
#   ./start-dev.sh
#
# Ctrl+C stops the frontend and the admin-service container. Postgres is left
# running (it's the shared dev database). Set SKIP_BUILD=1 to skip rebuilding
# the admin-service image.
#
# Compatible with the bash 3.2 that ships with macOS.

# `set -m` (job control) puts each host background process in its own process
# group, so Ctrl+C cleanup can stop the whole tree (next dev + turbopack
# workers, the log follower) without anything respawning.
set -eu
set -m

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

FRONTEND_DIR="$ROOT_DIR/frontend"
ADMIN_PORT="${ADMIN_PORT:-8001}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

FRONTEND_PID=""
LOGS_PID=""

log() { printf '\033[1;36m[start-dev]\033[0m %s\n' "$1"; }
err() { printf '\033[1;31m[start-dev]\033[0m %s\n' "$1" >&2; }

listeners_on() { lsof -nP -iTCP:"$1" -sTCP:LISTEN -t 2>/dev/null; }

# ── Preflight (before the cleanup trap, so failures exit quietly) ───────────
if ! docker info >/dev/null 2>&1; then
  err "Docker is not running. Start Docker Desktop and retry."
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  err "pnpm not found on PATH — cannot start the frontend."
  exit 1
fi

# The frontend must own its port. If something already holds it (e.g. a stale
# 'next dev', or another copy of this script), fail fast with a clear message
# instead of colliding and tearing everything down later.
if [ -n "$(listeners_on "$FRONTEND_PORT")" ]; then
  err "Port $FRONTEND_PORT is already in use by PID(s): $(listeners_on "$FRONTEND_PORT" | tr '\n' ' ')"
  err "Stop it (e.g. 'kill $(listeners_on "$FRONTEND_PORT" | tr '\n' ' ')') or run: FRONTEND_PORT=3001 ./start-dev.sh"
  exit 1
fi

# ── Cleanup ────────────────────────────────────────────────────────────────
signal_group() {
  # Signal an entire process group (negative PID). With `set -m`, each host
  # job's PID is its process-group leader.
  sig="$1"; pgid="$2"
  [ -n "$pgid" ] || return 0
  kill "-$sig" "-$pgid" 2>/dev/null || true
}

cleanup() {
  trap - INT TERM EXIT
  log "Shutting down…"
  signal_group TERM "$FRONTEND_PID"
  signal_group TERM "$LOGS_PID"
  sleep 1
  signal_group KILL "$FRONTEND_PID"
  signal_group KILL "$LOGS_PID"
  log "Stopping admin-service container…"
  docker compose stop admin-service >/dev/null 2>&1 || true
  wait 2>/dev/null || true
  log "Stopped. (Postgres + pgweb left running — 'docker compose stop postgres pgweb' to halt them.)"
  exit 0
}
trap cleanup INT TERM EXIT

# ── 1. Postgres + admin-service (containers) ───────────────────────────────
BUILD_FLAG="--build"
[ "${SKIP_BUILD:-0}" = "1" ] && BUILD_FLAG=""

log "Starting Postgres + admin-service + pgweb (docker compose)…"
# Migrations run inside the admin-service container (see its Dockerfile CMD).
# pgweb is a lightweight Postgres web viewer on http://localhost:8081.
docker compose up -d $BUILD_FLAG postgres admin-service pgweb

log "Waiting for admin-service to be ready…"
for _ in $(seq 1 60); do
  if [ "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$ADMIN_PORT/health" 2>/dev/null || echo 000)" = "200" ]; then
    log "admin-service is ready."
    break
  fi
  sleep 1
done

# ── 2. Stream admin-service logs ───────────────────────────────────────────
( exec docker compose logs -f --tail 10 admin-service ) &
LOGS_PID=$!

# ── 3. Frontend (Next.js on the host) ──────────────────────────────────────
log "Starting frontend on http://localhost:$FRONTEND_PORT …"
( cd "$FRONTEND_DIR" && exec pnpm dev --port "$FRONTEND_PORT" ) &
FRONTEND_PID=$!

log "Up. Press Ctrl+C to stop."
log "  frontend      → http://localhost:$FRONTEND_PORT/admin/rag"
log "  admin-service → http://localhost:$ADMIN_PORT  (API docs: /docs)"
log "  postgres view → http://localhost:8081  (pgweb)"

# Watch both; when either exits, report which one and let cleanup stop the rest.
while :; do
  if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    err "Frontend (next dev) exited — stopping the admin-service container."
    break
  fi
  if [ -n "$LOGS_PID" ] && ! kill -0 "$LOGS_PID" 2>/dev/null; then
    err "admin-service container stopped — shutting down the frontend."
    break
  fi
  sleep 1
done
