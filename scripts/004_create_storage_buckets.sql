-- Create public storage buckets required by the app
-- This script will create a single public bucket named `media` if it does not already exist.
-- NOTE: Run this in the Supabase SQL editor (or via psql connected to your project's DB).

DO $$
DECLARE
  has_create_fn BOOLEAN;
  _b TEXT;
  buckets TEXT[] := ARRAY['media', 'events', 'gallery'];
BEGIN
  -- Check if the storage.create_bucket function exists in the database.
  SELECT EXISTS(
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'create_bucket' AND n.nspname = 'storage'
  ) INTO has_create_fn;

  IF has_create_fn THEN
    FOREACH _b IN ARRAY buckets LOOP
      IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE name = _b) THEN
        PERFORM storage.create_bucket(_b, true);
        RAISE NOTICE 'Created storage bucket: %', _b;
      ELSE
        RAISE NOTICE 'Storage bucket "%" already exists', _b;
      END IF;
    END LOOP;
  ELSE
    -- The storage helper function is not available (this can happen on
    -- standalone Postgres instances or when running locally). In that case
    -- the safest action is to create the buckets using the Supabase
    -- dashboard (Storage → New bucket) or the Supabase CLI.
    RAISE NOTICE 'storage.create_bucket function not found. Please create the following buckets manually in the Supabase dashboard or CLI: %', buckets;
  END IF;
END
$$ LANGUAGE plpgsql;
