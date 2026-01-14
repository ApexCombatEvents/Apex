# Fix Platform Fees Showing $0.00

## Problem
Platform fees are showing $0.00 because existing payments were created before the platform fee logic was implemented. They have `platform_fee = 0` in the database.

## Solution: Backfill Existing Payments

### Step 1: Run the Migration (if not already done)
Run this in Supabase SQL Editor:
```sql
-- File: supabase/migrations/add_platform_fees.sql
ALTER TABLE public.stream_payments
ADD COLUMN IF NOT EXISTS platform_fee INTEGER DEFAULT 0;

ALTER TABLE public.offer_payments
ADD COLUMN IF NOT EXISTS platform_fee INTEGER DEFAULT 0;
```

### Step 2: Backfill Existing Payments
Run this in Supabase SQL Editor to calculate platform fees for all existing payments:
```sql
-- File: supabase/migrations/backfill_existing_platform_fees.sql

-- Update all existing payments to have 5% platform fee
UPDATE public.stream_payments
SET platform_fee = ROUND((amount_paid * 5) / 100)
WHERE platform_fee = 0 
  AND amount_paid > 0;

-- Verify the update
SELECT 
  COUNT(*) as total_payments,
  SUM(platform_fee) as total_platform_fees_cents,
  SUM(amount_paid) as total_revenue_cents,
  CASE 
    WHEN SUM(amount_paid) > 0 
    THEN ROUND(SUM(platform_fee)::numeric / SUM(amount_paid)::numeric * 100, 2)
    ELSE 0
  END as fee_percentage
FROM public.stream_payments
WHERE amount_paid > 0;
```

### Step 3: Verify Results
After running the backfill, refresh your earnings page. You should see:
- **Platform Fees** card showing the correct amount (5% of total revenue)
- **Platform Fee** column in the table showing fees for each event
- **Organizer Share** recalculated correctly (Revenue - Platform Fee - Fighter Share)

## Expected Results

For your current $12.00 total revenue:
- **Platform Fees:** $0.60 (5% of $12.00)
- **Organizer Share:** Should be $10.50 ($12.00 - $0.60 - $0.90 fighter share)

## Note
- New payments will automatically have platform fees calculated
- This backfill only affects existing payments
- The backfill is safe to run multiple times (it only updates records where `platform_fee = 0`)
