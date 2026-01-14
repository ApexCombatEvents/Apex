"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type EventDiscussionProps = {
  eventId: string;
};

type EventComment = {
  id: string;
  content: string;
  created_at: string;
  author_profile_id: string | null;
};

type ProfileLite = {
  id: string;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
};

export default function EventDiscussion({ eventId }: EventDiscussionProps) {
  const supabase = createSupabaseBrowser();

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [comments, setComments] = useState<EventComment[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, ProfileLite>>(
    {}
  );

  const [newComment, setNewComment] = useState("");
  const [savingComment, setSavingComment] = useState(false);

  // Load current user + comments + author profiles
  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      setLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData.user ?? null;
      if (!cancelled) {
        setUserId(currentUser ? currentUser.id : null);
      }

      const { data: commentsData, error: commentsError } = await supabase
        .from("event_comments")
        .select("id, content, created_at, author_profile_id")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (commentsError) {
        console.error("EventDiscussion comments load error", commentsError);
        if (!cancelled) {
          setComments([]);
          setProfilesById({});
          setLoading(false);
        }
        return;
      }

      const loadedComments = (commentsData as EventComment[]) || [];

      // Load author profiles in one go
      const authorIds = Array.from(
        new Set(
          loadedComments
            .map((c) => c.author_profile_id)
            .filter((id): id is string => !!id)
        )
      );

      let profilesMap: Record<string, ProfileLite> = {};
      if (authorIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .in("id", authorIds);

        if (profilesError) {
          console.error("EventDiscussion profile load error", profilesError);
        } else if (profilesData) {
          (profilesData as ProfileLite[]).forEach((p) => {
            profilesMap[p.id] = p;
          });
        }
      }

      if (!cancelled) {
        setComments(loadedComments);
        setProfilesById(profilesMap);
        setLoading(false);
      }
    }

    loadInitial();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) {
      alert("Please sign in to comment on events.");
      return;
    }

    const text = newComment.trim();
    if (!text) return;

    setSavingComment(true);

    const { data, error } = await supabase
      .from("event_comments")
      .insert({
        event_id: eventId,
        author_profile_id: userId,
        content: text,
      })
      .select("id, content, created_at, author_profile_id")
      .single();

    if (error) {
      console.error("EventDiscussion add comment error", error);
      setSavingComment(false);
      return;
    }

    const newRow = data as EventComment;

    // Ensure we have this user's profile in profilesById
    if (!profilesById[userId]) {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .eq("id", userId)
        .single();

      if (!profileError && profileData) {
        setProfilesById((prev) => ({
          ...prev,
          [userId]: profileData as ProfileLite,
        }));
      }
    }

    // Create notification for event owner
    try {
      const { data: event } = await supabase
        .from("events")
        .select("owner_profile_id, name")
        .eq("id", eventId)
        .single();
      
      if (event && event.owner_profile_id !== userId) {
        const { data: commenterProfile } = await supabase
          .from("profiles")
          .select("handle, display_name, full_name, username")
          .eq("id", userId)
          .single();
        
        const commenterName = commenterProfile?.display_name || 
                            commenterProfile?.full_name || 
                            commenterProfile?.username || 
                            commenterProfile?.handle || 
                            "Someone";
        
        await supabase.from("notifications").insert({
          profile_id: event.owner_profile_id,
          type: "event_comment",
          actor_profile_id: userId,
          data: {
            event_id: eventId,
            event_name: event.name,
            comment_id: newRow.id,
            commenter_name: commenterName,
            commenter_handle: commenterProfile?.handle || commenterProfile?.username,
            comment_preview: text.slice(0, 80),
          },
        });
      }
    } catch (notifError) {
      console.error("Event comment notification error", notifError);
      // Don't throw - the comment succeeded
    }

    setComments((prev) => [newRow, ...prev]); // Add new comment at the beginning
    setNewComment("");
    setSavingComment(false);
  }

  return (
    <div>
      {loading ? (
        <p className="text-xs text-slate-500">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-slate-500 mb-3">
          No comments yet. Be the first to say something about this event.
        </p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1 mb-3">
          {comments.map((c) => {
            const author = c.author_profile_id
              ? profilesById[c.author_profile_id]
              : undefined;

            const displayName =
              author?.full_name || author?.username || "Profile";

            return (
              <div
                key={c.id}
                className="flex items-start gap-2 rounded-lg bg-slate-50 px-2 py-1.5 text-xs"
              >
                {author?.avatar_url ? (
                  <div className="h-7 w-7 rounded-full overflow-hidden bg-slate-200 flex-shrink-0">
                    <Image
                      src={author.avatar_url}
                      alt={displayName}
                      width={28}
                      height={28}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-7 w-7 rounded-full bg-slate-200 flex-shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {author?.username ? (
                      <Link
                        href={`/profile/${author.username}`}
                        className="font-medium text-slate-900 hover:underline truncate"
                      >
                        {displayName}
                      </Link>
                    ) : (
                      <span className="font-medium text-slate-900 truncate">
                        {displayName}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">
                      {new Date(c.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap text-slate-800">
                    {c.content}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <form
        onSubmit={handleAddComment}
        className="flex items-center gap-2"
      >
        <input
          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          placeholder={
            userId ? "Share your thoughts about this event…" : "Sign in to comment"
          }
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          disabled={!userId || savingComment}
        />
        <button
          type="submit"
          disabled={!userId || savingComment || !newComment.trim()}
          className="rounded-full bg-purple-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-60"
        >
          {savingComment ? "Posting…" : "Post"}
        </button>
      </form>
    </div>
  );
}
