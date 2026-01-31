"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type PromotionFighter = {
  id: string;
  fighter_profile_id: string;
  status: string;
  rank: string | null;
  weight_class: string | null;
  belt_title: string | null;
  fighters: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

type PromotionFightersProps = {
  promotionId: string;
  isOwner: boolean;
};

export default function PromotionFighters({ promotionId, isOwner }: PromotionFightersProps) {
  const supabase = createSupabaseBrowser();
  const [fighters, setFighters] = useState<PromotionFighter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadFighters();
  }, [promotionId]);

  async function loadFighters() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("promotion_fighters")
        .select(`
          id,
          fighter_profile_id,
          status,
          rank,
          weight_class,
          belt_title,
          fighters:fighter_profile_id (
            id,
            full_name,
            username,
            avatar_url
          )
        `)
        .eq("promotion_profile_id", promotionId)
        .eq("status", "active")
        .order("rank", { ascending: true });

      if (error) {
        console.error("Error loading fighters:", error);
      } else {
        // Map the data and handle fighters array (Supabase may return array even for FK relationships)
        const mappedData = (data || []).map((item: any) => ({
          id: item.id,
          fighter_profile_id: item.fighter_profile_id,
          status: item.status,
          rank: item.rank,
          weight_class: item.weight_class,
          belt_title: item.belt_title,
          fighters: Array.isArray(item.fighters) 
            ? (item.fighters[0] || null)
            : (item.fighters || null),
        }));
        setFighters(mappedData);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }

  // Group fighters:
  // 1. Champions: fighters with a belt_title (regardless of rank)
  // 2. Rankings: fighters with a numeric rank and no belt_title
  // 3. Roster: fighters with neither belt_title nor numeric rank
  const champions = fighters.filter(f => f.belt_title && f.belt_title.trim() !== "");
  const rankedFighters = fighters.filter(f => {
    // Check if rank is a number (and no belt title)
    const hasNumericRank = f.rank && /^\d+$/.test(f.rank.trim());
    const hasNoBelt = !f.belt_title || f.belt_title.trim() === "";
    return hasNumericRank && hasNoBelt;
  });
  const unrankedFighters = fighters.filter(f => {
    const hasNoBelt = !f.belt_title || f.belt_title.trim() === "";
    const hasNoNumericRank = !f.rank || !/^\d+$/.test(f.rank.trim());
    return hasNoBelt && hasNoNumericRank;
  });

  if (loading) {
    return (
      <section className="card">
        <div className="section-header mb-4">
          <h2 className="section-title text-lg">Roster</h2>
        </div>
        <p className="text-sm text-slate-600">Loading fighters...</p>
      </section>
    );
  }

  return (
    <>
      <section className="card">
        <div className="section-header mb-4">
          <h2 className="section-title text-lg">Roster</h2>
        </div>
        <div className="flex items-center justify-between mb-4">
          {isOwner && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 transition-colors"
            >
              + Add Fighter
            </button>
          )}
        </div>

        {fighters.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
            <p className="text-sm text-slate-600 mb-2">No fighters in roster yet.</p>
            {isOwner && (
              <button
                onClick={() => setShowAddModal(true)}
                className="text-xs text-purple-700 hover:underline"
              >
                Add your first fighter
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Champions */}
            {champions.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">
                  Champions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {champions.map((pf) => (
                    <FighterCard key={pf.id} promotionFighter={pf} isOwner={isOwner} onUpdate={loadFighters} />
                  ))}
                </div>
              </div>
            )}

            {/* Ranked Fighters */}
            {rankedFighters.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">
                  Rankings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {rankedFighters
                    .sort((a, b) => {
                      const rankA = parseInt(a.rank?.trim() || "999");
                      const rankB = parseInt(b.rank?.trim() || "999");
                      return rankA - rankB;
                    })
                    .map((pf) => (
                      <FighterCard key={pf.id} promotionFighter={pf} isOwner={isOwner} onUpdate={loadFighters} />
                    ))}
                </div>
              </div>
            )}

            {/* Unranked Fighters */}
            {unrankedFighters.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">
                  Roster
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {unrankedFighters.map((pf) => (
                    <FighterCard key={pf.id} promotionFighter={pf} isOwner={isOwner} onUpdate={loadFighters} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {showAddModal && (
        <AddFighterModal
          promotionId={promotionId}
          existingFighterIds={fighters.map(f => f.fighter_profile_id)}
          onClose={() => setShowAddModal(false)}
          onAdded={loadFighters}
        />
      )}
    </>
  );
}

function FighterCard({ 
  promotionFighter, 
  isOwner,
  onUpdate 
}: { 
  promotionFighter: PromotionFighter;
  isOwner: boolean;
  onUpdate: () => void;
}) {
  const supabase = createSupabaseBrowser();
  const [showEditModal, setShowEditModal] = useState(false);
  const fighter = promotionFighter.fighters;
  if (!fighter) return null;

  const fighterName = fighter.full_name || fighter.username || "Unknown Fighter";
  const fighterHandle = fighter.username;

  return (
    <>
      <div className="border border-slate-200 rounded-lg p-3 hover:border-purple-300 transition-colors">
        <Link href={fighterHandle ? `/profile/${fighterHandle}` : "#"} className="block">
          <div className="flex items-center gap-3">
            {fighter.avatar_url ? (
              <Image
                src={fighter.avatar_url}
                alt={fighterName}
                width={48}
                height={48}
                className="rounded-full"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center">
                <span className="text-slate-600 font-semibold text-sm">
                  {fighterName[0]?.toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-slate-900 truncate">{fighterName}</div>
              {promotionFighter.belt_title ? (
                <div className="text-xs text-amber-700 font-medium truncate">
                  {promotionFighter.belt_title}
                </div>
              ) : promotionFighter.rank ? (
                <div className="text-xs text-slate-600">#{promotionFighter.rank}</div>
              ) : null}
              {promotionFighter.weight_class && (
                <div className="text-xs text-slate-500">{promotionFighter.weight_class}</div>
              )}
            </div>
          </div>
        </Link>
        {isOwner && (
          <div className="mt-2 flex gap-2">
            <button
              onClick={(e) => {
                e.preventDefault();
                setShowEditModal(true);
              }}
              className="flex-1 text-xs text-purple-600 hover:text-purple-700 text-center"
            >
              Edit
            </button>
            <button
              onClick={async (e) => {
                e.preventDefault();
                if (confirm(`Remove ${fighterName} from roster?`)) {
                  await supabase
                    .from("promotion_fighters")
                    .delete()
                    .eq("id", promotionFighter.id);
                  onUpdate();
                }
              }}
              className="flex-1 text-xs text-red-600 hover:text-red-700 text-center"
            >
              Remove
            </button>
          </div>
        )}
      </div>

      {showEditModal && (
        <EditFighterModal
          promotionFighter={promotionFighter}
          fighterName={fighterName}
          onClose={() => setShowEditModal(false)}
          onUpdated={onUpdate}
        />
      )}
    </>
  );
}

function AddFighterModal({
  promotionId,
  existingFighterIds,
  onClose,
  onAdded,
}: {
  promotionId: string;
  existingFighterIds: string[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const supabase = createSupabaseBrowser();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedFighter, setSelectedFighter] = useState<any>(null);
  const [rank, setRank] = useState("");
  const [weightClass, setWeightClass] = useState("");
  const [beltTitle, setBeltTitle] = useState("");
  const [saving, setSaving] = useState(false);

  async function searchFighters() {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .eq("role", "FIGHTER")
        .or(`full_name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) {
        console.error("Search error:", error);
      } else {
        // Filter out already added fighters
        const filtered = (data || []).filter(
          (f) => !existingFighterIds.includes(f.id)
        );
        setSearchResults(filtered);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setSearching(false);
    }
  }

  useEffect(() => {
    const delay = setTimeout(() => {
      searchFighters();
    }, 300);
    return () => clearTimeout(delay);
  }, [searchTerm]);

  async function handleAdd() {
    if (!selectedFighter) return;

    setSaving(true);
    try {
      const { error } = await supabase.from("promotion_fighters").insert({
        promotion_profile_id: promotionId,
        fighter_profile_id: selectedFighter.id,
        rank: rank || null,
        weight_class: weightClass || null,
        belt_title: beltTitle || null,
        status: "active",
      });

      if (error) {
        alert(`Error: ${error.message}`);
      } else {
        onAdded();
        onClose();
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
          <h2 className="text-lg font-semibold">Add Fighter to Roster</h2>
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
              Search Fighter
              <input
                type="text"
                className="w-full rounded-xl border px-3 py-2 text-sm"
                placeholder="Search by name or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </label>
            {searching && <p className="text-xs text-slate-500 mt-1">Searching...</p>}
          </div>

          {searchResults.length > 0 && (
            <div className="border rounded-lg p-2 max-h-48 overflow-y-auto">
              {searchResults.map((fighter) => (
                <button
                  key={fighter.id}
                  onClick={() => setSelectedFighter(fighter)}
                  className={`w-full text-left p-2 rounded hover:bg-slate-50 flex items-center gap-2 ${
                    selectedFighter?.id === fighter.id ? "bg-purple-50 border border-purple-200" : ""
                  }`}
                >
                  {fighter.avatar_url ? (
                    <Image
                      src={fighter.avatar_url}
                      alt={fighter.full_name || fighter.username || "Fighter"}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                      <span className="text-xs font-medium">
                        {(fighter.full_name || fighter.username || "?")[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-medium">
                      {fighter.full_name || fighter.username || "Unknown"}
                    </div>
                    {fighter.username && (
                      <div className="text-xs text-slate-500">@{fighter.username}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {selectedFighter && (
            <>
              <div className="border-t pt-4 space-y-3">
                <div>
                  <label className="text-xs text-slate-600 space-y-1 block">
                    Rank (numbers only, e.g., &quot;1&quot;, &quot;2&quot;, &quot;3&quot;)
                    <input
                      type="text"
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                      placeholder="1"
                      value={rank}
                      onChange={(e) => {
                        // Only allow numbers
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        setRank(value);
                      }}
                      pattern="[0-9]*"
                      inputMode="numeric"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Enter a number to place fighter in Rankings. Leave empty for Roster.
                    </p>
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
                    Belt Title (for champions)
                    <input
                      type="text"
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                      placeholder="WBC Heavyweight Champion"
                      value={beltTitle}
                      onChange={(e) => setBeltTitle(e.target.value)}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Entering a belt title will place the fighter in the Champions section
                    </p>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleAdd}
                  disabled={saving}
                  className="flex-1 px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-medium disabled:opacity-60"
                >
                  {saving ? "Adding..." : "Add Fighter"}
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EditFighterModal({
  promotionFighter,
  fighterName,
  onClose,
  onUpdated,
}: {
  promotionFighter: PromotionFighter;
  fighterName: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const supabase = createSupabaseBrowser();
  const [rank, setRank] = useState(promotionFighter.rank || "");
  const [weightClass, setWeightClass] = useState(promotionFighter.weight_class || "");
  const [beltTitle, setBeltTitle] = useState(promotionFighter.belt_title || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("promotion_fighters")
        .update({
          rank: rank || null,
          weight_class: weightClass || null,
          belt_title: beltTitle || null,
        })
        .eq("id", promotionFighter.id);

      if (error) {
        alert(`Error: ${error.message}`);
      } else {
        onUpdated();
        onClose();
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
          <h2 className="text-lg font-semibold">Edit Fighter: {fighterName}</h2>
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
              Rank (numbers only, e.g., &quot;1&quot;, &quot;2&quot;, &quot;3&quot;)
              <input
                type="text"
                className="w-full rounded-xl border px-3 py-2 text-sm"
                placeholder="1"
                value={rank}
                onChange={(e) => {
                  // Only allow numbers
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setRank(value);
                }}
                pattern="[0-9]*"
                inputMode="numeric"
              />
              <p className="text-xs text-slate-500 mt-1">
                Enter a number to place fighter in Rankings. Leave empty for Roster.
              </p>
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
              Belt Title (for champions)
              <input
                type="text"
                className="w-full rounded-xl border px-3 py-2 text-sm"
                placeholder="WBC Heavyweight Champion"
                value={beltTitle}
                onChange={(e) => setBeltTitle(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-1">
                This will display on the fighter&apos;s profile if they are a champion
              </p>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-medium disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
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


