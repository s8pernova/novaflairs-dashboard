# ADR 0005: Separate scenario simulation from risk modeling

## Status

Accepted

## Implementation

State: Accepted; implementation pending on `feature/scenario-simulator`

Evidence:

- [x] The existing Node-RED generator and prediction flows have been inspected.
- [x] The current database contracts for scenarios, telemetry, model runs,
      predictions, and observed outcomes have been inspected.
- [x] Method 2 has been classified as an explainable fixed-equation baseline,
      not a trained AI model.
- [x] A versioned scenario contract and deterministic simulation engine have
      been implemented with automated replay and outcome tests.
- [x] The container validates and exposes the tracked simulator through
      Node-RED global context without replacing persistent editor flows.
- [x] The independent-RNG generator has been replaced by a deterministic,
      stateful scenario simulator.
- [x] The simulator produces independently determined observed outcomes.
- [ ] A learned Model v2 service and model-agnostic persistence contract have
      been implemented.

Last checked: 2026-07-14

## Date

2026-07-14

## Owners

Aidan Hoo

## Context

NOVAflair currently uses Node-RED for two jobs:

- the `Synthetic Data` flow inserts a new telemetry observation every five
  seconds by applying independent `Math.random()` jitter to location, altitude,
  wind, flame length, and burn time; and
- the `Fire Calculations` flow polls unprocessed observations, evaluates the
  Method 2 logistic firebreak-crossing equation, and stores its prediction.

This proves the database pipeline, but the generated observations do not
represent one continuous fire. Runs cannot be reproduced, inputs are not
correlated by a state model, and there is no independent observed crossing
outcome against which a prediction can be evaluated.

NOVAflair also intends to add a learned risk model. That work needs a clear
boundary: simulation must not manufacture labels from the same prediction
formula used as a baseline, and Node-RED function nodes should not become the
only location for model implementation and testing.

The existing schema is optimized for Method 2. `model_runs` requires an
equation name and coefficients, while `prediction_results` requires
`beta_tx`. A learned model will need versioned artifact, dataset, uncertainty,
and explanation metadata that do not naturally fit those fields.

Constraints:

- The prototype must remain understandable and demo-friendly for a small team.
- Node-RED is already the repository's automation and direct PostgreSQL
  integration runtime.
- Supabase remains the durable source of truth for telemetry, predictions, and
  outcomes.
- The mobile app reads the restricted `operator_observation_feed` contract and
  must not depend directly on Node-RED runtime state.
- Method 2 is useful as an explainable baseline and must not be silently
  replaced or relabeled as AI.
- Synthetic data and outcomes must be clearly distinguished from measured
  field data.
- This decision does not authorize a database migration or production data
  change.

Assumptions:

- The first stateful simulator is a physics-inspired demonstration model, not a
  certified wildfire-spread model.
- A learned Model v2 will be trained only after independently labeled scenario
  runs or suitable external data exist.
- Node-RED will remain useful for scenario controls, workflow orchestration,
  telemetry adaptation, and persistence even when model inference moves to a
  dedicated service.

## Decision

NOVAflair will use Node-RED as a deterministic scenario orchestrator and
telemetry adapter, while keeping firebreak-risk calculation behind a separate,
versioned modeling boundary.

Decision details:

- Scenario definitions are versioned, source-controlled data rather than
  values hidden inside Node-RED function nodes.
- Simulation state advances coherently over time from a fixed seed, initial
  conditions, and explicit scripted or manually triggered events.
- The authoritative simulation calculations live in a normal, unit-tested
  JavaScript module used by Node-RED. The visual flow owns controls, scheduling,
  adapters, error routing, and database workflow.
- Node-RED emits simulated telemetry through the existing
  `telemetry_observations` contract and records run metadata in
  `raw_payload_json` until first-class run storage is justified.
- The simulator determines crossing or containment independently and writes the
  resolved label to `observed_outcomes`.
- Method 2 remains model version `v1`, retains its current versioned
  coefficients and thresholds, and is presented as an explainable logistic
  baseline.
- A future learned Model v2 runs in an independently testable service under a
  boundary such as `services/risk-model/`. Node-RED invokes that service,
  validates its structured response, and persists the result.
