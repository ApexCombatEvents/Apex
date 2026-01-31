# SQL for Event Follower Notifications

No SQL migration is required! The notification system already supports the new notification types (`bout_added` and `bout_started`).

The notifications table uses a flexible `type` text field and `data` JSONB field, so new notification types can be added without schema changes.

## What's Been Added:

1. **`bout_added` notifications** - Sent to all event followers when a new bout is added to an event
2. **`bout_started` notifications** - Sent to all event followers when a fight starts (bout marked as live)

## How It Works:

- When a bout is created/added → All event followers get a `bout_added` notification
- When a bout is marked as live → All event followers get a `bout_started` notification
- When an event goes live → All event followers get an `event_live` notification (already existed)
- When a fighter is added to a bout → All event followers get an `event_bout_matched` notification (already existed)

All these notifications appear in:
- The user's notification bell
- The notifications page
- The home timeline (NewsAndUpdates component)

No SQL needed - everything is ready to go! 🎉
