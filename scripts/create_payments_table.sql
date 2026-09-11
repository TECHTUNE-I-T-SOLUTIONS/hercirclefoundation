-- Create payments table for Paystack integration
-- This table stores all Paystack payment metadata and verification details

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  
  -- Payment reference and transaction details
  reference text NOT NULL UNIQUE,
  paystack_transaction_id text,
  amount numeric NOT NULL,
  currency text DEFAULT 'NGN',
  
  -- Payment status
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'abandoned', 'reversed')),
  verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed', 'reversed')),
  
  -- Customer information
  customer_email text,
  customer_name text,
  customer_phone text,
  
  -- Paystack metadata
  metadata jsonb,
  paystack_response jsonb,
  webhook_data jsonb,
  
  -- Link to donor record
  donor_id uuid,
  
  -- Timestamps
  paid_at timestamp with time zone,
  verified_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_donor_id_fkey FOREIGN KEY (donor_id) REFERENCES public.donors(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payments_reference ON public.payments(reference);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_verification_status ON public.payments(verification_status);
CREATE INDEX IF NOT EXISTS idx_payments_donor_id ON public.payments(donor_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_email ON public.payments(customer_email);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create policies for payments table
-- Allow service role to read/write all payments
CREATE POLICY "Service role can read all payments"
  ON public.payments FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert payments"
  ON public.payments FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update payments"
  ON public.payments FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "Service role can delete payments"
  ON public.payments FOR DELETE
  TO service_role
  USING (true);

-- Allow authenticated users to read their own payments
CREATE POLICY "Users can read own payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (customer_email = auth.email());

-- Grant necessary permissions
GRANT ALL ON public.payments TO service_role;
GRANT SELECT ON public.payments TO authenticated;

-- Add comment to table
COMMENT ON TABLE public.payments IS 'Stores Paystack payment transactions with metadata and verification status';
