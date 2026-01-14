"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

type Props = {
  boutId: string;
  initialResult: string | null;
  initialMethod: string | null;
  initialRound: number | null;
  initialTime: string | null;
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

    const { error } = await supabase
      .from("event_bouts")
      .update({
        result: result || null,
        result_method: method || null,
        result_round: roundInt,
        result_time: time || null,
      })
      .eq("id", boutId);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Saved");
      router.refresh();
    }

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
