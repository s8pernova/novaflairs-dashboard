-- Run after applying 005_operator_observation_feed.sql.
-- This query is read-only and impersonates the mobile app's anonymous role.
BEGIN;

SET LOCAL ROLE anon;

-- Expect: true, false, false, false, true, false.
SELECT
    current_user AS tested_role,
    has_table_privilege(
        current_user,
        'public.operator_observation_feed',
        'SELECT'
    ) AS can_read_operator_feed,
    has_table_privilege(
        current_user,
        'public.operator_observation_feed',
        'INSERT'
    ) AS can_insert_operator_feed,
    has_table_privilege(
        current_user,
        'public.telemetry_observations',
        'INSERT'
    ) AS can_insert_telemetry,
    has_table_privilege(
        current_user,
        'public.prediction_results',
        'INSERT'
    ) AS can_insert_predictions,
    has_column_privilege(
        current_user,
        'public.prediction_results',
        'crossing_probability',
        'SELECT'
    ) AS can_read_exposed_prediction_column,
    has_column_privilege(
        current_user,
        'public.prediction_results',
        'beta_tx',
        'SELECT'
    ) AS can_read_unexposed_prediction_column;

SELECT
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
FROM public.operator_observation_feed
WHERE scenario_id = 1
ORDER BY observed_at DESC
LIMIT 25;

-- Expect no rows: the feed must return at most one prediction per observation.
SELECT
    telemetry_observation_id,
    COUNT(*) AS feed_row_count
FROM public.operator_observation_feed
GROUP BY telemetry_observation_id
HAVING COUNT(*) > 1;

ROLLBACK;
