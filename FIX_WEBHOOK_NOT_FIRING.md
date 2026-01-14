# Fix Webhook Not Firing

## Step-by-Step Troubleshooting

### Step 1: Verify Stripe CLI is Running

**Check:**
- Is there a terminal window with `stripe listen` running?
- Does it show "Ready! Your webhook signing secret is whsec_..."?

**If not running:**
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

**Important:** Keep this terminal open and running!

---

### Step 2: Verify Webhook Secret Matches

**Problem:** The secret in `.env.local` doesn't match what Stripe CLI shows.

**Fix:**
1. Look at your Stripe CLI terminal
2. Copy the `whsec_...` secret it shows
3. Open `.env.local` in your project root
4. Make sure it has:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```
   (Use the EXACT secret from Stripe CLI - they must match!)

5. **Restart your dev server:**
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

**Note:** Every time you restart Stripe CLI, you get a NEW secret. Make sure they match!

---

### Step 3: Verify Payment Actually Completed

**Check Stripe Dashboard:**
1. Go to Stripe Dashboard → Payments (Test mode)
2. Find your test payment
3. Make sure it shows "Succeeded" status

**If payment failed:**
- Webhook won't fire for failed payments
- Try again with test card: `4242 4242 4242 4242`

---

### Step 4: Test Webhook Directly

**Use Stripe CLI to trigger a test event:**

1. Open a NEW terminal (keep Stripe CLI running in the other one)
2. Run:
   ```bash
   stripe trigger checkout.session.completed
   ```

3. **Watch your Stripe CLI terminal** - you should see:
   ```
   --> checkout.session.completed [evt_xxxxx]
   <--  [200] POST http://localhost:3000/api/stripe/webhook [evt_xxxxx]
   ```

4. **Watch your dev server terminal** - you should see:
   ```
   ✅ Webhook received: checkout.session.completed evt_xxxxx
   ```

**If this works:** Webhook is configured correctly! The issue is with real payments.

**If this doesn't work:** Continue to Step 5.

---

### Step 5: Check Webhook Endpoint is Accessible

**Test if your endpoint is reachable:**

1. Make sure your dev server is running: `npm run dev`
2. The endpoint should be: `http://localhost:3000/api/stripe/webhook`
3. Stripe CLI should be forwarding to this URL

**Verify:**
- Check Stripe CLI command has correct URL: `--forward-to localhost:3000/api/stripe/webhook`
- Check dev server is running on port 3000
- Try accessing `http://localhost:3000` in browser (should load your app)

---

### Step 6: Check for Errors

**Look for error messages:**

1. **In Stripe CLI terminal:**
   - Any red error messages?
   - Does it say "Failed to forward" or similar?

2. **In dev server terminal:**
   - Any error messages about webhook?
   - "Webhook signature verification failed"?
   - "No signature" errors?

**Common errors and fixes:**

- **"Webhook signature verification failed"**
  → Wrong `STRIPE_WEBHOOK_SECRET` in `.env.local`
  → Fix: Copy exact secret from Stripe CLI, restart dev server

- **"No signature"**
  → Stripe CLI not forwarding correctly
  → Fix: Restart Stripe CLI, make sure URL is correct

- **Connection refused / Failed to forward**
  → Dev server not running
  → Fix: Start dev server with `npm run dev`

---

### Step 7: Complete Reset (If Nothing Works)

**Nuclear option - start fresh:**

1. **Stop everything:**
   - Stop dev server (Ctrl+C)
   - Stop Stripe CLI (Ctrl+C)

2. **Start Stripe CLI:**
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   Copy the new `whsec_...` secret

3. **Update `.env.local`:**
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```
   (Use the NEW secret from step 2)

4. **Start dev server:**
   ```bash
   npm run dev
   ```

5. **Test with trigger:**
   ```bash
   stripe trigger checkout.session.completed
   ```

6. **Check both terminals for webhook events**

---

## Quick Diagnostic Checklist

Run through this checklist:

- [ ] Stripe CLI is running and shows "Ready!"
- [ ] `.env.local` has `STRIPE_WEBHOOK_SECRET` set
- [ ] The secret in `.env.local` matches what Stripe CLI shows
- [ ] Dev server was restarted after adding/updating the secret
- [ ] Dev server is running on `localhost:3000`
- [ ] Payment shows as "Succeeded" in Stripe Dashboard
- [ ] `stripe trigger checkout.session.completed` shows webhook events
- [ ] No error messages in either terminal

---

## Most Common Issue

**90% of the time, it's one of these:**

1. **Secret mismatch** - `.env.local` secret doesn't match Stripe CLI secret
   - **Fix:** Copy exact secret, restart dev server

2. **Dev server not restarted** - Added secret but didn't restart
   - **Fix:** Stop and restart `npm run dev`

3. **Stripe CLI not running** - Forgot to start it or it closed
   - **Fix:** Run `stripe listen --forward-to localhost:3000/api/stripe/webhook`

---

## Still Not Working?

If you've tried everything:

1. Share what you see in Stripe CLI terminal
2. Share what you see in dev server terminal
3. Share any error messages
4. Confirm the secret in `.env.local` matches Stripe CLI
