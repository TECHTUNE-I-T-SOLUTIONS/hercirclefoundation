-- Make the date field nullable in the events table
-- This allows events to be created without a specific date

ALTER TABLE public.events 
ALTER COLUMN date DROP NOT NULL;

-- Optional: Add a comment to document this change
COMMENT ON COLUMN public.events.date IS 'Event date and time - can be null for events with TBD dates';
