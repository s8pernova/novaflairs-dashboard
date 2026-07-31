-- Run after all migrations. This transaction makes no persistent changes.
BEGIN;

SET LOCAL ROLE anon;

SELECT
    has_table_privilege(
        current_user,
        'public.telemetry_observations',
        'SELECT'
    ) AS can_read_telemetry,
    has_table_privilege(
        current_user,
        'public.telemetry_observations',
        'INSERT'
    ) AS can_insert_telemetry,
    has_table_privilege(
        current_user,
        'public.prediction_results',
        'SELECT'
    ) AS can_read_predictions,
    has_table_privilege(
        current_user,
        'public.model_runs',
        'SELECT'
    ) AS can_read_model_runs,
    has_sequence_privilege(
        current_user,
        'public.telemetry_observations_id_seq',
        'USAGE'
    ) AS can_use_telemetry_sequence;

SELECT
    relname,
    relrowsecurity AS rls_enabled
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relname IN (
      'firebreak_segments',
      'model_runs',
      'observed_outcomes',
      'prediction_results',
      'scenarios',
      'telemetry_observations'
  )
ORDER BY relname;

ROLLBACK;
