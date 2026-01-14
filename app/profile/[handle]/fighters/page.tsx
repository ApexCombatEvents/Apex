// app/profile/[handle]/fighters/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

const ART_FILTERS = [
  { key: "all", label: "All disciplines" },
  { key: "Muay Thai", label: "Muay Thai" },
  { key: "Boxing", label: "Boxing" },
  { key: "MMA", label: "MMA" },
  { key: "BJJ", label: "BJJ" },
  { key: "Kickboxing", label: "Kickboxing" },
  { key: "K1", label: "K1" },
];

// Common weight classes across disciplines
const WEIGHT_CLASSES = [
  { key: "all", label: "All weight classes", minKg: null, maxKg: null },
  { key: "-57kg", label: "-57kg", minKg: null, maxKg: 57 },
  { key: "-60kg", label: "-60kg", minKg: null, maxKg: 60 },
  { key: "-63.5kg", label: "-63.5kg", minKg: null, maxKg: 63.5 },
  { key: "-67kg", label: "-67kg", minKg: null, maxKg: 67 },
  { key: "-70kg", label: "-70kg", minKg: null, maxKg: 70 },
  { key: "-72.5kg", label: "-72.5kg", minKg: null, maxKg: 72.5 },
  { key: "-75kg", label: "-75kg", minKg: null, maxKg: 75 },
  { key: "-80kg", label: "-80kg", minKg: null, maxKg: 80 },
  { key: "80kg+", label: "80kg+", minKg: 80, maxKg: null },
];

