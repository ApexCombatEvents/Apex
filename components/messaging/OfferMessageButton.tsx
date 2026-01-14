// components/messaging/OfferMessageButton.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type OfferMessageButtonProps = {
  targetProfileId: string;
  targetUsername?: string | null;
  boutId: string;
  eventId: string;
  fighterProfileId?: string | null;
  side: "red" | "blue";
};

export default function OfferMessageButton({
  targetProfileId,
  targetUsername,
  boutId,
  eventId,
  fighterProfileId,
  side,
}: OfferMessageButtonProps) {
  const router = useRouter();
  const supabase = createSupabaseBrowser();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    try {
      // 1) Get or create thread
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setLoading(false);
        return;
      }

      const { data: existingThread } = await supabase
        .from("message_threads")
        .select("id")
        .or(
          `and(profile_a.eq.${userData.user.id},profile_b.eq.${targetProfileId}),and(profile_a.eq.${targetProfileId},profile_b.eq.${userData.user.id})`
        )
        .maybeSingle();

      let threadId: string;
      if (existingThread) {
        threadId = existingThread.id;
      } else {
        const { data: newThread, error: threadError } = await supabase
          .from("message_threads")
          .insert({
            profile_a: userData.user.id,
            profile_b: targetProfileId,
          })
          .select("id")
          .single();

        if (threadError || !newThread) {
          console.error("OfferMessageButton thread creation error", threadError);
          setLoading(false);
          return;
        }
        threadId = newThread.id;
      }

      // 2) Navigate to the thread with bout details as query params
      const params = new URLSearchParams({
        boutId,
        eventId,
        side,
        ...(fighterProfileId && { fighterId: fighterProfileId }),
      });
      router.push(`/messages/${threadId}?${params.toString()}`);
    } catch (err) {
      console.error("OfferMessageButton error", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center rounded-xl border border-slate-300 px-3 py-1 text-[11px] font-medium text-slate-700 hover:border-purple-500 hover:text-purple-700 disabled:opacity-60"
      disabled={loading}
    >
      {loading ? "Opening…" : "Message"}
    </button>
  );
}

