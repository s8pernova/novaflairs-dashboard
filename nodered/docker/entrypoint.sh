#!/bin/sh
set -eu

mkdir -p /data

copy_file() {
  src="$1"
  dest="$2"

  if [ -f "$src" ]; then
    cp "$src" "$dest"
  fi
}

copy_dir() {
  src="$1"
  dest="$2"

  if [ -d "$src" ]; then
    rm -rf "$dest"
    cp -a "$src" "$dest"
  fi
}

copy_file /opt/orbit-nodered/flows.json /data/flows.json
copy_file /opt/orbit-nodered/flows_cred.json /data/flows_cred.json
copy_file /opt/orbit-nodered/settings.js /data/settings.js
copy_dir  /opt/orbit-nodered/lib /data/lib

cd /usr/src/node-red
exec npm start -- --userDir /data