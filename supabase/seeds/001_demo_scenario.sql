-- Disposable local fixture for the Node-RED telemetry generator.
INSERT INTO public.scenarios (
    id,
    name,
    description,
    source_type,
    patent_id,
    track,
    notes
)
VALUES (
    1,
    'Brushfire Westline 01',
    'Synthetic demo scenario for Node-RED stream',
    'simulated',
    'TOP2-277',
    'ORBIT Earth',
    NULL
)
ON CONFLICT (id) DO UPDATE
SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    source_type = EXCLUDED.source_type,
    patent_id = EXCLUDED.patent_id,
    track = EXCLUDED.track,
    notes = EXCLUDED.notes;

INSERT INTO public.firebreak_segments (
    id,
    scenario_id,
    segment_name,
    center_lat,
    center_lon,
    width_m,
    geometry_json,
    source_kind,
    notes
)
VALUES (
    1,
    1,
    'Segment A',
    38.81234,
    -77.09321,
    4.0,
    NULL,
    'simulated',
    'Initial demo segment'
)
ON CONFLICT (id) DO UPDATE
SET
    scenario_id = EXCLUDED.scenario_id,
    segment_name = EXCLUDED.segment_name,
    center_lat = EXCLUDED.center_lat,
    center_lon = EXCLUDED.center_lon,
    width_m = EXCLUDED.width_m,
    geometry_json = EXCLUDED.geometry_json,
    source_kind = EXCLUDED.source_kind,
    notes = EXCLUDED.notes;

SELECT setval(
    pg_get_serial_sequence('public.scenarios', 'id'),
    greatest((SELECT max(id) FROM public.scenarios), 1),
    true
);

SELECT setval(
    pg_get_serial_sequence('public.firebreak_segments', 'id'),
    greatest((SELECT max(id) FROM public.firebreak_segments), 1),
    true
);
