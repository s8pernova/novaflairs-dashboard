# NOVAflair Database Infrastructure

This directory is the only database infrastructure-as-code root for NOVAflair.
Supabase CLI migrations replace the former `backend/sql` directory.

## Layout

- `config.toml` defines the disposable local Supabase stack.
- `migrations/` is the authoritative executable schema and production-data
  history.
- `seeds/` contains disposable local fixtures only.
- `queries/read/` contains read-only operational inspection queries.
- `queries/verify/` contains transactional role and contract checks that make no
  persistent changes.

Runtime queries remain with the runtime that executes them. In particular,
Node-RED's ingestion and prediction SQL remains in `nodered/flows.json`; it is
not duplicated here.

## Tooling

The CLI is pinned as a repository-local npm dev dependency. Install it from the
repository root:

```bash
npm install
npx supabase --version
```

Do not install the CLI globally or in the Python virtual environment. The
Python `.venv` remains Python-only, while root `node_modules` contains
repository-scoped JavaScript tooling.

Common local commands:

```bash
npm run db:start
npm run db:status
npm run db:migrations:local
npm run db:lint
npm run db:check-layout
```

`npm run db:reset` destroys and recreates the local database, applies every
migration, and loads the configured seed files. Run it only when destroying
local database state is intentional.

Create every migration through the pinned CLI:

```bash
npm run db:migration:new -- descriptive_name
```

## Baseline contract

On 2026-07-11, read-only inspection confirmed that the linked Cloud project had
the six NOVAflair application tables and no rows in
`supabase_migrations.schema_migrations`. The first committed migration therefore
captures the existing application schema as a baseline.

The baseline must never execute against the existing linked Cloud schema. Before
the first remote push, its version must be recorded as already applied through a
separately reviewed and explicitly authorized migration-history repair. Until
that repair is complete, `db push` is not safe.

The forward migrations after the baseline:

1. replace legacy broad Data API grants with NOVAflair's explicit telemetry-read
   contract; and
2. ensure the model configuration required by the Node-RED prediction pipeline
   exists in new environments.

No migration-history repair or forward migration is performed merely by adding
these files to the repository.

## Data classification

`Method 2 Firebreak Crossing` is versioned operational configuration because
Node-RED resolves it by method name before writing prediction results. It is
therefore created idempotently by a migration.

`Brushfire Westline 01` and `Segment A` are disposable prototype fixtures used
by the local Node-RED generator, which currently emits `scenario_id = 1` and
`firebreak_segment_id = 1`. They live under `seeds/` and are not included in a
normal remote migration push.

Never commit production telemetry, prediction results, database passwords,
service-role keys, access tokens, or copied user data as seeds.

## Security review

Every migration that changes an API-reachable object must explicitly review:

- grants for `anon`, `authenticated`, and `service_role`;
- Row Level Security enablement and policies;
- view ownership and `security_invoker` behavior;
- function execution privileges and `search_path`;
- destructive DDL and data changes; and
- verification using the same role and access path as the real client.

The current web UI contract grants `anon` and `authenticated` only `SELECT` on
`public.telemetry_observations`. Node-RED uses direct PostgreSQL credentials and
does not depend on Data API client-role grants.

## Linked operations

Linking, inspecting history, dumping schema, repairing history, and pushing
migrations are distinct operations. Review the exact command help from the
pinned CLI before acting:

```bash
npx supabase migration list --help
npx supabase migration repair --help
npx supabase db push --help
```

Linked history repair and `db push` require explicit deployment intent. Normal
schema development must not use the remote Dashboard SQL editor or Table Editor,
because those changes bypass committed migration history.
