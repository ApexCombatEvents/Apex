# 🚀 Updated Apex Testing Checklist (January 2026)

This checklist combines critical launch requirements, security audits, and new feature verifications (i18n, Stripe, Live Management).

## 1. 🔐 Authentication & Security
- [ ] **Signup Flow**: Test role-specific signups (Fighter, Gym, Promotion, Coach).
- [ ] **Onboarding**: Complete profile setup after signup; verify data persists in `profiles` table.
- [ ] **Middleware Security**: Verify `middleware.ts` uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` (not Service Role).
- [ ] **RLS Policies**: Attempt to edit another user's profile via API/Console (should be denied).
- [ ] **Rate Limiting**: Verify login/signup endpoints are protected against brute force.

## 2. 🌍 Internationalization (i18n)
- [ ] **Locale Switching**: Switch between English (`en`), Spanish (`es`), Portuguese (`pt`), French (`fr`), and German (`de`).
- [ ] **Content Translation**: Ensure no raw translation keys (e.g., `common.save`) are visible.
- [ ] **Date/Currency**: Verify dates and currency formats match the selected locale.

## 3. 🥊 Event & Bout Management
- [ ] **Event Creation**: Upload banner, set date/location, and add description.
- [ ] **Bout Setup**:
    - [ ] Add linked fighters (profile search).
    - [ ] Add "TBC" or "Name Only" fighters.
    - [ ] Set "Looking for Opponent" status.
- [ ] **Bout Offers & Deposits**:
    - [ ] **Send Offer (No Fee)**: Send offer as Gym/Coach for a bout with no `offer_fee`.
    - [ ] **Send Offer (With Deposit)**: 
        - [ ] Click "Send Offer" on a bout requiring a fee.
        - [ ] Complete Stripe Checkout for the deposit.
        - [ ] **Confirmation**: Verify redirect back to Apex with a "Payment Successful" or "Offer Sent" confirmation message.
        - [ ] **Status**: Verify the offer appears in "My Offers" with status `pending`.
    - [ ] **Accept/Decline**: Accept/Decline offer as Promotion and verify notification/refund logic.

## 4. 📺 Live Event Flow (The "Manage Live" Page)
- [ ] **Start Event**: Click "Start Event" and verify `is_live: true` in DB.
- [ ] **Live Scoring**: Update round scores and verify they reflect on the public event page.
- [ ] **Result Processing**:
    - [ ] Save bout result (Winner, Method, Round).
    - [ ] **CRITICAL**: Verify fighter's record (W-L-D) updates automatically.
    - [ ] Verify "Next Fight" correctly transitions the `is_live` status.

## 💳 5. Payments & Stripe Integration
- [ ] **Stream Purchase**: Buy access to a live stream; verify player unlocks.
- [ ] **Featured Events**: Pay for featured status; verify event moves to top of home page.
- [ ] **Stripe Connect**: Complete onboarding for a Fighter/Gym to receive payouts.
- [ ] **Payout Requests**:
    - [ ] Request payout from Earnings page.
    - [ ] Admin: Approve payout and verify Stripe transfer initiation.

## 📱 6. Mobile & UX
- [ ] **Responsive Navigation**: Test bottom navigation bar on mobile devices.
- [ ] **Bout Layout**: Verify "Red vs Blue" layout remains readable on small screens.
- [ ] **Form Accessibility**: Ensure all inputs and date pickers are usable on touch screens.
- [ ] **Empty States**: Verify "No events found" or "No posts yet" messages appear correctly.

## 💬 7. Social & Engagement
- [ ] **Post Creation**: Upload single and multiple images; verify carousel works.
- [ ] **Interactions**: Like/Comment on posts and events; verify counts increment.
- [ ] **Follow System**: Follow a user/event; verify real-time notification in the bell icon.

## 🛡️ 8. Admin & Moderation
- [ ] **Content Moderation**: Report a post; verify it appears in `/admin/moderation`.
- [ ] **User Management**: Admin can ban/unban or delete a user account.
- [ ] **Sponsorships**: Create and activate a sidebar/hero sponsorship banner.

---

## 🏁 The "Golden Path" Smoke Test
1. **Sign up** as a Promotion.
2. **Create** an Event with 2 Bouts.
3. **Accept** a Bout Offer for a registered Fighter.
4. **Start** the Event Live.
5. **Save** a Result (Win for Fighter A).
6. **Verify** Fighter A's profile now shows +1 Win.
7. **Verify** Earnings reflect the fight purse/percentage.

**Last Updated**: January 27, 2026
