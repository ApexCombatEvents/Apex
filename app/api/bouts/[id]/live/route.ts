import { createSupabaseServer } from "@/lib/supabaseServer";
import { NextRequest, NextResponse } from "next/server";

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

    const body = await request.json();
    const { 
      is_live, 
      current_round, 
      total_rounds, 
      round_time_seconds,
      round_started_at,
      bout_started_at,
      bout_ended_at 
    } = body;

    // Check if user is event organizer or admin
    const { data: bout } = await supabase
      .from('event_bouts')
      .select(`
        id,
        event_id,
        event:events!inner(
          owner_profile_id,
          profile_id
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

    // If starting bout, set bout_started_at
    if (is_live === true && !bout_started_at) {
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

