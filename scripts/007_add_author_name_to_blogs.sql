-- 007_add_author_name_to_blogs.sql
-- Adds optional author_name field to blogs table

-- Add author_name column as nullable (optional)
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS author_name text;

-- Add comment to document the purpose
COMMENT ON COLUMN public.blogs.author_name IS 'Optional display name of the author (used when admin is not the author)';
