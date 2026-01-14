"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type FollowStatsProps = {
  profileId: string;
  username?: string | null;
};

type FollowState = {
  followers: number;
  following: number;
  isOwnProfile: boolean;
  isFollowing: boolean;
  loading: boolean;
};

export default function FollowStats({ profileId, username }: FollowStatsProps) {
  const supabase = createSupabaseBrowser();
  const [state, setState] = useState<FollowState>({
    followers: 0,
    following: 0,
    isOwnProfile: false,
    isFollowing: false,
    loading: true,
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load counts + relationship on mount
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState((s) => ({ ...s, loading: true }));
      setErrorMsg(null);

      // Who is viewing?
      const { data: userData } = await supabase.auth.getUser();
      const viewer = userData.user ?? null;

      const isOwn = !!viewer && viewer.id === profileId;

      // Followers = people who follow THIS profile
      const {
        count: followersCount,
        error: followersError,
      } = await supabase
        .from("profile_follows")
        .select("*", { head: true, count: "exact" })
        .eq("following_id", profileId);

      if (followersError) {
        console.error("Error loading followers count:", followersError);
      }

      // Following = profiles THIS profile follows
      const {
        count: followingCount,
        error: followingError,
      } = await supabase
        .from("profile_follows")
        .select("*", { head: true, count: "exact" })
        .eq("follower_id", profileId);

      if (followingError) {
        console.error("Error loading following count:", followingError);
      }

      // Does viewer follow this profile?
      let isFollowing = false;
      if (viewer) {
        const { count: relCount, error: relError } = await supabase
          .from("profile_follows")
          .select("*", { head: true, count: "exact" })
          .eq("follower_id", viewer.id)
          .eq("following_id", profileId);

        if (relError) {
          console.error("Error checking follow relationship:", relError);
        } else if (!relError && typeof relCount === "number" && relCount > 0) {
          isFollowing = true;
        }
      }

      if (cancelled) return;

      setState({
        followers:
          !followersError && typeof followersCount === "number"
            ? followersCount
            : 0,
        following:
          !followingError && typeof followingCount === "number"
            ? followingCount
            : 0,
        isOwnProfile: isOwn,
        isFollowing,
        loading: false,
      });
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [profileId, supabase]);

  async function handleFollow() {
    setErrorMsg(null);

    // Don't allow follow spam or self-follow
    if (state.loading || state.isOwnProfile) return;

    // Always fetch the current user fresh here
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const viewer = userData.user ?? null;

    if (userError || !viewer) {
      setErrorMsg("You must be signed in to follow profiles.");
      return;
    }

    if (state.isFollowing) {
      // Unfollow
      const { error } = await supabase
        .from("profile_follows")
        .delete()
        .eq("follower_id", viewer.id)
        .eq("following_id", profileId);

      if (error) {
        console.error("unfollow error", error);
        setErrorMsg(error.message || "Could not unfollow profile.");
        return;
      }

      // ✅ Update UI immediately
      setState((s) => ({
        ...s,
        followers: Math.max(0, s.followers - 1),
        isFollowing: false,
      }));
    } else {
      // Follow
      const { error } = await supabase.from("profile_follows").insert({
        follower_id: viewer.id,
        following_id: profileId,
      });

      if (error) {
        console.error("follow error", error);
        setErrorMsg(error.message || "Could not follow profile.");
        return;
      }

      // Create notification for the followed user
      try {
        const { data: followerProfile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", viewer.id)
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
          console.warn("⚠️ Cannot create follow notification: no name found for user", viewer.id);
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
          profile_id: profileId,
          type: "follow",
          actor_profile_id: viewer.id,
          data: {
            follower_name: followerName,
            follower_handle: followerHandle,
          },
        });
      } catch (notifError) {
        console.error("Follow notification error", notifError);
        // Don't throw - the follow succeeded
      }

      // ✅ Update UI immediately
      setState((s) => ({
        ...s,
        followers: s.followers + 1,
        isFollowing: true,
      }));
    }
  }

  const followingHref =
    username && username.trim() !== ""
      ? `/profile/${username}/following`
      : undefined;
  const followersHref =
    username && username.trim() !== ""
      ? `/profile/${username}/followers`
      : undefined;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600">
        <div className="flex items-center gap-4">
          {followingHref ? (
            <Link
              href={followingHref}
              className="hover:text-purple-700 hover:underline"
            >
              Following{" "}
              <span className="font-semibold">{state.following}</span>
            </Link>
          ) : (
            <span>
              Following{" "}
              <span className="font-semibold">{state.following}</span>
            </span>
          )}

          {followersHref ? (
            <Link
              href={followersHref}
              className="hover:text-purple-700 hover:underline"
            >
              Followers{" "}
              <span className="font-semibold">{state.followers}</span>
            </Link>
          ) : (
            <span>
              Followers{" "}
              <span className="font-semibold">{state.followers}</span>
            </span>
          )}
        </div>

        {/* Follow/Unfollow button */}
        {!state.isOwnProfile && (
          <button
            type="button"
            onClick={handleFollow}
            disabled={state.loading}
            className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors disabled:opacity-60 ${
              state.isFollowing
                ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                : "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
            }`}
          >
            {state.loading ? "…" : state.isFollowing ? "Following" : "Follow"}
          </button>
        )}
      </div>

      {errorMsg && (
        <span className="text-[11px] text-red-500">{errorMsg}</span>
      )}
    </div>
  );
}

