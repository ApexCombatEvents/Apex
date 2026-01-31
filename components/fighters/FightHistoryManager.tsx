// components/fighters/FightHistoryManager.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type FightHistoryEntry = {
  id: string;
  event_name: string;
  event_date: string;
  opponent_name: string;
  location?: string | null;
  result: "win" | "loss" | "draw" | "no_contest";
  result_method?: string | null;
  result_round?: number | null;
  result_time?: string | null;
  weight_class?: string | null;
  martial_art?: string | null;
  notes?: string | null;
};

type FightHistoryManagerProps = {
  fighterId: string;
};

export default function FightHistoryManager({ fighterId }: FightHistoryManagerProps) {
  const supabase = createSupabaseBrowser();
  const router = useRouter();
  const [fights, setFights] = useState<FightHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Form state
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [opponentName, setOpponentName] = useState("");
  const [location, setLocation] = useState("");
  const [result, setResult] = useState<"win" | "loss" | "draw" | "no_contest">("win");
  const [resultMethod, setResultMethod] = useState("");
  const [resultRound, setResultRound] = useState("");
  const [resultTime, setResultTime] = useState("");
  const [weightClass, setWeightClass] = useState("");
  const [martialArt, setMartialArt] = useState("");
  const [notes, setNotes] = useState("");
  const [maxDate, setMaxDate] = useState<string>("");

  useEffect(() => {
    // Set max date on client side only to avoid hydration errors
    setMaxDate(new Date().toISOString().split('T')[0]);
    loadFights();
  }, [fighterId]);

  async function loadFights() {
    try {
      const response = await fetch(`/api/fighters/fight-history?fighter_id=${fighterId}`);
      const data = await response.json();
      if (response.ok) {
        setFights(data.fights || []);
      } else {
        setMessage("Failed to load fight history");
      }
    } catch (err) {
      console.error("Error loading fights:", err);
      setMessage("Failed to load fight history");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEventName("");
    setEventDate("");
    setOpponentName("");
    setLocation("");
    setResult("win");
    setResultMethod("");
    setResultRound("");
    setResultTime("");
    setWeightClass("");
    setMartialArt("");
    setNotes("");
    setEditingId(null);
    setShowAddForm(false);
  }

  function startEdit(fight: FightHistoryEntry) {
    setEventName(fight.event_name);
    // Format date for input field (YYYY-MM-DD)
    const dateStr = fight.event_date;
    const formattedDate = dateStr.includes('T') 
      ? dateStr.split('T')[0] 
      : dateStr.length === 10 
        ? dateStr 
        : new Date(dateStr).toISOString().split('T')[0];
    setEventDate(formattedDate);
    setOpponentName(fight.opponent_name);
    setLocation(fight.location || "");
    setResult(fight.result);
    setResultMethod(fight.result_method || "");
    setResultRound(fight.result_round?.toString() || "");
    setResultTime(fight.result_time || "");
    setWeightClass(fight.weight_class || "");
    setMartialArt(fight.martial_art || "");
    setNotes(fight.notes || "");
    setEditingId(fight.id);
    setShowAddForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!eventName || !eventDate || !opponentName) {
      setMessage("Event name, date, and opponent name are required");
      return;
    }

    // Validate that event_date is not in the future
    const selectedDate = new Date(eventDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    if (selectedDate > today) {
      setMessage("Fight history dates cannot be in the future. Please select a past date.");
      return;
    }

    try {
      const payload = {
        event_name: eventName,
        event_date: eventDate,
        opponent_name: opponentName,
        location: location || null,
        result,
        result_method: resultMethod || null,
        result_round: resultRound ? parseInt(resultRound) : null,
        result_time: resultTime || null,
        weight_class: weightClass || null,
        martial_art: martialArt || null,
        notes: notes || null,
      };

      let response;
      if (editingId) {
        response = await fetch(`/api/fighters/fight-history/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch("/api/fighters/fight-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await response.json();
      if (response.ok) {
        setMessage("Fight history saved successfully");
        resetForm();
        // Reload fights to show the new/updated entry
        await loadFights();
        // Refresh the router to update the profile page display
        router.refresh();
        // Clear message after a short delay
        setTimeout(() => setMessage(null), 3000);
      } else {
        // Log the full error for debugging
        console.error("Fight history save error:", data);
        const errorMsg = data.error || data.message || "Failed to save fight history";
        setMessage(errorMsg);
      }
    } catch (err: any) {
      console.error("Error saving fight:", err);
      const errorMsg = err?.message || "Failed to save fight history. Please check your connection and try again.";
      setMessage(errorMsg);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this fight from your history?")) {
      return;
    }

    try {
      const response = await fetch(`/api/fighters/fight-history/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setMessage("Fight deleted successfully");
        await loadFights();
        // Refresh the router to update the profile page display
        router.refresh();
      } else {
        const data = await response.json();
        setMessage(data.error || "Failed to delete fight");
      }
    } catch (err) {
      console.error("Error deleting fight:", err);
      setMessage("Failed to delete fight");
    }
  }

  function formatResult(fight: FightHistoryEntry) {
    const resultLabels = {
      win: "Win",
      loss: "Loss",
      draw: "Draw",
      no_contest: "No Contest",
    };

    const parts: string[] = [resultLabels[fight.result]];
    if (fight.result_method) parts.push(fight.result_method);
    if (fight.result_round) parts.push(`R${fight.result_round}`);
    if (fight.result_time) parts.push(fight.result_time);

    return parts.join(" • ");
  }

  if (loading) {
    return <div className="text-sm text-slate-600">Loading fight history...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Fight History</h3>
          <p className="text-xs text-slate-600 mt-1">
            Add fights you participated in that weren&apos;t on Apex to keep your record up to date.
          </p>
        </div>
        {!showAddForm && (
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowAddForm(true);
            }}
            className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-medium hover:bg-purple-700"
          >
            + Add Fight
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="card space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-900">
              {editingId ? "Edit Fight" : "Add New Fight"}
            </h4>
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <label className="text-xs text-slate-600 space-y-1 block">
              Event Name *
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-sm"
                required
              />
            </label>

            <label className="text-xs text-slate-600 space-y-1 block">
              Event Date *
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                max={maxDate} // Prevent future dates (set on client to avoid hydration error)
                className="w-full rounded-xl border px-3 py-2 text-sm"
                required
              />
            </label>

            <label className="text-xs text-slate-600 space-y-1 block">
              Opponent Name *
              <input
                type="text"
                value={opponentName}
                onChange={(e) => setOpponentName(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-sm"
                required
              />
            </label>

            <label className="text-xs text-slate-600 space-y-1 block">
              Location
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. London, UK"
                className="w-full rounded-xl border px-3 py-2 text-sm"
              />
            </label>

            <label className="text-xs text-slate-600 space-y-1 block">
              Result *
              <select
                value={result}
                onChange={(e) => setResult(e.target.value as any)}
                className="w-full rounded-xl border px-3 py-2 text-sm"
                required
              >
                <option value="win">Win</option>
                <option value="loss">Loss</option>
                <option value="draw">Draw</option>
                <option value="no_contest">No Contest</option>
              </select>
            </label>

            <label className="text-xs text-slate-600 space-y-1 block">
              Result Method
              <input
                type="text"
                value={resultMethod}
                onChange={(e) => setResultMethod(e.target.value)}
                placeholder="e.g. KO, TKO, Decision, Submission"
                className="w-full rounded-xl border px-3 py-2 text-sm"
              />
            </label>

            <label className="text-xs text-slate-600 space-y-1 block">
              Round
              <input
                type="number"
                min="1"
                value={resultRound}
                onChange={(e) => setResultRound(e.target.value)}
                placeholder="e.g. 3"
                className="w-full rounded-xl border px-3 py-2 text-sm"
              />
            </label>

            <label className="text-xs text-slate-600 space-y-1 block">
              Time
              <input
                type="text"
                value={resultTime}
                onChange={(e) => setResultTime(e.target.value)}
                placeholder="e.g. 2:34"
                className="w-full rounded-xl border px-3 py-2 text-sm"
              />
            </label>

            <label className="text-xs text-slate-600 space-y-1 block">
              Weight Class
              <input
                type="text"
                value={weightClass}
                onChange={(e) => setWeightClass(e.target.value)}
                placeholder="e.g. 70kg, Welterweight"
                className="w-full rounded-xl border px-3 py-2 text-sm"
              />
            </label>

            <label className="text-xs text-slate-600 space-y-1 block">
              Martial Art
              <input
                type="text"
                value={martialArt}
                onChange={(e) => setMartialArt(e.target.value)}
                placeholder="e.g. Muay Thai, MMA, Boxing"
                className="w-full rounded-xl border px-3 py-2 text-sm"
              />
            </label>
          </div>

          <label className="text-xs text-slate-600 space-y-1 block">
            Notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about the fight..."
              className="w-full rounded-xl border px-3 py-2 text-sm min-h-[80px]"
            />
          </label>

          <button
            type="submit"
            className="w-full px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-700"
          >
            {editingId ? "Update Fight" : "Add Fight"}
          </button>
        </form>
      )}

      {message && (
        <div
          className={`text-xs rounded-xl px-3 py-2 ${
            message.includes("successfully")
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message}
        </div>
      )}

      {fights.length === 0 && !showAddForm ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
          <p className="text-sm text-slate-600 mb-2">No fight history added yet.</p>
          <p className="text-xs text-slate-500">
            Add fights you participated in that weren&apos;t on Apex to keep your record up to date.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {fights.map((fight) => (
            <div
              key={fight.id}
              className="rounded-xl border border-slate-200 bg-white p-4 space-y-2"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-slate-900">
                      {fight.event_name}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(fight.event_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-slate-700">
                    vs. <span className="font-medium">{fight.opponent_name}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    {formatResult(fight)}
                  </div>
                  {(fight.location || fight.weight_class || fight.martial_art) && (
                    <div className="mt-1 text-xs text-slate-500">
                      {[
                        fight.location,
                        fight.weight_class,
                        fight.martial_art,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </div>
                  )}
                  {fight.notes && (
                    <div className="mt-1 text-xs text-slate-600 italic">
                      {fight.notes}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(fight)}
                    className="px-2 py-1 text-xs text-purple-600 hover:text-purple-700"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(fight.id)}
                    className="px-2 py-1 text-xs text-red-600 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

