// components/events/EventFollowButton.tsx
"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type EventFollowButtonProps = {
  eventId: string;
  eventName: string;
};

export default function EventFollowButton({
  eventId,
  eventName,
}: EventFollowButtonProps) {
  const supabase = createSupabaseBrowser();
  const [userId, setUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        setUserId(null);
        setIsFollowing(false);
        setLoading(false);
        return;
      }

      setUserId(user.id);

      // Check if following
      const { data, error } = await supabase
        .from("event_follows")
        .select("id")
        .eq("profile_id", user.id)
        .eq("event_id", eventId)
        .single();

      if (!error && data) {
        setIsFollowing(true);
      } else {
        setIsFollowing(false);
      }
      setLoading(false);
    }
    load();
  }, [supabase, eventId]);

  async function toggleFollow() {
    if (!userId || busy) return;

    setBusy(true);
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from("event_follows")
          .delete()
          .eq("profile_id", userId)
          .eq("event_id", eventId);

        if (error) {
          console.error("Unfollow error", error);
        } else {
          setIsFollowing(false);
        }
      } else {
        // Follow
        const { error } = await supabase
          .from("event_follows")
          .insert({
            profile_id: userId,
            event_id: eventId,
          });

        if (error) {
          console.error("Follow error", error);
        } else {
          setIsFollowing(true);
          
          // Create notification for event owner
          try {
            const { data: event } = await supabase
              .from("events")
              .select("owner_profile_id, name, title")
              .eq("id", eventId)
              .single();
            
            if (event && event.owner_profile_id && event.owner_profile_id !== userId) {
              const { data: followerProfile } = await supabase
                .from("profiles")
                .select("full_name, username, display_name, handle")
                .eq("id", userId)
                .single();
              
              // Try all possible name fields, with username/handle as fallback (no user ID fallback)
              const followerName = followerProfile?.display_name || 
                                  followerProfile?.full_name || 
                                  followerProfile?.username || 
                                  (followerProfile?.handle ? `@${followerProfile.handle}` : null);
              
              // Only create notification if we have a name
              if (!followerName) {
                console.warn("⚠️ Cannot create event_follow notification: no name found for user", userId);
                return;
              }
              
              // Use username if available, otherwise handle
              const followerHandle = followerProfile?.username || followerProfile?.handle || null;
              
              await supabase.from("notifications").insert({
                profile_id: event.owner_profile_id,
                type: "event_follow",
                actor_profile_id: userId,
                data: {
                  event_id: eventId,
                  event_name: event.title || event.name || "Event",
                  follower_name: followerName,
                  follower_handle: followerHandle,
                },
              });
            }
          } catch (notifError) {
            console.error("Event follow notification error", notifError);
            // Don't throw - the follow succeeded
          }
        }
      }
    } finally {
      setBusy(false);
    }
  }

  if (loading || !userId) {
    return null; // Don't show button if not logged in or still loading
  }

  return (
    <button
      type="button"
      onClick={toggleFollow}
      disabled={busy}
      className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors disabled:opacity-60 ${
        isFollowing
          ? "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {busy ? "…" : isFollowing ? "Following" : "Follow event"}
    </button>
  );
}

