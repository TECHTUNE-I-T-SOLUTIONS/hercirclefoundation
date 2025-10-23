-- Add media_urls column to gallery (text[]), and migrate existing media_url values into it
ALTER TABLE IF EXISTS public.gallery
  ADD COLUMN IF NOT EXISTS media_urls text[];

-- Migrate existing rows: if media_urls is null and media_url is set, set media_urls = ARRAY[media_url]
UPDATE public.gallery
SET media_urls = ARRAY[media_url]
WHERE media_urls IS NULL AND media_url IS NOT NULL;

-- Optionally keep media_url for backward compatibility
-- You can DROP media_url later if you want to fully migrate to media_urls

-- Give an index for querying categories by media_urls presence if desired
CREATE INDEX IF NOT EXISTS idx_gallery_media_urls ON public.gallery USING GIN (media_urls);
