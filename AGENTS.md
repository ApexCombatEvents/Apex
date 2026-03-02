# AGENTS.md

## Cursor Cloud specific instructions

### Overview

**Legacy** (branded "Apex Combat Events") is a combat sports social network and matchmaking platform. It is a single Next.js 14 full-stack app (App Router) backed by Supabase (PostgreSQL, Auth, Storage) and Stripe for payments. There is no test framework configured — all testing is manual.

### Running the app

Standard npm scripts (see `package.json`):
- `npm run dev` — starts the Next.js dev server on port 3000
- `npm run build` — production build
- `npm run lint` — ESLint

### Environment variables

A `.env.local` file is required with these keys (see `README.md` Quick Start):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY` (must be non-empty or `lib/stripe.ts` throws on module load)
- `STRIPE_WEBHOOK_SECRET`

Optional: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (the app has an in-memory fallback rate limiter).

If real credentials are not available, placeholder values allow `npm run dev`, `npm run build`, and `npm run lint` to succeed. Runtime API calls to Supabase/Stripe will fail with fetch errors — this is expected.

### Gotchas

- `lib/stripe.ts` throws at import time if `STRIPE_SECRET_KEY` is empty. Any page or API route that imports this module will crash without the env var set.
- The ESLint config extends `next/core-web-vitals` only. Lint passes with 0 errors (18 `react-hooks/exhaustive-deps` warnings are pre-existing).
- There is no `.env.local.example` file in the repo. Refer to `README.md` for the required keys.
- No automated test runner (jest/vitest/playwright) is configured. Quality verification is manual.
- Protected routes (e.g. `/events`) redirect to `/login` when no Supabase session exists.
- The build produces some expected `DYNAMIC_SERVER_USAGE` warnings for API routes that use `cookies` — these are benign.
