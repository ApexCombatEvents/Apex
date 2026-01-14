# Quick Webhook Test Checklist

## Before Testing

- [ ] Stripe CLI is running: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- [ ] Copied `whsec_...` secret from Stripe CLI
- [ ] Added to `.env.local`: `STRIPE_WEBHOOK_SECRET=whsec_...`
- [ ] Restarted dev server: `npm run dev`

## Test Payment

1. Go to `http://localhost:3000`
2. Navigate to event with streaming
3. Purchase with test card: `4242 4242 4242 4242`
4. Complete payment

## Check Results

### ✅ Stripe CLI Terminal Should Show:
```
--> checkout.session.completed [evt_xxxxx]
<--  [200] POST http://localhost:3000/api/stripe/webhook [evt_xxxxx]
```

### ✅ Dev Server Terminal Should Show:
```
✅ Webhook received: checkout.session.completed evt_xxxxx
✅ Webhook: Stream payment created successfully { paymentId: '...', eventId: '...', ... }
```

### ✅ Database Query Should Show:
Run in Supabase SQL Editor:
```sql
SELECT id, event_id, amount_paid, payment_intent_id, created_at
FROM stream_payments
ORDER BY created_at DESC
LIMIT 1;
```

Should see your payment with recent timestamp and valid `payment_intent_id`.

## If Something's Wrong

- **No events in Stripe CLI?** → Check if payment completed in Stripe Dashboard
- **[400] in Stripe CLI?** → Wrong webhook secret, check `.env.local`
- **No logs in dev server?** → Webhook not reaching your server
- **Payment not in database?** → Check server logs for errors
