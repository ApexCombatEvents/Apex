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

    // Get reports
    const { data: reports, error } = await supabase
      .from('content_reports')
      .select('*')
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

    // Load reporter and reviewer profiles separately
    const reporterIds = new Set<string>();
    const reviewerIds = new Set<string>();
    
    (reports || []).forEach((report: any) => {
      if (report.reporter_id) reporterIds.add(report.reporter_id);
      if (report.reviewed_by) reviewerIds.add(report.reviewed_by);
    });

    const allProfileIds = Array.from(new Set([...reporterIds, ...reviewerIds]));
    const profilesById: Record<string, any> = {};

    if (allProfileIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', allProfileIds);

      if (profiles) {
        profiles.forEach((profile) => {
          profilesById[profile.id] = profile;
        });
      }
    }

    // Map reports with profile data
    const reportsWithProfiles = (reports || []).map((report: any) => ({
      ...report,
      reporter: report.reporter_id ? profilesById[report.reporter_id] || null : null,
      reviewer: report.reviewed_by ? profilesById[report.reviewed_by] || null : null,
    }));

    return NextResponse.json({ reports: reportsWithProfiles });
  } catch (error) {
    console.error("Reports API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

