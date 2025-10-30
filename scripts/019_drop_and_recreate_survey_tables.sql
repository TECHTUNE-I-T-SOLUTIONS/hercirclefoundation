-- 019_drop_and_recreate_survey_tables.sql
-- Safe drop + recreate for survey tables (useful when seed data or schema got messy)

-- Drop triggers first
DROP TRIGGER IF EXISTS trg_notify_survey_response ON public.survey_responses;
DROP FUNCTION IF EXISTS notify_on_new_survey_response();

DROP TRIGGER IF EXISTS trg_survey_forms_updated_at ON public.survey_forms;
DROP TRIGGER IF EXISTS trg_survey_questions_updated_at ON public.survey_questions;
DROP TRIGGER IF EXISTS trg_survey_sessions_updated_at ON public.survey_sessions;
DROP FUNCTION IF EXISTS surveys_update_updated_at();

-- Drop tables in dependency order
DROP TABLE IF EXISTS public.survey_answers CASCADE;
DROP TABLE IF EXISTS public.survey_responses CASCADE;
DROP TABLE IF EXISTS public.survey_sessions CASCADE;
DROP TABLE IF EXISTS public.survey_questions CASCADE;
DROP TABLE IF EXISTS public.survey_forms CASCADE;

-- Re-run 014 to recreate (assumes 014 is correct); alternatively, inline the create statements here.
-- For safety we inline the create statements so this single script is self-contained.

-- Table: survey_forms
create table public.survey_forms (
  id uuid not null default gen_random_uuid(),
  title text not null,
  description text null,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint survey_forms_pkey primary key (id)
) tablespace pg_default;

-- Table: survey_questions
create table public.survey_questions (
  id uuid not null default gen_random_uuid(),
  form_id uuid not null references public.survey_forms(id) on delete cascade,
  idx integer not null default 0,
  question_text text not null,
  question_type text not null default 'text',
  options jsonb null,
  conditional jsonb null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint survey_questions_pkey primary key (id)
) tablespace pg_default;

-- Table: survey_responses
create table public.survey_responses (
  id uuid not null default gen_random_uuid(),
  form_id uuid not null references public.survey_forms(id) on delete cascade,
  user_id uuid null,
  ip_address text null,
  user_agent text null,
  metadata jsonb null,
  created_at timestamptz default now(),
  constraint survey_responses_pkey primary key (id)
) tablespace pg_default;

-- Table: survey_answers
create table public.survey_answers (
  id uuid not null default gen_random_uuid(),
  response_id uuid not null references public.survey_responses(id) on delete cascade,
  question_id uuid not null references public.survey_questions(id) on delete cascade,
  answer_text text null,
  answer_json jsonb null,
  created_at timestamptz default now(),
  constraint survey_answers_pkey primary key (id)
) tablespace pg_default;

-- Table: survey_sessions
create table public.survey_sessions (
  id uuid not null default gen_random_uuid(),
  form_id uuid not null references public.survey_forms(id) on delete cascade,
  session_key text not null,
  shown_count integer not null default 0,
  last_shown_at timestamptz null,
  opted_in boolean null,
  declined boolean null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint survey_sessions_pkey primary key (id)
) tablespace pg_default;

create unique index idx_survey_sessions_form_key on survey_sessions(form_id, session_key);

-- recreate triggers
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

-- create notification trigger (if notifications table exists)
create or replace function notify_on_new_survey_response() returns trigger language plpgsql as $$
begin
  insert into public.notifications (id, type, title, body, reference_id, is_read, created_at)
  values (gen_random_uuid(), 'survey_response', 'New survey response', 'A new survey response was submitted', new.id, false, now());
  return new;
end
$$;

create trigger trg_notify_survey_response
after insert on survey_responses
for each row
execute function notify_on_new_survey_response();

