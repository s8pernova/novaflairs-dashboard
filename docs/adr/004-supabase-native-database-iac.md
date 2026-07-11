# ADR 0004: Use Supabase-Native Database Migrations

## Status

Proposed

## Implementation

State: Planned

Evidence required before this ADR is marked Accepted:

- [ ] `supabase/config.toml` defines the repository's local Supabase project.
- [ ] `supabase/migrations/` contains a reviewed, timestamped history that can
      recreate the NOVAflair application schema from an empty local database.
- [ ] The linked Supabase project's live schema and migration history have been
      inspected and reconciled without replaying existing DDL against production.
- [ ] Required operational reference data and disposable development fixtures
      have been classified and separated.
- [ ] Every real consumer of `backend/sql/` has been traced, updated, or removed.
- [ ] The replaced `backend/sql/` tree and its duplicate table mirrors have been
      deleted.
- [ ] Local reset, migration-history, application, and security checks pass.
- [ ] No production migration has been executed without explicit approval.

## Date

2026-07-11

## Owners

Aidan Hoo

## Context

NOVAflair already uses Supabase Cloud as its PostgreSQL platform, but the
repository does not use Supabase as its migration manager. Database SQL is split
across a custom `backend/sql/` tree:

- `backend/sql/migrations/001_init_tables.sql` creates the six current
  wildfire-domain tables, enum types, constraints, and indexes;
- `002_seed_scenario.sql` and `003_seed_model_runs.sql` insert prototype data;
- `004_telemetry_observations_read_policy.sql` grants Data API reads for
  telemetry;
- `backend/sql/tables/` contains hand-maintained table mirrors that overlap the
  migration history; and
- `backend/sql/queries/` contains loose SQL that may overlap runtime queries.

No repository-managed runner records those numbered files in Supabase migration
history or proves that they can recreate the live database. The table mirrors
also create a second representation that can drift from both the migrations and
the live schema.

The database has several distinct consumers:

- Node-RED connects directly to Supabase PostgreSQL through the pooler. It
  inserts telemetry, selects unprocessed observations, and writes prediction
  results.
- The web UI reads telemetry through the Supabase Data API.
- The Python backend creates a Supabase client for backend services.
- The operator mobile application will read a deliberately restricted
  observation-and-prediction contract through the Data API.

The next planned database change is an `operator_observation_feed` view with
explicit grants and Row Level Security dependencies. Adding that change to the
custom numbered directory would extend a migration process that the repository
intends to replace through this decision.

Constraints:

- Existing Node-RED ingestion and prediction processing must continue to work.
- Data API access must be explicit; database objects are not public merely
  because the UI or mobile app needs them.
- Supabase Cloud may already contain schema objects that are absent from its
  recorded migration history.
- Database changes must remain reviewable and reproducible without relying on
  a developer's global CLI installation or local Docker volumes.
- This refactor does not authorize applying or repairing production migrations.

Assumptions:

- Supabase Cloud remains the durable hosted database for NOVAflair.
- Local Supabase is disposable and exists to validate migrations and security
  behavior before an explicitly authorized deployment.
- The linked project's actual schema and migration history will be inspected
  before choosing the baseline-reconciliation procedure.

## Decision

NOVAflair will use the Supabase CLI and the repository's top-level `supabase/`
directory as the only database migration-management surface.

Decision details:

- `supabase/migrations/` is the authoritative executable history for schema,
  constraints, indexes, grants, RLS policies, views, functions, and required
  production data changes.
- Every new migration file is created with
  `npx supabase migration new <descriptive_name>` and reviewed before use.
- `supabase/config.toml` defines local Supabase behavior and committed seed-file
  ordering.
- Disposable local or demonstration fixtures live in Supabase seed files and
  are never treated as production migration history.
- Deterministic rows required for NOVAflair to operate in an environment are
  represented by explicit, idempotent migration DML rather than hidden local
  setup steps.
- Retained manual SQL is organized under `supabase/queries/` by purpose and is
  not executable migration history. A loose query with no verified consumer is
  deleted instead of preserved for hypothetical use.
- Runtime SQL embedded in Node-RED flows remains owned by the Node-RED runtime
  until a separate decision changes that boundary. Supabase manages the objects
  those queries depend on; it does not replace application query code.
- `backend/sql/migrations/`, `backend/sql/tables/`, and obsolete loose queries
  are removed after all real consumers and required behavior have been moved.
