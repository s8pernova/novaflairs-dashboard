create table public.prediction_results (
  id serial not null,
  telemetry_observation_id integer not null,
  model_run_id integer not null,
  firebreak_width_m_snapshot double precision not null,
  beta_tx double precision not null,
  crossing_probability double precision not null,
  risk_level public.risk_level_enum not null,
  predicted_crossed_yes_no public.crossing_decision_enum not null,
  computed_at timestamp with time zone not null default now(),
  constraint prediction_results_pkey primary key (id),
  constraint prediction_results_telemetry_observation_id_model_run_id_key unique (telemetry_observation_id, model_run_id),
  constraint prediction_results_model_run_id_fkey foreign KEY (model_run_id) references model_runs (id) on delete CASCADE,
  constraint prediction_results_telemetry_observation_id_fkey foreign KEY (telemetry_observation_id) references telemetry_observations (id) on delete CASCADE,
  constraint prediction_results_crossing_probability_check check (
    (
      (crossing_probability >= (0)::double precision)
      and (crossing_probability <= (1)::double precision)
    )
  ),
  constraint prediction_results_firebreak_width_m_snapshot_check check (
    (
      firebreak_width_m_snapshot > (0)::double precision
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_prediction_results_telemetry_observation_id on public.prediction_results using btree (telemetry_observation_id) TABLESPACE pg_default;

create index IF not exists idx_prediction_results_model_run_id on public.prediction_results using btree (model_run_id) TABLESPACE pg_default;