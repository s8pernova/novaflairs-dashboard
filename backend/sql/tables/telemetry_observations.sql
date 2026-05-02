create table public.telemetry_observations (
  id serial not null,
  scenario_id integer not null,
  firebreak_segment_id integer null,
  drone_id character varying(100) not null,
  observed_at timestamp with time zone not null,
  lat double precision null,
  lon double precision null,
  alt_m double precision null,
  wind_speed_2m_mps double precision not null,
  wind_direction_deg double precision null,
  flame_length_m double precision not null,
  burn_time_s double precision not null,
  source_kind public.source_kind_enum not null,
  quality_score double precision null,
  raw_payload_json jsonb null,
  created_at timestamp with time zone not null default now(),
  constraint telemetry_observations_pkey primary key (id),
  constraint telemetry_observations_scenario_id_fkey foreign KEY (scenario_id) references scenarios (id) on delete CASCADE,
  constraint telemetry_observations_firebreak_segment_id_fkey foreign KEY (firebreak_segment_id) references firebreak_segments (id) on delete set null,
  constraint telemetry_observations_wind_direction_deg_check check (
    (
      (wind_direction_deg is null)
      or (
        (wind_direction_deg >= (0)::double precision)
        and (wind_direction_deg < (360)::double precision)
      )
    )
  ),
  constraint telemetry_observations_burn_time_s_check check ((burn_time_s >= (0)::double precision)),
  constraint telemetry_observations_wind_speed_2m_mps_check check ((wind_speed_2m_mps >= (0)::double precision)),
  constraint telemetry_observations_flame_length_m_check check ((flame_length_m >= (0)::double precision)),
  constraint telemetry_observations_quality_score_check check (
    (
      (quality_score is null)
      or (
        (quality_score >= (0)::double precision)
        and (quality_score <= (1)::double precision)
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_telemetry_observations_scenario_id on public.telemetry_observations using btree (scenario_id) TABLESPACE pg_default;

create index IF not exists idx_telemetry_observations_firebreak_segment_id on public.telemetry_observations using btree (firebreak_segment_id) TABLESPACE pg_default;

create index IF not exists idx_telemetry_observations_observed_at on public.telemetry_observations using btree (observed_at) TABLESPACE pg_default;