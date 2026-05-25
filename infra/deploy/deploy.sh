#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="novaflairs"
APP_DIR="/srv/novaflairs-dashboard"
COMPOSE_FILE="$APP_DIR/infra/docker-compose.yml"
COMPOSE_ENV="/etc/novaflairs/compose.env"

compose() {
  docker compose \
    --project-name "$APP_NAME" \
    --env-file "$COMPOSE_ENV" \
    -f "$COMPOSE_FILE" \
    "$@"
}

log() {
  printf '\n[%s] %s\n' "$(date -Is)" "$*"
}

fail() {
  local exit_code=$?
  local line_no=${1:-unknown}

  printf '\n[deploy failed] line=%s exit=%s\n' "$line_no" "$exit_code" >&2

  compose ps || true
  compose logs --tail=120 || true

  exit "$exit_code"
}

trap 'fail $LINENO' ERR

cd "$APP_DIR"

# Pull latest code 
log "Pulling latest code"
git fetch --all --prune
git reset --hard origin/main

# Validate required files 
log "Validating required files"
test -f "$COMPOSE_FILE"
test -f "$COMPOSE_ENV"

log "Validating Docker access"
docker ps >/dev/null

log "Validating Docker Compose config"
compose config -q

# Build and deploy 
log "Building images"
compose --progress=plain build --pull

log "Starting containers"
compose up -d --remove-orphans

# Verify 
log "Waiting for containers to stabilize"
sleep 10

log "Container status"
compose ps

# Check that all containers are running (not restarting/exited)
UNHEALTHY=$(compose ps --format json | grep -cv '"running"' || true)
if [ "$UNHEALTHY" -gt 0 ]; then
  log "WARNING: $UNHEALTHY container(s) are not in 'running' state"
  compose logs --tail=80
  exit 1
fi

# Quick smoke test: verify the UI container is serving HTML
log "Smoke testing UI"
if curl -fsS --max-time 5 http://127.0.0.1:8080 | grep -q '</html>'; then
  log "UI smoke test passed"
else
  log "UI smoke test failed — container may still be starting"
  compose logs --tail=40 ui || true
  exit 1
fi

log "Recent logs"
compose logs --tail=40 || true

log "Deploy complete"
