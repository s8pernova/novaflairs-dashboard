import {
    getTelemetryObservations,
    mapOperatorObservation,
    type OperatorObservationFeedRow,
} from "@/data/telemetryRepository";

const mockOverrideTypes = jest.fn();
const mockLimit = jest.fn(() => ({ overrideTypes: mockOverrideTypes }));
const mockOrder = jest.fn(() => ({ limit: mockLimit }));
const mockEq = jest.fn(() => ({ order: mockOrder }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn((_table: string) => ({ select: mockSelect }));

jest.mock("@/data/supabaseClient", () => ({
    supabase: { from: (table: string) => mockFrom(table) },
}));

const feedRow: OperatorObservationFeedRow = {
    telemetry_observation_id: 286080,
    scenario_id: 1,
    firebreak_segment_id: 1,
    drone_id: "drone-01",
    observed_at: "2026-07-12T21:24:54.762Z",
    lat: 38.8123574670082,
    lon: -77.0932300282648,
    alt_m: 41.6082581857833,
    wind_speed_2m_mps: 3.01020189169879,
    wind_direction_deg: 217.417322658098,
    flame_length_m: 2.54554506870963,
    burn_time_s: 17.197068202071,
    quality_score: 0.92,
    prediction_result_id: 288810,
    model_run_id: 1,
    crossing_probability: 0.284734227617195,
    risk_level: "transition",
    predicted_crossed_yes_no: "NO",
    prediction_computed_at: "2026-07-12T21:24:56.013669Z",
};

describe("telemetryRepository", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("maps the database contract into the app domain", () => {
        expect(mapOperatorObservation(feedRow)).toEqual({
            id: 286080,
            scenarioId: 1,
            firebreakSegmentId: 1,
            droneId: "drone-01",
            observedAt: "2026-07-12T21:24:54.762Z",
            lat: 38.8123574670082,
            lon: -77.0932300282648,
            altitudeM: 41.6082581857833,
            windSpeedMps: 3.01020189169879,
            windDirectionDeg: 217.417322658098,
            flameLengthM: 2.54554506870963,
            burnTimeS: 17.197068202071,
            qualityScore: 0.92,
            predictionResultId: 288810,
            modelRunId: 1,
            crossingProbability: 0.284734227617195,
            riskLevel: "transition",
            predictedCrossingDecision: "NO",
            predictionComputedAt: "2026-07-12T21:24:56.013669Z",
        });
    });

    it("preserves nullable coordinates and an absent prediction", () => {
        expect(
            mapOperatorObservation({
                ...feedRow,
                lat: null,
                lon: null,
                prediction_result_id: null,
                model_run_id: null,
                crossing_probability: null,
                risk_level: null,
                predicted_crossed_yes_no: null,
                prediction_computed_at: null,
            }),
        ).toEqual({
            ...mapOperatorObservation(feedRow),
            lat: null,
            lon: null,
            predictionResultId: null,
            modelRunId: null,
            crossingProbability: null,
            riskLevel: null,
            predictedCrossingDecision: null,
            predictionComputedAt: null,
        });
    });

    it("queries one bounded scenario and returns mapped observations", async () => {
        mockOverrideTypes.mockResolvedValue({ data: [feedRow], error: null });

        await expect(getTelemetryObservations(1)).resolves.toEqual([
            mapOperatorObservation(feedRow),
        ]);

        expect(mockFrom).toHaveBeenCalledWith("operator_observation_feed");
        expect(mockSelect).toHaveBeenCalledWith(
            expect.stringContaining("telemetry_observation_id"),
        );
        expect(mockSelect).not.toHaveBeenCalledWith("*");
        expect(mockEq).toHaveBeenCalledWith("scenario_id", 1);
        expect(mockOrder).toHaveBeenCalledWith("observed_at", {
            ascending: false,
        });
        expect(mockLimit).toHaveBeenCalledWith(25);
    });

    it("surfaces Supabase errors instead of falling back to mock data", async () => {
        mockOverrideTypes.mockResolvedValue({
            data: null,
            error: { message: "network unavailable" },
        });

        await expect(getTelemetryObservations(1)).rejects.toThrow(
            "Unable to load telemetry for scenario 1: network unavailable",
        );
    });

    it("rejects invalid scenario identifiers before querying", async () => {
        await expect(getTelemetryObservations(0)).rejects.toThrow(
            "scenarioId must be a positive integer.",
        );
        expect(mockFrom).not.toHaveBeenCalled();
    });
});
