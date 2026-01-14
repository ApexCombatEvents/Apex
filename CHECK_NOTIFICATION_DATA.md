# How to Check Notification Data Fields

## Method 1: Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Navigate to **Table Editor** or **SQL Editor**

2. **In Table Editor:**
   - Click on the `notifications` table
   - Look at the `data` column - it's a JSONB field
   - Click on any notification row to see the JSON structure

3. **In SQL Editor (More Detailed):**
   Run this query to see all notification data:

```sql
SELECT 
  id,
  type,
  profile_id,
  actor_profile_id,
  data,
  is_read,
  created_at
FROM notifications
ORDER BY created_at DESC
LIMIT 10;
```

To see specific notification types:

```sql
-- Check message notifications
SELECT id, type, data->>'threadId' as thread_id, data
FROM notifications
WHERE type = 'message'
ORDER BY created_at DESC
LIMIT 5;

-- Check follow notifications
SELECT id, type, data->>'follower_handle' as follower_handle, data->>'follower_name' as follower_name, data
FROM notifications
WHERE type = 'follow'
ORDER BY created_at DESC
LIMIT 5;

-- Check event notifications
SELECT id, type, data->>'event_id' as event_id, data->>'event_name' as event_name, data
FROM notifications
WHERE type IN ('event_like', 'event_comment', 'bout_offer')
ORDER BY created_at DESC
LIMIT 5;
```

## Method 2: Browser Console (Client-Side)

1. **Open your app in the browser**
2. **Open Developer Tools** (F12 or Right-click → Inspect)
3. **Go to Console tab**
4. **Add this temporary code** to see notification data:

In your browser console, you can check the API response:

```javascript
// Check what notifications are being loaded
fetch('/api/notifications')
  .then(r => r.json())
  .then(data => {
    console.log('All notifications:', data);
    console.log('First notification data:', data.notifications[0]?.data);
  });
```

## Method 3: Add Debug Logging to Component

You can temporarily add console.log to see the data structure. I'll show you how below.

## Method 4: Check Network Tab

1. **Open Developer Tools** (F12)
2. **Go to Network tab**
3. **Click on the notifications bell** to trigger the API call
4. **Find the request to `/api/notifications`**
5. **Click on it** and check the **Response** tab
6. **Look at the `data` field** in each notification object

## Expected Data Structure

Here's what each notification type should have in the `data` field:

### Message Notification:
```json
{
  "threadId": "uuid-here",
  "preview": "message preview text"
}
```

### Follow Notification:
```json
{
  "follower_name": "John Doe",
  "follower_handle": "johndoe"
}
```

### Event Like/Comment:
```json
{
  "event_id": "uuid-here",
  "event_name": "Event Name",
  "liker_name": "John Doe" // or commenter_name
}
```

### Bout Offer:
```json
{
  "offer_id": "uuid-here",
  "bout_id": "uuid-here",
  "event_id": "uuid-here",
  "event_name": "Event Name",
  "fighter_profile_id": "uuid-here",
  "from_profile_id": "uuid-here",
  "from_name": "Coach Name"
}
```

### Bout Assigned:
```json
{
  "bout_id": "uuid-here",
  "event_id": "uuid-here",
  "event_name": "Event Name",
  "side": "red" // or "blue"
}
```

## Troubleshooting

If data fields are missing:

1. **Check the notification creation code** - Make sure all the fields are being inserted when notifications are created
2. **Check for typos** - Field names must match exactly (e.g., `threadId` not `thread_id`)
3. **Verify the data is JSON** - The `data` column should be valid JSON

