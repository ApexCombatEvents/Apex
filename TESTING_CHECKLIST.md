# Complete Testing Checklist for Apex Combat Events

## Table of Contents
1. [Authentication & Onboarding](#authentication--onboarding)
2. [Profile Management](#profile-management)
3. [Events Management](#events-management)
4. [Bouts Management](#bouts-management)
5. [Posts & Social Feed](#posts--social-feed)
6. [Messages](#messages)
7. [Notifications](#notifications)
8. [Payments & Payouts](#payments--payouts)
9. [Search & Discovery](#search--discovery)
10. [Follow System](#follow-system)
11. [Moderation](#moderation)
12. [Settings](#settings)
13. [Admin Features](#admin-features)
14. [Mobile Responsiveness](#mobile-responsiveness)

---

## Authentication & Onboarding

### Sign Up
- [ ] Navigate to `/signup`
- [ ] Fill in email and password
- [ ] Submit form → Should redirect to onboarding
- [ ] Try signing up with existing email → Should show error
- [ ] Try weak password → Should show validation error

### Login
- [ ] Navigate to `/login`
- [ ] Enter valid credentials → Should redirect to homepage
- [ ] Enter invalid credentials → Should show error message
- [ ] Stay logged in after closing/reopening browser

### Onboarding
- [ ] After signup, redirected to `/onboarding`
- [ ] Select role (Fighter, Gym, Promotion, Coach)
- [ ] Fill in required profile information
- [ ] Upload avatar (optional)
- [ ] Submit → Should create profile and redirect to homepage

### Logout
- [ ] Click logout from any page → Should redirect to login
- [ ] Protected pages should redirect to login when logged out

---

## Profile Management

### Viewing Profiles

#### Fighter Profile
- [ ] Navigate to `/profile/[username]` for a fighter
- [ ] **Header Section**: Avatar, banner, name, username, country, martial arts display correctly
- [ ] **Stats Section**: Win/loss record, belts, fight history visible
- [ ] **Bio Section**: Bio text displays
- [ ] **Fight History**: Past fights shown with results
- [ ] **Promotions**: Associated promotions display
- [ ] **Social Feed**: Posts appear in grid
  - [ ] Image posts show thumbnail only
  - [ ] Text posts show date only (no likes/comments initially)
  - [ ] Hover over any post → Overlay with likes/comments appears
  - [ ] Click post → Navigates to `/posts/[id]`

#### Gym Profile
- [ ] Navigate to `/profile/[username]` for a gym
- [ ] **Header**: Gym name, avatar, banner display
- [ ] **Bio**: Gym description shows
- [ ] **Coaches & Fighters**: Navigate to `/profile/[username]/coaches` and `/profile/[username]/fighters`
- [ ] **Events**: Upcoming events listed with proper styling
- [ ] **Social Feed**: Posts display with hover effects
- [ ] **Social Links**: Instagram, Twitter, etc. display correctly

#### Promotion Profile
- [ ] Navigate to `/profile/[username]` for a promotion
- [ ] **Header**: Promotion name, logo, banner
- [ ] **Bio**: Description displays
- [ ] **Fighters**: Associated fighters shown
- [ ] **Events**: Past and upcoming events
- [ ] **Social Feed**: Posts with hover overlays

### Editing Profile
- [ ] Navigate to `/profile/settings`
- [ ] **Avatar Upload**: Upload new avatar → Preview → Save
- [ ] **Banner Upload**: Upload banner → Preview → Save
- [ ] **Bio**: Edit bio text → Save → Verify on profile
- [ ] **Martial Arts**: Add/remove martial arts
- [ ] **Social Links**: Add Instagram, Twitter, TikTok, YouTube, website
- [ ] **Fight Record** (Fighters only): Edit wins/losses
- [ ] **Country**: Select country from dropdown

### Fighter-Specific Features
- [ ] **Belts Manager**: Navigate to `/profile/settings` → Add/edit/delete belts
- [ ] **Fight History**: Add fight manually (opponent, result, date, event)
- [ ] **Gym Affiliation**: View current gym, request to leave

### Gym-Specific Features
- [ ] **Manage Fighters**: View list at `/profile/[username]/fighters`
- [ ] **Manage Coaches**: View list at `/profile/[username]/coaches`
- [ ] **Remove Fighter**: Remove fighter from gym roster

---

## Events Management

### Creating Events
- [ ] Navigate to `/create-event`
- [ ] **Basic Info**:
  - [ ] Enter event name
  - [ ] Select event date
  - [ ] Choose martial arts
  - [ ] Enter city and country
  - [ ] Write description
- [ ] **Banner Upload**: Upload event banner (recommended: 1600×560px)
- [ ] **Bouts**:
  - [ ] Add main card bout
  - [ ] Add undercard bout
  - [ ] Set weight class, bout details
  - [ ] Mark "Looking for opponent" for empty corners
  - [ ] Add fighter names or leave TBC
- [ ] **Stream Settings**:
  - [ ] Enable "This event will be streamed"
  - [ ] Set stream price
  - [ ] Set fighter percentage
- [ ] Submit → Event created → Redirect to event page

### Viewing Events
- [ ] Navigate to `/events/[id]`
- [ ] **Header**: Event name, date, location, martial arts
- [ ] **Banner**: Event banner displays (or placeholder)
- [ ] **Sponsorships**: Sponsorship slideshow shows
- [ ] **Bouts Section**: 
  - [ ] "Red corner" / "VS" / "Blue corner" header displays
  - [ ] Main card bouts listed (properly numbered)
  - [ ] Undercard bouts listed (properly numbered)
  - [ ] Desktop: Horizontal layout (Red | Details | Blue)
  - [ ] Mobile: Same horizontal layout, just smaller
  - [ ] LIVE badge shows for live bouts (pulsing animation)
- [ ] **Event Discussion**: Like and comment on event
- [ ] **Share Button**: Share event via link

### Editing Events
- [ ] Navigate to `/events/[id]/edit` (only as organizer)
- [ ] **Edit Basic Info**: Name, date, location, description
- [ ] **Edit Banner**: Upload new banner
- [ ] **Edit Bouts**:
  - [ ] Add new bout
  - [ ] Edit existing bout
  - [ ] Delete bout
  - [ ] Reorder bouts (drag and drop)
  - [ ] Change card type (main/undercard)
- [ ] **Stream Settings**: Enable/disable, change price
- [ ] Save changes → Verify on event page

### Event Revenue
- [ ] Navigate to `/events/[id]/revenue` (organizer only)
- [ ] **Payments Summary**: Total revenue displays
- [ ] **Fighter Allocations**: Fighter shares shown
- [ ] **Tips**: Tips received listed
- [ ] **Breakdown**: Platform fees calculated correctly

### Featured Events
- [ ] Navigate to event page
- [ ] Click "Feature this event" button
- [ ] Redirected to Stripe checkout
- [ ] Complete payment
- [ ] Event shows "Featured" badge
- [ ] Featured event appears at top of event lists
- [ ] Featured status expires after featured_until date

---

## Bouts Management

### Bout Offers

#### Sending Offers (Coach/Gym)
- [ ] Navigate to event with "Looking for opponent" bout
- [ ] Click "Send Offer" button
- [ ] Fill in fighter details
- [ ] Set offer fee (if required)
- [ ] Submit → Offer sent to organizer

#### Viewing Offers (Organizer)
- [ ] Navigate to `/events/[id]/offers`
- [ ] See list of pending offers grouped by bout
- [ ] Click "Message" → Opens message thread
- [ ] Click "Accept" → Bout updated with fighter details
- [ ] Click "Decline" → Offer marked as declined
- [ ] Navigate to `/events/[id]/offers/all`
- [ ] **Filters**: Recent (30 days) / Past
- [ ] **Status Filters**: All / Accepted / Rejected
- [ ] Verify filtering works correctly

#### Paying Offer Fees
- [ ] Accept offer with fee
- [ ] Redirected to Stripe checkout
- [ ] Complete payment
- [ ] Fighter assigned to bout
- [ ] Offer status updated to "accepted"

### Live Bout Management
- [ ] Navigate to `/events/[id]/live` (organizer only)
- [ ] **Start Bout**:
  - [ ] Click "Start Bout"
  - [ ] Bout marked as live
  - [ ] LIVE badge appears
  - [ ] Moved to top of list
- [ ] **Score Bout**:
  - [ ] Enter round scores (red and blue)
  - [ ] Scores display in scoreboard
  - [ ] Total scores calculated correctly
- [ ] **End Bout**:
  - [ ] Click "End Bout"
  - [ ] Enter result (winner, method, round, time)
  - [ ] Submit → Bout no longer live
  - [ ] Result displays on event page
- [ ] **Next Bout Indicator**: Shows which bout is next

### Bout Results
- [ ] View event with completed bouts
- [ ] Result text displays: "Winner won by Method • R# @ time"
- [ ] Results visible on event page and live page

---

## Posts & Social Feed

### Creating Posts

#### Text Post
- [ ] Navigate to own profile
- [ ] Click "+" button in social feed section
- [ ] Write text content
- [ ] Submit → Post appears in feed
- [ ] Verify URLs in text are clickable links

#### Image Post (Single Image)
- [ ] Click "+" button
- [ ] Write text (optional)
- [ ] Upload 1 image
- [ ] Preview image before posting
- [ ] Submit → Post with image appears

#### Image Post (Multiple Images)
- [ ] Click "+" button
- [ ] Write text (optional)
- [ ] Upload 2-5 images
- [ ] Preview all images
- [ ] Submit → Post with multiple images appears

### Viewing Posts

#### In Feed/Grid View
- [ ] Navigate to any profile with posts
- [ ] **Image Posts**: 
  - [ ] Thumbnail displays
  - [ ] Date badge visible in top-left
  - [ ] Hover → Overlay with content, likes, comments
- [ ] **Text Posts**:
  - [ ] Content displays (truncated if long)
  - [ ] Date shows at bottom
  - [ ] NO likes/comments initially visible
  - [ ] Hover → Purple overlay with likes/comments appears

#### Individual Post Page
- [ ] Click any post → Navigate to `/posts/[id]`
- [ ] Post content displays (full text)
- [ ] Image(s) display
  - [ ] Single image: Full size
  - [ ] Multiple images: Carousel with arrows
  - [ ] Image counter: "1 / 3"
  - [ ] Dot indicators below
  - [ ] Click arrow buttons → Navigate between images
  - [ ] Click dot → Jump to that image
- [ ] Author info shows (name, username, date)
- [ ] Likes count displays
- [ ] Comments section opens by default
- [ ] Can like the post
- [ ] Can add comment

### Interacting with Posts

#### Liking
- [ ] Click heart icon → Post liked (heart filled)
- [ ] Like count increments
- [ ] Click again → Unlike (heart outline)
- [ ] Like count decrements

#### Commenting
- [ ] In feed view: Click post → Opens full post with comments
- [ ] Enter comment text
- [ ] Submit → Comment appears
- [ ] Comment shows your name, username, timestamp
- [ ] Comments count increments

#### Editing/Deleting Posts (Own Posts Only)
- [ ] Click three-dot menu on own post
- [ ] Click "Edit"
- [ ] Modify content
- [ ] Save → Changes appear
- [ ] Click "Delete"
- [ ] Confirm → Post removed from feed

---

## Messages

### Starting Conversations
- [ ] Navigate to another user's profile
- [ ] Click "Message" button
- [ ] Redirected to `/messages/[threadId]`
- [ ] Thread created (or existing thread opened)

### Sending Messages
- [ ] Open message thread
- [ ] Type message in input box
- [ ] Press Enter or click Send
- [ ] Message appears in thread
- [ ] Timestamp shows

### Viewing Messages
- [ ] Navigate to `/messages`
- [ ] All threads listed with:
  - [ ] Other user's avatar and name
  - [ ] Last message preview
  - [ ] Timestamp
  - [ ] Unread indicator (if unread)
- [ ] Click thread → Opens full conversation

### Bout Offer Messages
- [ ] Send bout offer via message
- [ ] Message includes bout details
- [ ] Offer status shows in message

### Notifications
- [ ] Receive new message
- [ ] Notification appears in bell icon
- [ ] Click notification → Opens message thread
- [ ] Mark as read → Notification clears

---

## Notifications

### Viewing Notifications
- [ ] Click bell icon in navbar
- [ ] Dropdown shows recent notifications
- [ ] Each notification shows:
  - [ ] Type icon
  - [ ] Description
  - [ ] Timestamp
  - [ ] Read/unread status

### Notification Types
- [ ] **Follow**: "X started following you"
- [ ] **Post Like**: "X liked your post"
- [ ] **Post Comment**: "X commented on your post"
- [ ] **Event Like**: "X liked your event"
- [ ] **Event Comment**: "X commented on your event"
- [ ] **Bout Offer**: "New bout offer for [event]"
- [ ] **Bout Assigned**: "You've been assigned to a bout"
- [ ] **Bout Result**: "Results posted for [bout]"
- [ ] **Event Live**: "Event is now live"
- [ ] **Message**: "New message from X"
- [ ] **Payout**: "Payout request approved/processed"

### Marking as Read
- [ ] Click notification → Navigates to relevant page
- [ ] Notification marked as read
- [ ] Badge count decrements
- [ ] Navigate to `/notifications`
- [ ] Click "Mark all as read"
- [ ] All notifications marked as read

---

## Payments & Payouts

### Stream Access Purchase
- [ ] Navigate to event with streaming enabled
- [ ] Navigate to `/events/[id]/stream`
- [ ] Click "Buy Stream Access" button
- [ ] Redirected to Stripe Checkout
- [ ] Enter payment details
- [ ] Complete payment
- [ ] Redirected back with success message
- [ ] Stream video player appears
- [ ] Access persists on reload

### Offer Fee Payment
- [ ] Accept bout offer with fee
- [ ] Redirected to Stripe Checkout
- [ ] Complete payment
- [ ] Fighter assigned to bout
- [ ] Payment recorded in database

### Featured Event Payment
- [ ] Click "Feature Event" button
- [ ] Redirected to Stripe Checkout
- [ ] Complete payment
- [ ] Event marked as featured
- [ ] Featured badge displays

### Fighter Payouts

#### Viewing Earnings
- [ ] Navigate to `/earnings` (as fighter)
- [ ] **Summary**:
  - [ ] Total earnings displays
  - [ ] Available to withdraw shows
  - [ ] Pending payouts listed
- [ ] **Earnings Breakdown by Event**:
  - [ ] Each event listed
  - [ ] Amount per event shown
  - [ ] Fighter percentage displayed

#### Requesting Payout
- [ ] Click "Request Payout"
- [ ] Enter amount (must be ≤ available)
- [ ] Submit → Payout request created
- [ ] Status shows as "pending"

#### Stripe Connect Setup
- [ ] Click "Set up Stripe Connect" (if not set up)
- [ ] Redirected to Stripe
- [ ] Complete onboarding
- [ ] Return to site
- [ ] Connect account linked

### Organizer Payouts

#### Viewing Earnings
- [ ] Navigate to `/earnings` (as organizer/promotion)
- [ ] **Total Revenue**: All event revenue
- [ ] **Platform Fees**: Calculated correctly
- [ ] **Fighter Allocations**: Deducted from total
- [ ] **Available to Withdraw**: Net amount available
- [ ] **Earnings by Event**: Breakdown per event

#### Requesting Payout
- [ ] Click "Request Payout"
- [ ] Enter amount
- [ ] Submit → Request created

### Admin Payout Processing
- [ ] Navigate to `/admin/payouts` (as admin)
- [ ] See all pending payout requests
- [ ] **Fighter Requests**: Listed separately
- [ ] **Organizer Requests**: Listed separately
- [ ] Click "Approve" → Payout marked approved
- [ ] Click "Reject" → Payout marked rejected
- [ ] Stripe transfer initiated on approval

---

## Search & Discovery

### Search Page
- [ ] Navigate to `/search`
- [ ] **Search Bar**: Enter search term
- [ ] Results show across all categories:
  - [ ] Events
  - [ ] Profiles (fighters, gyms, promotions)
  - [ ] Posts

### Filtering

#### Filter by Type
- [ ] Click "All" → Shows all results
- [ ] Click "Events" → Shows only events
- [ ] Click "Profiles" → Shows only profiles
- [ ] Click "Posts" → Shows only posts

#### Filter by Martial Art
- [ ] Select martial art (MMA, Boxing, Muay Thai, etc.)
- [ ] Results filtered to selected sport
- [ ] Can select multiple sports

#### Filter by Date (Events)
- [ ] "Upcoming" → Shows future events
- [ ] "Past" → Shows past events

#### Filter by Location
- [ ] Enter city/country
- [ ] Results filtered by location

### Search Results

#### Event Results
- [ ] Event name displays
- [ ] Date, location, martial arts shown
- [ ] Click event → Navigate to event page

#### Profile Results
- [ ] Avatar displays
- [ ] Name, username, role shown
- [ ] Click profile → Navigate to profile page

#### Post Results
- [ ] Post preview shown
- [ ] Author info displays
- [ ] Click post → Navigate to post page

---

## Follow System

### Following Users
- [ ] Navigate to any profile
- [ ] Click "Follow" button
- [ ] Button changes to "Following"
- [ ] Follower count increments
- [ ] Notification sent to followed user

### Unfollowing Users
- [ ] Navigate to followed profile
- [ ] Click "Following" button
- [ ] Confirm unfollow
- [ ] Button changes to "Follow"
- [ ] Follower count decrements

### Following Events
- [ ] Navigate to event page
- [ ] Click "Follow Event"
- [ ] Receive notifications about event updates
- [ ] Button changes to "Following"

### Viewing Followers/Following
- [ ] Navigate to `/profile/[username]/followers`
- [ ] List of followers displays
- [ ] Navigate to `/profile/[username]/following`
- [ ] List of following displays
- [ ] Click any user → Navigate to their profile

---

## Moderation

### Reporting Content

#### Report Post
- [ ] Navigate to any post
- [ ] Click report button (flag icon)
- [ ] Select reason (spam, inappropriate, etc.)
- [ ] Add details (optional)
- [ ] Submit → Report sent to admin

#### Report Profile
- [ ] Navigate to any profile
- [ ] Click report button
- [ ] Select reason
- [ ] Submit → Report sent

#### Report Event
- [ ] Navigate to event page
- [ ] Click report button
- [ ] Select reason
- [ ] Submit → Report sent

### Blocking Users
- [ ] Navigate to user's profile
- [ ] Click "Block" button
- [ ] Confirm block
- [ ] User blocked
- [ ] Their content no longer visible
- [ ] They cannot message you

### Admin Moderation
- [ ] Navigate to `/admin/moderation` (admin only)
- [ ] **All Reports Listed**:
  - [ ] Report type (post, profile, event)
  - [ ] Reporter name
  - [ ] Reason
  - [ ] Status (pending, reviewed, resolved)
- [ ] Click report → View details
- [ ] **Actions**:
  - [ ] Mark as reviewed
  - [ ] Mark as resolved
  - [ ] Take action on content (delete, warn, ban)

---

## Settings

### Account Settings
- [ ] Navigate to `/settings/account`
- [ ] **Email**: View current email
- [ ] **Password**: Change password
  - [ ] Enter current password
  - [ ] Enter new password
  - [ ] Confirm new password
  - [ ] Submit → Password changed

### Profile Settings
- [ ] Navigate to `/settings` (same as `/profile/settings`)
- [ ] Edit all profile fields
- [ ] Save changes
- [ ] Verify changes on profile page

### Stripe Connect
- [ ] Navigate to `/settings`
- [ ] Click "Set up payouts" or "Manage Stripe Account"
- [ ] Complete Stripe Connect onboarding
- [ ] Account linked
- [ ] Can receive payouts

### Privacy Settings
- [ ] View privacy policy at `/privacy`
- [ ] View terms at `/terms`

---

## Admin Features

### Admin Dashboard
- [ ] Navigate to `/admin` (admin only)
- [ ] **Stats Overview**:
  - [ ] Total users
  - [ ] Total events
  - [ ] Total posts
  - [ ] Revenue metrics

### Moderation
- [ ] Navigate to `/admin/moderation`
- [ ] Review reported content
- [ ] Take action on reports
- [ ] View report history

### Payout Management
- [ ] Navigate to `/admin/payouts`
- [ ] See all pending payouts
- [ ] Approve/reject requests
- [ ] View payout history

### Sponsorships
- [ ] Navigate to `/admin/sponsorships`
- [ ] View all sponsorships
- [ ] Navigate to `/admin/sponsorships/new`
- [ ] Create new sponsorship:
  - [ ] Title, description
  - [ ] Image upload
  - [ ] Link URL
  - [ ] Placement (homepage_hero, homepage_sidebar, etc.)
  - [ ] Variant (slideshow, banner, sidebar)
  - [ ] Active dates
- [ ] Submit → Sponsorship created
- [ ] Verify appears on homepage/placement

### Managing Users
- [ ] View user list
- [ ] Make user admin
- [ ] Ban/unban users
- [ ] Delete accounts

---

## Mobile Responsiveness

### Navigation
- [ ] **Mobile Menu**: Hamburger menu opens/closes
- [ ] Bottom nav bar displays on mobile
- [ ] All pages accessible

### Homepage
- [ ] Hero slideshow displays correctly
- [ ] News & updates section readable
- [ ] Sidebar sponsorships stack below on mobile

### Events
- [ ] Event detail page responsive
- [ ] **Bouts Section**:
  - [ ] Maintains horizontal layout on mobile
  - [ ] Red corner | VS | Blue corner
  - [ ] Smaller text sizes
  - [ ] Tighter spacing
  - [ ] Fighter info readable
- [ ] Edit event form works on mobile

### Profiles
- [ ] Profile header displays correctly
- [ ] Post grid adjusts to mobile (fewer columns)
- [ ] Hover effects work (or tap on mobile)

### Posts
- [ ] Post creation modal fits screen
- [ ] Image upload works on mobile
- [ ] Carousel navigation works with touch

### Messages
- [ ] Message list readable
- [ ] Chat interface usable
- [ ] Input field accessible

### Forms
- [ ] All forms fit screen width
- [ ] Input fields accessible
- [ ] Date pickers work on mobile
- [ ] File uploads work from mobile device

---

## Additional Cross-Platform Tests

### Browser Compatibility
- [ ] Test on Chrome
- [ ] Test on Firefox
- [ ] Test on Safari
- [ ] Test on Edge
- [ ] Test on mobile browsers (iOS Safari, Chrome Mobile)

### Performance
- [ ] Homepage loads in < 3 seconds
- [ ] Image-heavy pages load smoothly
- [ ] No console errors
- [ ] API calls complete without hanging

### Data Persistence
- [ ] Refresh page → Data remains
- [ ] Close tab and reopen → Still logged in
- [ ] Create content and navigate away → Content saved

### Edge Cases
- [ ] Empty states display correctly (no posts, no events, etc.)
- [ ] Long text content doesn't break layout
- [ ] Special characters in names/text handled properly
- [ ] Very long usernames/names truncated with ellipsis
- [ ] Missing images show placeholder
- [ ] Deleted users show "Apex user" in historical data

---

## Critical User Flows (End-to-End)

### Flow 1: New Fighter Signs Up and Gets First Fight
1. [ ] Sign up as new fighter
2. [ ] Complete onboarding
3. [ ] Edit profile (add bio, avatar, martial arts)
4. [ ] Search for upcoming events
5. [ ] Find event with "looking for opponent"
6. [ ] Message organizer about fighting
7. [ ] Organizer sends bout offer
8. [ ] Receive notification
9. [ ] Accept offer
10. [ ] Pay offer fee (if required)
11. [ ] View bout on event page
12. [ ] Event goes live
13. [ ] View live bout results
14. [ ] Receive earnings allocation
15. [ ] Request payout

### Flow 2: Gym Signs Up and Sends Fighter to Event
1. [ ] Sign up as gym
2. [ ] Complete onboarding
3. [ ] Add fighters to gym roster
4. [ ] Create post about upcoming fight
5. [ ] Search for events
6. [ ] Send bout offer for gym fighter
7. [ ] Message organizer
8. [ ] Organizer accepts offer
9. [ ] Pay offer fee
10. [ ] Fighter assigned to bout

### Flow 3: Promotion Creates and Runs Event
1. [ ] Sign up as promotion
2. [ ] Complete onboarding
3. [ ] Navigate to create event
4. [ ] Fill in event details
5. [ ] Add multiple bouts (main card and undercard)
6. [ ] Upload event banner
7. [ ] Enable streaming
8. [ ] Publish event
9. [ ] Receive bout offers
10. [ ] Accept/decline offers via messages
11. [ ] Feature event (pay for featured status)
12. [ ] On event day, go to live page
13. [ ] Start first bout
14. [ ] Score rounds
15. [ ] Enter result
16. [ ] End bout and start next
17. [ ] View revenue after event
18. [ ] Request payout

### Flow 4: Fan Discovers and Watches Event
1. [ ] Browse homepage
2. [ ] See featured event
3. [ ] Click event
4. [ ] Follow event for updates
5. [ ] View event details and fighters
6. [ ] Purchase stream access
7. [ ] Watch live stream
8. [ ] Like and comment on event
9. [ ] Follow fighters
10. [ ] View fighter profiles

---

## Notes for Testing
- Test with different user roles (fighter, gym, promotion, coach, admin)
- Clear browser cache between major tests
- Test with slow internet to check loading states
- Test with multiple tabs open
- Check that unauthorized users cannot access protected pages
- Verify all error messages are user-friendly
- Check that all external links open in new tabs
- Verify all forms have proper validation

## Priority Testing Order
1. **Critical**: Authentication, event creation, bout management, payments
2. **High**: Posts, messages, search, profiles
3. **Medium**: Notifications, following, moderation
4. **Low**: Admin features (if you're not using them immediately)

---

**Last Updated**: January 2026
**Total Test Items**: 500+
