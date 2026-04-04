BEGIN;

INSERT INTO model_runs (
    method_name,
    model_version,
    equation_name,
    coefficients_json,
    cross_threshold,
    high_risk_threshold,
    severe_risk_threshold,
    notes
)
VALUES (
    'Method 2 Firebreak Crossing',
    'v1',
    'Logistic firebreak crossing probability',
    '{"intercept": -1.8925, "Uw": 0.055, "Lfl": 0.9418, "Wfb": -0.4469, "tc": 0.0114}',
    0.30,
    0.35,
    0.45,
    'Based on notebook method 2 and firebreak paper'
);

COMMIT;