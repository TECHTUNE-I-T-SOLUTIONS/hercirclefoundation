-- 011_create_ai_tables_and_search_function.sql
-- Creates ai_users and ai_chat_history tables and a search_blogs function

-- ai_users table
CREATE TABLE IF NOT EXISTS ai_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  age_range text,
  language text DEFAULT 'en',
  email text,
  country text,
  ip_address text,
  user_token text UNIQUE NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION ai_users_updated_at_trigger()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_ai_users_updated_at ON ai_users;
CREATE TRIGGER set_ai_users_updated_at
BEFORE UPDATE ON ai_users
FOR EACH ROW
EXECUTE FUNCTION ai_users_updated_at_trigger();

-- ai_chat_history table
CREATE TABLE IF NOT EXISTS ai_chat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES ai_users(id) ON DELETE SET NULL,
  role text NOT NULL,
  message text NOT NULL,
  timestamp timestamp with time zone DEFAULT now(),
  ip_address text
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_users_user_token ON ai_users(user_token);
CREATE INDEX IF NOT EXISTS idx_ai_chat_history_user_id ON ai_chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_history_timestamp ON ai_chat_history(timestamp DESC);

-- Create a search function that uses full-text search on title, excerpt and content
-- This variant is compatible with your current `blogs` table (which has no `tags` column).
-- The function accepts an array of keywords (text[]) and returns up to 3 matching blogs

CREATE OR REPLACE FUNCTION public.search_blogs(keywords text[])
RETURNS TABLE(id uuid, title text, url text, tags text[])
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT b.id,
         b.title,
         -- build a frontend-friendly url from slug (project uses /blog/<slug>)
         COALESCE('/blog/' || NULLIF(b.slug, ''), '/') AS url,
         -- no tags column in this schema; return empty array
         ARRAY[]::text[] AS tags
  FROM blogs b
  WHERE (
    -- full-text search across title, excerpt and content
    to_tsvector('english', coalesce(b.title,'') || ' ' || coalesce(b.excerpt,'') || ' ' || coalesce(b.content,''))
      @@ plainto_tsquery(array_to_string(keywords, ' '))
  )
  ORDER BY b.created_at DESC
  LIMIT 3;
$$;

-- Grant execute to anon (so public client can call it) — adjust as needed for your security model
GRANT EXECUTE ON FUNCTION public.search_blogs(text[]) TO public;

-- Notes:
-- 1) This function does NOT assume a `tags` column. It performs full-text search on title, excerpt, and content.
-- 2) If you later add a `tags` (text[]) column and want faster tag overlap matching, let me know and
--    I will replace this function with a tags-aware variant that checks `b.tags && keywords` as a first step
--    and falls back to full-text search.
-- 3) If your tags are stored as JSON/JSONB, I can provide a JSONB-aware function variant as well.
