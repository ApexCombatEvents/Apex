# Files Needed for Manage Live Events Page

## Primary File (Main Issue)
**`app/events/[id]/live/page.tsx`**
- This is the main page where organizers manage their live events
- Currently orders bouts by `sequence_number` (line 110)
- Displays bouts grouped by card_type (main/undercard) with fight numbers calculated from sequence_number
- Issue: The ordering doesn't match the desired order

## Related Files (For Context)

### 1. **`components/events/LiveEventControls.tsx`**
- Component that links to the live management page
- Simple link component, no ordering logic

### 2. **`app/events/[id]/page.tsx`** (Public Event Page)
- Shows how bouts are ordered on the public event page
- Uses `order_index` instead of `sequence_number` (lines 127-128)
- Orders by: `card_type` (descending) then `order_index` (ascending)
- Groups: main card first, then undercard
- Live bouts come first within each group

### 3. **`components/events/StreamContent.tsx`**
- Shows bouts in the stream view
- Uses `order_index` for ordering (lines 303, 307, 309)
- Orders undercard first, then main card (fight sequence order)

### 4. **`components/events/StartEventButton.tsx`**
- Sets `sequence_number` when starting an event
- Uses `order_index` to determine sequence (lines 50, 54)
- Builds sequence: undercard first (by order_index), then main card (by order_index)

## Database Schema Context
The `event_bouts` table has both:
- `order_index` - Used for display ordering (main card vs undercard position)
- `sequence_number` - Used for fight sequence (which fight happens when)

## Current Behavior in Live Page
1. Loads bouts ordered by `sequence_number` ascending (line 110)
2. Sorts bouts by `sequence_number` for display (lines 297-301)
3. Groups by `card_type` (main vs undercard)
4. Calculates fight numbers within each card type based on `sequence_number`

## Desired Behavior
The user wants bouts to follow a specific order, but the current implementation isn't working correctly. The issue likely relates to:
- Whether to use `sequence_number` vs `order_index`
- How to properly order bouts within card types
- How to handle the relationship between display order and fight sequence

## Key Functions in Live Page
- `loadData()` - Loads bouts ordered by sequence_number
- `handleToggleLiveBout()` - Toggles live status
- `handleNextFight()` - Moves to next bout in sequence
- `handleUpdateResult()` - Updates bout results
- `getNextBout()` - Finds next bout by sequence_number
- Bout grouping logic (lines 313-333) - Groups by card_type and calculates fight numbers
