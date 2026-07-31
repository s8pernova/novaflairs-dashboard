#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/srv/novaflairs-dashboard"
STATE_DIR="/srv/novaflairs-deploy"
BACKUP_ROOT="$STATE_DIR/backups"
COMPOSE_ENV="/etc/novaflairs/compose.env"
COMPOSE_FILE="$APP_DIR/docker-compose.yml"
PROJECT_NAME="infra"
NODE_RED_VOLUME="novaflairs_nodered_data"
LOCK_FILE="$STATE_DIR/deploy.lock"

TARGET_SHA="${1:-}"
RELEASE_TAG=""
BACKUP_DIR=""
PREVIOUS_SHA=""
PREVIOUS_DATA_SOURCE=""
PREVIOUS_UI_IMAGE=""
PREVIOUS_NODE_RED_IMAGE=""
PREVIOUS_NODE_RED_USER=""
ROLLBACK_COMPOSE_FILE=""
ROLLBACK_OVERRIDE_FILE=""
CUTOVER_STARTED=0
DEPLOY_COMPLETE=0

log() {
  printf '\n[%s] %s\n' "$(date -Is)" "$*"
}

die() {
  printf '\n[deploy failed] %s\n' "$*" >&2
  exit 1
}

compose() {
  RELEASE_TAG="$RELEASE_TAG" docker compose \
    --project-name "$PROJECT_NAME" \
    --project-directory "$APP_DIR" \
    --env-file "$COMPOSE_ENV" \
    --file "$COMPOSE_FILE" \
    "$@"
}

rollback_compose() {
  local -a files=(--file "$ROLLBACK_COMPOSE_FILE")

  if [[ "$PREVIOUS_DATA_SOURCE" == "bind" ]]; then
    files+=(--file "$ROLLBACK_OVERRIDE_FILE")
  fi

  RELEASE_TAG="rollback" \
  NODE_RED_ROLLBACK_DATA_DIR="$APP_DIR/nodered" \
  NODE_RED_ROLLBACK_USER="$PREVIOUS_NODE_RED_USER" \
    docker compose \
      --project-name "$PROJECT_NAME" \
      --project-directory "$APP_DIR" \
      --env-file "$COMPOSE_ENV" \
      "${files[@]}" \
      "$@"
}

required_env_keys() {
  printf '%s\n' \
    VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY \
    NODE_RED_ADMIN_PASSWORD \
    NODE_RED_CREDENTIAL_SECRET \
    DB_HOST \
    DB_PORT \
    DB_NAME \
    DB_USER \
    DB_PASSWORD \
    DB_SSL_REJECT_UNAUTHORIZED
}

validate_host() {
  local key

  log "Validating host prerequisites"
  for command_name in curl docker flock git grep tar; do
    command -v "$command_name" >/dev/null \
      || die "Required command is unavailable: $command_name"
  done

  test -d "$APP_DIR/.git" || die "Git checkout is missing: $APP_DIR"
  test -r "$COMPOSE_ENV" || die "Compose environment is unreadable: $COMPOSE_ENV"
  test -r /etc/novaflairs/supabase-ca.pem \
    || die "Database CA certificate is unreadable"

  while IFS= read -r key; do
    grep --quiet --extended-regexp "^${key}=.+" "$COMPOSE_ENV" \
      || die "Required environment key is missing or empty: $key"
  done < <(required_env_keys)

  docker info >/dev/null
  docker compose version >/dev/null
}

smoke_test() {
  log "Smoke testing UI"
  curl --fail --silent --show-error --max-time 10 \
    http://127.0.0.1:8080/ >/dev/null

  log "Smoke testing Node-RED"
  curl --fail --silent --show-error --max-time 10 \
    http://127.0.0.1:1880/ >/dev/null

  log "Smoke testing Metabase"
  curl --fail --silent --show-error --max-time 15 \
    http://127.0.0.1:3000/api/health \
    | grep --quiet '"status"[[:space:]]*:[[:space:]]*"ok"'
}

detect_node_red_data_source() {
  local mount_type

  mount_type=$(docker inspect --format \
    '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Type}}{{end}}{{end}}' \
    novaflairs-nodered)

  case "$mount_type" in
    bind|volume)
      PREVIOUS_DATA_SOURCE="$mount_type"
      ;;
    *)
      die "Cannot identify the current Node-RED /data mount"
      ;;
  esac
}

backup_node_red_data() {
  if [[ "$PREVIOUS_DATA_SOURCE" != "bind" ]]; then
    return
  fi

  tar -C "$APP_DIR/nodered" -czf "$BACKUP_DIR/nodered-data.tar.gz" .
}

copy_bind_data_to_volume() {
  local helper_image=$1

  docker volume create "$NODE_RED_VOLUME" >/dev/null
  docker run --rm \
    --user 0 \
    --entrypoint /bin/sh \
    --volume "$NODE_RED_VOLUME:/target" \
    --volume "$BACKUP_DIR:/backup:ro" \
    "$helper_image" \
    -c '
      set -eu
      find /target -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +
      tar -C /target -xzf /backup/nodered-data.tar.gz
      chown -R 1000:1000 /target
    '
}

