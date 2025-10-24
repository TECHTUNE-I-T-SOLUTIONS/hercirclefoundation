-- 006_create_blogs_tables.sql
-- Creates blog-related tables and notification triggers

-- Enable pgcrypto for gen_random_uuid
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Blogs table
CREATE TABLE IF NOT EXISTS public.blogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  excerpt text,
  content text NOT NULL,
  cover_image text,
  status text NOT NULL DEFAULT 'draft', -- draft | published | archived
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Comments on blogs
CREATE TABLE IF NOT EXISTS public.blog_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id uuid NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES public.blog_comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Reactions (like, love, etc.)
CREATE TABLE IF NOT EXISTS public.blog_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id uuid NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'like', -- allow arbitrary reaction types
  created_at timestamptz DEFAULT now(),
  UNIQUE (blog_id, user_id, type)
);

-- Shares (external shares metadata)
CREATE TABLE IF NOT EXISTS public.blog_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id uuid NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  platform text, -- e.g., 'facebook', 'twitter', 'whatsapp'
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid, -- who should receive the notification (nullable for broadcast)
  actor_id uuid, -- who caused the event
  type text NOT NULL,
  payload jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Helper function: update updated_at timestamp on blogs
CREATE OR REPLACE FUNCTION public.blogs_updated_at_trigger()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_blogs_updated_at BEFORE UPDATE ON public.blogs
FOR EACH ROW EXECUTE FUNCTION public.blogs_updated_at_trigger();

-- Trigger: when a new blog is created, insert notifications for admins
CREATE OR REPLACE FUNCTION public.notify_on_new_blog()
RETURNS trigger AS $$
DECLARE
  admin_row record;
  payload jsonb;
  has_recipient boolean := false;
  has_actor boolean := false;
  has_payload boolean := false;
BEGIN
  payload = jsonb_build_object('blog_id', NEW.id, 'title', NEW.title, 'author_id', NEW.author_id);

  -- detect notifications schema capabilities
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'recipient_id'
  ) INTO has_recipient;
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'actor_id'
  ) INTO has_actor;
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'payload'
  ) INTO has_payload;

  FOR admin_row IN SELECT id FROM public.admin_users LOOP
    IF has_recipient AND has_actor AND has_payload THEN
      INSERT INTO public.notifications (recipient_id, actor_id, type, payload)
      VALUES (admin_row.id, NEW.author_id, 'blog_created', payload);
    ELSIF has_recipient AND has_actor THEN
      INSERT INTO public.notifications (recipient_id, actor_id, type)
      VALUES (admin_row.id, NEW.author_id, 'blog_created');
    ELSIF has_payload THEN
      INSERT INTO public.notifications (type, payload)
      VALUES ('blog_created', payload);
    ELSE
      INSERT INTO public.notifications (type)
      VALUES ('blog_created');
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_new_blog AFTER INSERT ON public.blogs
FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_blog();

-- Trigger: when a new comment is created, notify the blog author (unless commenter is author)
CREATE OR REPLACE FUNCTION public.notify_on_new_comment()
RETURNS trigger AS $$
DECLARE
  blog_owner uuid;
  payload jsonb;
BEGIN
  SELECT author_id INTO blog_owner FROM public.blogs WHERE id = NEW.blog_id LIMIT 1;
  IF blog_owner IS NULL THEN
    RETURN NEW;
  END IF;

  IF blog_owner = NEW.user_id THEN
    RETURN NEW; -- don't notify author about their own comment
  END IF;

  payload = jsonb_build_object('blog_id', NEW.blog_id, 'comment_id', NEW.id);

  -- detect columns
  DECLARE has_recipient boolean := false; has_actor boolean := false; has_payload boolean := false; BEGIN
    SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='recipient_id') INTO has_recipient;
    SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='actor_id') INTO has_actor;
    SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='payload') INTO has_payload;
    IF has_recipient AND has_actor AND has_payload THEN
      INSERT INTO public.notifications (recipient_id, actor_id, type, payload)
      VALUES (blog_owner, NEW.user_id, 'blog_commented', payload);
    ELSIF has_recipient AND has_actor THEN
      INSERT INTO public.notifications (recipient_id, actor_id, type)
      VALUES (blog_owner, NEW.user_id, 'blog_commented');
    ELSIF has_payload THEN
      INSERT INTO public.notifications (type, payload)
      VALUES ('blog_commented', payload);
    ELSE
      INSERT INTO public.notifications (type)
      VALUES ('blog_commented');
    END IF;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_new_comment AFTER INSERT ON public.blog_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_comment();

