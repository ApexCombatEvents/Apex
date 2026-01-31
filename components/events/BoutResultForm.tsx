"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { diffForSide, type Winner, type Side } from "@/lib/records";

type Props = {
  boutId: string;
  initialResult: string | null;
  initialMethod: string | null;
  initialRound: number | null;
  initialTime: string | null;
  eventId?: string;
};

const RESULT_OPTIONS = [
  { value: "", label: "No result yet" },
  { value: "red", label: "Red corner win" },
  { value: "blue", label: "Blue corner win" },
  { value: "draw", label: "Draw" },
  { value: "no_contest", label: "No contest" },
];

export default function BoutResultForm({
  boutId,
  initialResult,
  initialMethod,
  initialRound,
  initialTime,
  eventId,
}: Props) {
  const supabase = createSupabaseBrowser();
  const router = useRouter();

  const [result, setResult] = useState(initialResult ?? "");
  const [method, setMethod] = useState(initialMethod ?? "");
  const [round, setRound] = useState(initialRound ? String(initialRound) : "");
  const [time, setTime] = useState(initialTime ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const roundInt =
      round.trim() === "" ? null : Math.max(1, parseInt(round, 10) || 1);

    // First, get event_id and bout details including previous result
    let actualEventId = eventId;
    let boutData: any = null;
    let previousResult: string | null = null;

    const { data: bout, error: boutError } = await supabase
      .from("event_bouts")
      .select("event_id, red_fighter_id, blue_fighter_id, red_name, blue_name, winner_side")
      .eq("id", boutId)
      .single();

    if (!boutError && bout) {
      actualEventId = bout.event_id;
      boutData = bout;
      previousResult = bout.winner_side;
    }

    const { error } = await supabase
      .from("event_bouts")
      .update({
        winner_side: result || null,
        result_method: method || null,
        result_round: roundInt,
        result_time: time || null,
      })
      .eq("id", boutId);

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    // Update fighter records if result changed
    const newWinner = (result || null) as Winner;
    const oldWinner = (previousResult || null) as Winner;

    // DEBUG: Log all values to understand why record update might not trigger
    console.log("=== BOUT RESULT SAVE DEBUG ===");
    console.log("Bout ID:", boutId);
    console.log("Bout fetch error:", boutError ? JSON.stringify(boutError) : "none");
    console.log("Bout data exists:", !!boutData);
    console.log("Bout data:", JSON.stringify(boutData));
    console.log("Previous result (oldWinner):", oldWinner);
    console.log("New result (newWinner):", newWinner);
    console.log("Are they equal?:", newWinner === oldWinner);
    console.log("red_fighter_id:", boutData?.red_fighter_id || "NOT SET");
    console.log("blue_fighter_id:", boutData?.blue_fighter_id || "NOT SET");
    console.log("Will update records?:", boutData && newWinner !== oldWinner);
    console.log("=== END BOUT RESULT SAVE DEBUG ===");

    if (boutData && newWinner !== oldWinner) {
      console.log("=== RECORD UPDATE DEBUG ===");
      
      // Update red corner fighter's record using API route (bypasses RLS)
      if (boutData.red_fighter_id) {
        try {
          const response = await fetch("/api/fighters/update-record", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fighterId: boutData.red_fighter_id,
            }),
          });
          
          const responseData = await response.json();
          console.log("Red corner API response:", JSON.stringify(responseData));
        } catch (redErr) {
          console.error("Error updating red corner record:", redErr);
        }
      }

      // Update blue corner fighter's record using API route (bypasses RLS)
      if (boutData.blue_fighter_id) {
        try {
          const response = await fetch("/api/fighters/update-record", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fighterId: boutData.blue_fighter_id,
            }),
          });
          
          const responseData = await response.json();
          console.log("Blue corner API response:", JSON.stringify(responseData));
        } catch (blueErr) {
          console.error("Error updating blue corner record:", blueErr);
        }
      }
      
      console.log("=== END RECORD UPDATE DEBUG ===");
    }

    // Notify followers if a result was saved (not cleared)
    if (actualEventId && result && result !== "" && result !== "no_contest") {
      try {
        // Determine winner info
        const winnerSide = result === "red" ? "red" : result === "blue" ? "blue" : result === "draw" ? "draw" : null;
        let winnerName = "Winner";
        let cornerText = "";

        if (boutData && winnerSide) {
          if (winnerSide === "red") {
            if (boutData.red_fighter_id) {
              const { data: fighter } = await supabase
                .from("profiles")
                .select("full_name, username")
                .eq("id", boutData.red_fighter_id)
                .single();
              winnerName = fighter?.full_name || fighter?.username || "Red corner";
            } else {
              winnerName = boutData.red_name || "Red corner";
            }
            cornerText = "Red corner";
          } else if (winnerSide === "blue") {
            if (boutData.blue_fighter_id) {
              const { data: fighter } = await supabase
                .from("profiles")
                .select("full_name, username")
                .eq("id", boutData.blue_fighter_id)
                .single();
              winnerName = fighter?.full_name || fighter?.username || "Blue corner";
            } else {
              winnerName = boutData.blue_name || "Blue corner";
            }
            cornerText = "Blue corner";
          } else {
            winnerName = "Draw";
          }
        }

        const response = await fetch(`/api/events/${actualEventId}/notify-bout-result`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bout_id: boutId,
            winner_side: winnerSide,
            winner_name: winnerName,
            corner_text: cornerText,
            method: method || null,
            round: roundInt || null,
            time: time || null,
          }),
        });

        if (!response.ok) {
          console.error("Failed to notify followers about bout result");
        }
      } catch (notifError) {
        console.error("Error notifying followers about bout result:", notifError);
        // Don't fail the save if notification fails
      }
    }

    setMessage("Saved");
    router.refresh();
    setSaving(false);
  }

  return (
    <form
      onSubmit={handleSave}
      className="mt-2 rounded-lg border border-slate-200 bg-white/70 px-3 py-2 space-y-2"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <select
          className="rounded-lg border px-2 py-1 bg-white text-xs"
          value={result}
          onChange={(e) => setResult(e.target.value)}
        >
          {RESULT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <input
          className="flex-1 min-w-[120px] rounded-lg border px-2 py-1 text-xs"
          placeholder="Method (e.g. KO, UD)"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
        />

        <input
          type="number"
          min={1}
          className="w-16 rounded-lg border px-2 py-1 text-xs"
          placeholder="Rnd"
          value={round}
          onChange={(e) => setRound(e.target.value)}
        />

        <input
          className="w-20 rounded-lg border px-2 py-1 text-xs"
          placeholder="Time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />

        <button
          type="submit"
          disabled={saving}
          className="ml-auto px-3 py-1 rounded-full bg-purple-600 text-white text-[11px] font-medium disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {message && (
        <p className="text-[11px] text-slate-500">
          {message}
        </p>
      )}
    </form>
  );
}
