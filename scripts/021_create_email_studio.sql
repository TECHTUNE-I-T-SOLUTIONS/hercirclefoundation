-- ===========================================================================
-- HerCircle Foundation · Email Studio & Automation (021)
-- Run this in the Supabase SQL editor, or via the terminal command below.
-- Creates: contact_messages, email_templates, email_campaigns,
--          email_campaign_recipients, email_logs, admin_email_preferences + RLS.
-- ===========================================================================

-- 1. contact_messages – stores public contact-form submissions so the Email
--    Studio can target "people who contacted us" and admins can be notified.
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. email_templates — pre-designed reusable templates (marketing + alerts).
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'marketing',
  subject TEXT NOT NULL DEFAULT '',
  html_body TEXT NOT NULL DEFAULT '',
  text_body TEXT,
  from_key TEXT DEFAULT 'info',
  premium BOOLEAN DEFAULT FALSE,
  built_in BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. email_campaigns — drafts / scheduled / sent campaigns from the Studio.
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL DEFAULT '',
  text_body TEXT,
  audience TEXT NOT NULL DEFAULT 'custom',
  recipient_emails TEXT[] DEFAULT '{}',
  from_key TEXT DEFAULT 'general',
  reply_to TEXT,
  status TEXT DEFAULT 'draft',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  recipient_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  fail_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Per-recipient delivery tracking for a campaign.
CREATE TABLE IF NOT EXISTS public.email_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  status TEXT DEFAULT 'pending',
  error TEXT,
  message_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON public.email_campaign_recipients(campaign_id);

-- 4. email_logs — every outbound email for the dashboard delivery report.
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_emails TEXT[] DEFAULT ARRAY[]::text[],
  from_address TEXT,
  subject TEXT,
  status TEXT,
  error TEXT,
  message_id TEXT,
  category TEXT,
  campaign_id UUID,
  template_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON public.email_logs(created_at DESC);

-- 5. admin_email_preferences — per-admin opt-in for automated alert emails.
CREATE TABLE IF NOT EXISTS public.admin_email_preferences (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  notify_donation BOOLEAN DEFAULT TRUE,
  notify_volunteer BOOLEAN DEFAULT TRUE,
  notify_partner BOOLEAN DEFAULT TRUE,
  notify_contact BOOLEAN DEFAULT TRUE,
  notify_event BOOLEAN DEFAULT TRUE,
  notify_blog BOOLEAN DEFAULT TRUE,
  digest_daily BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS — public apps can write contact_messages; the Studio reads & writes via
-- the server-side service-role client, so tables remain private by default.
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_email_preferences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'contact_messages_insert' AND tablename = 'contact_messages') THEN
    CREATE POLICY "contact_messages_insert" ON public.contact_messages FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Notification for new contact messages (mirrors donors/volunteers triggers).
CREATE OR REPLACE FUNCTION public.notify_on_new_contact() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.notifications (type, title, body, reference_id)
  VALUES ('contact', 'New Contact Message', CONCAT(NEW.name, ' — ', COALESCE(NEW.subject, 'No subject')), NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_contact_insert ON public.contact_messages;
CREATE TRIGGER trg_notify_contact_insert AFTER INSERT ON public.contact_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_contact();

-- Reasonable grants
GRANT SELECT ON public.contact_messages TO anon;
GRANT INSERT ON public.contact_messages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_campaign_recipients TO authenticated;
GRANT SELECT ON public.email_logs TO authenticated;