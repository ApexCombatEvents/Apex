// app/profile/[handle]/following/page.tsx
import Link from "next/link";
import Image from "next/image";
import { createSupabaseServer } from "@/lib/supabaseServer";

export default async function FollowingPage({
  params,
}: {
  params: { handle: string };
}) {
  const supabase = createSupabaseServer();

  // 1) Find the profile for this handle
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, full_name")
    .eq("username", params.handle)
    .single();

  if (profileError || !profile) {
    return <div className="p-6 text-sm">Profile not found.</div>;
  }

  // 2) Who are they following?
  const { data: rows, error: followError } = await supabase
    .from("profile_follows")
    .select(
      "following:following_id ( id, username, full_name, avatar_url, role )"
    )
    .eq("follower_id", profile.id);

  if (followError) {
    console.error(followError);
    return <div className="p-6 text-sm">Failed to load following.</div>;
  }

  const following = (rows || [])
    .map((r: any) => r.following)
    .filter(Boolean);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">
          {profile.full_name || profile.username} is following
        </h1>
        <Link
          href={`/profile/${profile.username}`}
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

      {following.length === 0 ? (
        <p className="text-base text-slate-600">Not following anyone yet.</p>
      ) : (
        <div className="space-y-4">
          {following.map((p: any) => (
            <Link
              key={p.id}
              href={`/profile/${p.username}`}
              className="flex items-center gap-5 rounded-xl border-2 border-slate-200 bg-white px-6 py-5 text-base hover:border-purple-400 hover:bg-purple-50/60 hover:shadow-md transition-all duration-200"
            >
              <div className="h-16 w-16 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                {p.avatar_url && (
                  <Image
                    src={p.avatar_url}
                    alt={p.full_name || p.username || "Avatar"}
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-lg text-slate-900">{p.full_name || p.username}</span>
                <span className="text-sm text-slate-600">
                  @{p.username} • {p.role}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
