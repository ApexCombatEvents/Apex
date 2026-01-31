import { NextResponse } from "next/server";
import { createSupabaseServerForRoute } from "@/lib/supabaseServerForRoute";

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServerForRoute();
    let gym_id: string;
    let fighter_id: string;
    try {
      const json = await request.json();
      gym_id = json.gym_id;
      fighter_id = json.fighter_id;
    } catch (jsonError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

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
