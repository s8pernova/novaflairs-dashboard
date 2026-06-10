# ADR 0002: Keep the edge agent in the monorepo

## Status

Accepted

## Date

2026-06-10

## Owners

Aidan Hoo

## Context

NOVAflair is expanding to include Raspberry Pi-based sensing for a sentry drone. The edge software will collect telemetry from attached sensors, prepare readings for the backend data contract, and send observations into the existing NOVAflair data pipeline.

This is a new service, but it is not a separate product. It belongs to the same system as the current dashboard, backend SQL, Node-RED automation, Supabase storage, and deployment infrastructure.

The current repository already behaves like a small monorepo:

- `ui/` contains the current React dashboard.
- `backend/` contains configuration, Supabase access, and SQL.
- `nodered/` contains automation and pipeline flow code.
- `infra/` and `docker-compose.yml` describe deployment concerns.

Constraints:

- The project is still small enough that one repository is easier to operate.
- Telemetry schema changes and edge-agent changes should be reviewed together.
- The Raspberry Pi collector should support demos without requiring a separate clone and release process.
- Hardware-specific code should be isolated enough that it does not make normal dashboard development painful.

Assumptions:

- The edge agent will initially serve this NOVAflair system only.
- The same person or small team will maintain the dashboard, backend, and edge collector for now.
- The edge agent will send telemetry into the existing backend/Supabase pipeline rather than owning a separate database.

## Decision

The Raspberry Pi telemetry collector will live in this repository as a separate service instead of being created as a separate Git repository.

Decision details:

- Add the collector under a service boundary such as `services/edge-agent/`.
- Keep hardware-specific dependencies isolated to the edge-agent project.
- Treat the backend/Supabase telemetry contract as the integration point between the edge agent and the rest of the system.
- Do not split the edge agent into a separate repository unless its lifecycle becomes meaningfully independent.

In scope:

- Repository placement for the Raspberry Pi telemetry collector.
- Service-boundary expectations for the edge agent.
- Criteria for when a future repository split would make sense.

Out of scope:

- Implementing the edge agent.
- Choosing exact sensor hardware.
- Changing database tables or running migrations.
- Reorganizing the whole repository into `apps/`, `services/`, and `packages/` immediately.
- Deciding the React Native app structure, which is covered by ADR 0001.

## Rationale

Keeping the edge agent in the same repository gives the project the best development speed right now.

- One clone contains the demo dashboard, data pipeline, SQL, infrastructure, and sensor collector.
- Schema and payload changes can land with the collector changes that require them.
- The edge service is part of the same product lifecycle as the dashboard and backend.
- A future React Native app can share the same contracts without coordinating across repositories.
- A separate repository would add process overhead before the project has separate teams, releases, or access boundaries.

## Design and implementation notes

### Data model

- The edge agent should emit payloads that match the backend telemetry observation contract.
- Supabase/backend SQL remains the source of truth for stored telemetry.
- Raw sensor readings may be included as structured payload data when useful for debugging or model development.

### API / interfaces

- The edge agent should expose a small internal boundary around:
  - sensor readers
  - telemetry payload validation
  - local buffering for offline operation
  - upload/sync to the backend or Supabase pipeline
- A likely initial structure is:

```txt
services/
└── edge-agent/
    ├── README.md
    ├── pyproject.toml
    ├── src/
    │   └── novaflair_edge/
    │       ├── main.py
    │       ├── sensors/
    │       ├── telemetry/
    │       └── config.py
    ├── systemd/
    └── tests/
```

### Security and privacy

- Device secrets must stay out of git.
- The edge agent should not require service-role credentials unless a backend-only deployment path explicitly requires it.
- Per-device identifiers and credentials should be documented in the edge-agent README when the service is implemented.

### Operations

- The edge agent should be deployable independently to a Raspberry Pi.
- Local buffering should be considered early so telemetry is not lost during weak connectivity.
- Hardware-dependent tests should be separated from normal repository checks.

## Consequences

Positive:

- Faster development while the product shape is still changing.
- Easier schema, payload, dashboard, and collector changes in one review.
- Simpler demo setup and project storytelling.
- Clearer path to shared contracts between backend, web, mobile, and edge services.

Negative:

- The repository will contain hardware-adjacent code alongside app and backend code.
- Dependency boundaries need discipline so Pi-only packages do not leak into unrelated development flows.
- CI may need filters or separate jobs once hardware-facing tests exist.

Follow-ups:

- [ ] Add `services/edge-agent/` when implementation starts.
- [ ] Document the telemetry payload contract used by the edge agent.
- [ ] Decide whether shared schemas belong in `packages/shared/` or a Python/TypeScript-specific package.
- [ ] Add deployment notes for installing the edge agent on a Raspberry Pi.
- [ ] Revisit repo splitting if the edge agent gets a separate release process or maintainer.

## Alternatives considered

1. Create a separate edge-agent repository now
   - Why not: the collector does not yet have a separate lifecycle, team, customer, or release process.

2. Put all Raspberry Pi code directly under `backend/`
   - Why not: the edge agent has a different runtime and deployment target than backend SQL/config code.

3. Wait to decide until implementation starts
   - Why not: the repo boundary affects folder structure, shared contracts, and how future changes are reviewed.

## Rollout plan

1. Keep the existing repository as the system repository for NOVAflair.
2. Add the edge agent as its own service directory when sensor work begins.
3. Keep Pi-specific dependencies and deployment files inside that service.
4. Add shared schema/type code only when at least two surfaces need the same contract.
5. Reassess the repo boundary if the edge agent develops separate maintainers, release tags, access controls, or reuse outside NOVAflair.
