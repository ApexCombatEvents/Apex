import { createSupabaseServer } from "@/lib/supabaseServer";
import { NextRequest, NextResponse } from "next/server";

// Update bout score (round-by-round)
export async function POST(
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

    let round_number: number;
    let red_score: number;
    let blue_score: number;
    let notes: string | undefined;
    try {
      const body = await request.json();
      round_number = body.round_number;
      red_score = body.red_score;
      blue_score = body.blue_score;
      notes = body.notes;
    } catch (jsonError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Validate input
    if (!round_number || red_score === undefined || blue_score === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: round_number, red_score, blue_score" },
        { status: 400 }
      );
    }

    if (red_score < 0 || red_score > 10 || blue_score < 0 || blue_score > 10) {
      return NextResponse.json(
        { error: "Scores must be between 0 and 10" },
        { status: 400 }
      );
    }

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

    // Upsert score
    const { data: score, error } = await supabase
      .from('bout_scores')
      .upsert({
        bout_id: params.id,
        round_number,
        red_score,
        blue_score,
        scored_by: user.id,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'bout_id,round_number'
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving score:", error);
      return NextResponse.json(
        { error: "Failed to save score" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, score });
  } catch (error) {
    console.error("Score API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get all scores for a bout
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseServer();

    const { data: scores, error } = await supabase
      .from('bout_scores')
      .select(`
        *,
        scorer:profiles!bout_scores_scored_by_fkey(
          id,
          username,
          full_name
        )
      `)
      .eq('bout_id', params.id)
      .order('round_number', { ascending: true });

    if (error) {
      console.error("Error fetching scores:", error);
      return NextResponse.json(
        { error: "Failed to fetch scores" },
        { status: 500 }
      );
    }

    return NextResponse.json({ scores: scores || [] });
  } catch (error) {
    console.error("Get scores API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

