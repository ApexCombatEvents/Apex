# Stripe Webhook Testing Guide

## Prerequisites

1. **Stripe CLI installed** (for local testing)
   ```bash
   # Install Stripe CLI
   # macOS: brew install stripe/stripe-cli/stripe
   # Windows: Download from https://github.com/stripe/stripe-cli/releases
   # Linux: See https://stripe.com/docs/stripe-cli
   ```

2. **Your app running locally**
   ```bash
   npm run dev
   ```

3. **Environment variables set**
   - `STRIPE_SECRET_KEY` (use test key: `sk_test_...`)
   - `STRIPE_WEBHOOK_SECRET` (from Stripe CLI or Dashboard)

---

## Method 1: Local Testing with Stripe CLI (Recommended)

### Step 1: Start Stripe CLI Webhook Forwarding

Open a new terminal and run:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

This will:
- Forward webhook events to your local server
- Display a webhook signing secret (starts with `whsec_`)
- Show all webhook events in real-time

**Important:** Copy the `whsec_...` secret and add it to your `.env.local`:
```
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### Step 2: Test Stream Payment Webhook

1. **Create a test event** in another terminal:
   ```bash
   stripe trigger checkout.session.completed
   ```

2. **Or create a real test payment:**
   - Go to your app: `http://localhost:3000`
   - Create an event with streaming enabled
   - Set a stream price (e.g., $10.00)
   - Go to the stream page and attempt to purchase
   - Use Stripe test card: `4242 4242 4242 4242`
   - Use any future expiry date (e.g., 12/34)
   - Use any 3-digit CVC (e.g., 123)
   - Use any ZIP code

3. **Check the Stripe CLI terminal** - You should see:
   ```
   --> checkout.session.completed [evt_xxxxx]
   ```

4. **Check your app logs** - Look for:
   - Webhook received successfully
   - Payment record created in database

### Step 3: Verify Database Records

After a successful payment, check your database:

```sql
-- Check stream payments
SELECT * FROM stream_payments ORDER BY created_at DESC LIMIT 5;

-- Check offer payments (if testing offer fees)
SELECT * FROM offer_payments ORDER BY created_at DESC LIMIT 5;
```

### Step 4: Test Offer Fee Payment Webhook

1. Create an event with a bout that has an `offer_fee` set
2. Try to send an offer for that bout
3. Complete the payment with test card
4. Verify:
   - Offer was created in `event_bout_offers`
   - Payment record in `offer_payments`
   - Notification sent to event owner

---

## Method 2: Production Testing

### Step 1: Set Up Production Webhook

1. Go to Stripe Dashboard → Webhooks
2. Find your webhook endpoint
3. Click on it to view details
4. Copy the "Signing secret" (starts with `whsec_`)
5. Add it to your production environment variables

### Step 2: Test with Stripe Dashboard

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click on your webhook endpoint
3. Click "Send test webhook"
4. Select event: `checkout.session.completed`
5. Click "Send test webhook"

### Step 3: Monitor Webhook Logs

1. In Stripe Dashboard → Webhooks → Your endpoint
2. Click "Recent events" tab
3. You'll see:
   - ✅ Green checkmark = Success (200 response)
   - ❌ Red X = Failed (check error message)

### Step 4: Check Your Application Logs

Look for:
- Webhook received logs
- Database insert confirmations
- Any error messages

---

## What to Verify After Webhook Success

### For Stream Payments (`type: 'stream_access'`)

1. **Check `stream_payments` table:**
   ```sql
   SELECT 
     id,
     event_id,
     user_id,
     amount_paid,
     payment_intent_id,
     created_at
   FROM stream_payments
   ORDER BY created_at DESC
   LIMIT 1;
   ```

2. **Verify user has access:**
   - User should be able to view the stream
   - Check `StreamContent` component grants access

### For Offer Fee Payments (`type: 'offer_fee'`)

1. **Check `offer_payments` table:**
   ```sql
   SELECT 
     id,
     offer_id,
     bout_id,
     payer_profile_id,
     amount_paid,
     payment_status,
     payment_intent_id
   FROM offer_payments
   ORDER BY created_at DESC
   LIMIT 1;
   ```

2. **Check `event_bout_offers` table:**
   ```sql
   SELECT 
     id,
     bout_id,
     side,
     from_profile_id,
     fighter_profile_id,
     status
   FROM event_bout_offers
   ORDER BY created_at DESC
   LIMIT 1;
   ```

3. **Check notifications:**
   ```sql
   SELECT 
     id,
     profile_id,
     type,
     data
   FROM notifications
   WHERE type = 'bout_offer'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

---

## Common Issues & Solutions

### Issue: "Webhook signature verification failed"

**Solution:**
- Make sure `STRIPE_WEBHOOK_SECRET` matches the secret from Stripe CLI or Dashboard
- For local testing, use the secret from `stripe listen` command
- For production, use the secret from Stripe Dashboard

### Issue: "No signature" error

**Solution:**
- Make sure you're sending the webhook to the correct endpoint
- Check that `stripe-signature` header is being sent

### Issue: Payment succeeds but no database record

**Solution:**
- Check application logs for errors
- Verify database connection
- Check RLS policies allow inserts
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly

### Issue: Webhook times out

**Solution:**
- Check your server is running and accessible
- For local testing, make sure `stripe listen` is running
- Check firewall/network settings

---

## Testing Checklist

- [ ] Stripe CLI installed and working
- [ ] Webhook forwarding active (`stripe listen`)
- [ ] `STRIPE_WEBHOOK_SECRET` set in `.env.local`
- [ ] Test stream payment completes successfully
- [ ] `stream_payments` record created
- [ ] User can access stream after payment
- [ ] Test offer fee payment completes successfully
- [ ] `offer_payments` record created
- [ ] `event_bout_offers` record created
- [ ] Notification sent to event owner
- [ ] Production webhook configured
- [ ] Production webhook secret added to environment
- [ ] Production webhook tested successfully

---

## Stripe Test Cards

Use these cards for testing:

**Success:**
- Card: `4242 4242 4242 4242`
- Expiry: Any future date (e.g., 12/34)
- CVC: Any 3 digits (e.g., 123)

**Decline:**
- Card: `4000 0000 0000 0002`
- Expiry: Any future date
- CVC: Any 3 digits

**Requires Authentication (3D Secure):**
- Card: `4000 0025 0000 3155`
- Expiry: Any future date
- CVC: Any 3 digits

---

## Quick Test Commands

```bash
# Start webhook forwarding
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger a test checkout.session.completed event
stripe trigger checkout.session.completed

# View webhook events
stripe events list

# View specific event details
stripe events retrieve evt_xxxxx
```

---

## Next Steps

After successful webhook testing:
1. ✅ Verify all payment flows work
2. ✅ Test with real users (use test mode)
3. ✅ Monitor webhook logs in production
4. ✅ Set up alerts for failed webhooks
5. ✅ Document any custom webhook handling

