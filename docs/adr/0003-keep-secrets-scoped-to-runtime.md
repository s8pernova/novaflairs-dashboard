# ADR 0003: Keep secrets scoped to each runtime

## Status

Accepted

## Date

2026-06-11

## Owners

Aidan Hoo

## Context

NOVAflair runs several runtimes from one repository: the browser-facing React UI,
backend configuration, Supabase database tooling, Node-RED automation, Docker Compose
orchestration, and hosted Supabase resources. Each runtime needs environment
configuration, but not every value has the same exposure risk.

The project needs a simple rule for which environment files can be committed,
where local secrets live, and how browser-visible configuration differs from
server-only credentials.

Constraints:

- Browser builds expose `VITE_` variables to client-side JavaScript.
- Backend and Node-RED runtimes may need credentials that must never ship to the
  browser or be committed to git.
- Docker Compose, Node-RED, and hosted Supabase each load secrets from different
  places.
- The repository should remain demo-friendly without storing live credentials.

Assumptions:

- The repo will commit example environment files with placeholder values.
- Local `.env` files contain developer or deployment-specific secrets.
- Hosted Supabase project secrets and CLI authentication profiles are managed
  outside this repository. Local Supabase uses only documented optional values.

## Decision

NOVAflair will keep secrets scoped to the runtime that uses them, and the repo
will commit only example environment files with placeholder values.

Decision details:

- Commit `.env.example`, `ui/.env.local.example`, `backend/.env.example`, and
  `nodered/.env.example`.
- Do not commit `.env`, `ui/.env.local`, `backend/.env`, or `nodered/.env`.
- Treat `VITE_` values as public browser configuration, not secrets.
- Keep backend-only credentials, including `SUPABASE_SERVICE_ROLE_KEY`, out of
  browser and mobile bundles.
- Give Node-RED only its editor credentials, credential encryption secret, and
  database connection settings.
- Store Node-RED mutable runtime state in the `node_red_data` Docker volume; keep
  only seed files such as `flows.json`, `settings.js`, and package manifests in
  the repo.
- Wrap Docker Compose env values containing `$` in single quotes, especially
  bcrypt hashes and some generated database passwords.
- Commit `supabase/.env.example` for optional local-only Supabase values; never
  put linked-project credentials in that file.

In scope:

- Environment file ownership and commit policy.
- Runtime boundaries for browser, backend, Node-RED, Docker Compose, and hosted
  Supabase secrets.
- Public-repo cleanup expectations.

Out of scope:

- Rotating any current credential.
- Removing leaked secrets from git history.
- Running secret scanners.
- Changing deployment secret stores.
- Running database migrations.

## Rationale

Runtime-scoped secrets keep the project easy to run locally without blurring
security boundaries.

- Example files document the required configuration without exposing live
  credentials.
- Separating browser-visible values from server-only values prevents accidental
  service-role leakage.
- Keeping Node-RED mutable state in a Docker volume matches how Node-RED expects
  to persist runtime changes while still letting the repo provide deterministic
  seed files.
- Deferring `supabase/.env.example` avoids documenting a local Supabase runtime
  that does not exist yet.

## Design and implementation notes

### Data model

- No database tables or columns are changed by this decision.
- Secrets are not stored in repository-managed database seed files.

### API / interfaces

Environment file policy:

| File                    | Commit? | Purpose                                                          |
| ----------------------- | ------- | ---------------------------------------------------------------- |
| `.env.example`          | Yes     | Docker Compose orchestration and browser-visible UI build values |
| `.env`                  | No      | Local Docker Compose values                                      |
| `ui/.env.local.example` | Yes     | Browser-visible Vite/Supabase values for local UI development    |
| `ui/.env.local`         | No      | Local UI values                                                  |
| `backend/.env.example`  | Yes     | Backend-only server settings                                     |
| `backend/.env`          | No      | Local backend secrets, including Supabase service-role access    |
| `nodered/.env.example`  | Yes     | Node-RED runtime and database settings                           |
| `nodered/.env`          | No      | Local Node-RED secrets                                           |
| `supabase/.env.example` | Yes     | Optional local Supabase tooling values                           |
| `supabase/.env.local`   | No      | Local Supabase tooling secrets, if ever required                 |

### Security and privacy

- `VITE_` variables are bundled into browser JavaScript and must be considered
  public configuration.
- Backend variables may include server-only secrets such as
  `SUPABASE_SERVICE_ROLE_KEY`.
- Node-RED must receive only the secrets required for its own runtime.
- Hosted Supabase secrets belong in Supabase, GitHub, or host-level secret
  storage.
- Supabase CLI access tokens and linked-project database passwords remain in
  the developer's CLI profile or deployment secret store, never repository env
  files.
- Before making the repo public, rotate every credential that has ever been
  committed, remove leaked secret files from git history, and run a secret
  scanner such as `gitleaks` against the full history.

### Operations

- Docker Compose reads local orchestration values from `.env`.
- Local Compose commands load `nodered/.env` as a second interpolation source,
  but only the Node-RED service receives the declared server-only values.
- Production Compose reads `/etc/novaflairs/compose.env`; the Compose file still
  injects each value only into the runtime that requires it.
- The Vite UI reads local browser-safe values from `ui/.env.local`.
- Backend runtime settings live in `backend/.env`.
- Node-RED runtime settings live in `nodered/.env`, while runtime state lives in
  the `node_red_data` Docker volume.
- Values containing `$` must be single-quoted in Docker Compose env files.

## Consequences

Positive:

- The repo can document setup requirements without committing live credentials.
- Browser, backend, Node-RED, and hosted Supabase secret boundaries are explicit.
- Node-RED can persist runtime changes without treating generated state as source
  code.
- Public-repo readiness has a clear checklist.

Negative:

- Developers must keep multiple runtime-specific env files in sync.
- Some values, such as Supabase anon keys, look secret-like even though they are
  browser-visible configuration.
- Node-RED volume state can drift from committed seed files during local
  experimentation.

Follow-ups:

- [ ] Confirm all live secret files are ignored by git.
- [ ] Rotate any credential that has ever been committed before making the repo
      public.
- [ ] Remove leaked secret files from git history before making the repo public.
- [ ] Run `gitleaks` or an equivalent secret scanner against the full history.
- [x] Add `supabase/.env.example` when introducing the local Supabase CLI stack.

## Alternatives considered

1. Keep all configuration in one root `.env`
   - Why not: it mixes browser-visible configuration with server-only and
     runtime-specific secrets.

2. Commit local env files for easier demos
   - Why not: this would expose live credentials and make later public release
     cleanup harder.

3. Store Node-RED mutable state directly in git
   - Why not: runtime state belongs in the Docker volume; the repo should keep
     deterministic seed files only.

4. Put linked-project credentials in `supabase/.env.local`
   - Why not: CLI authentication profiles and deployment secret stores already
     provide a safer boundary outside the repository.

## Rollout plan

1. Keep committed env examples limited to placeholder values.
2. Keep local secret files ignored and runtime-specific.
3. Use the ADR environment file table when adding or moving runtime config.
4. Before public release, rotate any exposed credentials, remove leaked files
   from history, and scan the full history for secrets.
5. Revisit this ADR when a new runtime introduces a distinct secret boundary.
