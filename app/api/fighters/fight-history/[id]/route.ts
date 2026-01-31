// app/api/fighters/fight-history/[id]/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerForRoute } from "@/lib/supabaseServerForRoute";

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

    // Handle params as Promise (Next.js 15+) or direct object
    const resolvedParams = typeof params === 'object' && 'then' in params ? await params : params;
    const fightId = resolvedParams.id;

    // Verify the fight history entry belongs to the user
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
    if (result && !["win", "loss", "draw", "no_contest"].includes(result)) {
      return NextResponse.json(
        { error: "result must be win, loss, draw, or no_contest" },
        { status: 400 }
      );
    }

    // Validate that event_date is not in the future (if provided)
    if (event_date) {
      const eventDateObj = new Date(event_date);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today
      
      if (eventDateObj > today) {
        return NextResponse.json(
          { error: "Fight history dates cannot be in the future" },
          { status: 400 }
        );
      }
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

    // NOTE: Manual fight history does NOT auto-update the record anymore
    // Users should manually update their record in settings if they want to include manual fights
    
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

    // Handle params as Promise (Next.js 15+) or direct object
    const resolvedParams = typeof params === 'object' && 'then' in params ? await params : params;
    const fightId = resolvedParams.id;

    // Verify the fight history entry belongs to the user
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

    // NOTE: Manual fight history does NOT auto-update the record anymore
    // Users should manually update their record in settings if they want to reflect changes
    
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected error" },
      { status: 500 }
    );
  }
}

