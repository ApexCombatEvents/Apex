# Test Critical User Flows

## 🎯 Pre-Launch Testing Checklist

Test these flows before deploying to production. Check off each item as you complete it.

---

## 1. User Authentication ✅ **CRITICAL**

### Signup Flow
- [ ] Go to signup page
- [ ] Create a new account with email
- [ ] Verify email confirmation (if required)
- [ ] Can log in with new account
- [ ] Profile is created automatically

### Login Flow
- [ ] Login with email
- [ ] Login with username (if supported)
- [ ] Login fails with wrong password
- [ ] Can log out successfully
- [ ] Session persists after page refresh

**Test Accounts:**
- Create at least 2 test accounts for testing interactions

---

## 2. Profile Management ✅ **IMPORTANT**

### Profile Creation/Editing
- [ ] Can edit profile information (name, bio, etc.)
- [ ] Can upload avatar image ✅ (tested with storage setup)
- [ ] Can upload banner image ✅ (tested with storage setup)
- [ ] Avatar displays correctly after upload
- [ ] Banner displays correctly after upload
- [ ] Can update username
- [ ] Profile page displays all information correctly

### Profile Viewing
- [ ] Can view own profile
- [ ] Can view other users' profiles
- [ ] Profile images load correctly
- [ ] Profile links work

---

## 3. Event Management ✅ **CRITICAL**

### Event Creation
- [ ] Can create a new event
- [ ] Can set event title, description, date
- [ ] Can upload event banner/image (if applicable)
- [ ] Can add bouts to event
- [ ] Can set stream price (if streaming enabled)
- [ ] Can set fighter percentage for stream revenue
- [ ] Event saves successfully
- [ ] Event appears in event list

### Event Editing
- [ ] Can edit existing event
- [ ] Can add/remove bouts
- [ ] Can update event details
- [ ] Changes save correctly

### Event Viewing
- [ ] Can view event details
- [ ] Event information displays correctly
- [ ] Bouts list correctly
- [ ] Can navigate to stream page (if streaming enabled)

---

## 4. Bout Management ✅ **IMPORTANT**

### Bout Creation
- [ ] Can add bout to event
- [ ] Can set fighters for bout
- [ ] Can set bout order/sequence
- [ ] Can set offer fee (if applicable)
- [ ] Bout saves correctly

### Bout Editing
- [ ] Can edit bout details
- [ ] Can change fighters
- [ ] Can update bout order
- [ ] Changes save correctly

---

## 5. Payment Flows ✅ **CRITICAL**

### Stream Payment Flow
- [ ] Navigate to event stream page
- [ ] See stream price displayed
- [ ] Click "Purchase Stream Access"
- [ ] Redirected to Stripe Checkout
- [ ] Complete payment with test card: `4242 4242 4242 4242`
- [ ] Payment succeeds
- [ ] Redirected back to stream page
- [ ] Can now view stream content
- [ ] Payment appears in database ✅ (already verified)
- [ ] Webhook creates payment record ✅ (already verified)

**Test Cards:**
- Success: `4242 4242 4242 4242` (any future expiry, any CVC)
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

### Offer Fee Payment Flow
- [ ] Navigate to event with bouts
- [ ] Click to send bout offer
- [ ] See offer fee amount
- [ ] Complete payment with test card
- [ ] Payment succeeds
- [ ] Offer is created
- [ ] Notification sent to event owner
- [ ] Payment appears in `offer_payments` table

---

## 6. Content Moderation ✅ **IMPORTANT**

### Reporting Content
- [ ] Can report inappropriate content
- [ ] Report is saved to database
- [ ] Admin can see reports

### Blocking Users
- [ ] Can block a user
- [ ] Blocked user's content is hidden
- [ ] Can unblock a user

---

## 7. Admin Functions ✅ **CRITICAL** (if you have admin access)

### Admin Dashboard
- [ ] Can access admin dashboard
- [ ] Admin-only routes are protected
- [ ] Non-admin users cannot access admin routes

### Admin Actions
- [ ] Can view all events
- [ ] Can view all users
- [ ] Can moderate content
- [ ] Can view reports
- [ ] Can manage sponsorships (if applicable)

---

## 8. Social Features ✅ **IMPORTANT**

