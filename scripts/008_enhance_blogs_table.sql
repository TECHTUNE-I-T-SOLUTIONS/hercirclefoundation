-- 008_enhance_blogs_table.sql
-- Adds enhanced blog features for comprehensive blog management

-- Add featured flag for highlighting important posts
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS featured boolean DEFAULT false;

-- Add tags for categorization (using text array for simple tag management)
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Add SEO fields for better search engine optimization
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS seo_title text;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS seo_description text;

-- Add schema type for structured data (Article, BlogPosting, etc.)
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS schema_type text DEFAULT 'Article';

-- Add reading time in minutes (optional, can be calculated automatically)
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS reading_time integer;

-- Add comments to document new columns
COMMENT ON COLUMN public.blogs.featured IS 'Whether this blog post should be featured prominently';
COMMENT ON COLUMN public.blogs.tags IS 'Array of tags for categorization and filtering';
COMMENT ON COLUMN public.blogs.seo_title IS 'Custom SEO title (falls back to title if empty)';
COMMENT ON COLUMN public.blogs.seo_description IS 'SEO meta description for search engines';
COMMENT ON COLUMN public.blogs.schema_type IS 'Structured data schema type (Article, BlogPosting, NewsArticle, etc.)';
COMMENT ON COLUMN public.blogs.reading_time IS 'Estimated reading time in minutes';
