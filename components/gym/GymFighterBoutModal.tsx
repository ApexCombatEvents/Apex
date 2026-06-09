// components/gym/GymFighterBoutModal.tsx
"use client";

import { useEffect, useState } from "react";
import DisciplineSelect from "@/components/ui/DisciplineSelect";

export type GymFighterBout = {
  id: string;
  gym_profile_id: string;
  fighter_name: string;
  fighter_profile_id?: string | null;
  event_name: string;
  event_date: string;
  opponent_name?: string | null;
  location?: string | null;
  weight_class?: string | null;
  discipline?: string | null;
  tickets_url?: string | null;
  fighter_social?: string | null;
  notes?: string | null;
};

type Props = {
  gymId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
};

export default function GymFighterBoutModal({ gymId, isOpen, onClose, onUpdate }: Props) {
  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" aria-hidden="true" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Manage fighter bouts"
        className="fixed z-[70] inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center"
      >
        <div
          className="relative w-full md:max-w-2xl md:mx-4 bg-white rounded-t-3xl md:rounded-2xl shadow-2xl flex flex-col"
          style={{ maxHeight: "min(90dvh, 90vh)" }}
        >
          {/* Handle (mobile) */}
          <div className="flex justify-center pt-3 pb-1 md:hidden shrink-0">
            <div className="w-10 h-1 rounded-full bg-slate-300" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
            <div>
              <h2 className="text-base font-bold text-slate-900">Fighter Bouts</h2>
              <p className="text-xs text-slate-500 mt-0.5">Add upcoming fights for your fighters</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1 px-5 py-4 overscroll-contain">
            <BoutManager gymId={gymId} onUpdate={onUpdate} />
          </div>
        </div>
      </div>
    </>
  );
}

// ── Inner manager ──────────────────────────────────────────────────────────────

