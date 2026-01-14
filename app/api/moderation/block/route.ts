import { createSupabaseServer } from "@/lib/supabaseServer";
import { NextRequest, NextResponse } from "next/server";

// Block or unblock a user
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { blocked_id, action } = body;

    if (!blocked_id || !action) {
      return NextResponse.json(
        { error: "Missing required fields: blocked_id, action" },
        { status: 400 }
      );
    }

    if (action !== 'block' && action !== 'unblock') {
      return NextResponse.json(
        { error: "Invalid action. Must be 'block' or 'unblock'" },
        { status: 400 }
      );
    }

    if (blocked_id === user.id) {
      return NextResponse.json(
        { error: "Cannot block yourself" },
        { status: 400 }
      );
    }

    // Check if user exists
    const { data: blockedUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', blocked_id)
      .single();

    if (!blockedUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (action === 'block') {
      const { error } = await supabase
        .from('user_blocks')
        .insert({
          blocker_id: user.id,
          blocked_id,
        });

      if (error) {
        if (error.code === '23505') {
          return NextResponse.json(
            { success: true, message: "User already blocked" }
          );
        }
        console.error("Error blocking user:", error);
        return NextResponse.json(
          { error: "Failed to block user" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, message: "User blocked" });
    } else {
      // Unblock
      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', blocked_id);

      if (error) {
        console.error("Error unblocking user:", error);
        return NextResponse.json(
          { error: "Failed to unblock user" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, message: "User unblocked" });
    }
  } catch (error) {
    console.error("Block API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get list of blocked users
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: blocks, error } = await supabase
      .from('user_blocks')
      .select(`
        blocked_id,
        blocked:profiles!user_blocks_blocked_id_fkey(
          id,
          username,
          full_name,
          avatar_url
        ),
        created_at
      `)
      .eq('blocker_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching blocks:", error);
      return NextResponse.json(
        { error: "Failed to fetch blocked users" },
        { status: 500 }
      );
    }

    return NextResponse.json({ blocks: blocks || [] });
  } catch (error) {
    console.error("Get blocks API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

