-- 010_adapt_blog_triggers_for_public_notifications.sql
--
-- Make blog-related triggers compatible with an existing legacy `public.notifications`
-- table that uses (type, title, body, reference_id) only.
--
-- This script is safe to run multiple times: it adds nullable `user_name` columns
-- for comments/reactions/shares if missing (so frontend can store a display name),
-- and replaces existing trigger functions with versions that insert into the
-- legacy notifications columns (no recipient_id / actor_id / payload).
--
-- IMPORTANT: This only changes DB triggers and columns. To fully support
-- user-facing name caching, update the frontend to collect and persist a
-- `user_name` (e.g. in localStorage) and send it when creating comments,
-- reactions, or shares.

BEGIN;

-- add user_name columns so comments/reactions/shares can carry a display name
ALTER TABLE IF EXISTS public.blog_comments ADD COLUMN IF NOT EXISTS user_name text;
ALTER TABLE IF EXISTS public.blog_reactions ADD COLUMN IF NOT EXISTS user_name text;
ALTER TABLE IF EXISTS public.blog_shares ADD COLUMN IF NOT EXISTS user_name text;

-- If you no longer want to store user_id for unauthenticated actions, drop those columns.
-- WARNING: this will permanently remove any user_id data for comments/reactions/shares.
-- Make a backup before running this in production if you need to preserve user associations.
ALTER TABLE IF EXISTS public.blog_comments DROP COLUMN IF EXISTS user_id;
ALTER TABLE IF EXISTS public.blog_reactions DROP COLUMN IF EXISTS user_id;
ALTER TABLE IF EXISTS public.blog_shares DROP COLUMN IF EXISTS user_id;

-- Drop existing triggers and functions (if present) to replace with legacy-compatible versions
DROP TRIGGER IF EXISTS trg_notify_new_blog ON public.blogs;
DROP FUNCTION IF EXISTS public.notify_on_new_blog();

DROP TRIGGER IF EXISTS trg_notify_new_comment ON public.blog_comments;
DROP FUNCTION IF EXISTS public.notify_on_new_comment();

DROP TRIGGER IF EXISTS trg_notify_new_reaction ON public.blog_reactions;
DROP FUNCTION IF EXISTS public.notify_on_new_reaction();

DROP TRIGGER IF EXISTS trg_notify_new_share ON public.blog_shares;
DROP FUNCTION IF EXISTS public.notify_on_new_share();

-- Create simplified trigger: when a new blog is created, insert a broadcast notification
CREATE OR REPLACE FUNCTION public.notify_on_new_blog() RETURNS trigger AS $$
BEGIN
  -- Insert a broadcast notification (no recipient) using legacy notification cols
  INSERT INTO public.notifications (type, title, body, reference_id)
  VALUES (
    'blog_created',
    COALESCE(NEW.title, 'New blog'),
    'Author: ' || COALESCE(NEW.author_id::text, 'unknown'),
    NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_new_blog AFTER INSERT ON public.blogs
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_blog();

-- Create simplified trigger: when a new comment is created, insert a notification
CREATE OR REPLACE FUNCTION public.notify_on_new_comment() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.notifications (type, title, body, reference_id)
  VALUES (
    'blog_commented',
    'New Comment',
    (CASE WHEN COALESCE(NEW.user_name, '') <> '' THEN NEW.user_name ELSE 'anonymous' END)
      || ': ' || COALESCE(NEW.content, ''),
    NEW.blog_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_new_comment AFTER INSERT ON public.blog_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_comment();

-- Create simplified trigger: when a new reaction is created, insert a notification
CREATE OR REPLACE FUNCTION public.notify_on_new_reaction() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.notifications (type, title, body, reference_id)
  VALUES (
    'blog_reacted',
    'New Reaction',
    (CASE WHEN COALESCE(NEW.user_name, '') <> '' THEN NEW.user_name ELSE 'anonymous' END)
      || ' reacted (' || COALESCE(NEW.type, 'like') || ')',
    NEW.blog_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_new_reaction AFTER INSERT ON public.blog_reactions
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_reaction();

-- Create simplified trigger: when a new share is created, insert a notification
CREATE OR REPLACE FUNCTION public.notify_on_new_share() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.notifications (type, title, body, reference_id)
  VALUES (
    'blog_shared',
    'New Share',
    (CASE WHEN COALESCE(NEW.user_name, '') <> '' THEN NEW.user_name ELSE 'anonymous' END)
      || ' shared on ' || COALESCE(NEW.platform, 'unknown') || COALESCE(' - ' || NEW.metadata::text, ''),
    NEW.blog_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_new_share AFTER INSERT ON public.blog_shares
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_share();

COMMIT;

-- Notes:
-- 1) This preserves the existing legacy `public.notifications` schema (type, title, body, reference_id).
-- 2) It adds nullable `user_name` columns so frontends can supply a display name for unauthenticated users.
-- 3) You still need to update the frontend comment/reaction/share forms to collect and submit `user_name` and to cache the name locally (e.g., in localStorage) so users won't need to retype it.
