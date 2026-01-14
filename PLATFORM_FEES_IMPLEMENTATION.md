# Platform Fees Implementation Summary

## ✅ Implemented: 5% Platform Fees

### 1. Stream Payments - 5% Platform Fee
- **When:** Charged immediately when stream payment is made
- **Calculation:** 5% of `amount_paid`
- **Stored in:** `stream_payments.platform_fee` column
- **Organizer receives:** Revenue - Platform Fee (5%) - Fighter Allocations

### 2. Bout Offer Fees - 5% Platform Fee
- **When:** Charged when a bout offer is **accepted**
- **Calculation:** 5% of `offer_fee` amount
- **Stored in:** `offer_payments.platform_fee` column
- **If declined:** Full refund (no platform fee charged)

---

## Database Changes

### Migration: `add_platform_fees.sql`
- Added `platform_fee` column to `stream_payments` table
- Added `platform_fee` column to `offer_payments` table
- Default value: 0 (for backward compatibility)

**Run this migration in production Supabase before deploying!**

---

## Code Changes

### 1. Platform Fee Utility (`lib/platformFees.ts`)
- `PLATFORM_FEE_PERCENTAGE = 5`
- `calculatePlatformFee(amountCents)` - calculates 5% fee
- `amountAfterPlatformFee(amountCents)` - calculates amount after fee

### 2. Stream Payment Webhook (`app/api/stripe/webhook/route.ts`)
- Calculates and stores platform fee when stream payment is created
- Fee is 5% of `amount_paid`

### 3. Stream Payment Verification (`app/api/stripe/verify-stream-payment/route.ts`)
- Calculates platform fee as fallback if webhook hasn't fired

### 4. Offer Payment Webhook (`app/api/stripe/webhook/route.ts`)
- Sets `platform_fee = 0` initially (charged when accepted)

### 5. Offer Acceptance (`components/events/OfferActions.tsx`)
- When offer is accepted, calculates and updates platform fee (5% of offer_fee)
- Fee is charged only on acceptance, not on payment

### 6. Organizer Earnings API (`app/api/payouts/organizer/earnings/route.ts`)
- Calculates total platform fees across all events
- Organizer share = Revenue - Platform Fees - Fighter Allocations
- Returns `totalPlatformFees` in response

### 7. Organizer Payout Request (`app/api/payouts/organizer/request/route.ts`)
- Validates available balance accounts for platform fees

### 8. Earnings Page UI (`app/earnings/page.tsx`)
- Shows platform fees card for organizers
- Shows platform fee column in earnings breakdown table
- Updated fee disclosure message

### 9. Event Creation/Edit Pages
- Updated revenue split calculation to show 5% platform fee
- Shows: Revenue - Platform Fee (5%) - Fighter Share = Your Share

### 10. Terms of Service (`app/terms/page.tsx`)
- Updated to reflect 5% platform fee on stream revenue
- Added note about 5% fee on offer fees when accepted

---

## Revenue Split Examples

### Stream Payment: $10.00
- Total Revenue: $10.00
- Platform Fee (5%): $0.50
- Stripe Fees: ~$0.59
- Fighter Allocation (20%): $2.00
- **Organizer Receives:** $7.50 (before Stripe fees)

### Offer Fee: $50.00 (when accepted)
- Total Offer Fee: $50.00
- Platform Fee (5%): $2.50
- **Event Organizer Receives:** $47.50

---

## Next Steps

1. **Run Migration:**
   ```sql
   -- Run in Supabase SQL Editor
   -- File: supabase/migrations/add_platform_fees.sql
   ```

2. **Test Platform Fees:**
   - Make a test stream payment
   - Verify platform fee is calculated (5% of payment)
   - Check `stream_payments.platform_fee` column
   - Verify organizer earnings show platform fees deducted

3. **Test Offer Fee Platform Fee:**
   - Send a bout offer with fee
   - Accept the offer
   - Verify platform fee is charged (5% of offer_fee)
   - Check `offer_payments.platform_fee` column

4. **Verify Earnings Display:**
   - Check organizer earnings page shows platform fees
   - Verify revenue split calculations are correct
   - Test payout requests account for platform fees

---

## Important Notes

- **Backward Compatibility:** Existing payments will have `platform_fee = 0`
- **Future Payments:** All new payments will have platform fee calculated
- **Offer Fees:** Platform fee is only charged when offer is **accepted**
- **Transparency:** All fees are clearly displayed in UI and Terms of Service
