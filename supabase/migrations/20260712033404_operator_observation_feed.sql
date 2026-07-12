BEGIN;

-- Prediction rows are readable only when their telemetry observation is also
-- visible to the requesting role. Writes remain unavailable to app clients.
ALTER TABLE public.prediction_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to visible prediction results"
    ON public.prediction_results;

CREATE POLICY "Allow read access to visible prediction results"
    ON public.prediction_results
    FOR SELECT
    TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.telemetry_observations AS telemetry
            WHERE telemetry.id = prediction_results.telemetry_observation_id
        )
    );

REVOKE ALL ON TABLE public.prediction_results FROM anon, authenticated;

GRANT SELECT (
    id,
    telemetry_observation_id,
    model_run_id,
    crossing_probability,
    risk_level,
    predicted_crossed_yes_no,
    computed_at
) ON TABLE public.prediction_results TO anon, authenticated;

CREATE INDEX idx_prediction_results_operator_feed_latest
    ON public.prediction_results (
        telemetry_observation_id,
        computed_at DESC,
        id DESC
    );

CREATE VIEW public.operator_observation_feed
WITH (security_invoker = true)
AS
SELECT
    telemetry.id AS telemetry_observation_id,
    telemetry.scenario_id,
    telemetry.firebreak_segment_id,
    telemetry.drone_id,
    telemetry.observed_at,
    telemetry.lat,
    telemetry.lon,
    telemetry.alt_m,
    telemetry.wind_speed_2m_mps,
    telemetry.wind_direction_deg,
    telemetry.flame_length_m,
    telemetry.burn_time_s,
    telemetry.quality_score,
    latest_prediction.id AS prediction_result_id,
    latest_prediction.model_run_id,
    latest_prediction.crossing_probability,
    latest_prediction.risk_level,
    latest_prediction.predicted_crossed_yes_no,
    latest_prediction.computed_at AS prediction_computed_at
FROM public.telemetry_observations AS telemetry
LEFT JOIN LATERAL (
    SELECT
        prediction.id,
        prediction.model_run_id,
        prediction.crossing_probability,
        prediction.risk_level,
        prediction.predicted_crossed_yes_no,
        prediction.computed_at
    FROM public.prediction_results AS prediction
    WHERE prediction.telemetry_observation_id = telemetry.id
    ORDER BY prediction.computed_at DESC, prediction.id DESC
    LIMIT 1
) AS latest_prediction ON true;

COMMENT ON VIEW public.operator_observation_feed IS
    'Read-only operator feed with each telemetry observation and its latest prediction.';

REVOKE ALL ON TABLE public.operator_observation_feed
    FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.operator_observation_feed
    TO anon, authenticated;

COMMIT;
