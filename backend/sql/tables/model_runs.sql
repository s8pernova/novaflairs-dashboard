create table public.model_runs (
  id serial not null,
  method_name character varying(255) not null,
  model_version character varying(50) not null,
  equation_name character varying(255) not null,
  coefficients_json jsonb not null,
  cross_threshold double precision not null default 0.30,
  high_risk_threshold double precision not null default 0.35,
  severe_risk_threshold double precision not null default 0.45,
  created_at timestamp with time zone not null default now(),
  notes text null,
  constraint model_runs_pkey primary key (id)
) TABLESPACE pg_default;