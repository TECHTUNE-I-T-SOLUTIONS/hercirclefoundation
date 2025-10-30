-- 015_create_survey_events.sql
-- Tracks lightweight analytic events for surveys
create table if not exists public.survey_events (
  id uuid not null default gen_random_uuid(),
  session_key text null,
  form_id uuid null,
  event_type text not null,
  payload jsonb null,
  created_at timestamptz default now(),
  constraint survey_events_pkey primary key (id)
) tablespace pg_default;

create index if not exists idx_survey_events_form on survey_events(form_id);
create index if not exists idx_survey_events_session on survey_events(session_key);

