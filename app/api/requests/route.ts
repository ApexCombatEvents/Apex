import { NextResponse } from "next/server";
import { createSupabaseServerForRoute } from "@/lib/supabaseServerForRoute";

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServerForRoute();
    const { gym_id, fighter_id } = await request.json();

    // Insert a new join request
    const { error } = await supabase
      .from("gym_membership_requests")
      .insert([
        {
          gym_id,
          fighter_id,
          status: "pending",
        },
      ]);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Request sent!" });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
