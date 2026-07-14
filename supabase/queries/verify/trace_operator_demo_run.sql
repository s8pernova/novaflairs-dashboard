-- Read-only trace for the newest Node-RED scenario replay.
WITH latest_run AS (
    SELECT raw_payload_json ->> 'runId' AS run_id
    FROM public.telemetry_observations
    WHERE raw_payload_json ->> 'source' = 'node-red-scenario-engine'
    ORDER BY id DESC
    LIMIT 1
)
SELECT
    telemetry.raw_payload_json ->> 'runId' AS run_id,
    (telemetry.raw_payload_json ->> 'tick')::integer AS tick,
    (telemetry.raw_payload_json ->> 'elapsedSeconds')::integer
        AS elapsed_seconds,
    telemetry.id AS telemetry_observation_id,
    telemetry.observed_at,
    telemetry.lat,
    telemetry.lon,
    telemetry.wind_speed_2m_mps,
    telemetry.wind_direction_deg,
    telemetry.flame_length_m,
    telemetry.burn_time_s,
    prediction.id AS prediction_result_id,
    prediction.crossing_probability,
    prediction.risk_level,
    prediction.predicted_crossed_yes_no,
    feed.telemetry_observation_id IS NOT NULL AS present_in_operator_feed,
    feed.prediction_result_id = prediction.id AS feed_uses_same_prediction
FROM public.telemetry_observations AS telemetry
CROSS JOIN latest_run
LEFT JOIN public.operator_observation_feed AS feed
    ON feed.telemetry_observation_id = telemetry.id
LEFT JOIN public.prediction_results AS prediction
    ON prediction.id = feed.prediction_result_id
WHERE telemetry.raw_payload_json ->> 'runId' = latest_run.run_id
ORDER BY telemetry.id;
