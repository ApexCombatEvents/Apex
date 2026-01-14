import { createSupabaseServer } from "@/lib/supabaseServer";
import { NextRequest, NextResponse } from "next/server";

// GET all reports (admin only)
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role?.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    // Get reports with reporter info
    const { data: reports, error } = await supabase
      .from('content_reports')
      .select(`
        *,
        reporter:profiles!content_reports_reporter_id_fkey(
          id,
          username,
          full_name,
          avatar_url
        ),
        reviewer:profiles!content_reports_reviewed_by_fkey(
          id,
          username,
          full_name
        )
      `)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error fetching reports:", error);
      return NextResponse.json(
        { error: "Failed to fetch reports" },
        { status: 500 }
      );
    }

    return NextResponse.json({ reports: reports || [] });
  } catch (error) {
    console.error("Reports API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

