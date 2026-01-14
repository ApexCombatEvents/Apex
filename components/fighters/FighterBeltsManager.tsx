"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type FighterBelt = {
  id: string;
  belt_title: string;
  weight_class: string | null;
  promotion_name: string | null;
  belt_image_url: string | null;
  created_at: string;
};

type FighterBeltsManagerProps = {
  fighterId: string;
};

export default function FighterBeltsManager({ fighterId }: FighterBeltsManagerProps) {
  const supabase = createSupabaseBrowser();
  const [belts, setBelts] = useState<FighterBelt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadBelts();
  }, [fighterId]);

  async function loadBelts() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("fighter_belts")
        .select("*")
        .eq("fighter_profile_id", fighterId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading belts:", error);
      } else {
        setBelts((data as FighterBelt[]) || []);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(beltId: string) {
    if (!confirm("Are you sure you want to delete this belt?")) return;

    try {
      const { error } = await supabase
        .from("fighter_belts")
        .delete()
        .eq("id", beltId);

      if (error) {
        alert(`Error: ${error.message}`);
      } else {
        loadBelts();
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Championship Belts</h2>
        <p className="text-sm text-slate-600">Loading belts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Championship Belts</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 transition-colors"
        >
          + Add Belt
        </button>
      </div>

      <p className="text-xs text-slate-600">
        Add belts from promotions that aren&apos;t on Apex yet. Belts from promotions on Apex will appear automatically.
      </p>

      {belts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
          <p className="text-sm text-slate-600 mb-2">No belts added yet.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="text-xs text-purple-700 hover:underline"
          >
            Add your first belt
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {belts.map((belt) => (
            <div
              key={belt.id}
              className="border border-slate-200 rounded-lg p-3 flex items-center justify-between"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-slate-900">{belt.belt_title}</div>
                {belt.weight_class && (
                  <div className="text-xs text-slate-600">Weight Class: {belt.weight_class}</div>
                )}
                {belt.promotion_name && (
                  <div className="text-xs text-purple-700">Promotion: {belt.promotion_name}</div>
                )}
              </div>
              <button
                onClick={() => handleDelete(belt.id)}
                className="ml-3 px-3 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <AddBeltModal
          fighterId={fighterId}
          onClose={() => setShowAddModal(false)}
          onAdded={loadBelts}
        />
      )}
    </div>
  );
}

function AddBeltModal({
  fighterId,
  onClose,
  onAdded,
}: {
  fighterId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const supabase = createSupabaseBrowser();
  const [beltTitle, setBeltTitle] = useState("");
  const [weightClass, setWeightClass] = useState("");
  const [promotionName, setPromotionName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!beltTitle.trim()) {
      alert("Please enter a belt title");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("fighter_belts").insert({
        fighter_profile_id: fighterId,
        belt_title: beltTitle.trim(),
        weight_class: weightClass.trim() || null,
        promotion_name: promotionName.trim() || null,
      });

      if (error) {
        alert(`Error: ${error.message}`);
      } else {
        onAdded();
        onClose();
        // Reset form
        setBeltTitle("");
        setWeightClass("");
        setPromotionName("");
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Add Championship Belt</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-600 space-y-1 block">
              Belt Title *
              <input
                type="text"
                className="w-full rounded-xl border px-3 py-2 text-sm"
                placeholder="WBC Heavyweight Champion"
                value={beltTitle}
                onChange={(e) => setBeltTitle(e.target.value)}
                required
              />
            </label>
          </div>

          <div>
            <label className="text-xs text-slate-600 space-y-1 block">
              Weight Class
              <input
                type="text"
                className="w-full rounded-xl border px-3 py-2 text-sm"
                placeholder="Heavyweight, Lightweight, 70kg, etc."
                value={weightClass}
                onChange={(e) => setWeightClass(e.target.value)}
              />
            </label>
          </div>

          <div>
            <label className="text-xs text-slate-600 space-y-1 block">
              Promotion Name
              <input
                type="text"
                className="w-full rounded-xl border px-3 py-2 text-sm"
                placeholder="WBC, UFC, ISKA, etc."
                value={promotionName}
                onChange={(e) => setPromotionName(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-1">
                Name of the promotion that awarded this belt
              </p>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleAdd}
              disabled={saving || !beltTitle.trim()}
              className="flex-1 px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-medium disabled:opacity-60"
            >
              {saving ? "Adding..." : "Add Belt"}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
