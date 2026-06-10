// app/api/fighters/discipline-records/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerForRoute } from "@/lib/supabaseServerForRoute";

// GET: Fetch discipline records for a fighter
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
      .from("fighter_discipline_records")
      .select("*")
      .eq("fighter_profile_id", fighterId)
      .order("discipline", { ascending: true });

    if (error) {
      console.error("Error fetching discipline records:", error);
      return NextResponse.json(
        { error: "Failed to fetch discipline records" },
        { status: 500 }
      );
    }

    return NextResponse.json({ records: data || [] });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected error" },
      { status: 500 }
    );
  }
}

// POST: Add a new discipline record
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role?.toUpperCase() !== "FIGHTER") {
      return NextResponse.json(
        { error: "Only fighters can add discipline records" },
        { status: 403 }
      );
    }

    let discipline: string;
    let wins: number;
    let losses: number;
    let draws: number;
    try {
      const body = await req.json();
      discipline = body.discipline;
      wins = body.wins ?? 0;
      losses = body.losses ?? 0;
      draws = body.draws ?? 0;
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    if (!discipline || !discipline.trim()) {
      return NextResponse.json(
        { error: "discipline is required" },
        { status: 400 }
      );
    }

    if (wins < 0 || losses < 0 || draws < 0) {
      return NextResponse.json(
        { error: "wins, losses, and draws must be non-negative" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("fighter_discipline_records")
      .insert({
        fighter_profile_id: user.id,
        discipline: discipline.trim(),
        wins,
        losses,
        draws,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "You already have a record for this discipline. Edit the existing one instead." },
          { status: 409 }
        );
      }
      console.error("Error creating discipline record:", error);
      return NextResponse.json(
        { error: "Failed to create discipline record", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ record: data }, { status: 201 });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected error" },
      { status: 500 }
    );
  }
}
