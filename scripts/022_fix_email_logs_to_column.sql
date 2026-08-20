-- ===========================================================================
-- HerCircle Foundation · Email Studio Repair (022)
-- Fixes the schema mismatch between the app and the `email_logs` table.
-- The app inserts a `to` field, but the previous migration created `to_emails`.
-- This migration adds the missing `to` column, backfills it, and keeps both
-- columns in sync for existing and future rows.
-- ===========================================================================

-- 1. Add the missing `to` column if it does not already exist.
ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS "to" TEXT[] DEFAULT ARRAY[]::text[];

-- 2. Backfill the new column from the legacy `to_emails` column.
UPDATE public.email_logs
SET "to" = COALESCE("to", to_emails, ARRAY[]::text[])
WHERE "to" IS NULL OR cardinality("to") = 0;

-- 3. If older rows have `to_emails` empty but `to` populated later, mirror it.
UPDATE public.email_logs
SET to_emails = COALESCE(to_emails, "to", ARRAY[]::text[])
WHERE to_emails IS NULL OR cardinality(to_emails) = 0;

-- 4. Keep both columns synchronized for future inserts/updates.
CREATE OR REPLACE FUNCTION public.sync_email_logs_to_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."to" IS NULL AND NEW.to_emails IS NOT NULL THEN
    NEW."to" := NEW.to_emails;
  ELSIF NEW.to_emails IS NULL AND NEW."to" IS NOT NULL THEN
    NEW.to_emails := NEW."to";
  END IF;

  IF NEW."to" IS NULL THEN
    NEW."to" := ARRAY[]::text[];
  END IF;

  IF NEW.to_emails IS NULL THEN
    NEW.to_emails := ARRAY[]::text[];
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_email_logs_to_columns ON public.email_logs;
CREATE TRIGGER trg_sync_email_logs_to_columns
BEFORE INSERT OR UPDATE ON public.email_logs
FOR EACH ROW
EXECUTE FUNCTION public.sync_email_logs_to_columns();

