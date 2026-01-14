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

    if (!profile || profile.role !== "FIGHTER") {
      return NextResponse.json(
        { error: "Only fighters can add fight history" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      event_name,
      event_date,
      opponent_name,
      location,
      result,
      result_method,
      result_round,
      result_time,
      weight_class,
      martial_art,
      notes,
    } = body;

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
        { error: "Failed to create fight history entry" },
        { status: 500 }
      );
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

