# Local Webhook Verification Guide

## ✅ Step-by-Step Verification

### Step 1: Verify Stripe CLI is Running

In your terminal where you ran `stripe listen`, you should see:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx (^C to quit)
```

**If you don't see this:**
- Run: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- Copy the `whsec_...` secret that appears

---

### Step 2: Verify Environment Variable is Set

1. Check your `.env.local` file has:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```
   (Use the secret from Stripe CLI, not Dashboard)

2. **Restart your dev server** if you just added it:
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

---

### Step 3: Make a Test Payment

1. Go to `http://localhost:3000`
2. Navigate to an event with streaming enabled
3. Click to purchase stream access
4. Use Stripe test card:
   - **Card:** `4242 4242 4242 4242`
   - **Expiry:** Any future date (e.g., `12/34`)
   - **CVC:** Any 3 digits (e.g., `123`)
   - **ZIP:** Any 5 digits (e.g., `12345`)
5. Complete the payment

---

### Step 4: Check Stripe CLI Terminal

After completing payment, you should see in the Stripe CLI terminal:

```
2024-01-XX XX:XX:XX   --> checkout.session.completed [evt_xxxxx]
2024-01-XX XX:XX:XX  <--  [200] POST http://localhost:3000/api/stripe/webhook [evt_xxxxx]
```

**What to look for:**
- ✅ `--> checkout.session.completed` = Event received
- ✅ `[200]` = Your server responded successfully
- ❌ `[400]` or `[500]` = Error (check your server logs)

---

### Step 5: Check Your Server Logs

In your Next.js dev server terminal, look for:
- ✅ "Webhook received" messages
- ✅ Database insert confirmations
- ❌ Any error messages

**If you see errors:**
- "Webhook signature verification failed" → Wrong `STRIPE_WEBHOOK_SECRET`
- "No signature" → Stripe CLI not forwarding correctly
- Database errors → Check Supabase connection

---

### Step 6: Verify in Database

Run this query in Supabase SQL Editor:

```sql
-- Check most recent payments
SELECT 
  id as payment_id,
  event_id,
  user_id,
  amount_paid,
  payment_intent_id,
  fighter_allocations,
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
- ✅ Your test payment appears with recent `created_at` timestamp
- ✅ `payment_intent_status` shows "✅ Valid"
- ✅ `payment_intent_id` starts with `pi_`
- ✅ `amount_paid` matches what you paid

---

## 🔍 Troubleshooting

### Issue: Stripe CLI shows event but [400] or [500] response

**Check:**
1. Is `STRIPE_WEBHOOK_SECRET` in `.env.local` correct?
2. Did you restart the dev server after adding it?
3. Check server logs for specific error message

**Fix:**
- Verify the secret matches exactly what Stripe CLI shows
- Restart dev server: `npm run dev`

---

### Issue: No events appear in Stripe CLI

**Check:**
1. Is Stripe CLI still running?
2. Did you complete the payment successfully?
3. Check Stripe Dashboard → Payments (test mode) to see if payment succeeded

**Fix:**
- Restart Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- Make sure payment completed (check Stripe Dashboard)

---

### Issue: Payment exists but webhook didn't create it

**This is OK!** Your `verify-stream-payment` endpoint has a fallback that creates the payment if the webhook hasn't fired yet. However, you should still verify the webhook works.

**To test webhook specifically:**
1. Make a new test payment
2. Watch Stripe CLI terminal immediately
3. Check if webhook event appears before payment verification runs

---

### Issue: "Webhook signature verification failed"

**Cause:** Wrong webhook secret

**Fix:**
1. Check Stripe CLI terminal for the current secret
2. Update `.env.local` with the exact secret
3. Restart dev server

**Note:** The secret changes each time you restart Stripe CLI, so make sure they match!

---

## ✅ Success Indicators

You'll know it's working when:

1. ✅ Stripe CLI shows: `--> checkout.session.completed [evt_xxxxx]`
2. ✅ Stripe CLI shows: `<-- [200] POST ... [evt_xxxxx]`
3. ✅ Your server logs show webhook processing
4. ✅ Database query shows your payment with valid `payment_intent_id`
5. ✅ Payment appears immediately (webhook is faster than user callback)

---

## 🎯 Next Steps After Verification

Once webhook is working locally:

1. ✅ Document that it works
2. ✅ When you deploy, switch to Dashboard webhook secret
3. ✅ Test webhook in production after deployment
4. ✅ Set up webhook monitoring/alerts

---

## Quick Test Command

To quickly test if webhook endpoint is accessible:

```bash
# In another terminal, trigger a test event
stripe trigger checkout.session.completed
```

This will send a test event to your local webhook endpoint without making a real payment.