export default function FightersPage({
  params,
}: {
  params: Promise<{ handle: string }> | { handle: string };
}) {
  const supabase = createSupabaseBrowser();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [fighters, setFighters] = useState<any[]>([]);
  const [filteredFighters, setFilteredFighters] = useState<any[]>([]);
  const [artFilter, setArtFilter] = useState<string>("all");
  const [weightClassFilter, setWeightClassFilter] = useState<string>("all");
  const [handleParam, setHandleParam] = useState<string>("");
  const [notGymError, setNotGymError] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Resolve params (handle Promise in Next.js 15+)
  useEffect(() => {
    (async () => {
      const resolved = typeof params === 'object' && 'then' in params ? await params : params;
      setHandleParam(resolved.handle);
    })();
  }, [params]);

  // Get current user ID
  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      setMyId(userData.user?.id ?? null);
    })();
  }, []);

  useEffect(() => {
    if (!handleParam) return;

    (async () => {
      setLoading(true);
      
      // Load gym profile - try username first, then handle
      let { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", handleParam)
        .maybeSingle();

      // If not found by username, try handle field
      if ((profileError && profileError.code !== 'PGRST116') || !profileData) {
        const { data: handleData, error: handleError } = await supabase
          .from("profiles")
          .select("*")
          .eq("handle", handleParam)
          .maybeSingle();
        
        if (!handleError && handleData) {
          profileData = handleData;
          profileError = null;
        } else if (handleError && !profileError) {
          profileError = handleError;
        }
      }

      if (profileError || !profileData) {
        setLoading(false);
        return;
      }

      // Check if role is gym (handle both uppercase and lowercase)
      const roleString = profileData.role?.toString().toLowerCase().trim();
      const isGym = roleString === "gym";
      
      if (!isGym) {
        console.log("Not a gym profile. Role:", profileData.role);
        setNotGymError(true);
        setLoading(false);
        return;
      }
      
      setNotGymError(false);

      setProfile(profileData);

      // Load fighters - use username or handle, and handle role case sensitivity
      const gymIdentifier = profileData.username || profileData.handle;
      const { data: fightersData, error: fightersError } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, country, martial_arts, weight, weight_unit, social_links")
        .or("role.eq.fighter,role.eq.FIGHTER")
        .contains("social_links", { gym_username: gymIdentifier });

      if (fightersError) {
        console.error(fightersError);
        setLoading(false);
        return;
      }

      setFighters(fightersData || []);
      setLoading(false);
    })();
  }, [handleParam, supabase]);

  // Filter fighters when filters change
  useEffect(() => {
    let filtered = [...fighters];

    // Filter by martial art
    if (artFilter !== "all") {
      filtered = filtered.filter((fighter) => {
        if (!fighter.martial_arts || !Array.isArray(fighter.martial_arts)) {
          return false;
        }
        return fighter.martial_arts.some(
          (art: string) => art.toLowerCase() === artFilter.toLowerCase()
        );
      });
    }

    // Filter by weight class
    if (weightClassFilter !== "all") {
      const selectedWeightClass = WEIGHT_CLASSES.find(
        (wc) => wc.key === weightClassFilter
      );
      
      if (selectedWeightClass) {
        filtered = filtered.filter((fighter) => {
          if (!fighter.weight || !fighter.weight_unit) {
            return false;
          }

          // Convert weight to kg for comparison
          let weightInKg = fighter.weight;
          if (fighter.weight_unit === "lb") {
            weightInKg = fighter.weight / 2.20462;
          }

          // Check if weight falls within the range
          if (selectedWeightClass.minKg !== null && weightInKg < selectedWeightClass.minKg) {
            return false;
          }
          if (selectedWeightClass.maxKg !== null && weightInKg > selectedWeightClass.maxKg) {
            return false;
          }

          return true;
        });
      }
    }

    setFilteredFighters(filtered);
  }, [fighters, artFilter, weightClassFilter]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="card">
          <p className="text-sm text-slate-600">Loading fighters...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-lg font-semibold mb-2">Profile not found.</p>
        <p className="text-sm text-slate-600 mb-4">
          No profile found for <span className="font-mono">@{handleParam}</span>.
        </p>
        <Link
          href="/"
          className="inline-flex px-4 py-2 rounded-xl bg-purple-600 text-white text-sm"
        >
          Back to home
        </Link>
      </div>
    );
  }

  // Check if not a gym profile (handle both uppercase and lowercase)
  if (profile) {
    const roleString = profile.role?.toString().toLowerCase().trim();
    const isGym = roleString === "gym";
    
    if (!isGym) {
      return (
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <p className="text-lg font-semibold mb-2">Not a gym profile.</p>
          <p className="text-sm text-slate-600 mb-4">
            Role: {String(profile.role || "undefined")}
          </p>
          <Link
            href={`/profile/${handleParam}`}
            className="inline-flex px-4 py-2 rounded-xl bg-purple-600 text-white text-sm"
          >
            Back to profile
          </Link>
        </div>
      );
    }
  }
  
  // Show error if not a gym (from early check)
  if (notGymError) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-lg font-semibold mb-2">Not a gym profile.</p>
        <Link
          href={`/profile/${handleParam}`}
          className="inline-flex px-4 py-2 rounded-xl bg-purple-600 text-white text-sm"
        >
          Back to profile
        </Link>
      </div>
    );
  }

  const isMe = myId === profile?.id;

  async function handleRemoveFighter(fighterId: string) {
    if (!confirm("Are you sure you want to remove this fighter from your gym?")) {
      return;
    }

    setRemovingId(fighterId);

    try {
      // Call API route to remove fighter (uses service role to bypass RLS)
      const response = await fetch("/api/gym/remove-fighter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fighterId }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to remove fighter. Please try again.");
        setRemovingId(null);
        return;
      }

      // Refresh the fighters list
      const gymIdentifier = profile.username || profile.handle;
      const { data: fightersData } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, country, martial_arts, weight, weight_unit, social_links")
        .or("role.eq.fighter,role.eq.FIGHTER")
        .contains("social_links", { gym_username: gymIdentifier });

      setFighters(fightersData || []);
    } catch (err: any) {
      console.error("Remove fighter error", err);
      alert("An error occurred. Please try again.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">
          Fighters at {profile.full_name || profile.username}
        </h1>
        <Link
          href={`/profile/${handleParam}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span>Back to profile</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold">Filters</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <label className="text-xs text-slate-600 space-y-1 block">
            Martial Art
            <select
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              value={artFilter}
              onChange={(e) => setArtFilter(e.target.value)}
            >
              {ART_FILTERS.map((art) => (
                <option key={art.key} value={art.key}>
                  {art.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-slate-600 space-y-1 block">
            Weight Class
            <select
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              value={weightClassFilter}
              onChange={(e) => setWeightClassFilter(e.target.value)}
            >
              {WEIGHT_CLASSES.map((wc) => (
                <option key={wc.key} value={wc.key}>
                  {wc.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {(artFilter !== "all" || weightClassFilter !== "all") && (
          <button
            onClick={() => {
              setArtFilter("all");
              setWeightClassFilter("all");
            }}
            className="text-xs text-purple-600 hover:text-purple-700 font-medium"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Results count */}
      {filteredFighters.length !== fighters.length && (
        <p className="text-sm text-slate-600">
          Showing {filteredFighters.length} of {fighters.length} fighters
        </p>
      )}

      {/* Fighters List */}
      {filteredFighters.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
          <p className="text-sm text-slate-600">
            {fighters.length === 0
              ? "No fighters linked yet."
              : "No fighters match the selected filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFighters.map((fighter: any) => {
            // Format weight display
            const displayWeight = fighter.weight 
              ? `${fighter.weight}${fighter.weight_unit || "kg"}`
              : null;

            return (
              <div
                key={fighter.id}
                className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white px-4 py-4"
              >
                <Link
                  href={`/profile/${fighter.username}`}
                  className="flex items-start gap-4 flex-1 hover:opacity-80 transition-opacity"
                >
                  {/* Profile Picture */}
                  <div className="h-16 w-16 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                    {fighter.avatar_url ? (
                      <Image
                        src={fighter.avatar_url}
                        alt={fighter.full_name || fighter.username || "Fighter"}
                        width={64}
                        height={64}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-slate-400">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-8 w-8"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Fighter Info */}
                  <div className="flex-1 min-w-0">
                    {/* Full Name */}
                    <div className="font-semibold text-slate-900 text-base mb-1">
                      {fighter.full_name || "Fighter"}
                    </div>
                    
                    {/* Username and Weight */}
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      {fighter.username && (
                        <span className="text-sm text-slate-600">
                          @{fighter.username}
                        </span>
                      )}
                      {displayWeight && (
                        <>
                          <span className="text-slate-400">•</span>
                          <span className="text-sm text-slate-600 font-medium">
                            {displayWeight}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Martial Arts */}
                    {fighter.martial_arts && Array.isArray(fighter.martial_arts) && fighter.martial_arts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {fighter.martial_arts.map((art: string) => (
                          <span
                            key={art}
                            className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-medium"
                          >
                            {art}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Arrow Icon */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-slate-400 flex-shrink-0 mt-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>

                {/* Remove Button (only for gym owners) */}
                {isMe && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRemoveFighter(fighter.id);
                    }}
                    disabled={removingId === fighter.id}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    title="Remove fighter from gym"
                  >
                    {removingId === fighter.id ? "Removing..." : "Remove"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
