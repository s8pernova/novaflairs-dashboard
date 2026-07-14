# Build the scenario flow in Node-RED

This guide assembles visual orchestration around the tested simulator code. The
editor should coordinate messages and state; it should not duplicate the
calculations from `lib/scenario-engine.js`.

Open http://localhost:1880 after rebuilding the service:

```bash
docker compose up -d --build nodered
```

## Understand the context scopes

- `msg` is one message traveling along a wire.
- `flow` context is mutable state shared by nodes on one flow tab. The active
  scenario run belongs here.
- `global` context is runtime-wide application code and configuration. The
  container exposes `scenarioEngine` and `scenarios` here.

## 1. Create the flow tab

Add a flow tab named `Scenario Simulator`. Leave the old `Synthetic Data` flow
disabled while building its replacement.

## 2. Add control Inject nodes

Add six Inject nodes. In each node, remove the default `msg.payload` property
and add a string property named `msg.action`:

| Node name | `msg.action` |
| --- | --- |
| Start | `start` |
| Pause | `pause` |
| Resume | `resume` |
| Reset | `reset` |
| Trigger Wind Shift | `wind-shift` |
| Step | `step` |

An Inject node's left-side button sends its configured message once.

## 3. Add the Control Run function

Add a one-output Function node named `Control Run`. Wire Start, Pause, Resume,
Reset, and Trigger Wind Shift into it. Do not wire Step here.

```javascript
const engine = global.get("scenarioEngine");
const scenario = global.get("scenarios").brushfireWestline01;
const stateKey = "scenarioState";
const action = msg.action;
let state = flow.get(stateKey);

const createRun = () => {
    const startedAt = new Date().toISOString();
    const seed = Number(msg.seed ?? scenario.defaultSeed);

    return engine.initializeScenario(scenario, {
        runId: `${scenario.scenarioKey}-${Date.now()}`,
        seed,
        startedAt,
    });
};

switch (action) {
    case "start":
        if (state && ["running", "paused"].includes(state.status)) {
            node.warn("A scenario run is already active");
            return null;
        }
        state = createRun();
        break;
    case "reset":
        state = createRun();
        break;
    case "pause":
        if (!state) {
            node.warn("Start a scenario before pausing it");
            return null;
        }
        state = engine.pauseScenario(state);
        break;
    case "resume":
        if (!state) {
            node.warn("Start a scenario before resuming it");
            return null;
        }
        state = engine.resumeScenario(state);
        break;
    case "wind-shift":
        if (!state || state.status === "complete") {
            node.warn("Start an active scenario before triggering an event");
            return null;
        }
        state = engine.applyScenarioEvent(scenario, state, "wind-shift");
        break;
    default:
        node.error(`Unknown scenario control: ${action}`, msg);
        return null;
}

flow.set(stateKey, state);

const color = state.status === "running" ? "green" : "yellow";
node.status({
    fill: color,
    shape: "dot",
    text: `${state.status} | ${state.phase} | tick ${state.tick}`,
});

msg.payload = {
    action,
    runId: state.runId,
    status: state.status,
    phase: state.phase,
    tick: state.tick,
    elapsedSeconds: state.elapsedSeconds,
    firedEventIds: state.firedEventIds,
};

return msg;
```

Add a Debug node named `Run Status`, configure it to show complete
`msg.payload`, and wire `Control Run -> Run Status`.

## 4. Add the clock

Add another Inject node named `Tick`:

- set `msg.action` to the string `tick`;
- set Repeat to an interval of 5 seconds; and
- do not inject once automatically at startup.

The clock always sends ticks, but the next node ignores them unless a run is
active. This gives the flow one timer instead of creating a timer per run.

## 5. Add the Advance Run function

Add a Function node named `Advance Run` with two outputs:

1. telemetry;
2. resolved outcome preview.

Wire both Tick and Step into it.