create_backup() {
  local timestamp

  timestamp=$(date -u +%Y%m%dT%H%M%SZ)
  BACKUP_DIR="$BACKUP_ROOT/${timestamp}-${TARGET_SHA:0:12}"
  install -d -m 0700 "$BACKUP_DIR"

  log "Creating pre-deployment backup: $BACKUP_DIR"
  PREVIOUS_SHA=$(git -C "$APP_DIR" rev-parse HEAD)
  PREVIOUS_UI_IMAGE=$(docker inspect --format '{{.Image}}' novaflairs-ui)
  PREVIOUS_NODE_RED_IMAGE=$(docker inspect --format '{{.Image}}' novaflairs-nodered)
  PREVIOUS_NODE_RED_USER=$(docker inspect --format '{{.Config.User}}' novaflairs-nodered)
  if [[ -z "$PREVIOUS_NODE_RED_USER" ]]; then
    PREVIOUS_NODE_RED_USER="0:0"
  fi

  printf '%s\n' "$PREVIOUS_SHA" >"$BACKUP_DIR/previous-sha"
  git -C "$APP_DIR" status --porcelain=v1 >"$BACKUP_DIR/git-status.txt"
  docker inspect \
    novaflairs-ui \
    novaflairs-nodered \
    novaflairs-metabase \
    >"$BACKUP_DIR/containers.json"

  detect_node_red_data_source
  printf '%s\n' "$PREVIOUS_DATA_SOURCE" >"$BACKUP_DIR/nodered-data-source"
  printf '%s\n' "$PREVIOUS_NODE_RED_USER" >"$BACKUP_DIR/nodered-user"
  backup_node_red_data

  docker image tag "$PREVIOUS_UI_IMAGE" novaflairs-dashboard-ui:rollback
  docker image tag \
    "$PREVIOUS_NODE_RED_IMAGE" \
    novaflairs-dashboard-nodered:rollback
}

restore_checkout_and_data() {
  log "Restoring checkout $PREVIOUS_SHA"
  git -C "$APP_DIR" reset --hard "$PREVIOUS_SHA"

  if [[ "$PREVIOUS_DATA_SOURCE" == "bind" ]]; then
    tar --same-permissions \
      -C "$APP_DIR/nodered" \
      -xzf "$BACKUP_DIR/nodered-data.tar.gz"
  fi
}

rollback() {
  local rollback_failed=0

  set +e
  trap - ERR

  printf '\n[deploy failed] starting rollback; backup=%s\n' \
    "$BACKUP_DIR" >&2

  if (( CUTOVER_STARTED == 1 )); then
    if ! compose stop; then
      rollback_failed=1
    fi
  fi

  if ! restore_checkout_and_data; then
    rollback_failed=1
  fi

  if (( CUTOVER_STARTED == 1 )); then
    if ! rollback_compose up \
      --detach \
      --force-recreate \
      --remove-orphans \
      --no-build \
      --wait \
      --wait-timeout 180; then
      rollback_failed=1
    fi

    if ! smoke_test; then
      rollback_failed=1
    fi
  fi

  if (( rollback_failed == 0 )); then
    printf '\n[rollback complete] previous release is running\n' >&2
  else
    printf '\n[rollback failed] manual recovery required; backup=%s\n' \
      "$BACKUP_DIR" >&2
  fi
}

handle_error() {
  local exit_code=$?
  local line_no=${1:-unknown}

  printf '\n[deploy failed] line=%s exit=%s\n' \
    "$line_no" "$exit_code" >&2

  if [[ -n "$BACKUP_DIR" ]] && (( DEPLOY_COMPLETE == 0 )); then
    rollback
  fi

  exit "$exit_code"
}

main() {
  umask 077
  install -d -m 0700 "$STATE_DIR" "$BACKUP_ROOT"

  exec 9>"$LOCK_FILE"
  flock --nonblock 9 || die "Another deployment is already running"

  validate_host

  if [[ "$TARGET_SHA" == "preflight" ]]; then
    smoke_test
    log "Preflight complete"
    return
  fi

  [[ "$TARGET_SHA" =~ ^[0-9a-f]{40}$ ]] \
    || die "Usage: deploy.sh <40-character-git-sha|preflight>"

  cd "$APP_DIR"
  create_backup
  trap 'handle_error $LINENO' ERR

  log "Fetching target release"
  git fetch --prune origin main
  git cat-file -e "$TARGET_SHA^{commit}"
  if ! git merge-base --is-ancestor "$TARGET_SHA" origin/main; then
    printf 'Target commit is not reachable from origin/main\n' >&2
    return 1
  fi

  log "Checking out $TARGET_SHA"
  git reset --hard "$TARGET_SHA"
  test "$(git rev-parse HEAD)" = "$TARGET_SHA"
  test -f "$COMPOSE_FILE"

  ROLLBACK_COMPOSE_FILE="$BACKUP_DIR/docker-compose.yml"
  ROLLBACK_OVERRIDE_FILE="$BACKUP_DIR/docker-compose.rollback.yml"
  cp "$COMPOSE_FILE" "$ROLLBACK_COMPOSE_FILE"
  cp \
    "$APP_DIR/infra/deploy/docker-compose.rollback.yml" \
    "$ROLLBACK_OVERRIDE_FILE"

  RELEASE_TAG="$TARGET_SHA"

  log "Validating Docker Compose configuration"
  compose config --quiet

  log "Building target images"
  compose --progress=plain build --pull

  if [[ "$PREVIOUS_DATA_SOURCE" == "bind" ]]; then
    log "Migrating Node-RED /data from bind mount to named volume"
    copy_bind_data_to_volume "novaflairs-dashboard-nodered:$RELEASE_TAG"
  fi

  log "Starting target release"
  CUTOVER_STARTED=1
  compose up \
    --detach \
    --remove-orphans \
    --wait \
    --wait-timeout 180

  compose ps
  smoke_test

  DEPLOY_COMPLETE=1
  trap - ERR

  log "Deploy complete: $TARGET_SHA"
}

main "$@"
