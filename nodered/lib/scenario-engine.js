"use strict";

const METERS_PER_DEGREE_LATITUDE = 111_320;
const SUPPORTED_EVENT_TYPES = new Set(["wind_shift"]);

function assertObject(value, path) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error(`${path} must be an object`);
    }
}

function assertString(value, path) {
    if (typeof value !== "string" || value.trim() === "") {
        throw new Error(`${path} must be a non-empty string`);
    }
}

function assertFiniteNumber(value, path, options = {}) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error(`${path} must be a finite number`);
    }

    if (options.min !== undefined && value < options.min) {
        throw new Error(`${path} must be at least ${options.min}`);
    }

    if (options.max !== undefined && value > options.max) {
        throw new Error(`${path} must be at most ${options.max}`);
    }
}

function assertPositiveInteger(value, path) {
    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`${path} must be a positive integer`);
    }
}

function assertHeading(value, path) {
    assertFiniteNumber(value, path, { min: 0 });
    if (value >= 360) {
        throw new Error(`${path} must be less than 360`);
    }
}

function assertUniqueIds(items, path) {
    const seen = new Set();

    for (const item of items) {
        assertString(item.id, `${path}.id`);
        if (seen.has(item.id)) {
            throw new Error(`${path} contains duplicate id ${item.id}`);
        }
        seen.add(item.id);
    }
}

