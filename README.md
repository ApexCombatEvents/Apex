# Legacy-MVP — Combat Sports Social & Matchmaking (Next.js + Supabase)

Purple-themed app with profiles, posts, events, bouts, offers, and streams.

## Features
- Branding: **Legacy** with purple primary theme
- Profiles with banner/avatar, Instagram-style bio, social links
- Fighter/Coach bio fields and display
- Gym & Promotion profiles, events and **bouts** (blue/red; corners can be left open)
- **Only Coaches/Gyms can send offers** (DB-enforced)
- Home feed (follow + posts), Search, Rankings, Stream, Profile
- Supabase SQL schema with **RLS** and **seed data** for disciplines & weight classes
- Demo seed file for quick setup with your own user IDs

## Quick Start
1. Create a Supabase project. Get **Project URL** and **anon** key.
2. Copy `.env.local.example` → `.env.local` and fill keys.
3. Open **Supabase SQL Editor**, paste and run `supabase/schema.sql` (creates tables + seeds disciplines & weight classes).
4. Sign up a few users via the app (`/auth/sign-in`). Then open `supabase/seed.sql`, replace placeholder UUIDs with those users’ IDs, and run it to create demo profiles/events/bouts.
5. Install & run:
   ```bash
   npm install
   npm run dev
   ```
6. Visit `http://localhost:3000`

## Notes
- Add Supabase Storage buckets for `avatars`, `banners`, and `media` to support uploads later; currently fields take URLs.
- To test offers, set your profile `role` to `COACH` or `GYM` in the `profiles` table (or build a role switcher UI).
- Extend `rankings` by inserting rows for your preferred organizations.

Enjoy building your **Legacy** 🟣
