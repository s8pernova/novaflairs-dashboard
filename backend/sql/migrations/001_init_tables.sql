BEGIN;

-- =========================
-- enum types
-- =========================

CREATE TYPE scenario_source_type_enum AS ENUM (
    'simulated',
    'measured',
    'mixed'
);

CREATE TYPE source_kind_enum AS ENUM (
    'simulated',
    'measured',
    'inferred'
);

CREATE TYPE risk_level_enum AS ENUM (
    'moderate',
    'transition',
    'high',
    'severe'
);

CREATE TYPE crossing_decision_enum AS ENUM (
    'YES',
    'NO'
);

-- =========================
-- scenarios
-- =========================

CREATE TABLE scenarios (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    source_type scenario_source_type_enum NOT NULL,
    patent_id VARCHAR(50) NOT NULL DEFAULT 'TOP2-277',
    track VARCHAR(100) NOT NULL DEFAULT 'ORBIT Earth',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT
);

-- =========================
-- firebreak_segments
-- =========================

CREATE TABLE firebreak_segments (
    id SERIAL PRIMARY KEY,
    scenario_id INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
    segment_name VARCHAR(255) NOT NULL,
    center_lat DOUBLE PRECISION,
    center_lon DOUBLE PRECISION,
    width_m DOUBLE PRECISION NOT NULL CHECK (width_m > 0),
    geometry_json JSONB,
    source_kind source_kind_enum NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT
);

-- =========================
-- telemetry_observations
-- =========================

CREATE TABLE telemetry_observations (
    id SERIAL PRIMARY KEY,
    scenario_id INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
    firebreak_segment_id INTEGER REFERENCES firebreak_segments(id) ON DELETE SET NULL,
    drone_id VARCHAR(100) NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL,
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    alt_m DOUBLE PRECISION,
    wind_speed_2m_mps DOUBLE PRECISION NOT NULL CHECK (wind_speed_2m_mps >= 0),
    wind_direction_deg DOUBLE PRECISION CHECK (
        wind_direction_deg IS NULL OR
        (wind_direction_deg >= 0 AND wind_direction_deg < 360)
    ),
    flame_length_m DOUBLE PRECISION NOT NULL CHECK (flame_length_m >= 0),
    burn_time_s DOUBLE PRECISION NOT NULL CHECK (burn_time_s >= 0),
    source_kind source_kind_enum NOT NULL,
    quality_score DOUBLE PRECISION CHECK (
        quality_score IS NULL OR
        (quality_score >= 0 AND quality_score <= 1)
    ),
    raw_payload_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- model_runs
-- =========================

CREATE TABLE model_runs (
    id SERIAL PRIMARY KEY,
    method_name VARCHAR(255) NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    equation_name VARCHAR(255) NOT NULL,
    coefficients_json JSONB NOT NULL,
    cross_threshold DOUBLE PRECISION NOT NULL DEFAULT 0.30,
    high_risk_threshold DOUBLE PRECISION NOT NULL DEFAULT 0.35,
    severe_risk_threshold DOUBLE PRECISION NOT NULL DEFAULT 0.45,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT
);

-- =========================
-- prediction_results
-- =========================

CREATE TABLE prediction_results (
    id SERIAL PRIMARY KEY,
    telemetry_observation_id INTEGER NOT NULL REFERENCES telemetry_observations(id) ON DELETE CASCADE,
    model_run_id INTEGER NOT NULL REFERENCES model_runs(id) ON DELETE CASCADE,
    firebreak_width_m_snapshot DOUBLE PRECISION NOT NULL CHECK (firebreak_width_m_snapshot > 0),
    beta_tx DOUBLE PRECISION NOT NULL,
    crossing_probability DOUBLE PRECISION NOT NULL CHECK (
        crossing_probability >= 0 AND crossing_probability <= 1
    ),
    risk_level risk_level_enum NOT NULL,
    predicted_crossed_yes_no crossing_decision_enum NOT NULL,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (telemetry_observation_id, model_run_id)
);

-- =========================
-- observed_outcomes
-- =========================

CREATE TABLE observed_outcomes (
    id SERIAL PRIMARY KEY,
    telemetry_observation_id INTEGER NOT NULL REFERENCES telemetry_observations(id) ON DELETE CASCADE,
    observed_crossed_yes_no crossing_decision_enum NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL,
    source_kind source_kind_enum NOT NULL,
    notes TEXT
);

-- =========================
-- useful indexes
-- =========================

CREATE INDEX idx_firebreak_segments_scenario_id
    ON firebreak_segments (scenario_id);

CREATE INDEX idx_telemetry_observations_scenario_id
    ON telemetry_observations (scenario_id);

CREATE INDEX idx_telemetry_observations_firebreak_segment_id
    ON telemetry_observations (firebreak_segment_id);

CREATE INDEX idx_telemetry_observations_observed_at
    ON telemetry_observations (observed_at);

CREATE INDEX idx_prediction_results_telemetry_observation_id
    ON prediction_results (telemetry_observation_id);

CREATE INDEX idx_prediction_results_model_run_id
    ON prediction_results (model_run_id);

COMMIT;