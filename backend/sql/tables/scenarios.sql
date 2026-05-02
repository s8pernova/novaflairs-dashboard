create table public.scenarios (
  id serial not null,
  name character varying(255) not null,
  description text null,
  source_type public.scenario_source_type_enum not null,
  patent_id character varying(50) not null default 'TOP2-277'::character varying,
  track character varying(100) not null default 'ORBIT Earth'::character varying,
  created_at timestamp with time zone not null default now(),
  notes text null,
  constraint scenarios_pkey primary key (id)
) TABLESPACE pg_default;