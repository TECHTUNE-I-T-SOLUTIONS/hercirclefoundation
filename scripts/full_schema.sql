-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.admin_users (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  full_name text,
  role text DEFAULT 'admin'::text CHECK (role = ANY (ARRAY['admin'::text, 'super_admin'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_users_pkey PRIMARY KEY (id),
  CONSTRAINT admin_users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.volunteers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  skills text,
  availability text,
  motivation text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT volunteers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.donors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  donation_amount numeric,
  donation_type text,
  message text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT donors_pkey PRIMARY KEY (id)
);
CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  date timestamp with time zone NOT NULL,
  location text,
  image_url text,
  event_type text,
  status text DEFAULT 'upcoming'::text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT events_pkey PRIMARY KEY (id),
  CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.gallery (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  media_url text NOT NULL,
  media_type text,
  category text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  media_urls ARRAY,
  CONSTRAINT gallery_pkey PRIMARY KEY (id),
  CONSTRAINT gallery_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  body text,
  reference_id uuid,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id)
);
CREATE TABLE public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  endpoint text NOT NULL,
  p256dh text,
  auth text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.blogs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text,
  content text NOT NULL,
  cover_image text,
  status text NOT NULL DEFAULT 'draft'::text,
  published_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  author_name text,
  featured boolean DEFAULT false,
  tags ARRAY DEFAULT '{}'::text[],
  seo_title text,
  seo_description text,
  schema_type text DEFAULT 'Article'::text,
  reading_time integer,
  CONSTRAINT blogs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.blog_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  blog_id uuid NOT NULL,
  parent_id uuid,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  user_name text,
  CONSTRAINT blog_comments_pkey PRIMARY KEY (id),
  CONSTRAINT blog_comments_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id),
  CONSTRAINT blog_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.blog_comments(id)
);
CREATE TABLE public.blog_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  blog_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'like'::text,
  created_at timestamp with time zone DEFAULT now(),
  user_name text,
  CONSTRAINT blog_reactions_pkey PRIMARY KEY (id),
  CONSTRAINT blog_reactions_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id)
);
CREATE TABLE public.blog_shares (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  blog_id uuid NOT NULL,
  platform text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  user_name text,
  CONSTRAINT blog_shares_pkey PRIMARY KEY (id),
  CONSTRAINT blog_shares_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id)
);
CREATE TABLE public.partner_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  organization text,
  message text,
  status text DEFAULT 'pending'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT partner_requests_pkey PRIMARY KEY (id)
);
CREATE TABLE public.ai_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  age_range text,
  language text DEFAULT 'en'::text,
  email text,
  country text,
  ip_address text,
  user_token text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.ai_chat_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  role text NOT NULL,
  message text NOT NULL,
  timestamp timestamp with time zone DEFAULT now(),
  ip_address text,
  CONSTRAINT ai_chat_history_pkey PRIMARY KEY (id),
  CONSTRAINT ai_chat_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.ai_users(id)
);
CREATE TABLE public.story_themes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT story_themes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.stories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  author_name text,
  author_email text,
  title text,
  content text,
  excerpt text,
  file_url text,
  theme_id uuid,
  status text NOT NULL DEFAULT 'pending'::text,
  approved_by uuid,
  approved_at timestamp with time zone,
  ip_address text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT stories_pkey PRIMARY KEY (id),
  CONSTRAINT stories_theme_id_fkey FOREIGN KEY (theme_id) REFERENCES public.story_themes(id)
);
CREATE TABLE public.story_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL,
  type text NOT NULL,
  user_id uuid,
  ip_address text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT story_reactions_pkey PRIMARY KEY (id),
  CONSTRAINT story_reactions_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id)
);
CREATE TABLE public.survey_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_key text,
  form_id uuid,
  event_type text NOT NULL,
  payload jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT survey_events_pkey PRIMARY KEY (id)
);
CREATE TABLE public.survey_forms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT survey_forms_pkey PRIMARY KEY (id)
);
CREATE TABLE public.survey_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL,
  idx integer NOT NULL DEFAULT 0,
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'text'::text,
  options jsonb,
  conditional jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT survey_questions_pkey PRIMARY KEY (id),
  CONSTRAINT survey_questions_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.survey_forms(id)
);
CREATE TABLE public.survey_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL,
  user_id uuid,
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT survey_responses_pkey PRIMARY KEY (id),
  CONSTRAINT survey_responses_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.survey_forms(id)
);
CREATE TABLE public.survey_answers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL,
  question_id uuid NOT NULL,
  answer_text text,
  answer_json jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT survey_answers_pkey PRIMARY KEY (id),
  CONSTRAINT survey_answers_response_id_fkey FOREIGN KEY (response_id) REFERENCES public.survey_responses(id),
  CONSTRAINT survey_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.survey_questions(id)
);
CREATE TABLE public.survey_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL,
  session_key text NOT NULL,
  shown_count integer NOT NULL DEFAULT 0,
  last_shown_at timestamp with time zone,
  opted_in boolean,
  declined boolean,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT survey_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT survey_sessions_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.survey_forms(id)
);
CREATE TABLE public.contact_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text,
  message text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT contact_messages_pkey PRIMARY KEY (id)
);
CREATE TABLE public.email_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  category text DEFAULT 'marketing'::text,
  subject text NOT NULL DEFAULT ''::text,
  html_body text NOT NULL DEFAULT ''::text,
  text_body text,
  from_key text DEFAULT 'info'::text,
  premium boolean DEFAULT false,
  built_in boolean DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_templates_pkey PRIMARY KEY (id),
  CONSTRAINT email_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.email_campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL,
  html_body text NOT NULL DEFAULT ''::text,
  text_body text,
  audience text NOT NULL DEFAULT 'custom'::text,
  recipient_emails ARRAY DEFAULT '{}'::text[],
  from_key text DEFAULT 'general'::text,
  reply_to text,
  status text DEFAULT 'draft'::text,
  scheduled_at timestamp with time zone,
  sent_at timestamp with time zone,
  recipient_count integer DEFAULT 0,
  success_count integer DEFAULT 0,
  fail_count integer DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_campaigns_pkey PRIMARY KEY (id),
  CONSTRAINT email_campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.email_campaign_recipients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  campaign_id uuid,
  email text NOT NULL,
  name text,
  status text DEFAULT 'pending'::text,
  error text,
  message_id text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_campaign_recipients_pkey PRIMARY KEY (id),
  CONSTRAINT email_campaign_recipients_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.email_campaigns(id)
);
CREATE TABLE public.email_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  to_emails ARRAY DEFAULT ARRAY[]::text[],
  from_address text,
  subject text,
  status text,
  error text,
  message_id text,
  category text,
  campaign_id uuid,
  template_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  to ARRAY DEFAULT ARRAY[]::text[],
  CONSTRAINT email_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.admin_email_preferences (
  id uuid NOT NULL,
  notify_donation boolean DEFAULT true,
  notify_volunteer boolean DEFAULT true,
  notify_partner boolean DEFAULT true,
  notify_contact boolean DEFAULT true,
  notify_event boolean DEFAULT true,
  notify_blog boolean DEFAULT true,
  digest_daily boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_email_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT admin_email_preferences_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.ai_blog_suggestions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  blog_id uuid,
  content_hash text NOT NULL,
  excerpts jsonb NOT NULL,
  tags jsonb NOT NULL,
  seo_titles jsonb NOT NULL,
  seo_descriptions jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  used_at timestamp with time zone,
  model_used text,
  is_applied boolean DEFAULT false,
  CONSTRAINT ai_blog_suggestions_pkey PRIMARY KEY (id),
  CONSTRAINT ai_blog_suggestions_blog_id_fkey FOREIGN KEY (blog_id) REFERENCES public.blogs(id)
);