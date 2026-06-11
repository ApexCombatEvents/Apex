// app/api/fighters/discipline-records/[id]/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerForRoute } from "@/lib/supabaseServerForRoute";

// PUT: Update a discipline record
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
    const recordId = resolvedParams.id;

    const { data: existing } = await supabase
      .from("fighter_discipline_records")
      .select("fighter_profile_id")
      .eq("id", recordId)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Discipline record not found" },
        { status: 404 }
      );
    }

    if (existing.fighter_profile_id !== user.id) {
      return NextResponse.json(
        { error: "You can only update your own discipline records" },
        { status: 403 }
      );
    }

    let discipline: string | undefined;
    let wins: number | undefined;
    let losses: number | undefined;
    let draws: number | undefined;
    try {
      const body = await req.json();
      discipline = body.discipline;
      wins = body.wins;
      losses = body.losses;
      draws = body.draws;
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    if (wins !== undefined && wins < 0 ||
        losses !== undefined && losses < 0 ||
        draws !== undefined && draws < 0) {
      return NextResponse.json(
        { error: "wins, losses, and draws must be non-negative" },
        { status: 400 }
      );
    }

    const updateData: Record<string, any> = {};
    if (discipline !== undefined) updateData.discipline = discipline.trim();
    if (wins !== undefined) updateData.wins = wins;
    if (losses !== undefined) updateData.losses = losses;
    if (draws !== undefined) updateData.draws = draws;

    const { data, error } = await supabase
      .from("fighter_discipline_records")
      .update(updateData)
      .eq("id", recordId)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "You already have a record for this discipline." },
          { status: 409 }
        );
      }
      console.error("Error updating discipline record:", error);
      return NextResponse.json(
        { error: "Failed to update discipline record" },
        { status: 500 }
      );
    }

    return NextResponse.json({ record: data });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected error" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a discipline record
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
    const recordId = resolvedParams.id;

    const { data: existing } = await supabase
      .from("fighter_discipline_records")
      .select("fighter_profile_id")
      .eq("id", recordId)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Discipline record not found" },
        { status: 404 }
      );
    }

    if (existing.fighter_profile_id !== user.id) {
      return NextResponse.json(
        { error: "You can only delete your own discipline records" },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("fighter_discipline_records")
      .delete()
      .eq("id", recordId);

    if (error) {
      console.error("Error deleting discipline record:", error);
      return NextResponse.json(
        { error: "Failed to delete discipline record" },
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
