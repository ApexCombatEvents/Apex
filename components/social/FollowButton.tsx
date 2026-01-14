"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type FollowButtonProps = {
  targetProfileId: string;
  targetUsername?: string | null;
  size?: "sm" | "md";
};

export default function FollowButton({
  targetProfileId,
  targetUsername,
  size = "md",
}: FollowButtonProps) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState<number | null>(null);

  const supabase = createSupabaseBrowser();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      const authUser = userData.user ?? null;
      if (!authUser) {
        if (!cancelled) {
          setUserId(null);
          setIsFollowing(false);
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setUserId(authUser.id);
      }

      // Don’t follow yourself
      if (authUser.id === targetProfileId) {
        if (!cancelled) {
          setIsFollowing(false);
          setLoading(false);
        }
        return;
      }

      // Check if following
      const { data: followRows, error: followErr } = await supabase
        .from("profile_follows")
        .select("follower_id")
        .eq("follower_id", authUser.id)
        .eq("following_id", targetProfileId);

      if (!cancelled) {
        if (!followErr && followRows && followRows.length > 0) {
          setIsFollowing(true);
        } else {
          setIsFollowing(false);
        }
      }

      // Load follower count (optional)
      const { count } = await supabase
        .from("profile_follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", targetProfileId);

      if (!cancelled) {
        setFollowersCount(count ?? null);
        setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [supabase, targetProfileId]);

  async function toggleFollow() {
    if (!userId || busy) return;
    setBusy(true);

    if (!isFollowing) {
      // Follow
      const { error } = await supabase.from("profile_follows").insert({
        follower_id: userId,
        following_id: targetProfileId,
      });

      if (!error) {
        setIsFollowing(true);
        setFollowersCount((c) => (c ?? 0) + 1);
        
        // Create notification for the followed user
        try {
          const { data: followerProfile, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();
          
          if (profileError) {
            console.error("Error fetching follower profile:", profileError);
          }
          
          // Try all possible name fields, with username/handle as fallback (no user ID fallback)
          const followerName = followerProfile?.display_name || 
                               followerProfile?.full_name ||
                               followerProfile?.username || 
                               (followerProfile?.handle ? `@${followerProfile.handle}` : null);
          
          // Only create notification if we have a name
          if (!followerName) {
            console.warn("⚠️ Cannot create follow notification: no name found for user", userId);
            return;
          }
          
          // Try all possible handle/username fields for navigation
          const followerHandle = followerProfile?.username || 
                                 followerProfile?.handle ||
                                 null;
          
          console.log("Creating follow notification:", {
            followerName,
            followerHandle,
            profileData: followerProfile
          });
          
          await supabase.from("notifications").insert({
            profile_id: targetProfileId,
            type: "follow",
            actor_profile_id: userId,
            data: {
              follower_name: followerName,
              follower_handle: followerHandle,
            },
          });
        } catch (notifError) {
          console.error("Follow notification error", notifError);
          // Don't throw - the follow succeeded
        }
      }
    } else {
      // Unfollow
      const { error } = await supabase
        .from("profile_follows")
        .delete()
        .eq("follower_id", userId)
        .eq("following_id", targetProfileId);

      if (!error) {
        setIsFollowing(false);
        setFollowersCount((c) => (c !== null ? Math.max(0, c - 1) : null));
      }
    }

    setBusy(false);
  }

  // Not logged in – show a subtle link
  if (!loading && !userId) {
    if (size === "sm") {
      return (
        <Link
          href="/signin"
          className="text-[11px] text-purple-700 hover:underline"
        >
          Sign in to follow
        </Link>
      );
    }

    return (
      <Link
        href="/signin"
        className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs text-purple-700 hover:bg-purple-100"
      >
        Follow
      </Link>
    );
  }

  // Don’t render anything while loading or if it’s your own profile
  if (loading || userId === targetProfileId) {
    return null;
  }

  const label = isFollowing ? "Following" : "Follow";
  const extra =
    followersCount !== null ? ` · ${followersCount.toString()} followers` : "";

  const baseClasses =
    "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors";
  const variantClasses = isFollowing
    ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
    : "border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100";

  if (size === "sm") {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={toggleFollow}
        className={`text-[11px] ${isFollowing ? "text-slate-600" : "text-purple-700"} hover:underline disabled:opacity-60`}
      >
        {label}
        {extra && (
          <span className="ml-1 text-[10px] text-slate-400">{extra}</span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={toggleFollow}
      className={`${baseClasses} ${variantClasses} disabled:opacity-60`}
    >
      {label}
      {extra && (
        <span className="ml-1 text-[10px] font-normal text-slate-500">
          {extra}
        </span>
      )}
    </button>
  );
}