- NOVAflair will not initially add a hand-maintained declarative schema mirror.
  The current schema is derived by replaying committed migrations. Introducing
  `supabase/schemas/` later requires evidence that it improves this project's
  workflow without creating another competing source of truth.
- Supabase CLI usage must be version-reproducible through committed project
  tooling and lockfiles rather than an unpinned global installation.

In scope:

- Establishing the native Supabase directory and configuration.
- Reconciling the existing Cloud schema with a safe baseline migration.
- Classifying the existing scenario and model-run seed SQL.
- Moving or deleting custom migrations, table mirrors, and manual queries.
- Documenting local validation and linked-environment deployment checks.
- Preparing the repository for the operator observation-feed migration.

Out of scope:

- Executing migrations or migration-history repair against Supabase Cloud.
- Changing Node-RED's runtime connection method or moving its queries into the
  Python backend.
- Redesigning the wildfire, telemetry, or prediction data model.
- Adding mobile Supabase client code or completing the operator feed feature.
- Introducing Supabase Auth, Storage, Edge Functions, or database branching.

## Rationale

- Supabase migration history becomes the deployable record instead of an
  untracked convention around hand-numbered files.
- One executable history removes ambiguity between migrations, table mirrors,
  and the live Cloud schema.
- A migration-only model is proportionate to NOVAflair's current six-table
  schema and avoids copying CoScholar's larger declarative-schema workflow
  without a project-specific need.
- Explicit separation between migrations, required reference data, disposable
  seeds, manual verification SQL, and runtime queries prevents accidental
  production data changes.
- Replaying the history against disposable local Supabase provides stronger
  evidence than reviewing files independently.
- The workflow covers the grants, RLS policies, and views required by web and
  mobile Data API clients while preserving Node-RED's direct PostgreSQL role.

## Design and implementation notes

### Migration and data layout

- `supabase/config.toml`: local CLI and seed configuration.
- `supabase/migrations/`: timestamped executable history.
- `supabase/seed.sql` or ordered files configured by `config.toml`: disposable
  local fixtures only.
- `supabase/queries/read/`: read-only diagnostics, if retained.
- `supabase/queries/verify/`: transactional role and contract verification that
  makes no persistent changes, if retained.
- `supabase/queries/ops/`: explicitly invoked operational mutations, only when
  a real operator workflow exists and is documented.

The existing `002_seed_scenario.sql` and `003_seed_model_runs.sql` are not moved
mechanically. Each inserted row must first be classified:

- If Node-RED or another deployed runtime requires the row to operate, it is
  environment configuration/reference data and belongs in reviewed, idempotent
  migration DML.
- If the row exists only to make local demonstrations convenient, it belongs in
  disposable seed data.
- Production identities, secrets, copied telemetry, and other environment data
  never belong in committed seeds.

The pending operator-feed SQL must be recreated through the Supabase migration
workflow after the baseline is established. Its verification query belongs under
`supabase/queries/verify/`, not in migration history.

### Baseline reconciliation

The implementation must not assume NOVAflair has the same remote-history state
that CoScholar had. Before creating or recording a baseline:

1. Inspect the linked project's migration list and live schema.
2. Compare the live objects with the behavior represented by the existing
   numbered SQL files, table mirrors, grants, and RLS policies.
3. Generate and review a baseline that recreates the verified current state in
   disposable local Supabase.
4. If the live schema exists without matching migration history, propose the
   exact history-repair operation separately, with a backup and explicit
   approval. Do not execute the baseline against an already-populated schema.
5. Verify local and linked histories again before any forward migration is
   considered deployable.

### Change workflow

1. Update `dev` and create database-infrastructure work from that shared base.
2. Create a migration with `npx supabase migration new <name>`.
3. Review destructive DDL, DML, grants, RLS, policies, views, functions,
   triggers, and indexes manually.
4. Recreate the database from zero in disposable local Supabase.
5. Run role-appropriate verification using the same access path as Node-RED,
   the web UI, or the mobile client.
6. Inspect local and linked migration histories using commands supported by the
   pinned CLI version.
7. Apply or repair linked migrations only as a separate, explicitly authorized
   deployment operation.

### Security and privacy

- Every table or view reachable through the Supabase Data API requires an
  explicit grant and RLS decision.
- `anon` and `authenticated` receive only the columns and operations required by
  a documented client contract.
