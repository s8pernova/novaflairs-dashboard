#!/bin/sh
set -eu

SEED_DIR="${NODE_RED_SEED_DIR:-/opt/novaflairs-nodered}"

mkdir -p /data

copy_if_missing() {
  src="$1"
  dest="$2"

  if [ ! -e "$dest" ] && [ -f "$src" ]; then
    cp "$src" "$dest"
  fi
}

copy_dir_if_missing() {
  src="$1"
  dest="$2"

  if [ ! -e "$dest" ] && [ -d "$src" ]; then
    cp -a "$src" "$dest"
  fi
}

copy_if_missing "$SEED_DIR/package.json" /data/package.json
copy_if_missing "$SEED_DIR/package-lock.json" /data/package-lock.json
copy_if_missing "$SEED_DIR/flows.json" /data/flows.json
copy_if_missing "$SEED_DIR/settings.js" /data/settings.js
copy_dir_if_missing "$SEED_DIR/node_modules" /data/node_modules

if [ ! -f /data/flows_cred.json ]; then
  printf "{}\n" > /data/flows_cred.json
fi

cd /usr/src/node-red
exec npm start -- --userDir /data
