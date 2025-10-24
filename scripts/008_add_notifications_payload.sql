-- Add payload column to notifications if missing so triggers that insert into payload don't fail.
BEGIN;

-- Add the jsonb payload column if it doesn't exist.
ALTER TABLE IF EXISTS public.notifications
ADD COLUMN IF NOT EXISTS payload jsonb;

COMMIT;

-- Note: Run this migration against the database that returned the "column 'payload' does not exist" error.
-- After applying, existing triggers that write to `payload` will succeed. If you want to migrate
-- legacy title/body/reference_id data into payload for existing rows, I can add an UPDATE step,
-- but that should be done only after confirming those columns exist in your DB schema.
