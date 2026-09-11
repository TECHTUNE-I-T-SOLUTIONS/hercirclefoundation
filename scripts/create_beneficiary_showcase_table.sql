-- Create beneficiary_showcase table for showcasing beneficiary logos/images
-- This table stores information about beneficiaries and places visited by the foundation

CREATE TABLE IF NOT EXISTS public.beneficiary_showcase (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  
  -- Beneficiary/Place information
  name text NOT NULL,
  description text,
  link text,
  
  -- Image information
  image_url text NOT NULL,
  image_type text DEFAULT 'upload' CHECK (image_type IN ('upload', 'url')),
  
  -- Display settings
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  
  -- Metadata
  metadata jsonb,
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT beneficiary_showcase_pkey PRIMARY KEY (id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_beneficiary_showcase_is_active ON public.beneficiary_showcase(is_active);
CREATE INDEX IF NOT EXISTS idx_beneficiary_showcase_display_order ON public.beneficiary_showcase(display_order);
CREATE INDEX IF NOT EXISTS idx_beneficiary_showcase_created_at ON public.beneficiary_showcase(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.beneficiary_showcase ENABLE ROW LEVEL SECURITY;

-- Create policies for beneficiary_showcase table
-- Allow service role to read/write all beneficiary_showcase records
CREATE POLICY "Service role can read all beneficiary_showcase"
  ON public.beneficiary_showcase FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert beneficiary_showcase"
  ON public.beneficiary_showcase FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update beneficiary_showcase"
  ON public.beneficiary_showcase FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "Service role can delete beneficiary_showcase"
  ON public.beneficiary_showcase FOR DELETE
  TO service_role
  USING (true);

-- Allow authenticated users to read active beneficiary_showcase records
CREATE POLICY "Users can read active beneficiary_showcase"
  ON public.beneficiary_showcase FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Grant necessary permissions
GRANT ALL ON public.beneficiary_showcase TO service_role;
GRANT SELECT ON public.beneficiary_showcase TO authenticated;

-- Add comment to table
COMMENT ON TABLE public.beneficiary_showcase IS 'Stores beneficiary logos and images for circular showcase display';
