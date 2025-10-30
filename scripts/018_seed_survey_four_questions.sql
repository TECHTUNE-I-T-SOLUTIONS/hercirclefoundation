-- 018_seed_survey_four_questions.sql
-- Seed a short 4-question survey form (menstrual health) with one conditional question

DO $$
DECLARE
  v_form_id uuid;
  q1 uuid;
  q2 uuid;
  q3 uuid;
  q4 uuid;
BEGIN
  SELECT id INTO v_form_id FROM public.survey_forms WHERE title = 'Menstrual Health Snapshot (Short)' LIMIT 1;
  IF v_form_id IS NULL THEN
    INSERT INTO public.survey_forms (id, title, description, is_active)
    VALUES (gen_random_uuid(), 'Menstrual Health Snapshot (Short)', 'A short adaptive survey about menstrual health experiences', true)
    RETURNING id INTO v_form_id;
  END IF;

  -- avoid duplicating questions if they already exist for this form
  IF EXISTS (SELECT 1 FROM public.survey_questions WHERE form_id = v_form_id) THEN
    RAISE NOTICE 'Survey questions already seeded for form %', v_form_id;
    RETURN;
  END IF;

  -- Q1: age range
  INSERT INTO public.survey_questions (form_id, idx, question_text, question_type, options)
  VALUES (v_form_id, 1, 'What is your age range?', 'radio', '[{"value":"under_18","label":"Under 18"},{"value":"18_24","label":"18-24"},{"value":"25_34","label":"25-34"},{"value":"35_plus","label":"35+"}]'::jsonb)
  RETURNING id INTO q1;

  -- Q2: cramps yes/no/sometimes
  INSERT INTO public.survey_questions (form_id, idx, question_text, question_type, options)
  VALUES (v_form_id, 2, 'Do you experience menstrual cramps (pain) during your period?', 'radio', '[{"value":"yes","label":"Yes"},{"value":"sometimes","label":"Sometimes"},{"value":"no","label":"No"}]'::jsonb)
  RETURNING id INTO q2;

  -- Q3: severity (conditional: only if Q2 == 'yes')
  INSERT INTO public.survey_questions (form_id, idx, question_text, question_type, options, conditional)
  VALUES (v_form_id, 3, 'How severe are your cramps on average?', 'radio', '[{"value":"mild","label":"Mild"},{"value":"moderate","label":"Moderate"},{"value":"severe","label":"Severe"}]'::jsonb, jsonb_build_object('depends_on', q2, 'value', 'yes'))
  RETURNING id INTO q3;

  -- Q4: feeling informed
  INSERT INTO public.survey_questions (form_id, idx, question_text, question_type, options)
  VALUES (v_form_id, 4, 'How informed do you feel about menstrual hygiene and management?', 'radio', '[{"value":"very","label":"Very informed"},{"value":"some","label":"Somewhat informed"},{"value":"not_much","label":"Not much"}]'::jsonb)
  RETURNING id INTO q4;

  RAISE NOTICE 'Seeded survey form % with questions %,% ,%,%', v_form_id, q1, q2, q3, q4;
END
$$;
