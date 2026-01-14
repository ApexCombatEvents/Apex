import { createSupabaseServer } from "@/lib/supabaseServer";
import { NextRequest, NextResponse } from "next/server";

/**
 * Utility endpoint to fix order_index values for event bouts.
 * 
 * The issue: order_index values may be swapped or incorrect.
 * Expected pattern:
 * - Within each card_type, order_index should be 0, 1, 2... in chronological order
 * - Display shows them in reverse (Fight 2 at top, Fight 1 at bottom)
 * - But sequence should be: order_index 0 → 1 → 2...
 * 
 * This function:
 * 1. Loads all bouts for the event
 * 2. Groups by card_type
 * 3. Sorts by current order_index
 * 4. Reassigns order_index values 0, 1, 2... based on the sorted order
 * 5. Updates the database
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseServer();
    const eventId = params.id;

    // Check authentication
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Load event to verify ownership
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, profile_id, owner_profile_id")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const ownerId = event.owner_profile_id || event.profile_id;
    if (userData.user.id !== ownerId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Load all bouts for this event
    const { data: bouts, error: boutsError } = await supabase
      .from("event_bouts")
      .select("id, card_type, order_index, red_name, blue_name")
      .eq("event_id", eventId)
      .order("card_type", { ascending: false })
      .order("order_index", { ascending: true });

    if (boutsError) {
      return NextResponse.json(
        { error: "Failed to load bouts", details: boutsError.message },
        { status: 500 }
      );
    }

    if (!bouts || bouts.length === 0) {
      return NextResponse.json({ message: "No bouts to fix", fixed: 0 });
    }

    // Group by card_type and sort by current order_index
    // The issue: order_index values may be swapped (e.g., Fight 1 has order 1, Fight 2 has order 0)
    // Solution: Swap order_index 0 and 1 within each card_type
    // This ensures: order_index 0 = first fight chronologically, order_index 1 = second fight
    const undercardBouts = [...bouts]
      .filter((b) => b.card_type === "undercard")
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    
    const mainCardBouts = [...bouts]
      .filter((b) => b.card_type === "main")
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    // Build the correct order_index assignments
    // Strategy: Swap 0 and 1 within each card_type
    // If a bout has order_index 0, it becomes 1; if it has 1, it becomes 0
    const updates: Array<{ id: string; order_index: number; card_type: string; name: string; old_order_index: number }> = [];

    // Fix undercard: swap 0 and 1
    undercardBouts.forEach((bout) => {
      // Only swap if order_index is 0 or 1
      if (bout.order_index === 0 || bout.order_index === 1) {
        const newOrderIndex = bout.order_index === 0 ? 1 : 0;
        updates.push({
          id: bout.id,
          order_index: newOrderIndex,
          card_type: "undercard",
          name: `${bout.red_name} vs ${bout.blue_name}`,
          old_order_index: bout.order_index,
        });
      } else if (bout.order_index !== undefined) {
        // For other order_index values, ensure they're sequential (0, 1, 2...)
        const sortedIndex = undercardBouts.findIndex((b) => b.id === bout.id);
        if (bout.order_index !== sortedIndex) {
          updates.push({
            id: bout.id,
            order_index: sortedIndex,
            card_type: "undercard",
            name: `${bout.red_name} vs ${bout.blue_name}`,
            old_order_index: bout.order_index,
          });
        }
      }
    });

    // Fix main card: swap 0 and 1
    mainCardBouts.forEach((bout) => {
      // Only swap if order_index is 0 or 1
      if (bout.order_index === 0 || bout.order_index === 1) {
        const newOrderIndex = bout.order_index === 0 ? 1 : 0;
        updates.push({
          id: bout.id,
          order_index: newOrderIndex,
          card_type: "main",
          name: `${bout.red_name} vs ${bout.blue_name}`,
          old_order_index: bout.order_index,
        });
      } else if (bout.order_index !== undefined) {
        // For other order_index values, ensure they're sequential (0, 1, 2...)
        const sortedIndex = mainCardBouts.findIndex((b) => b.id === bout.id);
        if (bout.order_index !== sortedIndex) {
          updates.push({
            id: bout.id,
            order_index: sortedIndex,
            card_type: "main",
            name: `${bout.red_name} vs ${bout.blue_name}`,
            old_order_index: bout.order_index,
          });
        }
      }
    });

    if (updates.length === 0) {
      return NextResponse.json({
        message: "All order_index values are already correct",
        fixed: 0,
        bouts: bouts.map((b) => ({
          id: b.id,
          name: `${b.red_name} vs ${b.blue_name}`,
          card_type: b.card_type,
          order_index: b.order_index,
        })),
      });
    }

    // Apply updates one by one
    const results = [];
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from("event_bouts")
        .update({ order_index: update.order_index })
        .eq("id", update.id);

      if (updateError) {
        results.push({
          id: update.id,
          name: update.name,
          success: false,
          error: updateError.message,
        });
      } else {
        results.push({
          id: update.id,
          name: update.name,
          card_type: update.card_type,
          success: true,
          old_order_index: update.old_order_index,
          new_order_index: update.order_index,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      message: `Fixed ${successCount} bout(s), ${failCount} failed`,
      fixed: successCount,
      failed: failCount,
      updates: results,
      before: bouts.map((b) => ({
        id: b.id,
        name: `${b.red_name} vs ${b.blue_name}`,
        card_type: b.card_type,
        old_order_index: b.order_index,
      })),
    });
  } catch (error) {
    console.error("Error fixing bout order:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

