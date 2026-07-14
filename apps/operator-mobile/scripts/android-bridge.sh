#!/usr/bin/env bash

set -euo pipefail

readonly adb_server_socket="${ADB_SERVER_SOCKET:-tcp:127.0.0.1:5037}"
readonly android_sdk_root="${ANDROID_SDK_ROOT:-/usr/lib/android-sdk}"
readonly linux_adb="${android_sdk_root}/platform-tools/adb"
readonly wait_timeout_seconds="${ADB_WAIT_TIMEOUT_SECONDS:-30}"

if [[ ! -x "${linux_adb}" ]]; then
  printf 'Linux adb was not found at %s.\n' "${linux_adb}" >&2
  exit 1
fi

if ! command -v powershell.exe >/dev/null 2>&1; then
  printf 'powershell.exe is unavailable. Run this command from WSL with Windows interop enabled.\n' >&2
  exit 1
fi

windows_adb_path="$(powershell.exe -NoProfile -NonInteractive -Command '
  $adb = Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe"
  if (-not (Test-Path -LiteralPath $adb)) {
    Write-Error "Windows adb was not found at $adb."
    exit 1
  }
  [Console]::Write($adb)
' | tr -d '\r')"
readonly windows_adb="$(wslpath -u "${windows_adb_path}")"

printf 'Starting the Windows ADB server...\n'
"${windows_adb}" start-server

printf 'Waiting up to %s seconds for an Android device...\n' "${wait_timeout_seconds}"
if ! timeout "${wait_timeout_seconds}" env ADB_SERVER_SOCKET="${adb_server_socket}" "${linux_adb}" wait-for-device; then
  printf 'No Android device became available through %s. Confirm that the Windows emulator is running and visible to adb.exe.\n' "${adb_server_socket}" >&2
  exit 1
fi

env ADB_SERVER_SOCKET="${adb_server_socket}" "${linux_adb}" reverse tcp:8081 tcp:8081
printf 'ADB bridge ready on tcp:8081.\n'
