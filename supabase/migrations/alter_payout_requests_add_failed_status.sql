-- Add 'failed' status to payout_requests
-- This supports displaying Stripe transfer failures in the UI instead of leaving requests stuck in 'pending'.

-- Drop and recreate the status CHECK constraint to include 'failed'
DO $$
BEGIN
  -- Find and drop the existing check constraint if present
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'payout_requests_status_check'
      AND conrelid = 'public.payout_requests'::regclass
  ) THEN
    ALTER TABLE public.payout_requests DROP CONSTRAINT payout_requests_status_check;
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    -- Table might not exist yet in some environments
    NULL;
END $$;

ALTER TABLE public.payout_requests
ADD CONSTRAINT payout_requests_status_check
CHECK (status IN ('pending', 'approved', 'processed', 'rejected', 'cancelled', 'failed'));



