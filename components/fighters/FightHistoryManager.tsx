// components/fighters/FightHistoryManager.tsx
"use client";

import { useState, useEffect } from "react";
import DisciplineSelect from "@/components/ui/DisciplineSelect";

export type FightHistoryEntry = {
  id: string;
  event_name: string;
  event_date: string;
  opponent_name: string;
  location?: string | null;
  result: "win" | "loss" | "draw" | "no_contest" | null;
  result_method?: string | null;
  result_round?: number | null;
  result_time?: string | null;
  weight_class?: string | null;
  martial_art?: string | null;
  notes?: string | null;
};

type Props = {
  fighterId: string;
  /** When provided, called after every successful save/delete so the parent can refresh */
  onUpdate?: () => void;
};

const RESULT_LABELS: Record<string, string> = {
  win: "Win",
  loss: "Loss",
  draw: "Draw",
  no_contest: "No Contest",
};

function isUpcomingFight(entry: FightHistoryEntry): boolean {
  return new Date(entry.event_date) > new Date();
}

export default function FightHistoryManager({ fighterId, onUpdate }: Props) {
  const [fights, setFights] = useState<FightHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  // Form state
  const [isUpcoming, setIsUpcoming] = useState(false);
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

  useEffect(() => {
    loadFights();
  }, [fighterId]);

  async function loadFights() {
    try {
      setLoading(true);
      const res = await fetch(`/api/fighters/fight-history?fighter_id=${fighterId}`);
      const data = await res.json();
      if (res.ok) setFights(data.fights || []);
      else setMessage({ text: "Failed to load fights", ok: false });
    } catch {
      setMessage({ text: "Failed to load fights", ok: false });
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setIsUpcoming(false);
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
    setMessage(null);
  }

  function startEdit(fight: FightHistoryEntry) {
    const upcoming = isUpcomingFight(fight);
    setIsUpcoming(upcoming);
    setEventName(fight.event_name);
    const d = fight.event_date;
    setEventDate(d.includes("T") ? d.split("T")[0] : d.length === 10 ? d : new Date(d).toISOString().split("T")[0]);
    setOpponentName(fight.opponent_name);
    setLocation(fight.location || "");
    setResult((fight.result as any) || "win");
    setResultMethod(fight.result_method || "");
    setResultRound(fight.result_round?.toString() || "");
    setResultTime(fight.result_time || "");
    setWeightClass(fight.weight_class || "");
    setMartialArt(fight.martial_art || "");
    setNotes(fight.notes || "");
    setEditingId(fight.id);
    setShowAddForm(true);
    setMessage(null);
  }

  /** Pre-fill the form to mark an upcoming fight's result */
  function markResult(fight: FightHistoryEntry) {
    setIsUpcoming(false);
    setEventName(fight.event_name);
    const d = fight.event_date;
    setEventDate(d.includes("T") ? d.split("T")[0] : d.length === 10 ? d : new Date(d).toISOString().split("T")[0]);
    setOpponentName(fight.opponent_name);
    setLocation(fight.location || "");
    setResult("win");
    setResultMethod("");
    setResultRound("");
    setResultTime("");
    setWeightClass(fight.weight_class || "");
    setMartialArt(fight.martial_art || "");
    setNotes(fight.notes || "");
    setEditingId(fight.id);
    setShowAddForm(true);
    setMessage(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!eventName || !eventDate || !opponentName) {
      setMessage({ text: "Event name, date and opponent are required", ok: false });
      return;
    }

    const payload: Record<string, unknown> = {
      event_name: eventName,
      event_date: eventDate,
      opponent_name: opponentName,
      location: location || null,
      result: isUpcoming ? null : result,
      result_method: isUpcoming ? null : resultMethod || null,
      result_round: isUpcoming ? null : (resultRound ? parseInt(resultRound) : null),
      result_time: isUpcoming ? null : resultTime || null,
      weight_class: weightClass || null,
      martial_art: martialArt || null,
      notes: notes || null,
      is_upcoming: isUpcoming,
    };

    try {
      const url = editingId
        ? `/api/fighters/fight-history/${editingId}`
        : "/api/fighters/fight-history";
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage({ text: editingId ? "Fight updated!" : "Fight added!", ok: true });
        resetForm();
        await loadFights();
        onUpdate?.();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ text: data.error || "Failed to save fight", ok: false });
      }
    } catch {
      setMessage({ text: "Failed to save fight. Check your connection.", ok: false });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this fight from your history?")) return;
    try {
      const res = await fetch(`/api/fighters/fight-history/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMessage({ text: "Fight deleted", ok: true });
        await loadFights();
        onUpdate?.();
        setTimeout(() => setMessage(null), 3000);
      } else {
        const data = await res.json();
        setMessage({ text: data.error || "Failed to delete", ok: false });
      }
    } catch {
      setMessage({ text: "Failed to delete fight", ok: false });
    }
  }

  const upcomingFights = fights.filter(isUpcomingFight);
  const pastFights = fights.filter((f) => !isUpcomingFight(f));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Manage Fights</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Add upcoming fights or log past results not on Apex.
          </p>
        </div>
        {!showAddForm && (
          <button
            type="button"
            onClick={() => { resetForm(); setShowAddForm(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add Fight
          </button>
        )}
      </div>

      {/* Toast */}
      {message && (
        <div className={`text-xs rounded-xl px-3 py-2 ${message.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {message.text}
        </div>
      )}

      {/* Add / Edit form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-purple-200 bg-purple-50/40 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-900">
              {editingId ? "Edit Fight" : "Add Fight"}
            </h4>
            <button type="button" onClick={resetForm} className="text-xs text-slate-500 hover:text-slate-700">
              Cancel
            </button>
          </div>

          {/* Upcoming toggle */}
          {!editingId && (
            <div className="flex gap-2 p-1 bg-white rounded-xl border border-slate-200 w-fit">
              <button
                type="button"
                onClick={() => setIsUpcoming(false)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${!isUpcoming ? "bg-purple-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-800"}`}
              >
                Past fight
              </button>
              <button
                type="button"
                onClick={() => setIsUpcoming(true)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${isUpcoming ? "bg-purple-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-800"}`}
              >
                Upcoming fight
              </button>
            </div>
          )}

          {isUpcoming && (
            <p className="text-xs text-purple-700 bg-purple-100 rounded-lg px-3 py-2">
              This fight will appear in your Upcoming Fights section on your profile.
            </p>
          )}

          <div className="grid md:grid-cols-2 gap-3">
            <label className="text-xs text-slate-600 space-y-1 block">
              Event Name *
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-sm bg-white"
                placeholder="e.g. Legacy Fight Night 5"
                required
              />
            </label>

            <label className="text-xs text-slate-600 space-y-1 block">
              Event Date *
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-sm bg-white"
                required
              />
            </label>

            <label className="text-xs text-slate-600 space-y-1 block">
              Opponent Name *
              <input
                type="text"
                value={opponentName}
                onChange={(e) => setOpponentName(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-sm bg-white"
                placeholder="e.g. John Smith"
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
                className="w-full rounded-xl border px-3 py-2 text-sm bg-white"
              />
            </label>

            <label className="text-xs text-slate-600 space-y-1 block">
              Weight Class
              <input
                type="text"
                value={weightClass}
                onChange={(e) => setWeightClass(e.target.value)}
                placeholder="e.g. 70kg, Welterweight"
                className="w-full rounded-xl border px-3 py-2 text-sm bg-white"
              />
            </label>

            <DisciplineSelect label="Discipline" value={martialArt} onChange={setMartialArt} />
          </div>

          {/* Result fields — past fights only */}
          {!isUpcoming && (
            <div className="grid md:grid-cols-2 gap-3">
              <label className="text-xs text-slate-600 space-y-1 block">
                Result *
                <select
                  value={result}
                  onChange={(e) => setResult(e.target.value as any)}
                  className="w-full rounded-xl border px-3 py-2 text-sm bg-white"
                  required
                >
                  <option value="win">Win</option>
                  <option value="loss">Loss</option>
                  <option value="draw">Draw</option>
                  <option value="no_contest">No Contest</option>
                </select>
              </label>

              <label className="text-xs text-slate-600 space-y-1 block">
                Method
                <input
                  type="text"
                  value={resultMethod}
                  onChange={(e) => setResultMethod(e.target.value)}
                  placeholder="e.g. KO, TKO, Decision"
                  className="w-full rounded-xl border px-3 py-2 text-sm bg-white"
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
                  className="w-full rounded-xl border px-3 py-2 text-sm bg-white"
                />
              </label>

              <label className="text-xs text-slate-600 space-y-1 block">
                Time
                <input
                  type="text"
                  value={resultTime}
                  onChange={(e) => setResultTime(e.target.value)}
                  placeholder="e.g. 2:34"
                  className="w-full rounded-xl border px-3 py-2 text-sm bg-white"
                />
              </label>
            </div>
          )}

          <label className="text-xs text-slate-600 space-y-1 block">
            Notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              className="w-full rounded-xl border px-3 py-2 text-sm bg-white min-h-[72px]"
            />
          </label>

          <button
            type="submit"
            className="w-full px-4 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors"
          >
            {editingId ? "Save Changes" : isUpcoming ? "Add Upcoming Fight" : "Add Fight"}
          </button>
        </form>
      )}

      {/* Fight lists */}
      {loading ? (
        <div className="text-sm text-slate-500 py-4 text-center">Loading fights…</div>
      ) : (
        <div className="space-y-5">
          {/* Upcoming */}
          {upcomingFights.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Upcoming</h4>
              {upcomingFights.map((fight) => (
                <FightRow
                  key={fight.id}
                  fight={fight}
                  isUpcoming
                  onEdit={() => startEdit(fight)}
                  onDelete={() => handleDelete(fight.id)}
                  onMarkResult={() => markResult(fight)}
                />
              ))}
            </div>
          )}

          {/* Past */}
          {pastFights.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Past</h4>
              {pastFights.map((fight) => (
                <FightRow
                  key={fight.id}
                  fight={fight}
                  isUpcoming={false}
                  onEdit={() => startEdit(fight)}
                  onDelete={() => handleDelete(fight.id)}
                />
              ))}
            </div>
          )}

          {fights.length === 0 && !showAddForm && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-sm text-slate-600">No fights added yet.</p>
              <p className="text-xs text-slate-400 mt-1">Add upcoming fights or log past results.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-component ──────────────────────────────────────────────────────────────

function FightRow({
  fight,
  isUpcoming,
  onEdit,
  onDelete,
  onMarkResult,
}: {
  fight: FightHistoryEntry;
  isUpcoming: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMarkResult?: () => void;
}) {
  const resultStr = fight.result ? (() => {
    const parts: string[] = [RESULT_LABELS[fight.result] ?? fight.result];
    if (fight.result_method) parts.push(fight.result_method);
    if (fight.result_round) parts.push(`R${fight.result_round}`);
    if (fight.result_time) parts.push(fight.result_time);
    return parts.join(" · ");
  })() : null;

  return (
    <div className={`rounded-xl border p-3 space-y-1.5 ${isUpcoming ? "border-purple-200 bg-purple-50/30" : "border-slate-200 bg-white"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {isUpcoming && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                Upcoming
              </span>
            )}
            <span className="font-semibold text-sm text-slate-900 truncate">{fight.event_name}</span>
            <span className="text-xs text-slate-400 whitespace-nowrap">
              {new Date(fight.event_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
          <p className="text-sm text-slate-700 mt-0.5">
            vs <span className="font-medium">{fight.opponent_name}</span>
          </p>
          {resultStr && <p className="text-xs text-slate-500">{resultStr}</p>}
          {(fight.location || fight.weight_class || fight.martial_art) && (
            <p className="text-xs text-slate-400 mt-0.5">
              {[fight.location, fight.weight_class, fight.martial_art].filter(Boolean).join(" · ")}
            </p>
          )}
          {fight.notes && <p className="text-xs text-slate-500 italic mt-0.5">{fight.notes}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isUpcoming && onMarkResult && (
            <button
              type="button"
              onClick={onMarkResult}
              className="px-2 py-1 text-[11px] font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
            >
              + Result
            </button>
          )}
          <button type="button" onClick={onEdit} className="px-2 py-1 text-xs text-purple-600 hover:text-purple-700">
            Edit
          </button>
          <button type="button" onClick={onDelete} className="px-2 py-1 text-xs text-red-500 hover:text-red-600">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
