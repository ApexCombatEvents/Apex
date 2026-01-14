"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type EventReactionsProps = {
  eventId: string;
};

export default function EventReactions({ eventId }: EventReactionsProps) {
  const supabase = createSupabaseBrowser();

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const [commentCount, setCommentCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      setLoading(true);

      // 1) current user
      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData.user ?? null;
      if (!cancelled) {
        setUserId(currentUser ? currentUser.id : null);
      }

      // 2) likes for this event
      const { data: likesData, error: likesError, count: likesCount } =
        await supabase
          .from("event_likes")
          .select("profile_id", { count: "exact" })
          .eq("event_id", eventId);

      if (!cancelled) {
        if (likesError) {
          console.error("EventReactions likes error", likesError);
          setLikeCount(0);
        } else {
          setLikeCount(likesCount ?? (likesData?.length ?? 0));
          if (currentUser && likesData) {
            setLiked(
              likesData.some((row) => row.profile_id === currentUser.id)
            );
          }
        }
      }

      // 3) comment count for this event
      const {
        data: commentsData,
        error: commentsError,
        count: commentsCount,
      } = await supabase
        .from("event_comments")
        .select("id", { count: "exact" })
        .eq("event_id", eventId);

      if (!cancelled) {
        if (commentsError) {
          console.error("EventReactions comments count error", commentsError);
          setCommentCount(0);
        } else {
          setCommentCount(commentsCount ?? (commentsData?.length ?? 0));
        }
      }

      if (!cancelled) setLoading(false);
    }

    loadInitial();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function toggleLike() {
    if (!userId) {
      alert("Please sign in to like events.");
      return;
    }

    if (liked) {
      // unlike
      setLiked(false);
      setLikeCount((c) => Math.max(0, c - 1));

      const { error } = await supabase
        .from("event_likes")
        .delete()
        .eq("event_id", eventId)
        .eq("profile_id", userId);

      if (error) {
        console.error("Event unlike error", error);
        // rollback
        setLiked(true);
        setLikeCount((c) => c + 1);
      }
    } else {
      // like
      setLiked(true);
      setLikeCount((c) => c + 1);

      const { error } = await supabase
        .from("event_likes")
        .insert({ event_id: eventId, profile_id: userId });

      if (error) {
        console.error("Event like error", error);
        // rollback
        setLiked(false);
        setLikeCount((c) => Math.max(0, c - 1));
      } else {
        // Create notification for event owner
        try {
          const { data: event } = await supabase
            .from("events")
            .select("owner_profile_id, name")
            .eq("id", eventId)
            .single();
          
          if (event && event.owner_profile_id !== userId) {
            const { data: likerProfile } = await supabase
              .from("profiles")
              .select("handle, display_name, full_name, username")
              .eq("id", userId)
              .single();
            
            const likerName = likerProfile?.display_name || 
                             likerProfile?.full_name || 
                             likerProfile?.username || 
                             likerProfile?.handle || 
                             "Someone";
            
            await supabase.from("notifications").insert({
              profile_id: event.owner_profile_id,
              type: "event_like",
              actor_profile_id: userId,
              data: {
                event_id: eventId,
                event_name: event.name,
                liker_name: likerName,
                liker_handle: likerProfile?.handle || likerProfile?.username,
              },
            });
          }
        } catch (notifError) {
          console.error("Event like notification error", notifError);
          // Don't throw - the like succeeded
        }
      }
    }
  }

  if (loading) {
    return (
      <div className="mt-2 text-[11px] text-slate-400">
        Loading reactions…
      </div>
    );
  }

  return (
    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-600">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleLike}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${
            liked
              ? "border-purple-300 bg-purple-50 text-purple-700"
              : "border-slate-200 bg-white text-slate-600 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700"
          }`}
        >
          <span>{liked ? "♥" : "♡"}</span>
          <span>
            {likeCount} {likeCount === 1 ? "like" : "likes"}
          </span>
        </button>

        <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-slate-600">
          <span>💬</span>
          <span>
            {commentCount} {commentCount === 1 ? "comment" : "comments"}
          </span>
        </div>
      </div>
    </div>
  );
}
