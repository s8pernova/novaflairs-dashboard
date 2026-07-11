BEGIN;

-- Replace legacy auto-exposure with an explicit Data API contract. Node-RED
-- connects through PostgreSQL credentials and does not depend on client roles.
REVOKE ALL ON TABLE
    public.scenarios,
    public.firebreak_segments,
    public.telemetry_observations,
    public.model_runs,
    public.prediction_results,
    public.observed_outcomes
FROM anon, authenticated;

REVOKE ALL ON SEQUENCE
    public.scenarios_id_seq,
    public.firebreak_segments_id_seq,
    public.telemetry_observations_id_seq,
    public.model_runs_id_seq,
    public.prediction_results_id_seq,
    public.observed_outcomes_id_seq
FROM anon, authenticated;

GRANT SELECT ON TABLE public.telemetry_observations
TO anon, authenticated;

-- The linked project uses this Supabase-managed event-trigger function to
-- enable RLS on new public tables. It does not need to be callable by clients.
-- Some disposable CLI versions may not create the function, so guard the
-- platform-managed object without weakening the application-owned grants.
DO $$
BEGIN
    IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
        EXECUTE 'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() '
            'FROM PUBLIC, anon, authenticated';
    END IF;
END
$$;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL ON TABLES FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL ON SEQUENCES FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

COMMIT;
