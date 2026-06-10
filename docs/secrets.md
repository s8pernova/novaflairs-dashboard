# Secret Handling

This repo keeps secrets scoped to the runtime that uses them. Commit only
example files with placeholder values.

## Files

| File | Commit? | Purpose |
| --- | --- | --- |
| `.env.example` | Yes | Docker Compose orchestration and browser-visible UI build values |
| `.env` | No | Local Docker Compose values |
| `ui/.env.local.example` | Yes | Browser-visible Vite/Supabase values for local UI development |
| `ui/.env.local` | No | Local UI values |
| `backend/.env.example` | Yes | Backend-only server settings |
| `backend/.env` | No | Local backend secrets, including Supabase service-role access |
| `nodered/.env.example` | Yes | Node-RED runtime and database settings |
| `nodered/.env` | No | Local Node-RED secrets |

## Boundaries

- UI variables prefixed with `VITE_` are bundled into browser JavaScript. Treat
  them as public configuration, not secrets.
- Backend variables can include server-only secrets such as
  `SUPABASE_SERVICE_ROLE_KEY`.
- Node-RED receives only its editor credentials, credential encryption secret,
  and database connection settings.
- In Docker Compose env files, wrap values containing `$` in single quotes.
  This commonly applies to bcrypt hashes and some generated database passwords.
- Hosted Supabase project secrets live in Supabase/GitHub/host secret storage.
  Add a `supabase/.env.example` only if this repo starts running a local
  Supabase CLI stack.

## Before Making The Repo Public

1. Rotate every credential that has ever been committed.
2. Remove leaked secret files from Git history.
3. Run a secret scanner such as `gitleaks` against the full history.
