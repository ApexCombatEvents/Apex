// app/api/fighters/fight-history/[id]/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerForRoute } from "@/lib/supabaseServerForRoute";

export const dynamic = "force-dynamic";

// PUT: Update a fight history entry
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = createSupabaseServerForRoute();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const resolvedParams = typeof params === 'object' && 'then' in params ? await params : params;
    const fightId = resolvedParams.id;

    const { data: existingFight } = await supabase
      .from("fighter_fight_history")
      .select("fighter_profile_id")
      .eq("id", fightId)
      .single();

    if (!existingFight) {
      return NextResponse.json(
        { error: "Fight history entry not found" },
        { status: 404 }
      );
    }

    if (existingFight.fighter_profile_id !== user.id) {
      return NextResponse.json(
        { error: "You can only update your own fight history" },
        { status: 403 }
      );
    }

    let event_name: string | undefined;
    let event_date: string | undefined;
    let opponent_name: string | undefined;
    let location: string | undefined;
    let result: string | null | undefined;
    let result_method: string | undefined;
    let result_round: number | undefined;
    let result_time: string | undefined;
    let weight_class: string | undefined;
    let martial_art: string | undefined;
    let notes: string | undefined;
    let poster_url: string | null | undefined;
    let is_upcoming: boolean | undefined;

    try {
      const body = await req.json();
      event_name = body.event_name;
      event_date = body.event_date;
      opponent_name = body.opponent_name;
      location = body.location;
      result = body.result ?? null;
      result_method = body.result_method;
      result_round = body.result_round;
      result_time = body.result_time;
      weight_class = body.weight_class;
      martial_art = body.martial_art;
      notes = body.notes;
      // Only treat poster_url as provided when the key is explicitly present,
      // so ordinary edits (which omit it) never wipe an existing poster.
      poster_url = "poster_url" in body ? body.poster_url : undefined;
      is_upcoming = body.is_upcoming !== undefined ? Boolean(body.is_upcoming) : undefined;
    } catch (jsonError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // If explicitly marking as past, result is required
    if (is_upcoming === false && (!result || !["win", "loss", "draw", "no_contest"].includes(result))) {
      return NextResponse.json(
        { error: "A result (win/loss/draw/no_contest) is required for past fights" },
        { status: 400 }
      );
    }

    if (result && !["win", "loss", "draw", "no_contest"].includes(result)) {
      return NextResponse.json(
        { error: "result must be win, loss, draw, or no_contest" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (event_name !== undefined) updateData.event_name = event_name;
    if (event_date !== undefined) updateData.event_date = event_date;
    if (opponent_name !== undefined) updateData.opponent_name = opponent_name;
    if (location !== undefined) updateData.location = location;
    if (result !== undefined) updateData.result = result;
    if (result_method !== undefined) updateData.result_method = result_method;
    if (result_round !== undefined) updateData.result_round = result_round;
    if (result_time !== undefined) updateData.result_time = result_time;
    if (weight_class !== undefined) updateData.weight_class = weight_class;
    if (martial_art !== undefined) updateData.martial_art = martial_art;
    if (notes !== undefined) updateData.notes = notes;
    if (poster_url !== undefined) updateData.poster_url = poster_url || null;

    const { data, error } = await supabase
      .from("fighter_fight_history")
      .update(updateData)
      .eq("id", fightId)
      .select()
      .single();

    if (error) {
      console.error("Error updating fight history:", error);
      return NextResponse.json(
        { error: "Failed to update fight history entry" },
        { status: 500 }
      );
    }

    return NextResponse.json({ fight: data });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected error" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a fight history entry
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = createSupabaseServerForRoute();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const resolvedParams = typeof params === 'object' && 'then' in params ? await params : params;
    const fightId = resolvedParams.id;

    const { data: existingFight } = await supabase
      .from("fighter_fight_history")
      .select("fighter_profile_id")
      .eq("id", fightId)
      .single();

    if (!existingFight) {
      return NextResponse.json(
        { error: "Fight history entry not found" },
        { status: 404 }
      );
    }

    if (existingFight.fighter_profile_id !== user.id) {
      return NextResponse.json(
        { error: "You can only delete your own fight history" },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("fighter_fight_history")
      .delete()
      .eq("id", fightId);

    if (error) {
      console.error("Error deleting fight history:", error);
      return NextResponse.json(
        { error: "Failed to delete fight history entry" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected error" },
      { status: 500 }
    );
  }
}
