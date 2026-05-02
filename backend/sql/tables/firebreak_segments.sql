create table public.firebreak_segments (
  id serial not null,
  scenario_id integer not null,
  segment_name character varying(255) not null,
  center_lat double precision null,
  center_lon double precision null,
  width_m double precision not null,
  geometry_json jsonb null,
  source_kind public.source_kind_enum not null,
  created_at timestamp with time zone not null default now(),
  notes text null,
  constraint firebreak_segments_pkey primary key (id),
  constraint firebreak_segments_scenario_id_fkey foreign KEY (scenario_id) references scenarios (id) on delete CASCADE,
  constraint firebreak_segments_width_m_check check ((width_m > (0)::double precision))
) TABLESPACE pg_default;

create index IF not exists idx_firebreak_segments_scenario_id on public.firebreak_segments using btree (scenario_id) TABLESPACE pg_default;