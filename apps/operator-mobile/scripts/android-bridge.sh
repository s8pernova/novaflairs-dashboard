#!/usr/bin/env bash

set -euo pipefail

readonly android_sdk_root="${ANDROID_SDK_ROOT:-/usr/lib/android-sdk}"
readonly linux_adb="${android_sdk_root}/platform-tools/adb"
readonly runtime_dir="${XDG_RUNTIME_DIR:-/tmp}"
readonly adb_server_socket="${ADB_SERVER_SOCKET:-localfilesystem:${runtime_dir}/novaflair-operator-adb.sock}"
readonly emulator_transport="${ANDROID_EMULATOR_TRANSPORT:-127.0.0.1:5555}"
readonly wait_timeout_seconds="${ADB_WAIT_TIMEOUT_SECONDS:-30}"

if [[ ! -x "${linux_adb}" ]]; then
  printf 'Linux adb was not found at %s.\n' "${linux_adb}" >&2
  exit 1
fi

if [[ "${adb_server_socket}" != localfilesystem:* ]]; then
  printf 'ADB_SERVER_SOCKET must use a WSL-local localfilesystem socket, got %s.\n' "${adb_server_socket}" >&2
  exit 1
fi

readonly socket_path="${adb_server_socket#localfilesystem:}"
readonly pid_path="${socket_path}.pid"

adb_command() {
  env ADB_SERVER_SOCKET="${adb_server_socket}" "${linux_adb}" "$@"
}

adb_server_ready() {
  timeout 1 env ADB_SERVER_SOCKET="${adb_server_socket}" \
    "${linux_adb}" devices >/dev/null 2>&1
}

start_adb_server() {
  local backup_path
  local server_log
  local server_pid
  local timestamp

  if adb_server_ready; then
    printf 'Reusing the WSL ADB server at %s.\n' "${socket_path}"
    return
  fi

  timestamp="$(date -u +%Y%m%d-%H%M%SZ)"
  if [[ -e "${socket_path}" ]]; then
    backup_path="${socket_path}.stale-${timestamp}"
    mv -- "${socket_path}" "${backup_path}"
    printf 'Backed up stale ADB socket to %s.\n' "${backup_path}"
  fi

  server_log="${runtime_dir}/novaflair-operator-adb-${timestamp}.log"
  nohup "${linux_adb}" -L "${adb_server_socket}" nodaemon server \
    >"${server_log}" 2>&1 </dev/null &
  server_pid="$!"
  printf '%s\n' "${server_pid}" >"${pid_path}"

  for _ in {1..50}; do
    if adb_server_ready; then
      printf 'Started WSL ADB server %s; log: %s.\n' \
        "${server_pid}" "${server_log}"
      return
    fi
    sleep 0.1
  done

  printf 'WSL ADB server did not become ready. Log: %s\n' "${server_log}" >&2
  cat "${server_log}" >&2
  exit 1
}

start_adb_server

printf 'Connecting WSL ADB to the Windows emulator transport at %s...\n' \
  "${emulator_transport}"
adb_command connect "${emulator_transport}"

if ! timeout "${wait_timeout_seconds}" \
  env ADB_SERVER_SOCKET="${adb_server_socket}" \
  "${linux_adb}" -s "${emulator_transport}" wait-for-device; then
  printf 'No emulator became available at %s within %s seconds. Start Galaxy_Tab_A9 in Android Studio first.\n' \
    "${emulator_transport}" "${wait_timeout_seconds}" >&2
  exit 1
fi

adb_command -s "${emulator_transport}" reverse tcp:8081 tcp:8081
printf 'ADB bridge ready: Android tcp:8081 -> WSL Metro tcp:8081.\n'
