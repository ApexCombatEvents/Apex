"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import ReportButton from "@/components/moderation/ReportButton";

type PostReactionsProps = {
  postId: string;
  commentHref?: string;
  defaultShowComments?: boolean;
};

type Comment = {
  id: string;
  content: string;
  created_at: string;
  author_profile_id: string;
  author?: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

export default function PostReactions({
  postId,
  commentHref,
  defaultShowComments = false,
}: PostReactionsProps) {
  const supabase = createSupabaseBrowser();
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const [commentCount, setCommentCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);

  const [newComment, setNewComment] = useState("");
  const [savingComment, setSavingComment] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      setLoading(true);

      // current user
      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData.user ?? null;
      if (!cancelled) {
        setUserId(currentUser ? currentUser.id : null);
      }

      // likes
      const { data: likesData, error: likesError, count: likesCount } =
        await supabase
          .from("profile_post_likes")
          .select("profile_id", { count: "exact" })
          .eq("post_id", postId);

      if (!cancelled) {
        if (likesError) {
          console.error("PostReactions likes error", likesError);
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

      // comment count
      const {
        data: commentsData,
        error: commentsError,
        count: commentsCount,
      } = await supabase
        .from("profile_post_comments")
        .select("id", { count: "exact" })
        .eq("post_id", postId);

      if (!cancelled) {
        if (commentsError) {
          console.error("PostReactions comments count error", commentsError);
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
  }, [postId]);

  useEffect(() => {
    if (commentHref) return; // feed mode - never open inline comments
    if (defaultShowComments) {
      setShowComments(true);
      if (comments.length === 0) {
        void loadComments();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultShowComments, commentHref, postId]);

  async function toggleLike() {
    if (!userId) {
      alert("Please sign in to like posts.");
      return;
    }

    if (liked) {
      // unlike
      setLiked(false);
      setLikeCount((c) => Math.max(0, c - 1));

      const { error } = await supabase
        .from("profile_post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("profile_id", userId);

      if (error) {
        console.error("Unlike error", error);
        // rollback
        setLiked(true);
        setLikeCount((c) => c + 1);
      }
    } else {
      // like
      setLiked(true);
      setLikeCount((c) => c + 1);

      const { error } = await supabase
        .from("profile_post_likes")
        .insert({ post_id: postId, profile_id: userId });

      if (error) {
        console.error("Like error", error);
        // rollback
        setLiked(false);
        setLikeCount((c) => Math.max(0, c - 1));
      } else {
        // Create notification for post author
        try {
          const { data: post } = await supabase
            .from("posts")
            .select("author_profile_id")
            .eq("id", postId)
            .single();
          
          if (post && post.author_profile_id !== userId) {
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
              profile_id: post.author_profile_id,
              type: "post_like",
              actor_profile_id: userId,
              data: {
                post_id: postId,
                liker_name: likerName,
                liker_handle: likerProfile?.handle || likerProfile?.username,
              },
            });
          }
        } catch (notifError) {
          console.error("Post like notification error", notifError);
          // Don't throw - the like succeeded
        }
      }
    }
  }

  // Load comments + their authors
  async function loadComments() {
    const { data, error } = await supabase
      .from("profile_post_comments")
      .select("id, content, created_at, author_profile_id")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Load comments error", error);
      return;
    }

    const baseComments = (data as any[]) || [];

    const authorIds = Array.from(
      new Set(
        baseComments
          .map((c: any) => c.author_profile_id)
          .filter((id: string | null) => !!id)
      )
    );

    let authorsById: Record<string, Comment["author"]> = {};

    if (authorIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", authorIds);

      if (profilesError) {
        console.error("Load comment authors error", profilesError);
      } else if (profilesData) {
        for (const p of profilesData as any[]) {
          authorsById[p.id] = {
            id: p.id,
            full_name: p.full_name,
            username: p.username,
            avatar_url: p.avatar_url,
          };
        }
      }
    }

    const withAuthors: Comment[] = baseComments.map((c: any) => ({
      id: c.id,
      content: c.content,
      created_at: c.created_at,
      author_profile_id: c.author_profile_id,
      author: c.author_profile_id
        ? authorsById[c.author_profile_id] ?? null
        : null,
    }));

    setComments(withAuthors);
  }

  function handleToggleComments() {
    const next = !showComments;
    setShowComments(next);
    if (next && comments.length === 0) {
      void loadComments();
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) {
      alert("Please sign in to comment.");
      return;
    }
    const text = newComment.trim();
    if (!text) return;

    setSavingComment(true);

    const { data: insertedComment, error } = await supabase
      .from("profile_post_comments")
      .insert({
        post_id: postId,
        author_profile_id: userId,
        content: text,
      })
      .select("id, content, created_at, author_profile_id")
      .single();

    if (error) {
      console.error("Add comment error", error);
      setSavingComment(false);
      return;
    }

    setNewComment("");
    setCommentCount((c) => c + 1);

    // Create notification for post author
    try {
      const { data: post } = await supabase
        .from("profile_posts")
        .select("profile_id")
        .eq("id", postId)
        .single();
      
      if (post && post.profile_id !== userId) {
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
          profile_id: post.profile_id,
          type: "post_comment",
          actor_profile_id: userId,
          data: {
            post_id: postId,
            comment_id: insertedComment?.id,
            commenter_name: commenterName,
            commenter_handle: commenterProfile?.handle || commenterProfile?.username,
            comment_preview: text.slice(0, 80),
          },
        });
      }
    } catch (notifError) {
      console.error("Post comment notification error", notifError);
      // Don't throw - the comment succeeded
    }

    // Reload full list so new comment also has author info
    await loadComments();

    setSavingComment(false);
  }

  if (loading) {
    return (
      <div className="mt-2 text-[11px] text-slate-400">
        Loading reactions…
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      {/* Like + comment summary row */}
      <div className="flex items-center justify-between text-[11px] text-slate-600">
        <div className="flex items-center gap-3">
          <ReportButton contentType="post" contentId={postId} />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void toggleLike();
            }}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${
              liked
                ? "border-purple-300 bg-purple-50 text-purple-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700"
            }`}
          >
            <span>{liked ? "♥" : "♡"}</span>
            <span className="text-[11px]">
              {likeCount} {likeCount === 1 ? "like" : "likes"}
            </span>
          </button>

          {commentHref ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                router.push(commentHref);
              }}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700"
            >
              <span>💬</span>
              <span className="text-[11px]">
                {commentCount}{" "}
                {commentCount === 1 ? "comment" : "comments"}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleComments();
              }}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700"
            >
              <span>💬</span>
              <span className="text-[11px]">
                {commentCount}{" "}
                {commentCount === 1 ? "comment" : "comments"}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Comments list + input */}
      {!commentHref && showComments && (
        <div className="space-y-2 border-t border-slate-100 pt-2">
          {comments.length === 0 ? (
            <p className="text-[11px] text-slate-500">
              No comments yet. Be the first.
            </p>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
              {comments.map((c) => {
                const author = c.author;
                const displayName =
                  author?.full_name || author?.username || "Apex user";
                const handle = author?.username
                  ? `@${author.username}`
                  : "";
                const createdLabel = new Date(
                  c.created_at
                ).toLocaleString();

                return (
                  <div
                    key={c.id}
                    className="flex items-start gap-2 rounded-lg bg-slate-50 px-2 py-1 text-[11px] text-slate-800"
                  >
                    <div className="h-7 w-7 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                      {author?.avatar_url && (
                        <Image
                          src={author.avatar_url}
                          alt={displayName}
                          width={28}
                          height={28}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 min-w-0">
                          {author?.username ? (
                            <Link
                              href={`/profile/${author.username}`}
                              className="text-[11px] font-semibold text-slate-900 hover:underline truncate"
                            >
                              {displayName}
                            </Link>
                          ) : (
                            <span className="text-[11px] font-semibold text-slate-900 truncate">
                              {displayName}
                            </span>
                          )}
                          {handle && (
                            <span className="text-[10px] text-slate-500 truncate">
                              {handle}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {createdLabel}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-800 whitespace-pre-wrap mt-0.5">
                        {c.content}
                      </p>
                      <div className="mt-1">
                        <ReportButton 
                          contentType="profile_post_comment" 
                          contentId={c.id}
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add comment */}
          <form
            onSubmit={handleAddComment}
            className="flex items-center gap-2"
          >
            <input
              className="flex-1 rounded-xl border border-slate-200 bg-white px-2 py-1 text-[11px]"
              placeholder={
                userId ? "Write a comment…" : "Sign in to comment"
              }
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={!userId || savingComment}
            />
            <button
              type="submit"
              disabled={!userId || savingComment || !newComment.trim()}
              className="rounded-full bg-purple-600 px-3 py-1 text-[11px] font-medium text-white disabled:opacity-60"
            >
              {savingComment ? "Sending…" : "Send"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
