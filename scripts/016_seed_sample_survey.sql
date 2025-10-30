-- 016_seed_sample_survey.sql
-- Seeds a sample adaptive menstrual health survey (10 questions)

-- Insert form if it doesn't already exist
INSERT INTO public.survey_forms (id, title, description, is_active)
SELECT gen_random_uuid(), 'Menstrual Health Interview (Sample)', 'A short adaptive survey to understand menstrual health experiences', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.survey_forms WHERE title = 'Menstrual Health Interview (Sample)'
);

-- Use the inserted (or existing) form id and insert questions
WITH f AS (
  SELECT id FROM public.survey_forms WHERE title = 'Menstrual Health Interview (Sample)' LIMIT 1
)
INSERT INTO public.survey_questions (form_id, idx, question_text, question_type, options, conditional)
VALUES
((SELECT id FROM f), 1, 'Which age range are you in?', 'radio', '[{"value":"10-14","label":"10-14"},{"value":"15-19","label":"15-19"},{"value":"20-24","label":"20-24"},{"value":"25+","label":"25+"}]'::jsonb, NULL),
((SELECT id FROM f), 2, 'When did you get your first period (approx. age)?', 'number', NULL, NULL),
((SELECT id FROM f), 3, 'Do you have regular menstrual cycles (around the same number of days each month)?', 'radio', '[{"value":"yes","label":"Yes"},{"value":"no","label":"No"}]'::jsonb, NULL),
((SELECT id FROM f), 4, 'How many days does your typical period last?', 'number', NULL, NULL),
((SELECT id FROM f), 5, 'Do you usually experience significant cramps or pain during your period?', 'radio', '[{"value":"yes","label":"Yes"},{"value":"sometimes","label":"Sometimes"},{"value":"no","label":"No"}]'::jsonb, NULL),
((SELECT id FROM f), 6, 'On a scale of 1-10, how severe are your cramps on average?', 'number', NULL, NULL),
((SELECT id FROM f), 7, 'Have you ever discussed menstrual pain with a healthcare professional?', 'radio', '[{"value":"yes","label":"Yes"},{"value":"no","label":"No"}]'::jsonb, NULL),
((SELECT id FROM f), 8, 'Which of these symptoms do you experience around your period? (select all that apply)', 'checkbox', '[{"value":"bloating","label":"Bloating"},{"value":"headache","label":"Headache"},{"value":"nausea","label":"Nausea"},{"value":"mood_swings","label":"Mood swings"},{"value":"heavy_bleeding","label":"Heavy bleeding"}]'::jsonb, NULL),
((SELECT id FROM f), 9, 'What methods do you use to manage menstrual pain or discomfort? (select all that apply)', 'checkbox', '[{"value":"rest","label":"Rest"},{"value":"medication","label":"Medication"},{"value":"heat","label":"Heat pack"},{"value":"exercise","label":"Light exercise"},{"value":"herbal","label":"Herbal remedies"}]'::jsonb, NULL),
((SELECT id FROM f), 10, 'Are you able to access affordable menstrual products when needed?', 'radio', '[{"value":"always","label":"Always"},{"value":"sometimes","label":"Sometimes"},{"value":"never","label":"Never"}]'::jsonb, NULL)
ON CONFLICT DO NOTHING;
