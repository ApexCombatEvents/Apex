import { createSupabaseServer } from "@/lib/supabaseServer";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let content_type: string;
    let content_id: string;
    let reason: string;
    let description: string | undefined;
    try {
      const body = await request.json();
      content_type = body.content_type;
      content_id = body.content_id;
      reason = body.reason;
      description = body.description;
    } catch (jsonError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Validate input
    if (!content_type || !content_id || !reason) {
      return NextResponse.json(
        { error: "Missing required fields: content_type, content_id, reason" },
        { status: 400 }
      );
    }

    const validTypes = ['post', 'profile_post_comment', 'event_comment'];
    if (!validTypes.includes(content_type)) {
      return NextResponse.json(
        { error: "Invalid content_type" },
        { status: 400 }
      );
    }

    const validReasons = ['spam', 'harassment', 'hate_speech', 'inappropriate', 'false_info', 'other'];
    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        { error: "Invalid reason" },
        { status: 400 }
      );
    }

    // Check if content exists
    let contentExists = false;
    if (content_type === 'post') {
      const { data } = await supabase
        .from('profile_posts')
        .select('id')
        .eq('id', content_id)
        .single();
      contentExists = !!data;
    } else if (content_type === 'profile_post_comment') {
      const { data } = await supabase
        .from('profile_post_comments')
        .select('id')
        .eq('id', content_id)
        .single();
      contentExists = !!data;
    } else if (content_type === 'event_comment') {
      const { data } = await supabase
        .from('event_comments')
        .select('id')
        .eq('id', content_id)
        .single();
      contentExists = !!data;
    }

    if (!contentExists) {
      return NextResponse.json(
        { error: "Content not found" },
        { status: 404 }
      );
    }

    // Create report (handle duplicate gracefully)
    const { data: report, error } = await supabase
      .from('content_reports')
      .insert({
        reporter_id: user.id,
        content_type,
        content_id,
        reason,
        description: description || null,
      })
      .select()
      .single();

    if (error) {
      // Check if it's a duplicate
      if (error.code === '23505') {
        return NextResponse.json(
          { error: "You have already reported this content" },
          { status: 409 }
        );
      }
      console.error("Error creating report:", error);
      return NextResponse.json(
        { error: "Failed to create report" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, report }, { status: 201 });
  } catch (error) {
    console.error("Report API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