- Views exposed to client roles use `security_invoker = true` so underlying RLS
  remains authoritative.
- Node-RED's direct database credentials remain runtime-scoped according to ADR
  0003 and are never committed to `supabase/config.toml`, migrations, or seeds.
- Service-role keys, database passwords, TLS material, production telemetry,
  and copied user data are never committed.
- Security-sensitive migrations require verification under the actual client
  role, not only as the database owner.

### Operations

- Local Supabase state is disposable; committed migrations and reviewed Cloud
  state are durable.
- A clean local reset must succeed before the migration set is considered
  reproducible.
- Migration review records the target environment, verification performed,
  advisor findings, and whether the change includes DML or destructive DDL.
- Rollback normally uses a reviewed corrective forward migration. Destructive
  restoration requires a verified backup and an environment-specific plan.

## Consequences

Positive:

- NOVAflair gains one supported, auditable database migration history.
- New environments can be recreated without undocumented Dashboard actions.
- Web, mobile, backend, and Node-RED database contracts can be reviewed together.
- Obsolete table mirrors and custom migration paths are removed rather than
  carried as compatibility surfaces.
- Pending and applied migrations become visible through Supabase tooling.

Negative:

- Establishing the first trustworthy baseline requires careful comparison with
  the live Cloud project.
- Existing seed files may need to be split according to operational purpose.
- Local reset testing requires Docker and the Supabase local stack.
- Security-sensitive SQL still needs manual review; migration tooling does not
  make grants or RLS correct automatically.

Follow-ups:

- [ ] Inspect the linked Cloud schema and migration history read-only.
- [ ] Pin the Supabase CLI version in repository tooling.
- [ ] Create and verify the initial baseline locally.
- [ ] Classify scenario and model-run data as required reference data or local
      fixtures.
- [ ] Trace and remove duplicate `backend/sql/tables/` definitions.
- [ ] Determine whether `fetch_unprocessed_observations.sql` has a real consumer
      beyond the equivalent query embedded in Node-RED.
- [ ] Recreate the operator observation-feed change as a timestamped Supabase
      migration after the baseline.
- [ ] Add automated migration-layout and clean-reset checks.
- [ ] Decide whether CI should run disposable Supabase reset tests after local
      verification is reliable.

## Alternatives considered

1. Keep `backend/sql/` and run those files with a custom script
   - Rejected because NOVAflair would own migration ordering, history tracking,
     drift behavior, and deployment safety that Supabase already provides.

2. Keep custom and Supabase migration directories together
   - Rejected because two executable histories make the authoritative deployment
     path ambiguous and leave the refactor incomplete.

3. Copy CoScholar's complete database-IaC layout unchanged
   - Rejected because CoScholar's 59-table, multi-schema production baseline and
     declarative-schema workflow solve a larger problem than NOVAflair currently
     has. NOVAflair should adopt the shared migration discipline without copying
     project-specific artifacts or repair history.

4. Replay the existing numbered SQL files directly against Cloud
   - Rejected because the live schema and recorded migration history have not yet
     been reconciled; replaying DDL could fail or damage existing state.

5. Make normal schema changes through the Supabase Dashboard
   - Rejected because direct changes bypass repository review and reproducible
     migration history.

## Rollout plan

1. Keep the mobile database work stashed while this refactor establishes the
   new migration paths.
2. Inspect the linked project read-only and choose the baseline procedure from
   evidence.
3. Add and verify the native Supabase configuration and baseline locally.
4. Classify and migrate required data, retained verification SQL, and all real
   consumers of the custom paths.
5. Delete `backend/sql/` after repository-wide reference checks pass.
6. Commit the complete transition atomically on `refactor/supabase-iac`.
7. Integrate that commit into `dev`, then merge the updated `dev` into
   `feature/mobile-app` without rewriting the published mobile history.
8. Port the stashed operator-feed work into a newly generated Supabase migration
   and verify it separately.
9. Request separate approval before changing linked migration history or applying
   any production migration.

## References

- Supabase database migrations:
  https://supabase.com/docs/guides/deployment/database-migrations
- Supabase local development:
  https://supabase.com/docs/guides/local-development/cli/getting-started
- Supabase database seeding:
  https://supabase.com/docs/guides/local-development/seeding-your-database
- ADR 0003, Keep Secrets Scoped to Their Runtime:
  `docs/adr/0003-keep-secrets-scoped-to-runtime.md`
