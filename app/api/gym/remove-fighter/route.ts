import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerForRoute } from "@/lib/supabaseServerForRoute";

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

    let fighterId: string;
    try {
      const json = await req.json();
      fighterId = json.fighterId;
    } catch (jsonError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    if (!fighterId) {
      return NextResponse.json({ error: "Fighter ID is required" }, { status: 400 });
    }

    // Verify the current user is a gym
    const { data: gymProfile, error: gymError } = await supabase
      .from("profiles")
      .select("id, role, username")
      .eq("id", user.id)
      .single();

    if (gymError) {
      console.error("Gym profile lookup error:", gymError);
      return NextResponse.json({ error: "Failed to lookup gym profile" }, { status: 500 });
    }

    if (!gymProfile) {
      console.error("Gym profile not found for user:", user.id);
      return NextResponse.json({ error: "Gym profile not found" }, { status: 404 });
    }

    const roleLower = (gymProfile.role || "").toLowerCase();
    if (roleLower !== "gym") {
      return NextResponse.json({ error: "Only gym owners can remove fighters" }, { status: 403 });
    }

    // Get the fighter's current profile
    const { data: fighterProfile, error: fighterError } = await supabase
      .from("profiles")
      .select("id, social_links")
      .eq("id", fighterId)
      .single();

    if (fighterError || !fighterProfile) {
      return NextResponse.json({ error: "Fighter profile not found" }, { status: 404 });
    }

    // Verify the fighter is linked to this gym (using username only, as handle column doesn't exist)
    const gymIdentifier = gymProfile.username;
    const fighterGymUsername = fighterProfile.social_links?.gym_username;
    
    // Compare case-insensitively in case of casing differences
    if (fighterGymUsername?.toLowerCase() !== gymIdentifier?.toLowerCase()) {
      return NextResponse.json({ error: "Fighter is not linked to this gym" }, { status: 400 });
    }

    // Remove gym_username from social_links by setting it to null
    const currentSocialLinks = fighterProfile.social_links || {};
    const updatedSocialLinks = { ...currentSocialLinks, gym_username: null };

    // Update the fighter's profile (using service role for gym owner to update fighter profile)
    // We need to use a service role client here since RLS prevents gym owners from updating fighter profiles
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing Supabase environment variables");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ social_links: updatedSocialLinks })
      .eq("id", fighterId);

    if (updateError) {
      console.error("Remove fighter error", updateError);
      return NextResponse.json(
        { error: "Failed to remove fighter. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Fighter removed successfully" });
  } catch (err: any) {
    console.error("Remove fighter error", err);
    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
