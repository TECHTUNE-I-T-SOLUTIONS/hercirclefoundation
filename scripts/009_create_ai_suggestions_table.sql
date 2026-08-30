-- 009_create_ai_suggestions_table.sql
-- Creates table to store AI-generated suggestions for blog posts

-- AI suggestions table
CREATE TABLE IF NOT EXISTS public.ai_blog_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id uuid REFERENCES public.blogs(id) ON DELETE CASCADE, -- Nullable for unsaved blogs
  content_hash text NOT NULL, -- Hash of the content to identify if suggestions already exist
  excerpts jsonb NOT NULL,
  tags jsonb NOT NULL,
  seo_titles jsonb NOT NULL,
  seo_descriptions jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  used_at timestamptz, -- When these suggestions were actually used
  model_used text, -- Which AI model generated these suggestions
  is_applied boolean DEFAULT false
);

-- Create index on blog_id for quick lookups (include nulls for unsaved blogs)
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_blog_id ON public.ai_blog_suggestions(blog_id);

-- Create index on content_hash for deduplication
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_content_hash ON public.ai_blog_suggestions(content_hash);

-- Create index on used_at for analytics
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_used_at ON public.ai_blog_suggestions(used_at);

-- Add comments
COMMENT ON TABLE public.ai_blog_suggestions IS 'Stores AI-generated content suggestions for blog posts to enable reuse and cost optimization';
COMMENT ON COLUMN public.ai_blog_suggestions.blog_id IS 'Reference to the blog post (nullable for unsaved drafts)';
COMMENT ON COLUMN public.ai_blog_suggestions.content_hash IS 'Hash of the blog content to detect if content has changed';
COMMENT ON COLUMN public.ai_blog_suggestions.excerpts IS 'AI-generated excerpt suggestions';
COMMENT ON COLUMN public.ai_blog_suggestions.tags IS 'AI-generated tag suggestions';
COMMENT ON COLUMN public.ai_blog_suggestions.seo_titles IS 'AI-generated SEO title suggestions';
COMMENT ON COLUMN public.ai_blog_suggestions.seo_descriptions IS 'AI-generated SEO description suggestions';
COMMENT ON COLUMN public.ai_blog_suggestions.used_at IS 'Timestamp when these suggestions were actually applied to a blog';
COMMENT ON COLUMN public.ai_blog_suggestions.model_used IS 'Which AI model generated these suggestions';
COMMENT ON COLUMN public.ai_blog_suggestions.is_applied IS 'Whether these suggestions have been applied to the blog';
