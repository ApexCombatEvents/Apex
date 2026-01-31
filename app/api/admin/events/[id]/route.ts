import { createServerClient } from "@supabase/ssr";
import { createSupabaseServer } from "@/lib/supabaseServer";
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

// DELETE an event (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;
    
    if (!eventId) {
      return NextResponse.json({ error: "Event ID required" }, { status: 400 });
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

    // Use admin client to delete (bypasses RLS)
    const supabaseAdmin = createSupabaseAdmin();
    
    // First check if event exists
    const { data: targetEvent, error: fetchError } = await supabaseAdmin
      .from('events')
      .select('id, title, name')
      .eq('id', eventId)
      .single();

    if (fetchError || !targetEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Delete the event
    const { error: deleteError } = await supabaseAdmin
      .from('events')
      .delete()
      .eq('id', eventId);

    if (deleteError) {
      console.error("Error deleting event:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete event", details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: `Event ${targetEvent.title || targetEvent.name || eventId} deleted` 
    });
  } catch (error) {
    console.error("Admin event delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
