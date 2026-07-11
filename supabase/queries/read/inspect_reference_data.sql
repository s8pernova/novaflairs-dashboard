-- Read-only inventory of the small reference/configuration tables.
SELECT jsonb_build_object(
    'scenarios', (
        SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.id), '[]'::jsonb)
        FROM public.scenarios AS s
    ),
    'firebreak_segments', (
        SELECT coalesce(jsonb_agg(to_jsonb(f) ORDER BY f.id), '[]'::jsonb)
        FROM public.firebreak_segments AS f
    ),
    'model_runs', (
        SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY m.id), '[]'::jsonb)
        FROM public.model_runs AS m
    )
) AS reference_data;
