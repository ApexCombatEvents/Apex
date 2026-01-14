// app/api/fighters/fight-history/[id]/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerForRoute } from "@/lib/supabaseServerForRoute";

// PUT: Update a fight history entry
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
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

    // Verify the fight history entry belongs to the user
    const { data: existingFight } = await supabase
      .from("fighter_fight_history")
      .select("fighter_profile_id")
      .eq("id", params.id)
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
    if (result && !["win", "loss", "draw", "no_contest"].includes(result)) {
      return NextResponse.json(
        { error: "result must be win, loss, draw, or no_contest" },
        { status: 400 }
      );
    }

    const updateData: any = {};
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

    const { data, error } = await supabase
      .from("fighter_fight_history")
      .update(updateData)
      .eq("id", params.id)
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
  { params }: { params: { id: string } }
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

    // Verify the fight history entry belongs to the user
    const { data: existingFight } = await supabase
      .from("fighter_fight_history")
      .select("fighter_profile_id")
      .eq("id", params.id)
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
      .eq("id", params.id);

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

