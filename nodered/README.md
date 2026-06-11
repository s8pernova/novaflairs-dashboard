# Node-RED

This directory contains the public, source-controlled Node-RED assets:

- `flows.json` for flow definitions
- `settings.js` for runtime configuration
- `package.json` and `package-lock.json` for custom nodes

At runtime, Docker Compose mounts a named `node_red_data` volume at `/data`.
The image seeds that volume on first run from the files in this directory.
Node-RED editor changes are written to the Docker volume, not directly to Git.

Do not commit Node-RED runtime state or credential files. In particular, keep
these files out of source control:

- `flows_cred.json`
- `.config*.json`
- `*.backup`
- `.sessions.json`
- `.storage/`
- `context/`

Credentials are read from environment variables in `nodered/.env`. Start from
`nodered/.env.example` and keep the real `.env` private.

To intentionally update source-controlled flows after editing in the Node-RED
editor, export the flow and replace `nodered/flows.json` in a separate reviewed
change.
