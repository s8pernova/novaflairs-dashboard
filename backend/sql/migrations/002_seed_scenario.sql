BEGIN;

INSERT INTO scenarios (name, description, source_type)
VALUES (
  'Brushfire Westline 01',
  'Synthetic demo scenario for Node-RED stream',
  'simulated'
);

INSERT INTO firebreak_segments (
  scenario_id,
  segment_name,
  center_lat,
  center_lon,
  width_m,
  source_kind,
  notes
)
VALUES (
  1,
  'Segment A',
  38.81234,
  -77.09321,
  4.0,
  'simulated',
  'Initial demo segment'
);

COMMIT;