```javascript
const engine = global.get("scenarioEngine");
const scenario = global.get("scenarios").brushfireWestline01;
const stateKey = "scenarioState";
const action = msg.action;
let state = flow.get(stateKey);

if (!state) {
    node.warn("Start a scenario before advancing it");
    return [null, null];
}

if (action === "tick" && state.status !== "running") {
    return [null, null];
}

if (action === "step") {
    if (state.status !== "paused") {
        node.warn("Step is available only while the scenario is paused");
        return [null, null];
    }
    state = engine.resumeScenario(state);
} else if (action !== "tick") {
    node.error(`Unknown advance action: ${action}`, msg);
    return [null, null];
}

const result = engine.advanceScenario(scenario, state);
let nextState = result.state;

if (action === "step" && nextState.status === "running") {
    nextState = engine.pauseScenario(nextState);
}

flow.set(stateKey, nextState);

const color = nextState.status === "complete" ? "blue" : "green";
node.status({
    fill: color,
    shape: "dot",
    text: `${nextState.status} | ${nextState.phase} | tick ${nextState.tick}`,
});

if (!result.telemetry) {
    return [null, null];
}

const telemetryMessage = {
    ...msg,
    payload: result.telemetry,
};

const outcomeMessage = result.outcome
    ? {
          payload: result.outcome,
          runId: nextState.runId,
          telemetry: result.telemetry,
      }
    : null;

return [telemetryMessage, outcomeMessage];
```

Wire output 2 to a Debug node named `Outcome Preview`, showing complete
`msg.payload`. This exercise previews the independent outcome; a later step
will persist it after the final telemetry insert returns its ID.

## 6. Add the telemetry adapter

Add a one-output Function node named `Prepare Telemetry Insert`. Wire output 1
of Advance Run into it. This translates the engine's named object into the
ordered parameters expected by the existing PostgreSQL query.

```javascript
const telemetry = msg.payload;

msg.params = [
    telemetry.scenarioId,
    telemetry.firebreakSegmentId,
    telemetry.droneId,
    telemetry.observedAt,
    telemetry.lat,
    telemetry.lon,
    telemetry.altM,
    telemetry.windSpeed2mMps,
    telemetry.windDirectionDeg,
    telemetry.flameLengthM,
    telemetry.burnTimeS,
    telemetry.sourceKind,
    telemetry.qualityScore,
    JSON.stringify(telemetry.rawPayloadJson),
];

return msg;
```

## 7. Reuse the PostgreSQL insert

On the disabled `Synthetic Data` tab, copy the `Insert to DB` PostgreSQL node.
Paste it into `Scenario Simulator` and rename it `Insert Simulated Telemetry`.
It should retain the `NOVAflair Prod` connection and parameterized INSERT query.

Wire:

```text
Advance Run output 1
    -> Prepare Telemetry Insert
    -> Insert Simulated Telemetry
    -> Inserted Telemetry debug
```

Configure the final Debug node to show the complete message. Do not put database
credentials or passwords in a Function node.

## 8. Add visible error handling

Add a Catch node scoped to this flow and wire it to a `Scenario Errors` Debug
node showing the complete message.

The completed flow should read like this:

```text
Start/Pause/Resume/Reset/Wind Shift -> Control Run -> Run Status

Tick/Step -> Advance Run output 1 -> Prepare Telemetry Insert
                                    -> Insert Simulated Telemetry
                                    -> Inserted Telemetry

             Advance Run output 2 -> Outcome Preview

Catch -> Scenario Errors
```

## 9. Deploy and exercise the controls

Click Deploy, clear the Debug sidebar, and then:

1. Click Start. One observation should be inserted every five seconds.
2. Click Pause. Inserts should stop while Tick continues to fire.
3. Click Step. Exactly one observation should be inserted, and the run should
   remain paused.
4. Click Resume. Five-second updates should continue.
5. Click Reset for a fresh run and clock.
6. Click Trigger Wind Shift before 60 seconds to apply the event manually.

Without a manual trigger, the scenario applies its wind shift at 60 simulated
seconds. The default run should resolve as crossed at about 135 seconds. After
completion, later Tick messages are ignored.

Once insertion works, enable `Poll for new telemetry` on the existing
`Fire Calculations` flow to restore Method 2 baseline predictions. Keep that
flow separate from the scenario simulator.

## 10. Complete the replacement cleanly

After the new flow has inserted and replayed telemetry successfully:

1. delete the replaced RNG nodes or obsolete `Synthetic Data` tab rather than
   retaining a disabled legacy generator;
2. keep the shared PostgreSQL configuration if the new insert uses it;
3. deploy once more; and
4. export all flows in formatted JSON for the reviewed `flows.json` update.

Never export or commit `flows_cred.json`, session data, context state, or
runtime backups. Active run state is intentionally memory-only and clears when
Node-RED restarts.