### Posts
- [ ] Can create a post
- [ ] Can upload image to post ✅ (tested with storage setup)
- [ ] Post appears in feed
- [ ] Can edit own post
- [ ] Can delete own post
- [ ] Can view other users' posts

### Interactions
- [ ] Can like posts (if applicable)
- [ ] Can comment on posts (if applicable)
- [ ] Can follow users (if applicable)

---

## 9. Fight History ✅ **IMPORTANT**

### Adding Fight History
- [ ] Can add fight history to fighter profile
- [ ] Can enter fight details (opponent, result, date)
- [ ] Fight history saves correctly
- [ ] Fight history displays on profile

---

## 10. File Uploads ✅ **CRITICAL**

### Image Uploads
- [ ] Avatar upload works ✅ (tested with storage setup)
- [ ] Banner upload works ✅ (tested with storage setup)
- [ ] Post image upload works ✅ (tested with storage setup)
- [ ] Event banner upload works (if applicable)
- [ ] Images display correctly after upload
- [ ] Can delete uploaded images

### Upload Errors
- [ ] Error message shows for invalid file types
- [ ] Error message shows for files too large
- [ ] Error handling works gracefully

---

## 11. Notifications ✅ **IMPORTANT**

### Notification System
- [ ] Notifications appear when received
- [ ] Can view notification list
- [ ] Can mark notifications as read
- [ ] Notifications for bout offers work
- [ ] Notifications for events work

---

## 12. Search & Navigation ✅ **IMPORTANT**

### Search Functionality
- [ ] Can search for events
- [ ] Can search for users/profiles
- [ ] Search results are relevant
- [ ] Search works with different queries

### Navigation
- [ ] All navigation links work
- [ ] Can navigate between pages
- [ ] Back button works correctly
- [ ] Mobile navigation works (if applicable)

---

## 13. Error Handling ✅ **IMPORTANT**

### Error Pages
- [ ] 404 page displays for invalid routes
- [ ] 500 error page displays for server errors
- [ ] Error messages are user-friendly

### Form Validation
- [ ] Required fields show errors
- [ ] Invalid email formats are rejected
- [ ] Password requirements are enforced
- [ ] Validation errors are clear

---

## 14. Performance ✅ **RECOMMENDED**

### Page Load Times
- [ ] Homepage loads quickly
- [ ] Event pages load quickly
- [ ] Profile pages load quickly
- [ ] Images load efficiently

### Database Queries
- [ ] No obvious slow queries
- [ ] Lists are paginated (if applicable)
- [ ] No N+1 query problems

---

## 🐛 Common Issues to Watch For

### Payment Issues
- Payment succeeds but access not granted
- Payment fails but user charged
- Webhook doesn't fire
- Payment verification fails

### File Upload Issues
- Images don't upload
- Images upload but don't display
- Wrong file permissions
- Storage bucket errors

### Authentication Issues
- Session expires unexpectedly
- Can't log out
- Wrong user data displayed
- Permission errors

---

## 📝 Testing Notes

**Date:** _______________

**Tester:** _______________

**Environment:** Local / Staging / Production

**Issues Found:**
1. 
2. 
3. 

**Critical Issues (Must Fix Before Launch):**
1. 
2. 
3. 

---

## ✅ Final Checklist

Before marking testing complete:

- [ ] All critical flows tested
- [ ] All payment flows work correctly
- [ ] File uploads work correctly
- [ ] No critical bugs found
- [ ] Error handling works
- [ ] Mobile responsive (if applicable)
- [ ] Performance is acceptable

---

## 🚀 Ready for Production?

Once all critical flows are tested and working:

1. ✅ Fix any critical bugs found
2. ✅ Document any known issues
3. ✅ Prepare deployment
4. ✅ Set up production environment variables
5. ✅ Configure production webhook
6. ✅ Test in production environment
7. ✅ Go live! 🎉

---

## Quick Test Script

For a quick smoke test, verify these 5 critical flows:

1. **Signup/Login** - Can create account and log in
2. **Create Event** - Can create event with bouts
3. **Purchase Stream** - Can purchase stream access
4. **Upload Image** - Can upload avatar/banner
5. **View Content** - Can view events, profiles, posts

If all 5 work, you're in good shape! Then do full testing above.
