import {
    isTelemetryStale,
    summarizeTelemetry,
    TELEMETRY_STALE_AFTER_MS,
    type TelemetryObservation,
} from "@/domain/telemetry";

function makeObservation(
    overrides: Partial<TelemetryObservation> = {},
): TelemetryObservation {
    return {
        id: 1,
        scenarioId: 1,
        firebreakSegmentId: 1,
        droneId: "drone-01",
        observedAt: "2026-07-11T14:20:00Z",
        lat: 38.8123,
        lon: -77.0931,
        altitudeM: 42,
        windSpeedMps: 4,
        windDirectionDeg: 315,
        flameLengthM: 2,
        burnTimeS: 40,
        qualityScore: 0.92,
        predictionResultId: 101,
        modelRunId: 1,
        crossingProbability: 0.2,
        riskLevel: "moderate",
        predictedCrossingDecision: "NO",
        predictionComputedAt: "2026-07-11T14:20:01Z",
        ...overrides,
    };
}

describe("summarizeTelemetry", () => {
    it("returns zero values for an empty feed", () => {
        expect(summarizeTelemetry([])).toEqual({
            averageWindSpeed: 0,
            averageFlameLength: 0,
            averageBurnTime: 0,
            highestCrossingProbability: 0,
            positionedObservationCount: 0,
        });
    });

    it("calculates averages, highest risk, and positioned count", () => {
        const observations = [
            makeObservation(),
            makeObservation({
                id: 2,
                lat: null,
                lon: null,
                windSpeedMps: 8,
                flameLengthM: 4,
                burnTimeS: 80,
                crossingProbability: 0.65,
            }),
        ];

        expect(summarizeTelemetry(observations)).toEqual({
            averageWindSpeed: 6,
            averageFlameLength: 3,
            averageBurnTime: 60,
            highestCrossingProbability: 0.65,
            positionedObservationCount: 1,
        });
    });
});

describe("isTelemetryStale", () => {
    const nowMs = Date.parse("2026-07-11T14:20:30Z");

    it("does not label an empty feed as stale", () => {
        expect(isTelemetryStale([], nowMs)).toBe(false);
    });

    it("uses the newest observation and the documented threshold", () => {
        const observations = [
            makeObservation({ observedAt: "2026-07-11T14:19:00Z" }),
            makeObservation({
                id: 2,
                observedAt: new Date(
                    nowMs - TELEMETRY_STALE_AFTER_MS,
                ).toISOString(),
            }),
        ];

        expect(isTelemetryStale(observations, nowMs)).toBe(false);
        expect(isTelemetryStale(observations, nowMs + 1)).toBe(true);
    });

    it("treats an invalid required timestamp as stale", () => {
        expect(
            isTelemetryStale(
                [makeObservation({ observedAt: "not-a-timestamp" })],
                nowMs,
            ),
        ).toBe(true);
    });
});
