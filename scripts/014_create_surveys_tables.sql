-- 014_create_surveys_tables.sql
-- Creates tables for a dynamic survey/interview system

-- NOTE: This migration is safe to re-run in a dev environment: it drops existing survey-related triggers/functions/tables first

-- Drop dependent triggers/functions/tables if they exist (safe in dev/staging). Order matters because of FK constraints.
DROP TRIGGER IF EXISTS trg_notify_survey_response ON public.survey_responses;
DROP FUNCTION IF EXISTS notify_on_new_survey_response();

DROP TRIGGER IF EXISTS trg_survey_forms_updated_at ON public.survey_forms;
DROP TRIGGER IF EXISTS trg_survey_questions_updated_at ON public.survey_questions;
DROP TRIGGER IF EXISTS trg_survey_sessions_updated_at ON public.survey_sessions;
DROP FUNCTION IF EXISTS surveys_update_updated_at();

-- Drop tables (answers -> responses -> sessions -> questions -> forms)
DROP TABLE IF EXISTS public.survey_answers CASCADE;
DROP TABLE IF EXISTS public.survey_responses CASCADE;
DROP TABLE IF EXISTS public.survey_sessions CASCADE;
DROP TABLE IF EXISTS public.survey_questions CASCADE;
DROP TABLE IF EXISTS public.survey_forms CASCADE;

-- Table: survey_forms
create table if not exists public.survey_forms (
  id uuid not null default gen_random_uuid(),
  title text not null,
  description text null,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint survey_forms_pkey primary key (id)
) tablespace pg_default;

-- Table: survey_questions
create table if not exists public.survey_questions (
  id uuid not null default gen_random_uuid(),
  form_id uuid not null references public.survey_forms(id) on delete cascade,
  idx integer not null default 0,
  question_text text not null,
  question_type text not null default 'text', -- text | textarea | radio | checkbox | select | number | date
  options jsonb null, -- for radio/checkbox/select: array of option objects {"value":"...","label":"..."}
  conditional jsonb null, -- optional condition {depends_on: question_id, value: 'some'}
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint survey_questions_pkey primary key (id)
) tablespace pg_default;

-- Table: survey_responses (each submission)
create table if not exists public.survey_responses (
  id uuid not null default gen_random_uuid(),
  form_id uuid not null references public.survey_forms(id) on delete cascade,
  user_id uuid null, -- optional if logged in
  ip_address text null,
  user_agent text null,
  metadata jsonb null, -- store other client metadata
  created_at timestamptz default now(),
  constraint survey_responses_pkey primary key (id)
) tablespace pg_default;

-- Table: survey_answers (individual question answers)
create table if not exists public.survey_answers (
  id uuid not null default gen_random_uuid(),
  response_id uuid not null references public.survey_responses(id) on delete cascade,
  question_id uuid not null references public.survey_questions(id) on delete cascade,
  answer_text text null,
  answer_json jsonb null, -- for structured answers like arrays
  created_at timestamptz default now(),
  constraint survey_answers_pkey primary key (id)
) tablespace pg_default;

-- Table: survey_sessions (tracks popup shown / opt-in/declined)
create table if not exists public.survey_sessions (
  id uuid not null default gen_random_uuid(),
  form_id uuid not null references public.survey_forms(id) on delete cascade,
  session_key text not null, -- a client-generated key (localStorage id) to avoid duplicates
  shown_count integer not null default 0,
  last_shown_at timestamptz null,
  opted_in boolean null,
  declined boolean null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint survey_sessions_pkey primary key (id)
) tablespace pg_default;

-- ensure a session_key is unique per form to avoid duplicate session rows
create unique index if not exists idx_survey_sessions_form_key on survey_sessions(form_id, session_key);

-- Triggers to update updated_at columns
create or replace function surveys_update_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end
$$;

create trigger trg_survey_forms_updated_at
before update on survey_forms
for each row
execute function surveys_update_updated_at();

create trigger trg_survey_questions_updated_at
before update on survey_questions
for each row
execute function surveys_update_updated_at();

create trigger trg_survey_sessions_updated_at
before update on survey_sessions
for each row
execute function surveys_update_updated_at();

-- Trigger: notify admin via notifications table when a new survey response is created
-- Requires that `notifications` table exists (your project already has it)
create or replace function notify_on_new_survey_response() returns trigger language plpgsql as $$
begin
  -- insert a simple notification; customize title/body as you like
  insert into public.notifications (id, type, title, body, reference_id, is_read, created_at)
  values (gen_random_uuid(), 'survey_response', 'New survey response', 'A new survey response was submitted', new.id, false, now());
  return new;
end
$$;

create trigger trg_notify_survey_response
after insert on survey_responses
for each row
execute function notify_on_new_survey_response();

-- Indexes for fast queries
create index if not exists idx_survey_forms_active on survey_forms(is_active);
create index if not exists idx_survey_questions_form on survey_questions(form_id);
create index if not exists idx_survey_responses_form_created on survey_responses(form_id, created_at desc);
create index if not exists idx_survey_sessions_key on survey_sessions(session_key);

-- end of migration
