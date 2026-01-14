# Production Readiness Checklist

## 🔴 Critical (Must Fix Before Launch)

### 1. Environment Variables & Configuration
- [ ] **Create `.env.example` file** documenting all required environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (used in signup, login, webhooks)
  - `SUPABASE_URL` (used in signup route - inconsistent with NEXT_PUBLIC_SUPABASE_URL)
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
- [ ] **Fix environment variable inconsistency**: `app/api/signup/route.ts` uses `SUPABASE_URL` but should use `NEXT_PUBLIC_SUPABASE_URL`
- [ ] **Verify middleware.ts** - Currently uses `SUPABASE_SERVICE_ROLE_KEY` in middleware which is a security risk. Should use anon key for session refresh only.

### 2. Database Migrations
- [ ] **Verify all migrations are applied** in production Supabase:
  - Content moderation tables
  - Live bout scoring
  - Continuous fight sequence
  - Stream payments
  - Event sponsorships
  - Admin permissions
  - All other migrations in `supabase/migrations/`
- [ ] **Create migration run script** or document the order to run migrations
- [ ] **Test migrations on staging** before production

### 3. Security Issues
- [ ] **Fix middleware.ts security**: Using `SUPABASE_SERVICE_ROLE_KEY` in middleware is dangerous - should only use anon key
- [ ] **Review RLS policies**: Ensure all tables have proper Row Level Security enabled
- [ ] **Validate admin role checks**: Ensure admin-only routes are properly protected
- [ ] **Rate limiting**: Add rate limiting to API routes (especially login, signup, payment endpoints)
- [ ] **Input validation**: Add server-side validation for all user inputs (currently some validation is client-side only)
- [ ] **CORS configuration**: Ensure proper CORS settings for production domain
- [ ] **SQL injection protection**: Verify all database queries use parameterized queries (Supabase handles this, but double-check)

### 4. Stripe Payment Integration
- [ ] **Configure Stripe webhook endpoint** in Stripe Dashboard:
  - Point to: `https://yourdomain.com/api/stripe/webhook`
  - Events to listen for: `checkout.session.completed`
- [ ] **Test webhook signature verification** in production
- [ ] **Set up Stripe Connect** (if using for payouts to fighters):
  - Configure Connect account creation
  - Set up payout flows
- [ ] **Test payment flows** end-to-end:
  - Stream payments
  - Offer fee payments
  - Payment verification
- [ ] **Handle payment failures** gracefully with user-friendly error messages

### 5. Error Handling & Logging
- [ ] **Implement proper error logging**:
  - Set up error tracking service (Sentry, LogRocket, etc.)
  - Log all API errors with context
  - Log payment failures
- [ ] **User-friendly error messages**: Replace generic errors with helpful messages
- [ ] **Error boundaries**: Add React error boundaries for client-side errors
- [ ] **404/500 pages**: Create custom error pages

### 6. File Uploads & Storage
- [ ] **Verify Supabase Storage buckets** are created:
  - `avatars`
  - `banners` (or `event-banners`)
  - `media`
- [ ] **Set up storage policies** (RLS for storage)
- [ ] **File size limits**: Enforce file size limits on uploads
- [ ] **File type validation**: Validate file types on server-side
- [ ] **Image optimization**: Consider adding image resizing/optimization

## 🟡 Important (Should Fix Soon)

### 7. Performance Optimization
- [ ] **Image optimization**: Use Next.js Image component everywhere (already done in some places)
- [ ] **Database indexes**: Review and add indexes for frequently queried columns
- [ ] **Query optimization**: Review slow queries, add pagination where needed
- [ ] **Caching strategy**: Implement caching for static content, event listings
- [ ] **Bundle size**: Analyze and optimize bundle size
- [ ] **Lazy loading**: Implement lazy loading for heavy components

### 8. Testing
- [ ] **End-to-end testing**: Test critical user flows:
  - User signup/login
  - Event creation
  - Bout management
  - Stream payment flow
  - Content moderation
