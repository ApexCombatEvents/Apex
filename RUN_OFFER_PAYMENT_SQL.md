# SQL Migration for Offer Payment Platform Fee Transfer

Run this SQL in your Supabase SQL Editor to add the `transfer_status` column to track platform fee transfers:

```sql
-- Add transfer_status column to offer_payments table
ALTER TABLE public.offer_payments
ADD COLUMN IF NOT EXISTS transfer_status TEXT DEFAULT NULL CHECK (transfer_status IN ('pending', 'transferred', 'failed'));

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_offer_payments_transfer_status ON public.offer_payments(transfer_status) WHERE transfer_status IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.offer_payments.transfer_status IS 'Status of platform fee transfer: pending, transferred, failed';
```

This migration is safe to run multiple times (uses IF NOT EXISTS).