function validateScenario(scenario) {
    assertObject(scenario, "scenario");
    assertPositiveInteger(scenario.schemaVersion, "schemaVersion");
    if (scenario.schemaVersion !== 1) {
        throw new Error(`Unsupported scenario schema version ${scenario.schemaVersion}`);
    }

    assertString(scenario.scenarioKey, "scenarioKey");
    assertString(scenario.name, "name");
    assertString(scenario.simulatorVersion, "simulatorVersion");
    assertPositiveInteger(scenario.defaultSeed, "defaultSeed");

    assertObject(scenario.database, "database");
    assertPositiveInteger(scenario.database.scenarioId, "database.scenarioId");
    assertPositiveInteger(
        scenario.database.firebreakSegmentId,
        "database.firebreakSegmentId",
    );

    assertObject(scenario.timing, "timing");
    assertFiniteNumber(scenario.timing.tickSeconds, "timing.tickSeconds", {
        min: Number.EPSILON,
    });
    assertFiniteNumber(
        scenario.timing.maxDurationSeconds,
        "timing.maxDurationSeconds",
        { min: scenario.timing.tickSeconds },
    );

    assertObject(scenario.origin, "origin");
    assertFiniteNumber(scenario.origin.lat, "origin.lat", { min: -90, max: 90 });
    assertFiniteNumber(scenario.origin.lon, "origin.lon", {
        min: -180,
        max: 180,
    });

    assertObject(scenario.bounds, "bounds");
    for (const key of ["minEastM", "maxEastM", "minNorthM", "maxNorthM"]) {
        assertFiniteNumber(scenario.bounds[key], `bounds.${key}`);
    }
    if (scenario.bounds.minEastM >= scenario.bounds.maxEastM) {
        throw new Error("bounds.minEastM must be less than bounds.maxEastM");
    }
    if (scenario.bounds.minNorthM >= scenario.bounds.maxNorthM) {
        throw new Error("bounds.minNorthM must be less than bounds.maxNorthM");
    }

    assertObject(scenario.initialState, "initialState");
    const initial = scenario.initialState;
    assertFiniteNumber(initial.offsetEastM, "initialState.offsetEastM", {
        min: scenario.bounds.minEastM,
        max: scenario.bounds.maxEastM,
    });
    assertFiniteNumber(initial.offsetNorthM, "initialState.offsetNorthM", {
        min: scenario.bounds.minNorthM,
        max: scenario.bounds.maxNorthM,
    });
    assertFiniteNumber(initial.altitudeM, "initialState.altitudeM");
    assertHeading(initial.headingDeg, "initialState.headingDeg");
    assertFiniteNumber(
        initial.baseSpreadRateMps,
        "initialState.baseSpreadRateMps",
        { min: 0 },
    );
    assertFiniteNumber(
        initial.spreadMultiplier,
        "initialState.spreadMultiplier",
        { min: 0 },
    );
    assertFiniteNumber(initial.windSpeedMps, "initialState.windSpeedMps", {
        min: 0,
    });
    assertHeading(initial.windDirectionDeg, "initialState.windDirectionDeg");
    assertFiniteNumber(
        initial.baseFlameLengthM,
        "initialState.baseFlameLengthM",
        { min: 0 },
    );
    assertFiniteNumber(initial.baseBurnTimeS, "initialState.baseBurnTimeS", {
        min: 0,
    });
    assertFiniteNumber(initial.fuelFactor, "initialState.fuelFactor", {
        min: 0,
        max: 1,
    });
    assertFiniteNumber(initial.qualityScore, "initialState.qualityScore", {
        min: 0,
        max: 1,
    });

    assertObject(scenario.firebreak, "firebreak");
    assertFiniteNumber(scenario.firebreak.widthM, "firebreak.widthM", {
        min: Number.EPSILON,
    });
    assertHeading(
        scenario.firebreak.normalHeadingDeg,
        "firebreak.normalHeadingDeg",
    );
    assertFiniteNumber(
        scenario.firebreak.crossingIntensityThreshold,
        "firebreak.crossingIntensityThreshold",
        { min: 0 },
    );

    assertObject(scenario.dynamics, "dynamics");
    for (const key of [
        "windSpreadFactorPerMps",
        "windFlameFactorPerMps",
        "fuelFlameFactor",
        "burnTimeWindReductionPerMps",
        "minSpreadRateMps",
        "maxSpreadRateMps",
        "minFlameLengthM",
        "maxFlameLengthM",
        "minBurnTimeS",
        "maxBurnTimeS",
    ]) {
        assertFiniteNumber(scenario.dynamics[key], `dynamics.${key}`, { min: 0 });
    }
    for (const [minimum, maximum] of [
        ["minSpreadRateMps", "maxSpreadRateMps"],
        ["minFlameLengthM", "maxFlameLengthM"],
        ["minBurnTimeS", "maxBurnTimeS"],
    ]) {
        if (scenario.dynamics[minimum] > scenario.dynamics[maximum]) {
            throw new Error(`dynamics.${minimum} must not exceed dynamics.${maximum}`);
        }
    }

    assertObject(scenario.noise, "noise");
    for (const key of [
        "positionM",
        "altitudeM",
        "windSpeedMps",
        "windDirectionDeg",
        "flameLengthM",
        "burnTimeS",
    ]) {
        assertFiniteNumber(scenario.noise[key], `noise.${key}`, { min: 0 });
    }

    if (!Array.isArray(scenario.phases) || scenario.phases.length === 0) {
        throw new Error("phases must be a non-empty array");
    }
    assertUniqueIds(scenario.phases, "phases");
    let previousPhaseStart = -1;
    for (const phase of scenario.phases) {
        assertFiniteNumber(phase.startsAtSeconds, `phases.${phase.id}.startsAtSeconds`, {
            min: 0,
            max: scenario.timing.maxDurationSeconds,
        });
        if (phase.startsAtSeconds <= previousPhaseStart) {
            throw new Error("phases must be ordered by increasing startsAtSeconds");
        }
        previousPhaseStart = phase.startsAtSeconds;
    }
    if (scenario.phases[0].startsAtSeconds !== 0) {
        throw new Error("the first phase must start at zero seconds");
    }

    if (!Array.isArray(scenario.events)) {
        throw new Error("events must be an array");
    }
    assertUniqueIds(scenario.events, "events");
    for (const event of scenario.events) {
        assertString(event.type, `events.${event.id}.type`);
        if (!SUPPORTED_EVENT_TYPES.has(event.type)) {
            throw new Error(`Unsupported scenario event type ${event.type}`);
        }
        assertFiniteNumber(event.atSeconds, `events.${event.id}.atSeconds`, {
            min: 0,
            max: scenario.timing.maxDurationSeconds,
        });
        assertObject(event.changes, `events.${event.id}.changes`);
        if (event.changes.windSpeedMps !== undefined) {
            assertFiniteNumber(
                event.changes.windSpeedMps,
                `events.${event.id}.changes.windSpeedMps`,
                { min: 0 },
            );
        }
        if (event.changes.windDirectionDeg !== undefined) {
            assertHeading(
                event.changes.windDirectionDeg,
                `events.${event.id}.changes.windDirectionDeg`,
            );
        }
        if (event.changes.headingDeg !== undefined) {
            assertHeading(
                event.changes.headingDeg,
                `events.${event.id}.changes.headingDeg`,
            );
        }
        if (event.changes.spreadMultiplier !== undefined) {
            assertFiniteNumber(
                event.changes.spreadMultiplier,
                `events.${event.id}.changes.spreadMultiplier`,
                { min: 0 },
            );
        }
    }

    assertObject(scenario.telemetry, "telemetry");
    assertString(scenario.telemetry.droneId, "telemetry.droneId");
    if (scenario.telemetry.sourceKind !== "simulated") {
        throw new Error("telemetry.sourceKind must be simulated");
    }

    return scenario;
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum);
}

