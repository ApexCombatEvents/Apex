# 🔐 Setup Production Environment Variables

**Status:** ⚠️ **CRITICAL** - Must be done before deployment

## 📋 Overview

Environment variables are configuration values that your application needs to run. In production, these must be set in your hosting platform (Vercel, Netlify, Railway, etc.) **before** you deploy your application.

---

## 🎯 Required Environment Variables

Your application requires these environment variables:

### 1. Supabase Configuration (Required)

| Variable Name | Description | Where to Find |
|--------------|-------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key | Supabase Dashboard → Settings → API → Project API keys → `anon` `public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (⚠️ **SECRET** - never expose to client) | Supabase Dashboard → Settings → API → Project API keys → `service_role` `secret` |

### 2. Stripe Configuration (Required for Payments)

| Variable Name | Description | Where to Find |
|--------------|-------------|---------------|
| `STRIPE_SECRET_KEY` | Stripe secret key (⚠️ **SECRET**) | Stripe Dashboard → Developers → API keys → Secret key (use **Live** key for production) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | Stripe Dashboard → Developers → Webhooks → Your webhook → Signing secret (see Step 5) |

---

## 🚀 Step-by-Step Setup

### Step 1: Get Supabase Credentials

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your **production** project
3. Click **Settings** (gear icon) → **API**
4. Copy the following values:

   **Project URL:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   ```

   **anon public key:**
   ```
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

   **service_role secret key:**
   ```
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

   ⚠️ **Security Note:** The `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security (RLS). **Never commit this key to Git or expose it in client-side code.** Only use it in server-side API routes.

---

### Step 2: Get Stripe Credentials

#### 2a. Get Stripe Secret Key (Live Mode)

1. Go to your [Stripe Dashboard](https://dashboard.stripe.com)
2. **Switch to Live Mode** (toggle in top right)
3. Go to **Developers** → **API keys**
4. Copy your **Secret key** (starts with `sk_live_...`)

   ```
   STRIPE_SECRET_KEY=sk_live_xxxxx...
   ```

   ⚠️ **Important:** Use the **Live** key (starts with `sk_live_`) for production, NOT the test key (starts with `sk_test_`).

#### 2b. Get Stripe Webhook Secret (see Step 5)

The webhook secret is created when you set up your webhook endpoint. See Step 5 below.

---

### Step 3: Choose Your Hosting Platform

Set environment variables based on your hosting platform:

---

## 📦 Platform-Specific Instructions

### Option A: Vercel (Recommended for Next.js)

1. **Go to Vercel Dashboard:**
   - Visit [vercel.com](https://vercel.com)
   - Log in and select your project (or create a new one)

2. **Navigate to Project Settings:**
   - Click on your project
   - Go to **Settings** → **Environment Variables**

3. **Add Each Variable:**
   - Click **"Add New"**
   - Enter the variable name (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
   - Enter the value
   - Select environment: **Production** (or **Production, Preview, Development** if you want to use the same values)
   - Click **"Save"**
   - Repeat for each variable

4. **Add All Variables:**
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   STRIPE_SECRET_KEY
   STRIPE_WEBHOOK_SECRET
   ```

5. **Redeploy:**
   - After adding variables, go to **Deployments** tab
   - Click the **"⋯"** menu on the latest deployment
   - Select **"Redeploy"** (or push a new commit to trigger a new deployment)

---

### Option B: Netlify