- [ ] **Load testing**: Test with expected user load
- [ ] **Payment testing**: Test with Stripe test mode thoroughly
- [ ] **Cross-browser testing**: Test on major browsers
- [ ] **Mobile responsiveness**: Verify all pages work on mobile devices

### 9. Monitoring & Analytics
- [ ] **Set up application monitoring** (e.g., Vercel Analytics, or similar)
- [ ] **Set up uptime monitoring** (e.g., UptimeRobot, Pingdom)
- [ ] **Database monitoring**: Monitor Supabase usage, connection limits
- [ ] **Payment monitoring**: Monitor Stripe dashboard for failed payments
- [ ] **User analytics**: Consider adding analytics (privacy-compliant)

### 10. Documentation
- [ ] **Update README.md** with:
  - Production deployment instructions
  - Environment variables documentation
  - Database setup instructions
  - Migration instructions
- [ ] **API documentation**: Document all API endpoints
- [ ] **Admin guide**: Create guide for admin users
- [ ] **User guide**: Create basic user guide

### 11. Legal & Compliance
- [ ] **Terms of Service**: Add ToS page
- [ ] **Privacy Policy**: Add Privacy Policy page
- [ ] **Cookie consent**: Add cookie consent banner (if required)
- [ ] **GDPR compliance**: Ensure user data can be exported/deleted
- [ ] **Payment terms**: Add payment terms and refund policy

## 🟢 Nice to Have (Can Add Later)

### 12. Features & Polish
- [ ] **Email notifications**: Set up email service (SendGrid, Resend, etc.) for:
  - Welcome emails
  - Event notifications
  - Payment confirmations
- [ ] **Search functionality**: Improve search with better indexing
- [ ] **Real-time updates**: Consider adding real-time features with Supabase Realtime
- [ ] **Social sharing**: Add social media sharing buttons
- [ ] **SEO optimization**: Add meta tags, Open Graph tags, sitemap
- [ ] **Accessibility**: Audit and improve accessibility (WCAG compliance)

### 13. Backup & Recovery
- [ ] **Database backups**: Verify Supabase automatic backups are enabled
- [ ] **Backup strategy**: Document backup and recovery procedures
- [ ] **Disaster recovery plan**: Create plan for handling outages

### 14. Deployment
- [ ] **Choose hosting platform** (Vercel, AWS, etc.)
- [ ] **Set up CI/CD pipeline**:
  - Automated testing
  - Automated deployments
  - Environment management
- [ ] **Domain setup**: Configure custom domain with SSL
- [ ] **CDN configuration**: Set up CDN for static assets
- [ ] **Environment separation**: Ensure dev/staging/prod environments are separate

## 📋 Pre-Launch Checklist

### Final Steps
- [ ] Run all database migrations in production
- [ ] Set all environment variables in production
- [ ] Test all critical user flows
- [ ] Verify Stripe webhook is working
- [ ] Test payment flows with real (test) cards
- [ ] Verify file uploads work
- [ ] Check all admin functions work
- [ ] Test content moderation features
- [ ] Verify email notifications (if implemented)
- [ ] Load test the application
- [ ] Security audit
- [ ] Legal pages are live
- [ ] Error tracking is set up
- [ ] Monitoring is configured

## 🐛 Known Issues to Address

1. **Login route syntax error**: Line 8 in `app/api/login/route.ts` has `try {` without proper structure
2. **Environment variable inconsistency**: `SUPABASE_URL` vs `NEXT_PUBLIC_SUPABASE_URL`
3. **Middleware security**: Using service role key in middleware
4. **Missing error boundaries**: No React error boundaries implemented
5. **No rate limiting**: API routes are vulnerable to abuse

## 🔧 Quick Wins (Easy Fixes)

1. Fix login route syntax error
2. Standardize environment variable names
3. Add `.env.example` file
4. Create custom 404/500 pages
5. Add basic rate limiting to auth routes
6. Add input validation helpers
7. Document all environment variables

---

**Priority Order for Launch:**
1. Fix critical security issues
2. Fix environment variable issues
3. Run all migrations
4. Set up Stripe webhook
5. Test payment flows
6. Add error logging
7. Create legal pages
8. Deploy to staging
9. Full testing
10. Deploy to production

