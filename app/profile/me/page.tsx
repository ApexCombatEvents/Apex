// app/profile/me/page.tsx
import { createSupabaseServer } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";

export default async function MyProfilePage() {
  const supabase = createSupabaseServer();

  // 1) Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Not signed in → send to login
    redirect("/login");
  }

  // 2) Look up their profile to get the username/handle
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  // 3) If no username yet, send them to profile settings
  if (error || !profile?.username) {
    redirect("/profile/settings");
  }

  // 4) Redirect to the public profile page that already shows PostReactions
  redirect(`/profile/${profile.username}`);
}