-- Trigger: when a new reaction is created, notify the blog author (unless reactor is author)
CREATE OR REPLACE FUNCTION public.notify_on_new_reaction()
RETURNS trigger AS $$
DECLARE
  blog_owner uuid;
  payload jsonb;
BEGIN
  SELECT author_id INTO blog_owner FROM public.blogs WHERE id = NEW.blog_id LIMIT 1;
  IF blog_owner IS NULL THEN
    RETURN NEW;
  END IF;

  IF blog_owner = NEW.user_id THEN
    RETURN NEW;
  END IF;

  payload = jsonb_build_object('blog_id', NEW.blog_id, 'reaction_id', NEW.id, 'type', NEW.type);

  -- detect columns
  DECLARE has_recipient boolean := false; has_actor boolean := false; has_payload boolean := false; BEGIN
    SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='recipient_id') INTO has_recipient;
    SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='actor_id') INTO has_actor;
    SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='payload') INTO has_payload;
    IF has_recipient AND has_actor AND has_payload THEN
      INSERT INTO public.notifications (recipient_id, actor_id, type, payload)
      VALUES (blog_owner, NEW.user_id, 'blog_reacted', payload);
    ELSIF has_recipient AND has_actor THEN
      INSERT INTO public.notifications (recipient_id, actor_id, type)
      VALUES (blog_owner, NEW.user_id, 'blog_reacted');
    ELSIF has_payload THEN
      INSERT INTO public.notifications (type, payload)
      VALUES ('blog_reacted', payload);
    ELSE
      INSERT INTO public.notifications (type)
      VALUES ('blog_reacted');
    END IF;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_new_reaction AFTER INSERT ON public.blog_reactions
FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_reaction();

-- Trigger: when a new share is created, notify the blog author (unless sharer is author)
CREATE OR REPLACE FUNCTION public.notify_on_new_share()
RETURNS trigger AS $$
DECLARE
  blog_owner uuid;
  payload jsonb;
BEGIN
  SELECT author_id INTO blog_owner FROM public.blogs WHERE id = NEW.blog_id LIMIT 1;
  IF blog_owner IS NULL THEN
    RETURN NEW;
  END IF;

  IF blog_owner = NEW.user_id THEN
    RETURN NEW;
  END IF;

  payload = jsonb_build_object('blog_id', NEW.blog_id, 'share_id', NEW.id, 'platform', NEW.platform, 'metadata', NEW.metadata);

  -- detect columns
  DECLARE has_recipient boolean := false; has_actor boolean := false; has_payload boolean := false; BEGIN
    SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='recipient_id') INTO has_recipient;
    SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='actor_id') INTO has_actor;
    SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='notifications' AND column_name='payload') INTO has_payload;
    IF has_recipient AND has_actor AND has_payload THEN
      INSERT INTO public.notifications (recipient_id, actor_id, type, payload)
      VALUES (blog_owner, NEW.user_id, 'blog_shared', payload);
    ELSIF has_recipient AND has_actor THEN
      INSERT INTO public.notifications (recipient_id, actor_id, type)
      VALUES (blog_owner, NEW.user_id, 'blog_shared');
    ELSIF has_payload THEN
      INSERT INTO public.notifications (type, payload)
      VALUES ('blog_shared', payload);
    ELSE
      INSERT INTO public.notifications (type)
      VALUES ('blog_shared');
    END IF;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_new_share AFTER INSERT ON public.blog_shares
FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_share();

-- Optional: grant privileges (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_database_role;

-- End of migration
