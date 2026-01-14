// app/profile/[handle]/coaches/page.tsx
import Link from "next/link";
import Image from "next/image";
import { createSupabaseServer } from "@/lib/supabaseServer";

export default async function CoachesPage({
  params,
}: {
  params: Promise<{ handle: string }> | { handle: string };
}) {
  const supabase = createSupabaseServer();

  // Handle params as Promise (Next.js 15+) or direct object
  const resolvedParams = typeof params === 'object' && 'then' in params ? await params : params;
  const handleParam = resolvedParams.handle;

  // Load gym profile - try username first, then handle
  let { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", handleParam)
    .maybeSingle();

  // If not found by username, try handle field
  if ((profileError && profileError.code !== 'PGRST116') || !profile) {
    const { data: handleData, error: handleError } = await supabase
      .from("profiles")
      .select("*")
      .eq("handle", handleParam)
      .maybeSingle();
    
    if (!handleError && handleData) {
      profile = handleData;
      profileError = null;
    } else if (handleError && !profileError) {
      profileError = handleError;
    }
  }

  if (profileError || !profile) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-lg font-semibold mb-2">Profile not found.</p>
        <p className="text-sm text-slate-600 mb-4">
          No profile found for <span className="font-mono">@{handleParam}</span>.
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

  // Only show coaches for gym profiles (handle both uppercase and lowercase)
  const roleString = profile.role?.toString().toLowerCase().trim();
  const isGym = roleString === "gym";
  
  if (!isGym) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-lg font-semibold mb-2">Not a gym profile.</p>
        <p className="text-sm text-slate-600 mb-4">
          Role: {String(profile.role || "undefined")}
        </p>
        <Link
          href={`/profile/${handleParam}`}
          className="inline-flex px-4 py-2 rounded-xl bg-purple-600 text-white text-sm"
        >
          Back to profile
        </Link>
      </div>
    );
  }

  // Find coaches who have linked this gym in their settings
  const gymIdentifier = profile.username || profile.handle;
  const { data: coaches, error: coachesError } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, country, martial_arts, social_links")
    .or("role.eq.coach,role.eq.COACH")
    .contains("social_links", { gym_username: gymIdentifier });

  if (coachesError) {
    console.error(coachesError);
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-sm text-red-600">Failed to load coaches.</p>
      </div>
    );
  }

  const coachesList = coaches || [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">
          Head coaches at {profile.full_name || profile.username}
        </h1>
        <Link
          href={`/profile/${handleParam}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
        >
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span>Back to profile</span>
        </Link>
      </div>

      {coachesList.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
          <p className="text-sm text-slate-600">No coaches linked yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {coachesList.map((coach: any) => (
            <Link
              key={coach.id}
              href={`/profile/${coach.username}`}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm hover:border-purple-400 hover:bg-purple-50/60 transition-colors"
            >
              <div className="h-12 w-12 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                {coach.avatar_url ? (
                  <Image
                    src={coach.avatar_url}
                    alt={coach.full_name || coach.username || "Coach"}
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-slate-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 truncate">
                  {coach.full_name || "Coach"}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {coach.username && `@${coach.username}`}
                  {coach.country && ` • ${coach.country}`}
                </div>
                {coach.martial_arts && Array.isArray(coach.martial_arts) && coach.martial_arts.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {coach.martial_arts.slice(0, 3).map((art: string) => (
                      <span
                        key={art}
                        className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px]"
                      >
                        {art}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-slate-400 flex-shrink-0"
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
          ))}
        </div>
      )}
    </div>
  );
}

