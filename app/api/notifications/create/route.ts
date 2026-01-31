import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Validate environment variables at module load
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing required Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { profile_id, type, actor_profile_id, data } = json;

    if (!profile_id || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: profile_id, type' },
        { status: 400 }
      );
    }

    // If actor_profile_id is provided, fetch actor profile info to include in notification data
    let notificationData = data || {};
    if (actor_profile_id) {
      try {
        const { data: actorProfile } = await supabaseAdmin
          .from('profiles')
          .select('id, display_name, full_name, username, handle')
          .eq('id', actor_profile_id)
          .single();

        if (actorProfile) {
          const actorName = actorProfile.display_name || 
                           actorProfile.full_name || 
                           actorProfile.username || 
                           actorProfile.handle || 
                           null;
          const actorHandle = actorProfile.username || actorProfile.handle || null;

          // Add actor info to notification data based on notification type
          if (type === 'follow' || type === 'event_follow') {
            notificationData.follower_name = actorName;
            notificationData.follower_handle = actorHandle;
          } else if (type === 'post_like' || type === 'event_like') {
            notificationData.liker_name = actorName;
            notificationData.liker_handle = actorHandle;
          } else if (type === 'post_comment' || type === 'event_comment') {
            notificationData.commenter_name = actorName;
            notificationData.commenter_handle = actorHandle;
          }
          // For other types, we can add generic actor info
          if (!notificationData.actor_name) {
            notificationData.actor_name = actorName;
            notificationData.actor_handle = actorHandle;
          }
        }
      } catch (actorError) {
        console.error('Error fetching actor profile:', actorError);
        // Continue without actor info - notification will still be created
      }
    }

    // Create notification using admin client to bypass RLS
    const { data: notification, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        profile_id,
        type,
        actor_profile_id: actor_profile_id || null,
        data: notificationData,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Notification creation error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create notification' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: notification.id });
  } catch (error: any) {
    console.error('Notification API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create notification' },
      { status: 500 }
    );
  }
}
