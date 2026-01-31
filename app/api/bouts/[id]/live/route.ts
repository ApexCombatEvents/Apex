import { createSupabaseServer } from "@/lib/supabaseServer";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

// Validate environment variables at module load
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing required Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

// Update live bout state (start/stop bout, round changes, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseServer();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let is_live: boolean | undefined;
    let current_round: number | undefined;
    let total_rounds: number | undefined;
    let round_time_seconds: number | undefined;
    let round_started_at: string | undefined;
    let bout_started_at: string | undefined;
    let bout_ended_at: string | undefined;
    try {
      const body = await request.json();
      is_live = body.is_live;
      current_round = body.current_round;
      total_rounds = body.total_rounds;
      round_time_seconds = body.round_time_seconds;
      round_started_at = body.round_started_at;
      bout_started_at = body.bout_started_at;
      bout_ended_at = body.bout_ended_at;
    } catch (jsonError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Check if user is event organizer or admin
    // Also get current is_live status to detect if this is a new start
    const { data: bout } = await supabase
      .from('event_bouts')
      .select(`
        id,
        event_id,
        is_live,
        bout_started_at,
        event:events!inner(
          id,
          owner_profile_id,
          profile_id,
          name,
          title
        )
      `)
      .eq('id', params.id)
      .single();

    if (!bout) {
      return NextResponse.json(
        { error: "Bout not found" },
        { status: 404 }
      );
    }

    const event = (bout as any).event;
    if (!event) {
      return NextResponse.json(
        { error: "Event not found for this bout" },
        { status: 404 }
      );
    }
    
    const isOrganizer = event.owner_profile_id === user.id || event.profile_id === user.id;

    // Check if admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role?.toLowerCase() === 'admin';

    if (!isOrganizer && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build update object
    const updateData: any = {};
    if (is_live !== undefined) updateData.is_live = is_live;
    if (current_round !== undefined) updateData.current_round = current_round;
    if (total_rounds !== undefined) updateData.total_rounds = total_rounds;
    if (round_time_seconds !== undefined) updateData.round_time_seconds = round_time_seconds;
    if (round_started_at !== undefined) updateData.round_started_at = round_started_at;
    if (bout_started_at !== undefined) updateData.bout_started_at = bout_started_at;
    if (bout_ended_at !== undefined) updateData.bout_ended_at = bout_ended_at;

    // Track if this is a new live start (for notifications)
    // Only notify if: bout is being set to live AND it wasn't already live AND bout_started_at wasn't already set
    const wasJustStarted = is_live === true && 
                          (bout as any).is_live !== true && 
                          !bout_started_at && 
                          !(bout as any).bout_started_at;
    
    // If starting bout, set bout_started_at
    if (is_live === true && !bout_started_at && !(bout as any).bout_started_at) {
      updateData.bout_started_at = new Date().toISOString();
    }

    // If ending bout, set bout_ended_at and is_live to false
    if (is_live === false) {
      updateData.is_live = false;
      if (!bout_ended_at) {
        updateData.bout_ended_at = new Date().toISOString();
      }
    }

    const { data: updatedBout, error } = await supabase
      .from('event_bouts')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating bout:", error);
      return NextResponse.json(
        { error: "Failed to update bout" },
        { status: 500 }
      );
    }

    // If bout was just started (is_live = true and bout_started_at was set), notify followers
    if (wasJustStarted && event) {
      try {
        // Get all followers of this event
        const { data: followers } = await supabaseAdmin
          .from("event_follows")
          .select("profile_id")
          .eq("event_id", event.id);

        if (followers && followers.length > 0) {
          // Get bout details
          const { data: boutDetails } = await supabaseAdmin
            .from("event_bouts")
            .select("id, red_name, blue_name, sequence_number")
            .eq("id", params.id)
            .single();

          if (boutDetails) {
            const eventName = (event as any).title || (event as any).name || "Event";
            const redName = boutDetails.red_name || "TBC";
            const blueName = boutDetails.blue_name || "TBC";
            const boutNumber = boutDetails.sequence_number || null;

            // Create notifications for all followers
            const notifications = followers.map((f) => ({
              profile_id: f.profile_id,
              type: "bout_started",
              actor_profile_id: user.id,
              data: {
                event_id: event.id,
                event_name: eventName,
                bout_id: params.id,
                red_name: redName,
                blue_name: blueName,
                bout_number: boutNumber,
              },
            }));

            await supabaseAdmin.from("notifications").insert(notifications);
          }
        }
      } catch (notifError) {
        console.error("Error notifying followers about bout start:", notifError);
        // Don't fail the bout update if notification fails
      }
    }

    return NextResponse.json({ success: true, bout: updatedBout });
  } catch (error) {
    console.error("Live bout API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get live bout state
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseServer();

    const { data: bout, error } = await supabase
      .from('event_bouts')
      .select(`
        id,
        is_live,
        current_round,
        total_rounds,
        round_time_seconds,
        round_started_at,
        bout_started_at,
        bout_ended_at
      `)
      .eq('id', params.id)
      .single();

    if (error) {
      console.error("Error fetching bout:", error);
      return NextResponse.json(
        { error: "Failed to fetch bout" },
        { status: 500 }
      );
    }

    return NextResponse.json({ bout });
  } catch (error) {
    console.error("Get live bout API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

