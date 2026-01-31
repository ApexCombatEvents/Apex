# Notification Preferences - Future Implementation

## Status
The notification preferences page has been **hidden** from the settings page but kept in the codebase for future use.

## Location
- Settings page: `app/settings/page.tsx` (line ~225)
- Notification preferences page: `app/settings/notifications/page.tsx` (fully functional)

## How to Re-enable

### Step 1: Unhide in Settings Page
In `app/settings/page.tsx`, change:
```tsx
{/* Notification preferences - hidden for now, can be enabled in the future */}
{false && (
  <Link href="/settings/notifications" className="block">
    ...
  </Link>
)}
```

To:
```tsx
<Link href="/settings/notifications" className="block">
  <section className="card space-y-2 hover:border-purple-200 hover:bg-white transition-colors">
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold">Notifications</h2>
      <span className="text-xs text-purple-700 font-semibold">→</span>
    </div>
    <p className="text-sm text-slate-600">
      Choose what shows up in your in-app notifications.
    </p>
  </section>
</Link>
```

## Current Functionality
The notification preferences page (`app/settings/notifications/page.tsx`) is fully functional and includes:
- Social notifications (follows, post likes, post comments)
- Event notifications (likes, comments, follows, bout matched, live)
- Bout notifications (offers, assigned, results)
- Message notifications
- Payout notifications
- Product/marketing notifications

## Database
The `notification_preferences` table exists and is ready to use. Migration files:
- `supabase/migrations/create_notification_preferences_table.sql`
- `supabase/migrations/add_notification_preferences.sql`
- `supabase/migrations/alter_notification_preferences_add_all_types.sql`

## Notes
- The page is fully implemented and working
- Database schema is in place
- RLS policies are configured
- Simply unhide the link in settings to enable
