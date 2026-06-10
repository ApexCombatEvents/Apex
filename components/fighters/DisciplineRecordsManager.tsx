"use client";

import { useState, useEffect } from "react";

type DisciplineRecord = {
  id: string;
  discipline: string;
  wins: number;
  losses: number;
  draws: number;
};

type Props = {
  fighterId: string;
  martialArtsSuggestions?: string[];
};

export default function DisciplineRecordsManager({ fighterId, martialArtsSuggestions = [] }: Props) {
  const [records, setRecords] = useState<DisciplineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRecords();
  }, [fighterId]);

  async function loadRecords() {
    setLoading(true);
    try {
      const res = await fetch(`/api/fighters/discipline-records?fighter_id=${fighterId}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
      }
    } catch (err) {
      console.error("Error loading discipline records:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(discipline: string, wins: number, losses: number, draws: number) {
    setError(null);
    const res = await fetch("/api/fighters/discipline-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discipline, wins, losses, draws }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to add discipline record");
      return false;
    }

    await loadRecords();
    return true;
  }

  async function handleUpdate(id: string, discipline: string, wins: number, losses: number, draws: number) {
    setError(null);
    const res = await fetch(`/api/fighters/discipline-records/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discipline, wins, losses, draws }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to update discipline record");
      return false;
    }

    await loadRecords();
    return true;
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this discipline record?")) return;
    setError(null);

    const res = await fetch(`/api/fighters/discipline-records/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to delete discipline record");
      return;
    }

    await loadRecords();
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Record by Discipline</h2>
        <p className="text-sm text-slate-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Record by Discipline</h2>
        {!showAddForm && (
          <button
            onClick={() => { setShowAddForm(true); setEditingId(null); }}
            className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 transition-colors"
          >
            + Add Discipline
          </button>
        )}
      </div>

      <p className="text-xs text-slate-600">
        Break down your overall record by discipline. This helps promoters and matchmakers understand your experience in each art.
      </p>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {records.length === 0 && !showAddForm ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
          <p className="text-sm text-slate-600 mb-2">No discipline records added yet.</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="text-xs text-purple-700 hover:underline"
          >
            Add your first discipline record
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map((rec) =>
            editingId === rec.id ? (
              <DisciplineForm
                key={rec.id}
                initial={rec}
                suggestions={martialArtsSuggestions}
                existingDisciplines={records.filter(r => r.id !== rec.id).map(r => r.discipline)}
                onSubmit={async (d, w, l, dr) => {
                  const ok = await handleUpdate(rec.id, d, w, l, dr);
                  if (ok) setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
                submitLabel="Save"
              />
            ) : (
              <div
                key={rec.id}
                className="border border-slate-200 rounded-lg p-3 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-slate-900">{rec.discipline}</div>
                  <div className="text-xs text-slate-600">
                    {rec.wins}-{rec.losses}-{rec.draws}
                    <span className="text-slate-400 ml-1">(W-L-D)</span>
                  </div>
                </div>
                <div className="flex gap-1 ml-3">
                  <button
                    onClick={() => { setEditingId(rec.id); setShowAddForm(false); }}
                    className="px-3 py-1.5 text-xs text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(rec.id)}
                    className="px-3 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {showAddForm && (
        <DisciplineForm
          suggestions={martialArtsSuggestions}
          existingDisciplines={records.map(r => r.discipline)}
          onSubmit={async (d, w, l, dr) => {
            const ok = await handleAdd(d, w, l, dr);
            if (ok) setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
          submitLabel="Add"
        />
      )}
    </div>
  );
}

function DisciplineForm({
  initial,
  suggestions,
  existingDisciplines,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initial?: { discipline: string; wins: number; losses: number; draws: number };
  suggestions: string[];
  existingDisciplines: string[];
  onSubmit: (discipline: string, wins: number, losses: number, draws: number) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [discipline, setDiscipline] = useState(initial?.discipline ?? "");
  const [wins, setWins] = useState(String(initial?.wins ?? 0));
  const [losses, setLosses] = useState(String(initial?.losses ?? 0));
  const [draws, setDraws] = useState(String(initial?.draws ?? 0));
  const [saving, setSaving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(discipline.toLowerCase()) &&
      s.toLowerCase() !== discipline.toLowerCase() &&
      !existingDisciplines.some(e => e.toLowerCase() === s.toLowerCase())
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!discipline.trim()) return;
    setSaving(true);
    await onSubmit(
      discipline.trim(),
      Math.max(0, parseInt(wins) || 0),
      Math.max(0, parseInt(losses) || 0),
      Math.max(0, parseInt(draws) || 0)
    );
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="border border-purple-200 rounded-lg p-3 bg-purple-50/30 space-y-3">
      <div className="relative">
        <label className="text-xs text-slate-600 space-y-1 block">
          Discipline *
          <input
            type="text"
            className="w-full rounded-xl border px-3 py-2 text-sm bg-white"
            placeholder="e.g. Boxing, Muay Thai, MMA"
            value={discipline}
            onChange={(e) => { setDiscipline(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            required
          />
        </label>
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
            {filteredSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-purple-50 transition-colors"
                onMouseDown={() => { setDiscipline(s); setShowSuggestions(false); }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <label className="text-xs text-slate-600 space-y-1 block">
          Wins
          <input
            type="number"
            min={0}
            className="w-full rounded-xl border px-3 py-2 text-sm bg-white"
            value={wins}
            onChange={(e) => setWins(e.target.value)}
          />
        </label>
        <label className="text-xs text-slate-600 space-y-1 block">
          Losses
          <input
            type="number"
            min={0}
            className="w-full rounded-xl border px-3 py-2 text-sm bg-white"
            value={losses}
            onChange={(e) => setLosses(e.target.value)}
          />
        </label>
        <label className="text-xs text-slate-600 space-y-1 block">
          Draws
          <input
            type="number"
            min={0}
            className="w-full rounded-xl border px-3 py-2 text-sm bg-white"
            value={draws}
            onChange={(e) => setDraws(e.target.value)}
          />
        </label>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !discipline.trim()}
          className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-medium disabled:opacity-60 hover:bg-purple-700 transition-colors"
        >
          {saving ? "Saving..." : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
