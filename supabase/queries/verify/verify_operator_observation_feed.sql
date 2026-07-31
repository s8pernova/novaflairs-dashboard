-- This query is read-only and impersonates the mobile app's anonymous role.
BEGIN;

SET LOCAL ROLE anon;

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

-- Expect: anon, true, then false for every write privilege, true, false,
-- a positive scenario row count, and zero duplicate observations.
WITH duplicate_observations AS (
    SELECT telemetry_observation_id
    FROM public.operator_observation_feed
    GROUP BY telemetry_observation_id
    HAVING COUNT(*) > 1
)
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
        'INSERT, UPDATE, DELETE'
    ) AS can_write_operator_feed,
    has_table_privilege(
        current_user,
        'public.telemetry_observations',
        'INSERT, UPDATE, DELETE'
    ) AS can_write_telemetry,
    has_table_privilege(
        current_user,
        'public.prediction_results',
        'INSERT, UPDATE, DELETE'
    ) AS can_write_predictions,
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
    ) AS can_read_unexposed_prediction_column,
    (
        SELECT COUNT(*)
        FROM public.operator_observation_feed
        WHERE scenario_id = 1
    ) AS scenario_1_row_count,
    (
        SELECT COUNT(*)
        FROM duplicate_observations
    ) AS duplicate_observation_count;

ROLLBACK;
