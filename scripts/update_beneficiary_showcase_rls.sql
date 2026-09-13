-- Update RLS policies to allow public read access for beneficiary_showcase
-- Run this in Supabase SQL editor to fix the issue where public page shows no items

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Public can read active beneficiary_showcase" ON public.beneficiary_showcase;

-- Allow public (anonymous) users to read active beneficiary_showcase records
CREATE POLICY "Public can read active beneficiary_showcase"
  ON public.beneficiary_showcase FOR SELECT
  TO anon
  USING (is_active = true);

-- Grant SELECT permission to anon role
GRANT SELECT ON public.beneficiary_showcase TO anon;
