// app/api/gym/fighter-bouts/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerForRoute } from "@/lib/supabaseServerForRoute";

// GET: Fetch all fighter bouts added by a gym
export async function GET(req: Request) {
  try {
    const supabase = createSupabaseServerForRoute();
    const { searchParams } = new URL(req.url);
    const gymId = searchParams.get("gym_id");

    if (!gymId) {
      return NextResponse.json({ error: "gym_id is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("gym_fighter_bouts")
      .select("*")
      .eq("gym_profile_id", gymId)
      .order("event_date", { ascending: true });

    if (error) {
      console.error("Error fetching gym fighter bouts:", error);
      return NextResponse.json({ error: "Failed to fetch fighter bouts" }, { status: 500 });
    }

    return NextResponse.json({ bouts: data || [] });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

// POST: Add a new fighter bout
export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServerForRoute();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify the user is a gym
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role?.toUpperCase() !== "GYM") {
      return NextResponse.json({ error: "Only gym accounts can add fighter bouts" }, { status: 403 });
    }

    let body: Record<string, any>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { fighter_name, event_name, event_date } = body;

    if (!fighter_name || !event_name || !event_date) {
      return NextResponse.json(
        { error: "fighter_name, event_name, and event_date are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("gym_fighter_bouts")
      .insert({
        gym_profile_id: user.id,
        fighter_name,
        fighter_profile_id: body.fighter_profile_id || null,
        event_name,
        event_date,
        opponent_name: body.opponent_name || null,
        location: body.location || null,
        weight_class: body.weight_class || null,
        discipline: body.discipline || null,
        tickets_url: body.tickets_url || null,
        fighter_social: body.fighter_social || null,
        notes: body.notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating gym fighter bout:", error);
      return NextResponse.json(
        { error: "Failed to create fighter bout", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ bout: data }, { status: 201 });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