- Before Model v2 results are stored, a reviewed Supabase migration will make
  model-run and prediction metadata model-agnostic. It will not overload
  Method 2-specific fields such as `coefficients_json` or `beta_tx` with
  unrelated meanings.
- Model evaluation splits data by complete scenario run to avoid leakage
  between adjacent observations from the same simulated fire.
- An LLM may summarize structured telemetry and model output for an operator,
  but it never originates, changes, or substitutes for the numerical risk
  score.

In scope:

- Responsibility boundaries for scenario definitions, simulation logic,
  Node-RED orchestration, Supabase persistence, and learned inference.
- Reproducibility and independent outcome requirements for synthetic scenarios.
- The continuing role of Method 2 after a learned model is introduced.
- The minimum provenance and explainability expected from Model v2.

Out of scope:

- Selecting the final machine-learning algorithm or training framework.
- Claiming real-world predictive validity from simulator-generated data.
- Defining production hardware ingestion or certified fire-spread physics.
- Designing the final operator explanation interface.
- Applying database migrations or modifying linked Supabase data.

## Rationale

- Reproducible scenarios make failures, demonstrations, tests, and model
  comparisons diagnosable.
- Coherent state and correlated measurements better exercise the operator
  workflow than independent random values.
- Independent outcomes prevent a learned model from merely imitating Method 2
  while appearing to validate it.
- Keeping core simulation and inference logic outside visual function nodes
  makes them reviewable, unit-testable, and reusable.
- Keeping orchestration in Node-RED uses its strengths without turning it into
  an opaque machine-learning runtime.
- Preserving Method 2 gives the product an interpretable baseline and lets a
  learned model demonstrate measurable improvement rather than replacing an
  undocumented calculation.
- Evolving the database contract explicitly avoids assigning false meanings to
  equation-specific columns.

## Design and implementation notes

### Scenario and run contract

A source-controlled scenario definition includes:

- a stable scenario key, schema version, simulator version, and seed;
- database mappings for the scenario and firebreak segment;
- initial position, heading, spread behavior, environmental conditions, and
  telemetry quality;
- tick duration, run duration, bounds, and named phases; and
- time-based events such as a wind shift plus the same events exposed as manual
  demo controls.

Active run state includes a unique run ID, seed, tick, elapsed simulation time,
phase, fire-front position, heading, current conditions, applied events, and
outcome. Node-RED context may hold this mutable state while a run is active, but
it is not the durable source of scenario definitions or generated observations.

### Simulation interface

The simulation module exposes small operations equivalent to:

```text
initialize(scenario, seed) -> run state
advance(state) -> next state and telemetry
applyEvent(state, event) -> next state
```

Given the same scenario version and seed, these operations produce the same
sequence. Bounded noise comes from a seeded pseudo-random generator and is
applied after coherent state has been calculated.

### Data model

- `scenarios` and `firebreak_segments` identify the durable database context
  referenced by a simulator definition.
- `telemetry_observations` stores emitted measurements with
  `source_kind = 'simulated'` and run provenance in `raw_payload_json`.
- `model_runs` identifies the exact baseline or learned-model version used for
  inference.
- `prediction_results` stores versioned model output associated with one
  observation.
- `observed_outcomes` stores an independently resolved crossing label and must
  not derive that label from `prediction_results`.

The simulator may begin with run provenance in structured raw payloads. If run
selection, querying, uniqueness, or lifecycle becomes a durable product need,
NOVAflair will add a first-class scenario-run relation through a reviewed
Supabase migration instead of relying indefinitely on JSON queries.

Before learned inference is persisted, a separate migration will address the
Method 2-specific requirements in `model_runs` and `prediction_results`. The
target contract must represent at least model version, model or artifact
provenance, training-data version, probability, threshold, uncertainty, and
explanation metadata without weakening existing v1 traceability.

### Model-service interface

The future model service accepts validated, unit-bearing features and returns a
structured result containing:

- model and artifact version;
- crossing probability and decision threshold;
- crossing decision and risk classification;
- uncertainty or confidence information; and
- bounded feature-contribution or explanation data.

Node-RED remains responsible for polling or receiving work, invoking the
service, applying retry and timeout policy, validating the response, and
persisting it with the matching model-run identity. The model service does not
receive general database credentials merely for convenience.

### Security and privacy

