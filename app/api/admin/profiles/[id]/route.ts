import { createServerClient } from "@supabase/ssr";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// Create admin client with service role key (bypasses RLS)
function createSupabaseAdmin() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    }
  );
}

// DELETE a profile (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const profileId = params.id;
    
    if (!profileId) {
      return NextResponse.json({ error: "Profile ID required" }, { status: 400 });
    }

    // Use regular client to check auth
    const supabase = createSupabaseServer();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!adminProfile || adminProfile.role?.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    // Prevent admin from deleting themselves
    if (profileId === user.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    // Use admin client to delete (bypasses RLS)
    const supabaseAdmin = createSupabaseAdmin();
    
    // First check if profile exists
    const { data: targetProfile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('id, username, full_name')
      .eq('id', profileId)
      .single();

    if (fetchError || !targetProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Delete the profile
    const { error: deleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', profileId);

    if (deleteError) {
      console.error("Error deleting profile:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete profile", details: deleteError.message },
        { status: 500 }
      );
    }

    // Also delete the auth user if possible
    try {
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(profileId);
      if (authDeleteError) {
        console.warn("Could not delete auth user:", authDeleteError);
        // Don't fail the request - profile is already deleted
      }
    } catch (authErr) {
      console.warn("Auth user deletion not available:", authErr);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Profile ${targetProfile.username || targetProfile.full_name || profileId} deleted` 
    });
  } catch (error) {
    console.error("Admin profile delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
