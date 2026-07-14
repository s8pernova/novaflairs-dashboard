# Node-RED

This directory contains the public, source-controlled Node-RED assets:

- `flows.json` for flow definitions
- `settings.js` for runtime configuration
- `package.json` and `package-lock.json` for custom nodes

At runtime, Docker Compose mounts a named `node_red_data` volume at `/data`.
The image seeds editor flows and package state into that volume on first run.
Tracked `settings.js` is refreshed from the image on every container start so
runtime configuration cannot silently drift from Git. Node-RED editor changes
are written to the Docker volume, not directly to Git.

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

## Scenario simulator

The current independent-RNG telemetry generator is being replaced by a
deterministic, stateful scenario simulator. Follow `TODO.md` for the ordered
implementation and verification steps. The responsibility boundaries between
Node-RED orchestration, Supabase persistence, the Method 2 baseline, and a
future learned model are recorded in
`docs/adr/0005-separate-scenario-simulation-from-risk-modeling.md`.

The source-controlled simulator consists of:

- `scenarios/brushfire-westline-01.json`: initial conditions, timing, events,
  database mappings, bounds, and deterministic seed;
- `scenarios/README.md`: contract, units, coordinate conventions, and outcome
  behavior;
- `lib/scenario-engine.js`: pure validation, state-transition, event, telemetry,
  and outcome logic; and
- `test/scenario-engine.test.js`: deterministic replay and behavior tests.

Run the simulator tests from this directory:

```bash
npm test
```

After changing tracked simulator code or settings, rebuild only Node-RED:

```bash
docker compose up -d --build nodered
```

The container validates the scenario during startup and exposes these values to
Function nodes:

```javascript
const engine = global.get("scenarioEngine");
const scenario = global.get("scenarios").brushfireWestline01;
```

The visual flow should hold only orchestration state and adapters. Simulation
calculations belong in the tested engine rather than being copied into Function
nodes. Start, pause, resume, reset, step, and wind-shift controls are assembled
in the editor, then the deployed flow is intentionally exported into the
tracked `flows.json` for review.

## Replay the operator demo

Start the source-controlled runtime from the repository root:

```bash
docker compose up -d --build nodered
```

Open `http://localhost:1880`, select the `Scenario Simulator` tab, and use one
of these two replay modes:

1. Select **Reset** and let the five-second `Tick` inject run normally.
2. For a faster controlled walkthrough, select **Reset**, immediately select
   **Pause**, then select **Step** once per simulated five-second interval.

The scripted wind shift fires at 60 simulated seconds. With the default seed,
the Method 2 results cover moderate, transition, and high risk before the run
resolves as crossed. The prediction flow polls every three seconds, and
the mobile app polls every eight seconds, so allow both consumers one interval
to display the final observation.

**Reset** creates a new run ID and initial state. It does not delete observations
from earlier runs, which keeps the telemetry history auditable. Run
`supabase/queries/verify/trace_operator_demo_run.sql` in the Supabase SQL editor
to trace every observation from the latest replay through its prediction and
operator-feed row without changing data.
