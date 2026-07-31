-- Read-only inventory for baseline reconciliation and migration review.
WITH table_counts AS (
    SELECT 'firebreak_segments' AS relation, count(*) AS row_count
    FROM public.firebreak_segments
    UNION ALL
    SELECT 'model_runs', count(*)
    FROM public.model_runs
    UNION ALL
    SELECT 'observed_outcomes', count(*)
    FROM public.observed_outcomes
    UNION ALL
    SELECT 'prediction_results', count(*)
    FROM public.prediction_results
    UNION ALL
    SELECT 'scenarios', count(*)
    FROM public.scenarios
    UNION ALL
    SELECT 'telemetry_observations', count(*)
    FROM public.telemetry_observations
),
event_triggers AS (
    SELECT
        evtname,
        evtenabled,
        evtfoid::regproc::text AS function_name
    FROM pg_event_trigger
)
SELECT jsonb_build_object(
    'server_version', current_setting('server_version'),
    'table_counts', (
        SELECT jsonb_object_agg(relation, row_count ORDER BY relation)
        FROM table_counts
    ),
    'event_triggers', (
        SELECT jsonb_agg(
            jsonb_build_object(
                'name', evtname,
                'enabled', evtenabled,
                'function', function_name
            )
            ORDER BY evtname
        )
        FROM event_triggers
    )
) AS baseline_state;
