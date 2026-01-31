import { createSupabaseServer } from "@/lib/supabaseServer";
import { NextRequest, NextResponse } from "next/server";

// Update report status (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const supabase = createSupabaseServer();
    
    // Handle both sync and async params (Next.js 13 vs 15)
    const resolvedParams = await Promise.resolve(params);
    const reportId = resolvedParams.id;
    
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

    let status: string;
    let resolution_notes: string | undefined;
    let moderation_action: string | undefined;
    try {
      const body = await request.json();
      status = body.status;
      resolution_notes = body.resolution_notes;
      moderation_action = body.moderation_action;
    } catch (jsonError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    const validStatuses = ['pending', 'reviewing', 'resolved', 'dismissed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    // Update report
    const updateData: any = {
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    };

    if (resolution_notes) {
      updateData.resolution_notes = resolution_notes;
    }

    const { data: report, error: reportError } = await supabase
      .from('content_reports')
      .update(updateData)
      .eq('id', reportId)
      .select()
      .single();

    if (reportError) {
      console.error("Error updating report:", reportError);
      return NextResponse.json(
        { error: "Failed to update report" },
        { status: 500 }
      );
    }

    // Handle moderation action if provided
    if (moderation_action && report) {
      const { content_type, content_id } = report;
      
      let tableName = '';
      if (content_type === 'post') {
        tableName = 'profile_posts'; // Fixed: use profile_posts not posts
      } else if (content_type === 'profile_post_comment') {
        tableName = 'profile_post_comments';
      } else if (content_type === 'event_comment') {
        tableName = 'event_comments';
      }

      if (tableName && moderation_action !== 'none') {
        let moderationStatus = 'approved';
        if (moderation_action === 'hide') {
          moderationStatus = 'hidden';
        } else if (moderation_action === 'delete') {
          moderationStatus = 'deleted';
        }

        const { error: modError } = await supabase
          .from(tableName)
          .update({
            moderation_status: moderationStatus,
            moderated_by: user.id,
            moderated_at: new Date().toISOString(),
            moderation_notes: resolution_notes || null,
          })
          .eq('id', content_id);

        if (modError) {
          console.error("Error applying moderation:", modError);
          // Don't fail the request, just log
        }
      }
    }

    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error("Update report API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

