# Node-RED scenario simulator TODO

## Prototype definition of done

The scenario simulator is complete when a developer can:

- start Node-RED through the repository's Docker Compose service;
- select and replay a named scenario from a fixed seed;
- start, pause, reset, and trigger a scripted wind shift from the editor;
- produce a coherent fire-front path instead of independent random readings;
- write telemetry and an independently determined crossing outcome to Supabase;
- preserve the existing Method 2 prediction as an explainable baseline;
- trace one run through Node-RED, Supabase, and the operator mobile app;
- reproduce the same run and outcome from the same scenario version and seed;
- review the simulation logic with automated tests outside the visual flow; and
- export deployed editor changes back to the tracked `nodered/flows.json`.

The first simulator is a physics-inspired demonstration model, not a certified
wildfire forecast. It must label all generated observations as simulated and
must not present synthetic outcomes as field measurements.

## 0. Current baseline

- [x] Run Node-RED as the `nodered` Docker Compose service.
- [x] Keep editor credentials and database credentials in ignored runtime env
      files.
- [x] Seed the editor's runtime files into the persistent `node_red_data`
      volume on first start.
- [x] Insert simulated observations into `telemetry_observations`.
- [x] Poll unprocessed observations and write Method 2 results to
      `prediction_results`.
- [x] Store the Method 2 coefficients and thresholds as the versioned `v1`
      `model_runs` record.
- [x] Seed the disposable `Brushfire Westline 01` scenario and firebreak
      segment for local development.

Current limitation: the `RNG` function applies independent `Math.random()`
jitter around one location every five seconds. It tests database plumbing, but
it does not describe a continuous fire or produce reproducible outcomes.

## 1. Define the simulator contract

- [x] Add a versioned scenario definition under `nodered/scenarios/` for
      `Brushfire Westline 01`.
- [x] Give the definition a stable scenario key, schema version, simulator
      version, seed, tick duration, and total duration.
- [x] Record the database scenario and firebreak-segment mapping explicitly;
      do not hide numeric IDs inside a function node.
- [x] Define initial position, altitude, heading, spread rate, wind, flame
      length, burn time, fuel factor, and telemetry quality.
- [x] Define named phases such as ignition, growth, firebreak approach, wind
      shift, crossing or containment, and completion.
- [x] Define scripted events by simulation time and keep manual event triggers
      as explicit overrides of the same event contract.
- [x] Define run state containing the run ID, seed, tick index, elapsed time,
      phase, position, heading, current conditions, fired events, and outcome.
- [x] Document units and valid ranges for every generated telemetry field.
- [x] Validate a scenario definition at startup and fail with a useful error
      before inserting data when it is invalid.

Verification:

- [x] A scenario definition can be reviewed without opening the Node-RED
      editor.
- [x] Missing required fields, invalid ranges, and unknown events are rejected.
- [x] The same definition and seed identify one reproducible run.

## 2. Build a deterministic, testable scenario engine

- [x] Add the simulation engine as a normal JavaScript module under
      `nodered/lib/`; do not bury the authoritative calculations in a large
      function node.
- [x] Use a small seeded pseudo-random generator instead of `Math.random()`.
- [x] Implement an initializer that creates run state from a scenario
      definition and seed.
- [x] Implement one pure tick operation that returns the next state and emitted
      telemetry without mutating its input.
- [x] Advance position from elapsed time, heading, spread rate, and wind.
- [x] Correlate flame length and burn time with the simulated conditions rather
      than sampling every field independently.
- [x] Apply bounded noise only after the coherent state has been calculated.
- [x] Apply scripted and manual events through one event function.
- [x] Determine crossing or containment from simulator state independently of
      the Method 2 prediction formula.
- [x] Emit run ID, scenario key, simulator version, seed, tick, phase, and event
      metadata in `raw_payload_json`.
- [x] Add Node's built-in test runner and a package script for simulator tests.

Verification:

- [x] Repeating a scenario with the same seed produces identical states,
      telemetry, and outcome.
- [x] Different seeds vary bounded noise without changing scripted events.
- [x] Position advances continuously and remains within the scenario bounds.
- [x] Wind-shift and phase-transition tests prove expected state changes.
- [x] Outcome tests do not import or duplicate the Method 2 equation.

## 3. Orchestrate the engine in Node-RED

- [ ] Replace the disabled `Run every 5s -> RNG` path with a dedicated
      `Scenario Simulator` flow.
- [x] Load the source-controlled scenario definition and simulation module in
      the container runtime.
- [x] Add Start, Pause, Resume, Reset, Step, and Trigger Wind Shift controls.
- [x] Keep one interval/tick source and ignore ticks unless a run is active.
- [x] Store only the active run state in Node-RED context; scenario definitions
      and engine code remain source controlled.
- [x] Prevent a second Start action from creating overlapping active runs.
- [x] Format the engine's telemetry through one adapter before the PostgreSQL
      insert node.
- [x] Show the run ID, phase, tick, and status with Node-RED status/debug nodes.
- [x] Route validation, engine, and database failures to a visible error path.
- [ ] Keep the Method 2 polling flow separate and label it clearly as the
      baseline prediction flow.

Verification:

