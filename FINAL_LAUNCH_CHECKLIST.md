# 🚀 Apex Launch Readiness Checklist (200% Ready)

This checklist covers every critical flow, edge case, and technical requirement to ensure a flawless launch.

## 1. User Authentication & Profile
- [ ] **Signup Flow**: Test fighter, gym, and promotion signups. Ensure role-specific fields appear.
- [ ] **Username Uniqueness**: Verify that choosing an existing username shows a clear "Username already taken" error.
- [ ] **Profile Settings**: 
    - [ ] Update avatar/banner (verify they save and persist).
    - [ ] Update record (e.g., set to 1-2-3).
    - [ ] Link a fighter to a gym (verify the gym profile shows the fighter).
- [ ] **Fighter Stats**: Verify "Last 5" and "Win Streak" update automatically after a bout result is saved.

## 2. Event Management (Promotions)
- [ ] **Create Event**: Create an event with a banner, date, and location.
- [ ] **Bout Creation**: 
    - [ ] Add a bout with two linked fighters (search and select).
    - [ ] Add a bout with "Name only" fighters (no profile link).
- [ ] **Edit Event**: Change bout order and details. Verify changes persist.
- [ ] **Bout Offers**: 
    - [ ] Send an offer to a fighter.
    - [ ] Verify duplicate offers are blocked.
    - [ ] Fighter receives notification and can accept/decline.

## 3. Live Event Flow (The "Manage Live" Page)
- [ ] **Manual Start**: Click "Manage Live Event" -> Click "Start Event".
    - [ ] Verify event is marked `is_live: true`.
    - [ ] Verify Bout #1 is marked `is_live: true`.
- [ ] **Live Scoring**: Test the live scoring interface (if applicable).
- [ ] **Result Saving**: 
    - [ ] Save a result (Win/Loss/Draw).
    - [ ] **CRITICAL**: Verify fighter records update correctly (e.g., 1-2-3 -> 2-2-3 for a win).
    - [ ] Verify "Next Fight" button moves `is_live` to the next bout in sequence.

## 4. Gym & Promotion Profiles
- [ ] **Gym Fighter List**: Verify all fighters who listed the gym in their settings appear here.
- [ ] **Upcoming Events**: Verify the "Fighter Events" section shows all upcoming bouts for linked fighters.
- [ ] **Promotion Events**: Verify all events created by the promotion appear on their profile.

## 5. Social & Engagement
- [ ] **Posting**: 
    - [ ] Post text-only.
    - [ ] Post image-only (verify it works without text).
    - [ ] Post video (verify it plays correctly in the feed).
- [ ] **Interactions**: Like, comment, and share posts.
- [ ] **Follow System**: Follow a fighter/gym/event. Verify notifications are received.

## 6. Notifications
- [ ] **Real-time Alerts**: Verify the bell icon updates for:
    - [ ] New bout offers.
    - [ ] Event going live.
    - [ ] Bout results.
    - [ ] New followers/likes.

## 7. Admin Dashboard
- [ ] **Moderation**: Verify admins can see and delete reported content.
- [ ] **User Management**: 
    - [ ] Delete a profile (verify it's removed from both Auth and Database).
    - [ ] Delete an event.
- [ ] **Featured Events**: Set an event as "Featured" and verify the countdown appears on the home page.

## 8. Mobile Responsiveness (200% Check)
- [ ] **Navigation**: 
    - [ ] Bottom Nav: Home, Search, Messages, Profile.
    - [ ] Burger Menu: Events (only for Gyms/Promotions), Admin (only for Admins).
- [ ] **Layouts**: Check the "Manage Live" and "Edit Event" pages on a mobile screen.
- [ ] **Forms**: Ensure all input fields and dropdowns are easy to tap on mobile.

## 9. Technical & Security
- [ ] **RLS Policies**: Verify that users cannot edit other people's profiles or events via the console.
- [ ] **API Security**: Verify that sensitive operations (like record updates) are handled via secure API routes.
- [ ] **Environment Variables**: Ensure `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, etc., are set for production.

## 10. Final "Smoke Test"
- [ ] **The Full Loop**: Signup -> Create Event -> Add Bouts -> Start Event -> Save Results -> Check Profile Records. If this works end-to-end, you are ready.
