-- Migration: Create error_logs table for tracking
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT,
  stack TEXT,
  component_stack TEXT,
  url TEXT,
  user_agent TEXT,
  severity TEXT DEFAULT 'error',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- No public read/write - only admin client (API) should insert
-- No policies needed if we use service role to insert
