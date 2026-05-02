create table public.observed_outcomes (
  id serial not null,
  telemetry_observation_id integer not null,
  observed_crossed_yes_no public.crossing_decision_enum not null,
  observed_at timestamp with time zone not null,
  source_kind public.source_kind_enum not null,
  notes text null,
  constraint observed_outcomes_pkey primary key (id),
  constraint observed_outcomes_telemetry_observation_id_fkey foreign KEY (telemetry_observation_id) references telemetry_observations (id) on delete CASCADE
) TABLESPACE pg_default;