- [x] Start begins one run and emits one observation per configured tick.
- [x] Pause stops inserts without discarding state; Resume continues it.
- [x] Step advances exactly one tick while paused.
- [x] Reset returns to the initial deterministic state without stale timers.
- [x] Trigger Wind Shift uses the same event handling as the scripted event.
- [ ] Restarting Node-RED does not silently resume a half-finished run.

## 4. Record independent outcomes and preserve the baseline

- [x] Continue inserting simulator output into `telemetry_observations` with
      `source_kind = 'simulated'`.
- [x] Continue running Method 2 as model version `v1`; do not describe the fixed
      logistic equation as a trained AI model.
- [ ] When a run resolves, insert its crossing or containment result into
      `observed_outcomes` using the observation where the outcome became known.
- [ ] Include the run ID and simulator version in the outcome notes until run
      metadata has a reviewed first-class schema.
- [ ] Make outcome insertion idempotent so replayed messages cannot create
      duplicate labels.
- [x] Verify that outcome generation cannot read Method 2 probability, risk, or
      decision fields.
- [ ] Decide through a reviewed migration whether first-class `scenario_runs`
      metadata and an outcome uniqueness constraint are required. Do not run a
      migration without explicit approval.

Verification:

- [ ] One completed run has telemetry, Method 2 predictions, and an independent
      observed outcome.
- [ ] A failed prediction does not prevent the simulator from recording the
      eventual outcome.
- [ ] Replaying an insert does not duplicate the outcome.

## 5. Connect the complete demo path

- [x] Start Node-RED with `docker compose up -d --build nodered`.
- [ ] Run one low-risk containment scenario from Reset to completion.
- [x] Run one wind-shift crossing scenario from Reset to completion.
- [ ] Confirm the expected rows in `telemetry_observations`,
      `prediction_results`, and `observed_outcomes`.
- [ ] Trace one observation ID through the prediction row and
      `operator_observation_feed` into the mobile app.
- [ ] Confirm the mobile dashboard updates without restarting Metro or the app.
- [ ] Document a short judge-demo sequence that can be reset and replayed.
- [ ] Document cleanup of disposable demo rows without making it an automatic
      startup action.

Verification:

- [ ] The same seed produces the same judge-demo sequence twice.
- [ ] A wind shift visibly changes coherent telemetry before risk changes.
- [ ] The app labels delayed or missing prediction data honestly.
- [ ] Values and units match at every boundary.

## 6. Make editor changes reviewable and reproducible

- [ ] Export the deployed editor flow and intentionally replace the tracked
      `nodered/flows.json`.
- [x] Never copy `flows_cred.json`, session data, context state, or runtime
      backups into Git.
- [ ] Review the exported JSON for credentials, generated IDs, disabled nodes,
      stale debug nodes, and accidental workspace changes.
- [x] Ensure the Docker image copies scenario definitions and simulator modules
      into the runtime seed directory.
- [ ] Verify a fresh disposable Node-RED volume starts from tracked assets.
- [x] Update `nodered/README.md` with simulator controls, test commands, export
      workflow, and the warning about persistent runtime state.

Verification:

- [ ] `git diff --check` passes.
- [x] Simulator tests pass outside Node-RED.
- [x] The Compose service starts with no flow errors.
- [ ] A fresh volume reproduces the committed flow and scenario without manual
      editor repair.

## 7. Prepare trustworthy training data for Model v2

- [ ] Generate a balanced set of completed runs across seeds, wind conditions,
      firebreak widths, fuel factors, and crossing outcomes.
- [ ] Split training and evaluation data by complete run, not by individual
      telemetry row, to prevent leakage between adjacent ticks.
- [ ] Record scenario version, simulator version, seed, feature units, label
      definition, and extraction query with every dataset.
- [ ] Keep an untouched evaluation scenario set that is not used to tune the
      model.
- [ ] Compare Model v2 against Method 2 using calibration, discrimination, and
      operational false-negative metrics.
- [ ] Treat simulator-only performance as prototype evidence, not proof of
      real-world wildfire accuracy.
- [ ] Add real or independently sourced data before making field-performance
      claims.

Verification:

- [ ] No training label is calculated by Method 2 or copied from
      `prediction_results`.
- [ ] Dataset generation is reproducible from committed scenario versions and
      seeds.
- [ ] Training, validation, and test runs do not overlap.

## 8. Hand off to the AI risk-model branch

- [ ] Create `feature/ai-risk-model` only after this simulator branch produces
      trustworthy labeled runs.
- [ ] Add the model as an independently testable service under
      `services/risk-model/`, not as opaque code inside Node-RED.
- [ ] Keep Node-RED responsible for orchestration, request validation, retries,
      and persistence of model responses.
- [ ] Add a reviewed Supabase migration that makes model metadata and prediction
      storage model-agnostic before writing Model v2 results. Do not run it
      without explicit approval.
- [ ] Store model version, artifact or training-data version, probability,
      uncertainty, decision threshold, and explanation metadata.
- [ ] Add a baseline-versus-Model-v2 comparison and feature-contribution view
      to the operator app.
- [ ] Keep any LLM-generated briefing downstream of structured model output;
      an LLM must never originate or alter the crossing-risk score.

Verification:

- [ ] Model v1 and Model v2 results can be distinguished and reproduced.
- [ ] A model-service outage leaves telemetry and observed-outcome collection
      working.
- [ ] The app can explain which model produced a displayed prediction.
