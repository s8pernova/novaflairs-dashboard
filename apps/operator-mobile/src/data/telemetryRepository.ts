import { supabase } from "@/data/supabaseClient";
import type {
    CrossingDecision,
    TelemetryObservation,
    TelemetryRiskLevel,
} from "@/domain/telemetry";

const FEED_LIMIT = 25;

const FEED_COLUMNS = `
    telemetry_observation_id,
    scenario_id,
    firebreak_segment_id,
    drone_id,
    observed_at,
    lat,
    lon,
    alt_m,
    wind_speed_2m_mps,
    wind_direction_deg,
    flame_length_m,
    burn_time_s,
    quality_score,
    prediction_result_id,
    model_run_id,
    crossing_probability,
    risk_level,
    predicted_crossed_yes_no,
    prediction_computed_at
`;

export interface OperatorObservationFeedRow {
    telemetry_observation_id: number;
    scenario_id: number;
    firebreak_segment_id: number | null;
    drone_id: string;
    observed_at: string;
    lat: number | null;
    lon: number | null;
    alt_m: number | null;
    wind_speed_2m_mps: number;
    wind_direction_deg: number | null;
    flame_length_m: number;
    burn_time_s: number;
    quality_score: number | null;
    prediction_result_id: number | null;
    model_run_id: number | null;
    crossing_probability: number | null;
    risk_level: TelemetryRiskLevel | null;
    predicted_crossed_yes_no: CrossingDecision | null;
    prediction_computed_at: string | null;
}

export function mapOperatorObservation(
    row: OperatorObservationFeedRow,
): TelemetryObservation {
    return {
        id: row.telemetry_observation_id,
        scenarioId: row.scenario_id,
        firebreakSegmentId: row.firebreak_segment_id,
        droneId: row.drone_id,
        observedAt: row.observed_at,
        lat: row.lat,
        lon: row.lon,
        altitudeM: row.alt_m,
        windSpeedMps: row.wind_speed_2m_mps,
        windDirectionDeg: row.wind_direction_deg,
        flameLengthM: row.flame_length_m,
        burnTimeS: row.burn_time_s,
        qualityScore: row.quality_score,
        predictionResultId: row.prediction_result_id,
        modelRunId: row.model_run_id,
        crossingProbability: row.crossing_probability,
        riskLevel: row.risk_level,
        predictedCrossingDecision: row.predicted_crossed_yes_no,
        predictionComputedAt: row.prediction_computed_at,
    };
}

export async function getTelemetryObservations(
    scenarioId: number,
): Promise<TelemetryObservation[]> {
    if (!Number.isInteger(scenarioId) || scenarioId <= 0) {
        throw new Error("scenarioId must be a positive integer.");
    }

    const { data, error } = await supabase
        .from("operator_observation_feed")
        .select(FEED_COLUMNS)
        .eq("scenario_id", scenarioId)
        .order("observed_at", { ascending: false })
        .limit(FEED_LIMIT)
        .overrideTypes<OperatorObservationFeedRow[], { merge: false }>();

    if (error) {
        throw new Error(
            `Unable to load telemetry for scenario ${scenarioId}: ${error.message}`,
        );
    }

    return data.map(mapOperatorObservation);
}
