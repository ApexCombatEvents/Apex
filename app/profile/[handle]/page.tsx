// app/profile/[handle]/page.tsx
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabaseServer";
import FighterProfile from "@/components/profiles/FighterProfile";
import CoachProfile from "@/components/profiles/CoachProfile";
import GymProfile from "@/components/profiles/GymProfile";
import PromotionProfile from "@/components/profiles/PromotionProfile";

type ProfileRole = "fighter" | "coach" | "gym" | "promotion" | null;

type Profile = {
  id: string;
  username?: string | null;
  role?: ProfileRole;
  [key: string]: any;
};

type Post = {
  id: string;
  content: string | null;
  created_at: string;
  image_url?: string | null;
  image_urls?: string[] | null;
};

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ handle: string }> | { handle: string };
}) {
  const supabase = createSupabaseServer();

  // Handle params as Promise (Next.js 15+) or direct object
  const resolvedParams = typeof params === 'object' && 'then' in params ? await params : params;
  const handleParam = resolvedParams.handle;

  // 1) Load profile by handle or username
  // Try username first, then fall back to handle
  let { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", handleParam)
    .single();

  // If not found by username, try handle field
  if (profileError || !profileData) {
    const { data: handleData, error: handleError } = await supabase
      .from("profiles")
      .select("*")
      .eq("handle", handleParam)
      .single();
    
    if (!handleError && handleData) {
      profileData = handleData;
      profileError = null;
    }
  }

  if (profileError || !profileData) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <p className="text-lg font-semibold mb-2">Profile not found.</p>
        <p className="text-sm text-slate-600 mb-4">
          No profile found for{" "}
          <span className="font-mono">@{handleParam}</span>.
        </p>
        <Link
          href="/"
          className="inline-flex px-4 py-2 rounded-xl bg-purple-600 text-white text-sm"
        >
          Back to home
        </Link>
      </div>
    );
  }

  const profile = profileData as Profile;
  // Normalize role to lowercase for matching (schema stores uppercase, code expects lowercase)
  const roleString = profile.role?.toLowerCase() ?? null;
  const role: ProfileRole = (roleString === "fighter" || roleString === "coach" || roleString === "gym" || roleString === "promotion") 
    ? roleString 
    : null;

  // Check if current user is viewing their own profile
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwnProfile = user?.id === profile.id;

  // 2) Load profile posts (used by fighter + gym feeds)
  const { data: postsData } = await supabase
    .from("profile_posts")
    .select("id, content, created_at, image_url, image_urls")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false });

  const posts: Post[] = postsData || [];

  // 3) If gym, load linked fighters (fighters whose social_links.gym_username = this gym's username or handle)
  let fighters: any[] = [];
  const gymIdentifier = profile.username || profile.handle;
  if (role === "gym" && gymIdentifier) {
    // Query for fighters - handle both uppercase and lowercase role values
    // We check both @handle and handle formats
    const gymHandle = gymIdentifier.startsWith('@') ? gymIdentifier : `@${gymIdentifier}`;
    const gymRaw = gymIdentifier.startsWith('@') ? gymIdentifier.substring(1) : gymIdentifier;

    const { data: fightersData } = await supabase
      .from("profiles")
      .select(
        "id, full_name, username, avatar_url, country, martial_arts, social_links"
      )
      .or("role.eq.fighter,role.eq.FIGHTER")
      .or(`social_links->>gym_username.eq.${gymHandle},social_links->>gym_username.eq.${gymRaw}`);

    fighters = fightersData || [];
  }

  // 4) Role-based rendering
  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {isOwnProfile && (
        <div className="mb-4">
          <Link
            href="/profile/settings"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            <span>Edit Profile</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      )}
      {role === "fighter" && (
        <FighterProfile profile={profile} posts={posts} isOwnProfile={isOwnProfile} />
      )}

      {role === "coach" && (
        <CoachProfile profile={profile} posts={posts} isOwnProfile={isOwnProfile} />
      )}

      {role === "gym" && (
        <GymProfile
          profile={profile}
          fighters={fighters}
          posts={posts}
          isOwnProfile={isOwnProfile}
          profileIdentifier={handleParam}
        />
      )}

      {role === "promotion" && (
        <PromotionProfile profile={profile} posts={posts} isOwnProfile={isOwnProfile} />
      )}

      {!role && (
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700">
          This profile doesn&apos;t have an account type yet.
        </div>
      )}
    </div>
  );
}








