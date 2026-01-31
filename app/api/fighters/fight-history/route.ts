// app/api/fighters/fight-history/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerForRoute } from "@/lib/supabaseServerForRoute";

// GET: Fetch fight history for a fighter
export async function GET(req: Request) {
  try {
    const supabase = createSupabaseServerForRoute();
    const { searchParams } = new URL(req.url);
    const fighterId = searchParams.get("fighter_id");

    if (!fighterId) {
      return NextResponse.json(
        { error: "fighter_id is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("fighter_fight_history")
      .select("*")
      .eq("fighter_profile_id", fighterId)
      .order("event_date", { ascending: false });

    if (error) {
      console.error("Error fetching fight history:", error);
      return NextResponse.json(
        { error: "Failed to fetch fight history" },
        { status: 500 }
      );
    }

    return NextResponse.json({ fights: data || [] });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected error" },
      { status: 500 }
    );
  }
}

// POST: Add a new fight history entry
export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServerForRoute();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify user is a fighter
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role?.toUpperCase() !== "FIGHTER") {
      return NextResponse.json(
        { error: "Only fighters can add fight history" },
        { status: 403 }
      );
    }

    let event_name: string;
    let event_date: string;
    let opponent_name: string | undefined;
    let location: string | undefined;
    let result: string | undefined;
    let result_method: string | undefined;
    let result_round: number | undefined;
    let result_time: string | undefined;
    let weight_class: string | undefined;
    let martial_art: string | undefined;
    let notes: string | undefined;
    try {
      const body = await req.json();
      event_name = body.event_name;
      event_date = body.event_date;
      opponent_name = body.opponent_name;
      location = body.location;
      result = body.result;
      result_method = body.result_method;
      result_round = body.result_round;
      result_time = body.result_time;
      weight_class = body.weight_class;
      martial_art = body.martial_art;
      notes = body.notes;
    } catch (jsonError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Validation
    if (!event_name || !event_date || !opponent_name || !result) {
      return NextResponse.json(
        { error: "event_name, event_date, opponent_name, and result are required" },
        { status: 400 }
      );
    }

    if (!["win", "loss", "draw", "no_contest"].includes(result)) {
      return NextResponse.json(
        { error: "result must be win, loss, draw, or no_contest" },
        { status: 400 }
      );
    }

    // Validate that event_date is not in the future
    const eventDateObj = new Date(event_date);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    if (eventDateObj > today) {
      return NextResponse.json(
        { error: "Fight history dates cannot be in the future" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("fighter_fight_history")
      .insert({
        fighter_profile_id: user.id,
        event_name,
        event_date,
        opponent_name,
        location: location || null,
        result,
        result_method: result_method || null,
        result_round: result_round || null,
        result_time: result_time || null,
        weight_class: weight_class || null,
        martial_art: martial_art || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating fight history:", error);
      return NextResponse.json(
        { error: "Failed to create fight history entry", details: error.message },
        { status: 500 }
      );
    }

    // Trigger record update
    try {
      await fetch(`${new URL(req.url).origin}/api/fighters/update-record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fighterId: user.id }),
      });
    } catch (updateError) {
      console.error("Error triggering record update after manual fight entry:", updateError);
    }

    return NextResponse.json({ fight: data }, { status: 201 });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected error" },
      { status: 500 }
    );
  }
}