function BoutManager({ gymId, onUpdate }: { gymId: string; onUpdate?: () => void }) {
  const [bouts, setBouts] = useState<GymFighterBout[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  // Form state
  const [fighterName, setFighterName] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [opponentName, setOpponentName] = useState("");
  const [location, setLocation] = useState("");
  const [weightClass, setWeightClass] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [ticketsUrl, setTicketsUrl] = useState("");
  const [fighterSocial, setFighterSocial] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => { loadBouts(); }, [gymId]);

  async function loadBouts() {
    try {
      setLoading(true);
      const res = await fetch(`/api/gym/fighter-bouts?gym_id=${gymId}`);
      const data = await res.json();
      if (res.ok) setBouts(data.bouts || []);
      else setMessage({ text: "Failed to load fighter bouts", ok: false });
    } catch {
      setMessage({ text: "Failed to load fighter bouts", ok: false });
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFighterName(""); setEventName(""); setEventDate(""); setOpponentName("");
    setLocation(""); setWeightClass(""); setDiscipline(""); setTicketsUrl("");
    setFighterSocial(""); setNotes(""); setEditingId(null); setShowForm(false);
    setMessage(null);
  }

  function startEdit(bout: GymFighterBout) {
    setFighterName(bout.fighter_name);
    setEventName(bout.event_name);
    const d = bout.event_date;
    setEventDate(d.includes("T") ? d.split("T")[0] : d.length === 10 ? d : new Date(d).toISOString().split("T")[0]);
    setOpponentName(bout.opponent_name || "");
    setLocation(bout.location || "");
    setWeightClass(bout.weight_class || "");
    setDiscipline(bout.discipline || "");
    setTicketsUrl(bout.tickets_url || "");
    setFighterSocial(bout.fighter_social || "");
    setNotes(bout.notes || "");
    setEditingId(bout.id);
    setShowForm(true);
    setMessage(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!fighterName || !eventName || !eventDate) {
      setMessage({ text: "Fighter name, event name and date are required", ok: false });
      return;
    }

    const payload = {
      fighter_name: fighterName,
      event_name: eventName,
      event_date: eventDate,
      opponent_name: opponentName || null,
      location: location || null,
      weight_class: weightClass || null,
      discipline: discipline || null,
      tickets_url: ticketsUrl || null,
      fighter_social: fighterSocial || null,
      notes: notes || null,
    };

    try {
      const url = editingId ? `/api/gym/fighter-bouts/${editingId}` : "/api/gym/fighter-bouts";
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage({ text: editingId ? "Fight updated!" : "Fight added!", ok: true });
        resetForm();
        await loadBouts();
        onUpdate?.();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ text: data.error || "Failed to save fight", ok: false });
      }
    } catch {
      setMessage({ text: "Failed to save. Check your connection.", ok: false });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this fighter bout?")) return;
    try {
      const res = await fetch(`/api/gym/fighter-bouts/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMessage({ text: "Fight deleted", ok: true });
        await loadBouts();
        onUpdate?.();
        setTimeout(() => setMessage(null), 3000);
      } else {
        const data = await res.json();
        setMessage({ text: data.error || "Failed to delete", ok: false });
      }
    } catch {
      setMessage({ text: "Failed to delete", ok: false });
    }
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Manage Fighter Bouts</h3>
          <p className="text-xs text-slate-500 mt-0.5">Add upcoming fights for fighters not yet on Apex.</p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => { resetForm(); setShowForm(true); }}
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

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-purple-200 bg-purple-50/40 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-900">{editingId ? "Edit Fight" : "Add Fighter Bout"}</h4>
            <button type="button" onClick={resetForm} className="text-xs text-slate-500 hover:text-slate-700">Cancel</button>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <label className="text-xs text-slate-600 space-y-1 block md:col-span-2">
              Fighter Name *
              <input
                type="text"
                value={fighterName}
                onChange={(e) => setFighterName(e.target.value)}
                placeholder="e.g. Jamie Wilson"
                className="w-full rounded-xl border px-3 py-2 text-sm bg-white"
                required
              />
            </label>

            <label className="text-xs text-slate-600 space-y-1 block">
              Event Name *
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g. Legacy Fight Night 6"
                className="w-full rounded-xl border px-3 py-2 text-sm bg-white"
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
              Opponent Name
              <input
                type="text"
                value={opponentName}
                onChange={(e) => setOpponentName(e.target.value)}
                placeholder="e.g. John Smith"
                className="w-full rounded-xl border px-3 py-2 text-sm bg-white"
              />
            </label>

            <label className="text-xs text-slate-600 space-y-1 block">
              Location
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Manchester, UK"
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

            <DisciplineSelect label="Discipline" value={discipline} onChange={setDiscipline} />

            <label className="text-xs text-slate-600 space-y-1 block">
              Tickets Link
              <input
                type="url"
                value={ticketsUrl}
                onChange={(e) => setTicketsUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border px-3 py-2 text-sm bg-white"
              />
            </label>

            <label className="text-xs text-slate-600 space-y-1 block">
              Fighter Social / Profile Link
              <input
                type="text"
                value={fighterSocial}
                onChange={(e) => setFighterSocial(e.target.value)}
                placeholder="e.g. @fighter_insta or https://..."
                className="w-full rounded-xl border px-3 py-2 text-sm bg-white"
              />
            </label>
          </div>

          <label className="text-xs text-slate-600 space-y-1 block">
            Extra Details / Notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any extra info about this bout..."
              className="w-full rounded-xl border px-3 py-2 text-sm bg-white min-h-[72px]"
            />
          </label>

          <button
            type="submit"
            className="w-full px-4 py-2.5 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors"
          >
            {editingId ? "Save Changes" : "Add Bout"}
          </button>
        </form>
      )}

      {/* Bouts list */}
      {loading ? (
        <div className="text-sm text-slate-500 py-4 text-center">Loading…</div>
      ) : bouts.length === 0 && !showForm ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
          <p className="text-sm text-slate-600">No fighter bouts added yet.</p>
          <p className="text-xs text-slate-400 mt-1">Add upcoming fights for your fighters on other promotions.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bouts.map((bout) => (
            <div key={bout.id} className="rounded-xl border border-purple-200 bg-purple-50/30 p-3 space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                      Upcoming
                    </span>
                    <span className="font-semibold text-sm text-slate-900">{bout.fighter_name}</span>
                  </div>
                  <p className="text-sm text-slate-700 mt-0.5">{bout.event_name}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(bout.event_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    {bout.location ? ` · ${bout.location}` : ""}
                  </p>
                  {bout.opponent_name && (
                    <p className="text-xs text-slate-600">vs <span className="font-medium">{bout.opponent_name}</span></p>
                  )}
                  {(bout.weight_class || bout.discipline) && (
                    <p className="text-xs text-slate-400">{[bout.weight_class, bout.discipline].filter(Boolean).join(" · ")}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    {bout.tickets_url && (
                      <a
                        href={bout.tickets_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600 text-white text-[11px] font-medium hover:bg-purple-700 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                        </svg>
                        Buy Tickets
                      </a>
                    )}
                    {bout.fighter_social && (
                      <a
                        href={bout.fighter_social.startsWith("http") ? bout.fighter_social : `https://instagram.com/${bout.fighter_social.replace("@", "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] text-purple-600 hover:underline"
                      >
                        Fighter profile
                      </a>
                    )}
                  </div>
                  {bout.notes && <p className="text-xs text-slate-500 italic mt-0.5">{bout.notes}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={() => startEdit(bout)} className="px-2 py-1 text-xs text-purple-600 hover:text-purple-700">Edit</button>
                  <button type="button" onClick={() => handleDelete(bout.id)} className="px-2 py-1 text-xs text-red-500 hover:text-red-600">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
