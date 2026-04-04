SELECT
    t.id AS telemetry_observation_id,
    t.firebreak_segment_id,
    t.observed_at,
    t.wind_speed_2m_mps,
    t.flame_length_m,
    t.burn_time_s,
    f.width_m AS firebreak_width_m,
    mr.id AS model_run_id,
    mr.cross_threshold,
    mr.high_risk_threshold,
    mr.severe_risk_threshold
FROM telemetry_observations t
JOIN firebreak_segments f
    ON f.id = t.firebreak_segment_id
JOIN model_runs mr
    ON mr.method_name = 'Method 2 Firebreak Crossing'
LEFT JOIN prediction_results p
    ON p.telemetry_observation_id = t.id
   AND p.model_run_id = mr.id
WHERE p.id IS NULL
ORDER BY t.observed_at ASC
LIMIT 25;