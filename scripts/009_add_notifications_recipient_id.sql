-- Ensure notifications table has recipient_id and actor_id columns
BEGIN;

-- Add recipient_id (who should receive the notification) if missing
ALTER TABLE IF EXISTS public.notifications
ADD COLUMN IF NOT EXISTS recipient_id uuid;

-- Add actor_id (who triggered the event) if missing
ALTER TABLE IF EXISTS public.notifications
ADD COLUMN IF NOT EXISTS actor_id uuid;

COMMIT;

-- Run this migration against the database that returned the "column 'recipient_id' does not exist" error.
