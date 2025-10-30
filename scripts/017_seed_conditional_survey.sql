-- 017_seed_conditional_survey.sql
-- Seed another survey form with conditionals that demonstrate branching
-- This script inserts a form and its questions in a single statement using CTEs
-- so we can reference newly inserted question IDs in conditionals.

WITH f AS (
  INSERT INTO public.survey_forms (id, title, description, is_active)
  VALUES (gen_random_uuid(), 'Menstrual Health — Conditional Flow Sample', 'Survey that demonstrates conditional questions and branching behavior', true)
  RETURNING id
),
q1 AS (
  INSERT INTO public.survey_questions (id, form_id, idx, question_text, question_type, options, conditional)
  SELECT gen_random_uuid(), f.id, 1,
    'Do you experience period pain (cramps)?',
    'radio',
    ('[{"value":"yes","label":"Yes"},{"value":"no","label":"No"}]')::jsonb,
    NULL
  FROM f
  RETURNING id
),
q2 AS (
  INSERT INTO public.survey_questions (id, form_id, idx, question_text, question_type, options, conditional)
  SELECT gen_random_uuid(), f.id, 2,
    'How severe are your cramps on a scale of 1-10?',
    'number',
    NULL,
    jsonb_build_object('depends_on', q1.id::text, 'value', 'yes')
  FROM f, q1
  RETURNING id
),
q3 AS (
  INSERT INTO public.survey_questions (id, form_id, idx, question_text, question_type, options, conditional)
  SELECT gen_random_uuid(), f.id, 3,
    'Do you use any medications for pain relief?',
    'radio',
    ('[{"value":"yes","label":"Yes"},{"value":"no","label":"No"}]')::jsonb,
    NULL
  FROM f
  RETURNING id
),
q4 AS (
  INSERT INTO public.survey_questions (id, form_id, idx, question_text, question_type, options, conditional)
  SELECT gen_random_uuid(), f.id, 4,
    'Which medications do you use? (comma-separated)',
    'text',
    NULL,
    jsonb_build_object('depends_on', q3.id::text, 'value', 'yes')
  FROM f, q3
  RETURNING id
),
q5 AS (
  INSERT INTO public.survey_questions (id, form_id, idx, question_text, question_type, options, conditional)
  SELECT gen_random_uuid(), f.id, 5,
    'Have you ever missed school or work because of your period?',
    'radio',
    ('[{"value":"yes","label":"Yes"},{"value":"no","label":"No"}]')::jsonb,
    NULL
  FROM f
  RETURNING id
),
q6 AS (
  INSERT INTO public.survey_questions (id, form_id, idx, question_text, question_type, options, conditional)
  SELECT gen_random_uuid(), f.id, 6,
    'If yes, how often do you miss school/work due to your period?',
    'radio',
    ('[{"value":"rarely","label":"Rarely"},{"value":"sometimes","label":"Sometimes"},{"value":"often","label":"Often"}]')::jsonb,
    jsonb_build_object('depends_on', q5.id::text, 'value', 'yes')
  FROM f, q5
  RETURNING id
)

SELECT 'ok' AS result;
