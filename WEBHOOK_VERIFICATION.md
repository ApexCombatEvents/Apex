# Webhook Verification Guide

## How to Check if Your Webhook Worked After a Test Payment

### Step 1: Check Stripe Dashboard

1. **Go to Stripe Dashboard → Developers → Webhooks**
2. **Click on your webhook endpoint** (`vibrant-inspiration`)
3. **Look at the "Event deliveries" section:**
   - If you see a number > 0, the webhook received events
   - Click on the number or graph to see detailed events
4. **Check the "Recent events" tab:**
   - Look for `checkout.session.completed` events
   - ✅ Green checkmark = Success (200 response)
   - ❌ Red X = Failed (check error message)

### Step 2: Check Your Database

Run this query in Supabase SQL Editor:

```sql
-- Check most recent payments
SELECT 
  id as payment_id,
  event_id,
  user_id,
  amount_paid,
  payment_intent_id,
  created_at,
  CASE 
    WHEN amount_paid > 0 THEN CONCAT('$', (amount_paid::numeric / 100)::text)
    ELSE 'Free'
  END AS amount_display,
  CASE 
    WHEN payment_intent_id IS NOT NULL AND payment_intent_id LIKE 'pi_%' THEN '✅ Valid'
    WHEN payment_intent_id IS NULL THEN '⚠️ Missing'
    ELSE '⚠️ Invalid format'
  END AS payment_intent_status
FROM stream_payments
ORDER BY created_at DESC
LIMIT 5;
```

**What to look for:**
- If you see your test payment with a recent `created_at` timestamp, the webhook worked!
- If `payment_intent_status` shows "✅ Valid", everything is correct

### Step 3: Check Application Logs

Look for webhook-related messages in:
- Your server console (if running locally)
- Vercel logs (if deployed)
- Your hosting platform's logs

**Look for:**
- "Webhook received" messages
- Any error messages about webhook processing
- Database insert confirmations

---

## Troubleshooting

### Issue: Event deliveries shows "Total 0" after making a payment

**Possible causes:**

1. **Test Mode vs Live Mode Mismatch**
   - Make sure you're checking the correct mode in Stripe Dashboard
   - If you made a test payment, check the Test mode webhook
   - If you made a live payment, check the Live mode webhook

2. **Webhook Not Configured for the Right Events**
   - Click on your webhook endpoint
   - Click "Show" next to "Listening to: 1 event"
   - Make sure `checkout.session.completed` is selected

3. **Webhook Secret Not Set**
   - Check your production environment variables
   - Make sure `STRIPE_WEBHOOK_SECRET` matches the secret shown in Stripe Dashboard
   - The secret should start with `whsec_`

4. **Payment Didn't Complete**
   - Check Stripe Dashboard → Payments
   - Make sure the payment shows as "Succeeded"
   - If payment failed, the webhook won't fire

5. **Webhook Endpoint Not Accessible**
   - Make sure your production URL is accessible: `https://apexcombatevents.com/api/stripe/webhook`
   - Test the endpoint manually (it should return an error about missing signature, not a 404)

### Issue: Webhook shows as Failed (Red X)

1. **Check the error message:**
   - Click on the failed event in Stripe Dashboard
   - Read the error response
   - Common errors:
     - "Webhook signature verification failed" → Wrong `STRIPE_WEBHOOK_SECRET`
     - "No signature" → Webhook endpoint not receiving headers correctly
     - Timeout → Server not responding fast enough

2. **Check your server logs** for detailed error messages

### Issue: Payment exists but webhook didn't create it

This is actually OK! Your `verify-stream-payment` endpoint has a fallback that creates the payment if the webhook hasn't fired yet. However, you should still fix the webhook for production.

---

## Quick Verification Checklist

After making a test payment:

- [ ] Refresh Stripe Dashboard webhook page
- [ ] Check "Event deliveries" shows > 0
- [ ] Check "Recent events" shows `checkout.session.completed` with ✅
- [ ] Run database query and see your payment record
- [ ] Verify `payment_intent_status` shows "✅ Valid"
- [ ] Check application logs for webhook processing messages

---

## Next Steps

Once webhook is working:
1. ✅ Monitor webhook events regularly
2. ✅ Set up alerts for failed webhooks (in Stripe Dashboard)
3. ✅ Test with different payment scenarios
4. ✅ Document any custom webhook handling
