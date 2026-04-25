BEGIN;

-- Allow the frontend Supabase client to read telemetry observations.
-- Writes remain blocked unless a separate policy is added.
ALTER TABLE telemetry_observations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to telemetry observations"
    ON telemetry_observations;

CREATE POLICY "Allow read access to telemetry observations"
    ON telemetry_observations
    FOR SELECT
    TO anon, authenticated
    USING (true);

GRANT SELECT ON telemetry_observations TO anon, authenticated;

COMMIT;
