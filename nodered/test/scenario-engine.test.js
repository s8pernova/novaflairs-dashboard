"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const scenario = require("../scenarios/brushfire-westline-01.json");
const {
    advanceScenario,
    applyScenarioEvent,
    initializeScenario,
    pauseScenario,
    resumeScenario,
    validateScenario,
} = require("../lib/scenario-engine");

const START_OPTIONS = {
    runId: "test-run",
    seed: 12345,
    startedAt: "2026-07-14T00:00:00.000Z",
};

function copy(value) {
    return JSON.parse(JSON.stringify(value));
}

function runToCompletion(definition, options = START_OPTIONS) {
    let state = initializeScenario(definition, options);
    const telemetry = [];

    while (state.status !== "complete") {
        const result = advanceScenario(definition, state);
        state = result.state;
        telemetry.push(result.telemetry);
    }

    return { state, telemetry };
}

test("validates the source-controlled scenario contract", () => {
    assert.equal(validateScenario(scenario), scenario);

    const missing = copy(scenario);
    delete missing.initialState.altitudeM;
    assert.throws(
        () => validateScenario(missing),
        /initialState.altitudeM must be a finite number/,
    );

    const outOfRange = copy(scenario);
    outOfRange.initialState.headingDeg = 360;
    assert.throws(
        () => validateScenario(outOfRange),
        /initialState.headingDeg must be less than 360/,
    );

    const invalid = copy(scenario);
    invalid.events[0].type = "unknown_event";
    assert.throws(
        () => validateScenario(invalid),
        /Unsupported scenario event type unknown_event/,
    );
});

test("replays the same run exactly from the same seed and clock", () => {
    const first = runToCompletion(scenario);
    const second = runToCompletion(scenario);

    assert.deepEqual(second, first);
    assert.equal(first.state.outcome.observedCrossedYesNo, "YES");
});

test("changes bounded telemetry noise without changing scripted events", () => {
    const first = runToCompletion(scenario, START_OPTIONS);
    const second = runToCompletion(scenario, {
        ...START_OPTIONS,
        seed: 54321,
    });

    assert.notEqual(first.telemetry[0].lat, second.telemetry[0].lat);
    assert.deepEqual(first.state.firedEventIds, ["wind-shift"]);
    assert.deepEqual(second.state.firedEventIds, ["wind-shift"]);
    assert.equal(first.state.outcome.type, second.state.outcome.type);
});

test("advances continuously while keeping state inside scenario bounds", () => {
    let state = initializeScenario(scenario, START_OPTIONS);

    while (state.status !== "complete") {
        const previousPosition = state.position;
        const result = advanceScenario(scenario, state);
        state = result.state;

        assert.notDeepEqual(state.position, previousPosition);
        assert.ok(state.position.eastM >= scenario.bounds.minEastM);
        assert.ok(state.position.eastM <= scenario.bounds.maxEastM);
        assert.ok(state.position.northM >= scenario.bounds.minNorthM);
        assert.ok(state.position.northM <= scenario.bounds.maxNorthM);
    }
});

test("applies the wind shift once through scripted or manual control", () => {
    const initial = initializeScenario(scenario, START_OPTIONS);
    const shifted = applyScenarioEvent(scenario, initial, "wind-shift");
    const repeated = applyScenarioEvent(scenario, shifted, "wind-shift");

    assert.equal(shifted.windSpeedMps, 10);
    assert.equal(shifted.headingDeg, 90);
    assert.equal(shifted.spreadMultiplier, 2);
    assert.deepEqual(shifted.firedEventIds, ["wind-shift"]);
    assert.deepEqual(repeated, shifted);
    assert.deepEqual(initial.firedEventIds, []);
});

test("advances phases and emits run provenance", () => {
    let state = initializeScenario(scenario, START_OPTIONS);
    let latest;

    while (state.elapsedSeconds < 60) {
        latest = advanceScenario(scenario, state);
        state = latest.state;
    }

    assert.equal(state.phase, "wind-driven");
    assert.deepEqual(state.firedEventIds, ["wind-shift"]);
    assert.equal(latest.telemetry.rawPayloadJson.runId, START_OPTIONS.runId);
    assert.equal(latest.telemetry.rawPayloadJson.seed, START_OPTIONS.seed);
    assert.equal(latest.telemetry.sourceKind, "simulated");
});

test("contains a low-intensity run independently of Method 2", () => {
    const containedScenario = copy(scenario);
    containedScenario.events = [];
    containedScenario.timing.maxDurationSeconds = 240;
    containedScenario.phases = containedScenario.phases.filter(
        (phase) => phase.startsAtSeconds < containedScenario.timing.maxDurationSeconds,
    );

    const result = runToCompletion(containedScenario);

    assert.equal(result.state.outcome.type, "contained");
    assert.equal(result.state.outcome.observedCrossedYesNo, "NO");
});

test("does not advance paused or completed state", () => {
    const initial = initializeScenario(scenario, START_OPTIONS);
    const paused = pauseScenario(initial);
    const pausedResult = advanceScenario(scenario, paused);

    assert.equal(pausedResult.telemetry, null);
    assert.deepEqual(pausedResult.state, paused);

    const resumed = resumeScenario(paused);
    const resumedResult = advanceScenario(scenario, resumed);
    assert.equal(resumedResult.state.tick, 1);

    const completed = runToCompletion(scenario).state;
    const completedResult = advanceScenario(scenario, completed);
    assert.equal(completedResult.telemetry, null);
    assert.deepEqual(completedResult.state, completed);
});