function normalizeHeading(value) {
    return ((value % 360) + 360) % 360;
}

function degreesToRadians(value) {
    return (value * Math.PI) / 180;
}

function headingVector(headingDeg) {
    const radians = degreesToRadians(headingDeg);
    return {
        east: Math.sin(radians),
        north: Math.cos(radians),
    };
}

function headingAlignment(firstHeadingDeg, secondHeadingDeg) {
    return Math.cos(degreesToRadians(firstHeadingDeg - secondHeadingDeg));
}

function nextRandom(rngState) {
    let state = (rngState + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    value = ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
    return { rngState: state, value };
}

function boundedNoise(rngState, magnitude) {
    const random = nextRandom(rngState);
    return {
        rngState: random.rngState,
        value: (random.value * 2 - 1) * magnitude,
    };
}

function phaseAt(scenario, elapsedSeconds) {
    let phase = scenario.phases[0].id;
    for (const candidate of scenario.phases) {
        if (candidate.startsAtSeconds > elapsedSeconds) {
            break;
        }
        phase = candidate.id;
    }
    return phase;
}

function offsetToCoordinates(origin, eastM, northM) {
    const latitude = origin.lat + northM / METERS_PER_DEGREE_LATITUDE;
    const longitudeScale =
        METERS_PER_DEGREE_LATITUDE * Math.cos(degreesToRadians(origin.lat));
    const longitude = origin.lon + eastM / longitudeScale;
    return { lat: latitude, lon: longitude };
}

function signedFirebreakDistance(scenario, position) {
    const normal = headingVector(scenario.firebreak.normalHeadingDeg);
    return position.eastM * normal.east + position.northM * normal.north;
}

function initializeScenario(scenario, options = {}) {
    validateScenario(scenario);
    const seed = options.seed ?? scenario.defaultSeed;
    assertPositiveInteger(seed, "seed");

    const startedAt = options.startedAt ?? new Date().toISOString();
    if (Number.isNaN(Date.parse(startedAt))) {
        throw new Error("startedAt must be an ISO-compatible timestamp");
    }

    const runId =
        options.runId ?? `${scenario.scenarioKey}-${seed}-${Date.parse(startedAt)}`;
    assertString(runId, "runId");

    return {
        runId,
        scenarioKey: scenario.scenarioKey,
        simulatorVersion: scenario.simulatorVersion,
        seed,
        rngState: seed >>> 0,
        startedAt: new Date(startedAt).toISOString(),
        status: "running",
        tick: 0,
        elapsedSeconds: 0,
        phase: phaseAt(scenario, 0),
        position: {
            eastM: scenario.initialState.offsetEastM,
            northM: scenario.initialState.offsetNorthM,
        },
        altitudeM: scenario.initialState.altitudeM,
        headingDeg: scenario.initialState.headingDeg,
        baseSpreadRateMps: scenario.initialState.baseSpreadRateMps,
        spreadMultiplier: scenario.initialState.spreadMultiplier,
        windSpeedMps: scenario.initialState.windSpeedMps,
        windDirectionDeg: scenario.initialState.windDirectionDeg,
        baseFlameLengthM: scenario.initialState.baseFlameLengthM,
        baseBurnTimeS: scenario.initialState.baseBurnTimeS,
        fuelFactor: scenario.initialState.fuelFactor,
        qualityScore: scenario.initialState.qualityScore,
        firedEventIds: [],
        lastEventId: null,
        outcome: null,
    };
}

function eventById(scenario, eventId) {
    const event = scenario.events.find((candidate) => candidate.id === eventId);
    if (!event) {
        throw new Error(`Unknown scenario event ${eventId}`);
    }
    return event;
}

function applyScenarioEvent(scenario, state, eventOrId) {
    validateScenario(scenario);
    const event =
        typeof eventOrId === "string" ? eventById(scenario, eventOrId) : eventOrId;

    if (!event || !SUPPORTED_EVENT_TYPES.has(event.type)) {
        throw new Error(`Unsupported scenario event type ${event?.type}`);
    }

    if (state.firedEventIds.includes(event.id)) {
        return clone(state);
    }

    const next = clone(state);
    const changes = event.changes;
    for (const key of [
        "windSpeedMps",
        "windDirectionDeg",
        "headingDeg",
        "spreadMultiplier",
    ]) {
        if (changes[key] !== undefined) {
            next[key] = changes[key];
        }
    }
    next.firedEventIds.push(event.id);
    next.lastEventId = event.id;
    return next;
}

function pauseScenario(state) {
    const next = clone(state);
    if (next.status === "running") {
        next.status = "paused";
    }
    return next;
}

function resumeScenario(state) {
    const next = clone(state);
    if (next.status === "paused") {
        next.status = "running";
    }
    return next;
}

function calculateDynamics(scenario, state) {
    const windTravelHeading = normalizeHeading(state.windDirectionDeg + 180);
    const alignment = Math.max(
        0,
        headingAlignment(state.headingDeg, windTravelHeading),
    );
    const alignedWindSpeedMps = state.windSpeedMps * alignment;
    const spreadRateMps = clamp(
        state.baseSpreadRateMps *
            state.spreadMultiplier *
            (1 +
                scenario.dynamics.windSpreadFactorPerMps * alignedWindSpeedMps),
        scenario.dynamics.minSpreadRateMps,
        scenario.dynamics.maxSpreadRateMps,
    );
    const flameLengthM = clamp(
        state.baseFlameLengthM *
            (1 +
                scenario.dynamics.windFlameFactorPerMps * alignedWindSpeedMps +
                scenario.dynamics.fuelFlameFactor * (state.fuelFactor - 0.5)),
        scenario.dynamics.minFlameLengthM,
        scenario.dynamics.maxFlameLengthM,
    );
    const burnTimeS = clamp(
        state.baseBurnTimeS -
            scenario.dynamics.burnTimeWindReductionPerMps * alignedWindSpeedMps,
        scenario.dynamics.minBurnTimeS,
        scenario.dynamics.maxBurnTimeS,
    );
    const intensityProxy =
        flameLengthM *
        spreadRateMps *
        (1 + alignedWindSpeedMps / 10) *
        state.fuelFactor;

    return {
        windTravelHeading,
        alignedWindSpeedMps,
        spreadRateMps,
        flameLengthM,
        burnTimeS,
        intensityProxy,
    };
}

function applyDueEvents(scenario, state, elapsedSeconds) {
    let next = state;
    for (const event of scenario.events) {
        if (
            event.atSeconds <= elapsedSeconds &&
            !next.firedEventIds.includes(event.id)
        ) {
            next = applyScenarioEvent(scenario, next, event);
        }
    }
    return next;
}

function resolvePosition(scenario, state, dynamics, tickSeconds) {
    const movement = headingVector(state.headingDeg);
    let eastM = clamp(
        state.position.eastM + movement.east * dynamics.spreadRateMps * tickSeconds,
        scenario.bounds.minEastM,
        scenario.bounds.maxEastM,
    );
    let northM = clamp(
        state.position.northM +
            movement.north * dynamics.spreadRateMps * tickSeconds,
        scenario.bounds.minNorthM,
        scenario.bounds.maxNorthM,
    );

    const normal = headingVector(scenario.firebreak.normalHeadingDeg);
    const nearEdgeDistance = -scenario.firebreak.widthM / 2;
    const distance = signedFirebreakDistance(scenario, { eastM, northM });
    let outcome = null;

    if (
        distance >= nearEdgeDistance &&
        dynamics.intensityProxy < scenario.firebreak.crossingIntensityThreshold
    ) {
        const correction = distance - nearEdgeDistance;
        eastM -= normal.east * correction;
        northM -= normal.north * correction;
        outcome = "contained";
    }

    const crossedDistance = signedFirebreakDistance(scenario, { eastM, northM });
    if (crossedDistance >= scenario.firebreak.widthM / 2) {
        outcome = "crossed";
    }

    return { position: { eastM, northM }, outcome };
}

function createOutcome(type, elapsedSeconds) {
    return {
        type,
        observedCrossedYesNo: type === "crossed" ? "YES" : "NO",
        resolvedAtSeconds: elapsedSeconds,
    };
}

function addTelemetryNoise(scenario, state, dynamics) {
    let rngState = state.rngState;
    const values = {};

    for (const [key, magnitude] of Object.entries({
        eastM: scenario.noise.positionM,
        northM: scenario.noise.positionM,
        altitudeM: scenario.noise.altitudeM,
        windSpeedMps: scenario.noise.windSpeedMps,
        windDirectionDeg: scenario.noise.windDirectionDeg,
        flameLengthM: scenario.noise.flameLengthM,
        burnTimeS: scenario.noise.burnTimeS,
    })) {
        const noise = boundedNoise(rngState, magnitude);
        rngState = noise.rngState;
        values[key] = noise.value;
    }

    return {
        rngState,
        eastM: state.position.eastM + values.eastM,
        northM: state.position.northM + values.northM,
        altitudeM: state.altitudeM + values.altitudeM,
        windSpeedMps: Math.max(0, state.windSpeedMps + values.windSpeedMps),
        windDirectionDeg: normalizeHeading(
            state.windDirectionDeg + values.windDirectionDeg,
        ),
        flameLengthM: Math.max(0, dynamics.flameLengthM + values.flameLengthM),
        burnTimeS: Math.max(0, dynamics.burnTimeS + values.burnTimeS),
    };
}

function buildTelemetry(scenario, state, dynamics, noisy) {
    const coordinates = offsetToCoordinates(
        scenario.origin,
        noisy.eastM,
        noisy.northM,
    );
    const observedAt = new Date(
        Date.parse(state.startedAt) + state.elapsedSeconds * 1000,
    ).toISOString();

    return {
        scenarioId: scenario.database.scenarioId,
        firebreakSegmentId: scenario.database.firebreakSegmentId,
        droneId: scenario.telemetry.droneId,
        observedAt,
        lat: coordinates.lat,
        lon: coordinates.lon,
        altM: noisy.altitudeM,
        windSpeed2mMps: noisy.windSpeedMps,
        windDirectionDeg: noisy.windDirectionDeg,
        flameLengthM: noisy.flameLengthM,
        burnTimeS: noisy.burnTimeS,
        sourceKind: scenario.telemetry.sourceKind,
        qualityScore: state.qualityScore,
        rawPayloadJson: {
            source: "node-red-scenario-engine",
            scenarioKey: scenario.scenarioKey,
            simulatorVersion: scenario.simulatorVersion,
            runId: state.runId,
            seed: state.seed,
            tick: state.tick,
            elapsedSeconds: state.elapsedSeconds,
            phase: state.phase,
            lastEventId: state.lastEventId,
            firedEventIds: [...state.firedEventIds],
            positionEastM: state.position.eastM,
            positionNorthM: state.position.northM,
            spreadRateMps: dynamics.spreadRateMps,
            intensityProxy: dynamics.intensityProxy,
            outcome: state.outcome,
        },
    };
}

function advanceScenario(scenario, currentState) {
    validateScenario(scenario);
    const original = clone(currentState);
    if (original.status !== "running") {
        return { state: original, telemetry: null, outcome: original.outcome };
    }

    const elapsedSeconds = Math.min(
        original.elapsedSeconds + scenario.timing.tickSeconds,
        scenario.timing.maxDurationSeconds,
    );
    let state = applyDueEvents(scenario, original, elapsedSeconds);
    const dynamics = calculateDynamics(scenario, state);
    const resolved = resolvePosition(
        scenario,
        state,
        dynamics,
        elapsedSeconds - original.elapsedSeconds,
    );

    state.position = resolved.position;
    state.tick += 1;
    state.elapsedSeconds = elapsedSeconds;
    state.phase = phaseAt(scenario, elapsedSeconds);

    if (resolved.outcome) {
        state.outcome = createOutcome(resolved.outcome, elapsedSeconds);
        state.status = "complete";
        state.phase = "complete";
    } else if (elapsedSeconds >= scenario.timing.maxDurationSeconds) {
        state.outcome = createOutcome("contained", elapsedSeconds);
        state.status = "complete";
        state.phase = "complete";
    }

    const noisy = addTelemetryNoise(scenario, state, dynamics);
    state.rngState = noisy.rngState;
    const telemetry = buildTelemetry(scenario, state, dynamics, noisy);

    return { state, telemetry, outcome: state.outcome };
}

module.exports = {
    advanceScenario,
    applyScenarioEvent,
    initializeScenario,
    offsetToCoordinates,
    pauseScenario,
    resumeScenario,
    signedFirebreakDistance,
    validateScenario,
};
