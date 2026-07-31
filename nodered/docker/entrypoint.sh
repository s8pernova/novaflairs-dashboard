#!/bin/sh
set -eu

IMAGE_DIR="${NODE_RED_IMAGE_DIR:-/opt/novaflairs-nodered}"

mkdir -p /data

copy_from_image() {
  src="$1"
  dest="$2"

  if [ -f "$src" ]; then
    cp "$src" "$dest"
  fi
}

copy_from_image "$IMAGE_DIR/flows.json" /data/flows.json
copy_from_image "$IMAGE_DIR/settings.js" /data/settings.js
copy_from_image "$IMAGE_DIR/package.json" /data/package.json
copy_from_image "$IMAGE_DIR/package-lock.json" /data/package-lock.json

rm -rf /data/node_modules
ln -s "$IMAGE_DIR/node_modules" /data/node_modules

if [ ! -f /data/flows_cred.json ]; then
  printf "{}\n" > /data/flows_cred.json
fi

cd /usr/src/node-red
exec npm start -- --userDir /data
