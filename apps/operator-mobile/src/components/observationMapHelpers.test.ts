import {
    getInitialRegion,
    getMarkerColor,
    getMarkerDiameter,
    getWindEndpoint,
    isPositionedObservation,
    type PositionedObservation,
} from "@/components/observationMapHelpers";
import type { TelemetryObservation } from "@/domain/telemetry";
import { colors } from "@/theme/tokens";

const observation: TelemetryObservation = {
    id: 1,
    scenarioId: 1,
    firebreakSegmentId: 1,
    droneId: "drone-01",
    observedAt: "2026-07-14T03:00:00Z",
    lat: 38.8123,
    lon: -77.0931,
    altitudeM: 42,
    windSpeedMps: 6,
    windDirectionDeg: 0,
    flameLengthM: 2,
    burnTimeS: 40,
    qualityScore: 0.92,
    predictionResultId: 101,
    modelRunId: 1,
    crossingProbability: 0.28,
    riskLevel: "transition",
    predictedCrossingDecision: "NO",
    predictionComputedAt: "2026-07-14T03:00:01Z",
};

describe("observation map helpers", () => {
    it("filters observations that have both coordinates", () => {
        expect(isPositionedObservation(observation)).toBe(true);
        expect(
            isPositionedObservation({ ...observation, lat: null }),
        ).toBe(false);
    });

    it("maps model risk levels to shared colors", () => {
        expect(getMarkerColor("moderate")).toBe(colors.riskLow);
        expect(getMarkerColor("transition")).toBe(colors.riskElevated);
        expect(getMarkerColor("high")).toBe(colors.riskHigh);
        expect(getMarkerColor("severe")).toBe(colors.riskHigh);
        expect(getMarkerColor(null)).toBe(colors.riskUnknown);
    });

    it("keeps marker sizes within a conservative fixed range", () => {
        expect(getMarkerDiameter(-1)).toBe(16);
        expect(getMarkerDiameter(2)).toBe(20);
        expect(getMarkerDiameter(20)).toBe(28);
    });

    it("derives a padded region from the returned coordinates", () => {
        const region = getInitialRegion([
            { latitude: 38.81, longitude: -77.1 },
            { latitude: 38.82, longitude: -77.08 },
        ]);

        expect(region?.latitude).toBeCloseTo(38.815);
        expect(region?.longitude).toBeCloseTo(-77.09);
        expect(region?.latitudeDelta).toBeCloseTo(0.015);
        expect(region?.longitudeDelta).toBeCloseTo(0.03);
        expect(getInitialRegion([])).toBeNull();
    });

    it("points wind vectors downwind from meteorological direction", () => {
        const endpoint = getWindEndpoint(
            observation as PositionedObservation,
        );

        expect(endpoint.latitude).toBeLessThan(observation.lat as number);
        expect(endpoint.longitude).toBeCloseTo(observation.lon as number, 6);
    });
});
