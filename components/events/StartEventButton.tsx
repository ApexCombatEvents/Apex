"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type StartEventButtonProps = {
  eventId: string;
  boutCount: number;
};

export default function StartEventButton({
  eventId,
  boutCount,
}: StartEventButtonProps) {
  const router = useRouter();
  const supabase = createSupabaseBrowser();
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleStartEvent() {
    if (boutCount === 0) {
      setMessage("Please add bouts before starting the event.");
      return;
    }

    setUpdating(true);
    setMessage(null);

    try {
      // Load all bouts for this event to build sequence
      const { data: boutsData, error: boutsError } = await supabase
        .from("event_bouts")
        .select("*")
        .eq("event_id", eventId);

      if (boutsError) {
        setMessage("Failed to load bouts: " + boutsError.message);
        return;
      }

      if (!boutsData || boutsData.length === 0) {
        setMessage("No bouts found. Add bouts before starting the event.");
        return;
      }

      // Build fight sequence: undercard first (sorted by order_index), then main card (sorted by order_index)
      const undercard = (boutsData as any[])
        .filter((b) => b.card_type === "undercard")
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      
      const main = (boutsData as any[])
        .filter((b) => b.card_type === "main")
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

      const sequence = [...undercard, ...main];
      const firstBout = sequence[0];

      if (!firstBout) {
        setMessage("No bouts found. Add bouts before starting the event.");
        return;
      }

      // Update event to live
      const { error: eventError } = await supabase
        .from("events")
        .update({ is_live: true })
        .eq("id", eventId);

      if (eventError) {
        setMessage("Failed to start event: " + eventError.message);
        return;
      }

      // Mark first bout as live
      const { error: boutError } = await supabase
        .from("event_bouts")
        .update({ is_live: true })
        .eq("id", firstBout.id);

      if (boutError) {
        setMessage("Event is live but failed to mark first bout as live.");
        return;
      }

      // Notify followers
      try {
        const response = await fetch(`/api/events/${eventId}/notify-live`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          console.error("Failed to notify followers");
        }
      } catch (err) {
        console.error("Error notifying followers", err);
      }

      // Redirect to live page
      router.push(`/events/${eventId}/live`);
      router.refresh();
    } catch (error) {
      console.error("Error in handleStartEvent:", error);
      setMessage("An error occurred: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="space-y-2">
      {message && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {message}
        </div>
      )}
      <button
        onClick={handleStartEvent}
        disabled={updating || boutCount === 0}
        className="inline-flex items-center gap-2 rounded-lg border-2 border-purple-600 bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-purple-700 hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        {updating ? "Starting event..." : "Manage Live Event"}
      </button>
      <p className="text-xs text-slate-600">
        Click to manage bouts, update results, and control the live event
      </p>
    </div>
  );
}


