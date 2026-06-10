# Node-RED

This directory contains the public, source-controlled Node-RED assets:

- `flows.json` for flow definitions
- `settings.js` for runtime configuration
- `package.json` and `package-lock.json` for custom nodes

Do not commit local Node-RED runtime state or credential files. In particular,
keep these files local-only:

- `flows_cred.json`
- `.config*.json`
- `*.backup`
- `.sessions.json`
- `.storage/`
- `context/`

Credentials are read from environment variables in `nodered/.env`. Start from
`nodered/.env.example` and keep the real `.env` private.
