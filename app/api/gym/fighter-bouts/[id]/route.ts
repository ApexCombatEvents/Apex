// app/api/gym/fighter-bouts/[id]/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerForRoute } from "@/lib/supabaseServerForRoute";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> | { id: string } };

async function resolveId(params: Params["params"]): Promise<string> {
  const resolved = typeof params === "object" && "then" in params ? await params : params;
  return resolved.id;
}

// PUT: Update a fighter bout
export async function PUT(req: Request, { params }: Params) {
  try {
    const supabase = createSupabaseServerForRoute();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const boutId = await resolveId(params);

    const { data: existing } = await supabase
      .from("gym_fighter_bouts")
      .select("gym_profile_id")
      .eq("id", boutId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Fighter bout not found" }, { status: 404 });
    }

    if (existing.gym_profile_id !== user.id) {
      return NextResponse.json({ error: "You can only update your own fighter bouts" }, { status: 403 });
    }

    let body: Record<string, any>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    const fields = [
      "fighter_name", "fighter_profile_id", "event_name", "event_date",
      "opponent_name", "location", "weight_class", "discipline",
      "tickets_url", "fighter_social", "notes",
    ];
    for (const field of fields) {
      if (body[field] !== undefined) updateData[field] = body[field] ?? null;
    }

    const { data, error } = await supabase
      .from("gym_fighter_bouts")
      .update(updateData)
      .eq("id", boutId)
      .select()
      .single();

    if (error) {
      console.error("Error updating gym fighter bout:", error);
      return NextResponse.json({ error: "Failed to update fighter bout" }, { status: 500 });
    }

    return NextResponse.json({ bout: data });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

// DELETE: Remove a fighter bout
export async function DELETE(req: Request, { params }: Params) {
  try {
    const supabase = createSupabaseServerForRoute();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const boutId = await resolveId(params);

    const { data: existing } = await supabase
      .from("gym_fighter_bouts")
      .select("gym_profile_id")
      .eq("id", boutId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Fighter bout not found" }, { status: 404 });
    }

    if (existing.gym_profile_id !== user.id) {
      return NextResponse.json({ error: "You can only delete your own fighter bouts" }, { status: 403 });
    }

    const { error } = await supabase
      .from("gym_fighter_bouts")
      .delete()
      .eq("id", boutId);

    if (error) {
      console.error("Error deleting gym fighter bout:", error);
      return NextResponse.json({ error: "Failed to delete fighter bout" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