1. **Go to Netlify Dashboard:**
   - Visit [app.netlify.com](https://app.netlify.com)
   - Select your site

2. **Navigate to Site Settings:**
   - Click **Site configuration** → **Environment variables**

3. **Add Variables:**
   - Click **"Add a variable"**
   - Enter key and value
   - Click **"Add variable"**
   - Repeat for each variable

4. **Redeploy:**
   - Go to **Deploys** tab
   - Click **"Trigger deploy"** → **"Deploy site"**

---

### Option C: Railway

1. **Go to Railway Dashboard:**
   - Visit [railway.app](https://railway.app)
   - Select your project

2. **Open Service Settings:**
   - Click on your service
   - Go to **Variables** tab

3. **Add Variables:**
   - Click **"New Variable"**
   - Enter key and value
   - Click **"Add"**
   - Repeat for each variable

4. **Redeploy:**
   - Railway automatically redeploys when variables are added

---

### Option D: Self-Hosted / VPS

If you're hosting on your own server (DigitalOcean, AWS EC2, etc.):

1. **Create `.env.local` file** in your project root:
   ```bash
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   
   # Stripe
   STRIPE_SECRET_KEY=sk_live_xxxxx...
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx...
   ```

2. **Never commit `.env.local` to Git:**
   - Make sure `.env.local` is in your `.gitignore`
   - Verify: `git check-ignore .env.local` should return the file path

3. **Set file permissions:**
   ```bash
   chmod 600 .env.local  # Only owner can read/write
   ```

4. **Restart your application** to load new environment variables

---

### Option E: Docker / Docker Compose

If using Docker:

1. **Create `.env` file** (or use environment variable files)
2. **Update `docker-compose.yml`:**
   ```yaml
   services:
     app:
       env_file:
         - .env
       # OR use environment: section
       environment:
         - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
         - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
         # ... etc
   ```

3. **Restart containers:**
   ```bash
   docker-compose down
   docker-compose up -d
   ```

---

## 🔔 Step 4: Configure Stripe Webhook (CRITICAL)

Stripe webhooks notify your application when payments are completed. You must set up the webhook **before** going live.

### 4a. Get Your Production Domain

First, deploy your application to get a production URL (e.g., `https://yourapp.vercel.app`).

### 4b. Create Stripe Webhook

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Live Mode**
2. Navigate to **Developers** → **Webhooks**
3. Click **"Add endpoint"**
4. **Endpoint URL:** `https://your-production-domain.com/api/stripe/webhook`
   - Example: `https://yourapp.vercel.app/api/stripe/webhook`
5. **Description:** "Production webhook for payment confirmations"
6. **Events to send:** Select `checkout.session.completed`
7. Click **"Add endpoint"**

### 4c. Copy Webhook Signing Secret

1. After creating the webhook, click on it
2. Find **"Signing secret"** section
3. Click **"Reveal"** and copy the secret (starts with `whsec_...`)
4. Add this to your environment variables as `STRIPE_WEBHOOK_SECRET`

---

## ✅ Step 5: Verification

After setting up all environment variables:

### 5a. Verify Variables Are Set

**For Vercel/Netlify/Railway:**
- Check the Environment Variables section in your dashboard
- All 5 variables should be listed

**For Self-Hosted:**
```bash
# Check if variables are loaded (don't print secrets!)
node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Supabase URL set' : '❌ Missing');"
```

### 5b. Test Connection (After Deployment)

1. Deploy your application
2. Check your application logs for errors
3. Try these critical flows:
   - User signup/login (tests Supabase connection)
   - Upload an image (tests Supabase Storage)
   - Make a test payment (tests Stripe integration)

### 5c. Check Environment Variable Access

**Important:** Environment variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Only use this prefix for variables that are safe to expose (like public API keys).

- ✅ `NEXT_PUBLIC_SUPABASE_URL` - Safe to expose
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Safe to expose (it's public)
- ❌ `SUPABASE_SERVICE_ROLE_KEY` - **NEVER** use `NEXT_PUBLIC_` prefix (server-side only)
- ❌ `STRIPE_SECRET_KEY` - **NEVER** use `NEXT_PUBLIC_` prefix (server-side only)
- ❌ `STRIPE_WEBHOOK_SECRET` - **NEVER** use `NEXT_PUBLIC_` prefix (server-side only)

---

## 🔒 Security Best Practices

1. **Never Commit Secrets:**
   - ❌ Don't commit `.env.local` or `.env` to Git
   - ✅ Add `.env.local` to `.gitignore`
   - ✅ Use platform environment variables for production

2. **Rotate Keys Regularly:**
   - Supabase: Generate new keys in Dashboard → Settings → API
   - Stripe: Regenerate keys in Dashboard → Developers → API keys

3. **Use Different Keys for Dev/Prod:**
   - Use test keys for development
   - Use live keys only for production

4. **Limit Access:**
   - Only give team members access to production environment variables if needed
   - Use separate Supabase projects for dev/staging/production if possible

5. **Monitor for Leaks:**
   - Regularly check Git history for accidentally committed secrets
   - Use tools like `git-secrets` or GitHub secret scanning

---

## 🔍 Troubleshooting

### Issue: "Environment variable not found"

**Solution:**
- Verify the variable name matches exactly (case-sensitive)
- Make sure you redeployed after adding variables
- Check that you're in the correct environment (Production vs Preview)

### Issue: "Invalid API key" (Supabase)

**Solution:**
- Verify you copied the entire key (they're very long)
- Check you're using production keys, not local/dev keys
- Make sure there are no extra spaces or line breaks

### Issue: "Webhook signature verification failed" (Stripe)

**Solution:**
- Verify `STRIPE_WEBHOOK_SECRET` matches the webhook's signing secret
- Check that you're using the correct webhook secret for your environment (test vs live)
- Ensure the webhook endpoint URL matches your production URL

### Issue: Variables not updating after deployment

**Solution:**
- Most platforms require a redeploy to pick up new environment variables
- Clear build cache if available (Vercel → Settings → General → Clear Build Cache)
- Restart your application/server

---

## 📝 Checklist

Before deploying to production:

- [ ] `NEXT_PUBLIC_SUPABASE_URL` set (production Supabase project)
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set (production anon key)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set (production service role key)
- [ ] `STRIPE_SECRET_KEY` set (Stripe **live** secret key - `sk_live_...`)
- [ ] Stripe webhook endpoint created and configured
- [ ] `STRIPE_WEBHOOK_SECRET` set (from Stripe webhook)
- [ ] All variables verified in hosting platform dashboard
- [ ] Application redeployed after setting variables
- [ ] Tested critical flows (signup, upload, payment)

---

## 🚀 Next Steps

After completing environment variable setup:

1. ✅ All environment variables configured
2. ✅ Stripe webhook set up
3. → **Step 4: Test Critical Flows** (verify everything works)
4. → **Step 5: Deploy to Production** (final deployment)

---

## 📞 Need Help?

- **Vercel Docs:** [Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- **Netlify Docs:** [Environment Variables](https://docs.netlify.com/environment-variables/overview/)
- **Supabase Docs:** [Getting Started](https://supabase.com/docs/guides/getting-started)
- **Stripe Docs:** [Webhooks](https://stripe.com/docs/webhooks)

---

## 📌 Quick Reference

### Variable Naming Convention

- `NEXT_PUBLIC_*` = Exposed to browser (client-side)
- No prefix = Server-side only (API routes, server components)

### Where to Find Values

| Variable | Location |
|----------|----------|
| Supabase URL & Keys | Supabase Dashboard → Settings → API |
| Stripe Secret Key | Stripe Dashboard → Developers → API keys (Live mode) |
| Stripe Webhook Secret | Stripe Dashboard → Developers → Webhooks → Your webhook |

### Required for Production

✅ All 5 variables are **required** for full functionality:
- Without Supabase variables: App won't connect to database
- Without Stripe variables: Payment flows won't work