- Scenario definitions and generated telemetry contain no runtime credentials.
- Node-RED database credentials remain scoped to `nodered/.env` under ADR 0003.
- Any model-service credential is runtime-scoped and never placed in a flow,
  scenario definition, mobile bundle, or committed env file.
- The mobile app continues to receive only publishable client configuration and
  its restricted Data API read contract.
- Synthetic provenance is retained so generated data cannot be mistaken for
  measured operational evidence.

### Operations and observability

- Node-RED continues to run through Docker Compose and persist editor/runtime
  state in the `node_red_data` volume.
- Deployed editor changes are intentionally exported to the tracked
  `nodered/flows.json`; runtime volume state is not treated as source control.
- Logs and debug status identify scenario key, run ID, simulator version, tick,
  phase, observation ID, and model version where applicable.
- Start, pause, resume, step, reset, and event controls are idempotent or reject
  invalid transitions visibly.
- A model-service failure does not stop telemetry collection or independently
  observed outcome recording.

## Consequences

Positive:

- Demonstrations become reproducible, controllable, and easier to explain.
- Synthetic telemetry behaves like one evolving scenario instead of unrelated
  random rows.
- Training labels and baseline predictions remain meaningfully independent.
- Simulation and learned-model logic gain normal automated tests.
- The operator app can compare an explainable baseline with a learned model.
- Model provenance and uncertainty become deliberate product data.

Negative:

- The simulator requires more design and testing than an RNG function node.
- Source-controlled modules and scenario files add a build and export boundary
  to the Node-RED workflow.
- Model v2 requires a service runtime and a future database migration.
- Simulator performance cannot establish real-world wildfire accuracy.
- Maintaining baseline and learned predictions adds evaluation and UI
  complexity.

Follow-ups:

- [ ] Complete `nodered/TODO.md` through the deterministic scenario demo.
- [ ] Add and test the scenario contract and JavaScript simulation module.
- [ ] Replace the independent-RNG flow with explicit run controls.
- [ ] Record independent observed outcomes for completed runs.
- [ ] Verify one replayable end-to-end scenario in the mobile app.
- [ ] Review and authorize any required run-metadata migration separately.
- [ ] Create Model v2 work only after the simulator produces trustworthy labels.
- [ ] Design and review the model-agnostic persistence migration before storing
      learned-model results.

## Alternatives considered

1. Keep independent RNG as the permanent demo generator
   - Rejected because it is not reproducible, does not model one evolving fire,
     and cannot generate defensible training outcomes.

2. Generate training labels from the Method 2 decision
   - Rejected because Model v2 would learn to imitate the baseline rather than
     provide independent evidence or improvement.

3. Put the trained model directly in a Node-RED function node
   - Rejected because model artifacts, dependencies, tests, versioning, and
     resource needs deserve an independent runtime boundary.

4. Move the entire simulator out of Node-RED immediately
   - Rejected because Node-RED remains well suited to operator controls,
     scheduling, event orchestration, adapters, and the current database
     pipeline. Only the authoritative calculations need a normal testable
     module.

5. Use an LLM to predict firebreak crossing
   - Rejected because a language model is not the numerical, calibrated risk
     model required by this workflow. Its acceptable role is downstream
     summarization of validated structured outputs.

## Rollout plan

1. Define and validate one source-controlled scenario contract.
2. Implement and unit-test deterministic state transitions and independent
   outcome logic.
3. Replace the RNG flow with Node-RED run controls and the simulation adapter.
4. Persist telemetry and observed outcomes while retaining Method 2 as v1.
5. Replay low-risk and wind-shift scenarios through Supabase and the mobile app.
6. Export the deployed flow, verify a fresh Node-RED volume, and document the
   demo procedure.
7. Generate leakage-resistant labeled datasets by complete scenario run.
8. Create the Model v2 service and model-agnostic migration as separately
   reviewed work.

## References

- ADR 0001, Use React Native for the Operator App:
  `docs/adr/0001-use-react-native-for-operator-app.md`
- ADR 0002, Keep the Edge Agent in the Monorepo:
  `docs/adr/0002-keep-edge-agent-in-monorepo.md`
- ADR 0003, Keep Secrets Scoped to Their Runtime:
  `docs/adr/0003-keep-secrets-scoped-to-runtime.md`
- ADR 0004, Use Supabase-Native Database Migrations:
  `docs/adr/0004-supabase-native-database-iac.md`
