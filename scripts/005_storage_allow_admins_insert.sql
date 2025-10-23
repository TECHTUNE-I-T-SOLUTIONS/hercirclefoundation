-- Allow inserts into storage.objects for admin users defined in public.admin_users
-- Run this in the Supabase SQL editor.

DO $$
BEGIN
  -- Create policy only if it does not already exist
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies p
    WHERE p.policyname = 'allow_admins_insert'
      AND p.schemaname = 'storage'
      AND p.tablename = 'objects'
  ) THEN
    -- Ensure row level security is enabled (it generally is for storage schema)
    BEGIN
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN undefined_table THEN
      RAISE NOTICE 'storage.objects table not found; ensure you are running this against a Supabase project with Storage enabled.';
    END;

    EXECUTE '
      CREATE POLICY allow_admins_insert ON storage.objects
      FOR INSERT
      USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()))
      WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()))
    ';

    RAISE NOTICE 'Created policy allow_admins_insert on storage.objects';
  ELSE
    RAISE NOTICE 'Policy allow_admins_insert already exists on storage.objects';
  END IF;
END
$$ LANGUAGE plpgsql;
