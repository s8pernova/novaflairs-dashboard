import {
    summarizeTelemetry,
    type TelemetryObservation,
} from "@/domain/telemetry";

function makeObservation(
    overrides: Partial<TelemetryObservation> = {},
): TelemetryObservation {
    return {
        id: 1,
        observedAt: "2026-07-11T14:20:00Z",
        lat: 38.8123,
        lon: -77.0931,
        windSpeedMps: 4,
        windDirectionDeg: 315,
        flameLengthM: 2,
        burnTimeS: 40,
        crossingProbability: 0.2,
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
