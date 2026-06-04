// app/search/page.tsx — people search (fighters, coaches, gyms, promotions)
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { countryToFlag } from "@/lib/countries";
import { getCurrentLocation } from "@/lib/location";
import SponsorshipBanner from "@/components/sponsors/SponsorshipBanner";
import { getSponsorshipsForPlacement, type Sponsorship } from "@/lib/sponsorships";
import ALogo from "@/components/logos/ALogo";
import { useTranslation } from "@/hooks/useTranslation";
import { DISCIPLINES } from "@/lib/disciplines";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "fighter" | "coach" | "gym" | "promotion";

type ProfileResult = {
  id: string;
  full_name: string | null;
  username: string | null;
  role: Role | null;
  avatar_url: string | null;
  country: string | null;
  martial_arts: string[] | null;
  social_links: any | null;
  record: string | null;
  rank: string | null;
  weight: number | null;
  weight_unit: "kg" | "lb" | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseRecord(record?: string | null) {
  if (!record) return { wins: null as number | null, losses: null as number | null, draws: null as number | null };
  const m = record.match(/^(\d+)-(\d+)-(\d+)$/);
  if (!m) return { wins: null, losses: null, draws: null };
  return { wins: parseInt(m[1], 10), losses: parseInt(m[2], 10), draws: parseInt(m[3], 10) };
}

const ROLE_FILTERS: { key: "all" | Role; label: string }[] = [
  { key: "all", label: "All" },
  { key: "fighter", label: "Fighters" },
  { key: "coach", label: "Coaches" },
  { key: "gym", label: "Gyms" },
  { key: "promotion", label: "Promotions" },
];

const VALID_ROLE_PARAMS = new Set<string>(["all", "fighter", "coach", "gym", "promotion"]);

function parseRoleFromUrl(): "all" | Role | null {
  if (typeof window === "undefined") return null;
  const role = new URLSearchParams(window.location.search).get("role");
  if (!role || !VALID_ROLE_PARAMS.has(role)) return null;
  return role as "all" | Role;
}

const ART_FILTERS = [
  { key: "all", label: "All disciplines" },
  ...DISCIPLINES.map((d) => ({ key: d, label: d })),
];

const LEVEL_OPTIONS = [
  "Amateur",
  "Pro-Am",
  "C Class",
  "B Class",
  "A Class",
  "Semi-Pro",
  "Professional",
] as const;

const RECENTS_KEY = "legacy_recent_searches";

// Role colour map for badges
const ROLE_COLORS: Record<string, string> = {
  fighter: "bg-red-100 text-red-700 border-red-200",
  coach: "bg-blue-100 text-blue-700 border-blue-200",
  gym: "bg-green-100 text-green-700 border-green-200",
  promotion: "bg-orange-100 text-orange-700 border-orange-200",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const supabase = createSupabaseBrowser();
  const { t } = useTranslation();

  // Default to "fighter" unless URL overrides
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>(
    () => parseRoleFromUrl() ?? "fighter"
  );
  const [artFilter, setArtFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Apply ?role=... deep link on mount
  useEffect(() => {
    const roleFromUrl = parseRoleFromUrl();
    if (roleFromUrl) setRoleFilter(roleFromUrl);
  }, []);

  // Auto-show advanced filters for fighters
  useEffect(() => {
    if (roleFilter === "fighter") setShowAdvanced(true);
  }, [roleFilter]);

  const [levelFilter, setLevelFilter] = useState("");
  const [maxWeight, setMaxWeight] = useState("");
  const [weightUnitFilter, setWeightUnitFilter] = useState<"any" | "kg" | "lb">("any");

  const [profileResults, setProfileResults] = useState<ProfileResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ country?: string; city?: string } | null>(null);
  const [userCoordinates, setUserCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPermissionRequested, setLocationPermissionRequested] = useState(false);
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recents, location, and sponsorships on mount
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const raw = window.localStorage.getItem(RECENTS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setRecentSearches(parsed.map((v) => String(v)).filter((v) => v.trim().length > 0).slice(0, 8));
          }
        }
      }
    } catch { /* ignore */ }

    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("country, location_city, location_country")
            .eq("id", userData.user.id)
            .single();
          if (profile) {
            setUserLocation({
              country: (profile as any).country || (profile as any).location_country || undefined,
              city: (profile as any).location_city || undefined,
            });
          }
        }
      } catch { /* ignore */ }
    })();

    if (!locationPermissionRequested && typeof window !== "undefined") {
      setLocationPermissionRequested(true);
      getCurrentLocation().then((coords) => {
        if (coords) {
          setUserCoordinates(coords);
          runSearch("auto");
        }
      });
    }

    (async () => {
      try {
        const s = await getSponsorshipsForPlacement("search_page");
        setSponsorships(s);
      } catch { /* ignore */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, locationPermissionRequested]);

  function saveRecents(term: string) {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const next = [trimmed, ...prev.filter((t) => t.toLowerCase() !== trimmed.toLowerCase())].slice(0, 8);
      try { if (typeof window !== "undefined") window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  // Auto-load on mount
  useEffect(() => {
    runSearch("auto");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced auto-search on filter changes
  useEffect(() => {
    const handler = setTimeout(() => { runSearch("auto"); }, 300);
    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, roleFilter, artFilter, locationFilter, levelFilter, maxWeight, weightUnitFilter]);

  async function runSearch(source: "auto" | "submit" = "auto") {
    const trimmed = query.trim();
    const locTrimmed = locationFilter.trim();

    setLoading(true);
    setError(null);

    try {
      let profileQuery = supabase
        .from("profiles")
        .select("id, full_name, username, role, avatar_url, country, martial_arts, social_links, record, rank, weight, weight_unit")
        .not("role", "is", null);

      if (trimmed) {
        profileQuery = profileQuery.or(`full_name.ilike.%${trimmed}%,username.ilike.%${trimmed}%`);
      }

      if (roleFilter !== "all") {
        profileQuery = profileQuery.eq("role", roleFilter.toUpperCase());
      }

      if (artFilter !== "all") {
        profileQuery = profileQuery.contains("martial_arts", [artFilter]);
      }

      if (locTrimmed) {
        profileQuery = profileQuery.ilike("country", `%${locTrimmed}%`);
      }

      profileQuery = profileQuery.limit(100);

      const { data: profilesData, error: profilesError } = await profileQuery;

      if (profilesError) {
        console.error("Search profiles error", profilesError);
        setError((prev) => prev || profilesError.message);
      } else {
        let profiles = ((profilesData || []) as any[]).map((p: any) => ({
          ...p,
          role: p.role?.toLowerCase() as Role | null,
        })) as ProfileResult[];

        // Advanced fighter filters (client-side)
        const maxWeightNum = maxWeight.trim() === "" ? null : Math.max(0, parseFloat(maxWeight) || 0);

        if (levelFilter || (maxWeightNum !== null && weightUnitFilter !== "any")) {
          profiles = profiles.filter((p) => {
            if (p.role !== "fighter") return true;
            if (levelFilter && p.rank !== levelFilter) return false;
            if (maxWeightNum !== null && weightUnitFilter !== "any" && p.weight !== null && p.weight_unit) {
              let w = p.weight;
              if (weightUnitFilter === "kg" && p.weight_unit === "lb") w = w / 2.20462;
              if (weightUnitFilter === "lb" && p.weight_unit === "kg") w = w * 2.20462;
              if (w > maxWeightNum) return false;
            }
            return true;
          });
        }

        profiles = profiles.sort((a, b) => {
          const aName = (a.full_name || a.username || "").toLowerCase();
          const bName = (b.full_name || b.username || "").toLowerCase();
          return aName.localeCompare(bName);
        });

        setProfileResults(profiles);
      }

      if (source === "submit" && trimmed) saveRecents(trimmed);
    } catch (err: any) {
      console.error("Search exception", err);
      setError("Something went wrong while searching.");
    } finally {
      setSearched(true);
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    runSearch("submit");
  }

  function handleRecentClick(term: string) {
    setQuery(term);
    runSearch("submit");
  }

  const activeRoleLabel = ROLE_FILTERS.find((f) => f.key === roleFilter)?.label ?? "Results";

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t("Search.title")}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t("Search.subtitle")}</p>
        </div>
      </div>

      {/* Search + filters */}
      <section className="card space-y-5 p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
          <input
            className="flex-1 rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
            placeholder={t("Search.placeholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex flex-wrap gap-3 items-center">
            <button type="submit" className="btn btn-primary">{t("Search.button")}</button>
            <span className="text-xs text-slate-400 hidden sm:inline">{t("Search.alsoSearch")}</span>
            {ROLE_FILTERS.filter((f) => f.key !== "all").map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setRoleFilter(f.key as Role)}
                className={`px-4 py-2 rounded-full text-xs font-medium border-2 transition-all ${
                  roleFilter === f.key
                    ? "border-purple-400 bg-purple-100 text-purple-700 shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-purple-300 hover:bg-purple-50"
                }`}
              >
                {f.label}
              </button>
            ))}
            {roleFilter !== "all" && (
              <button type="button" onClick={() => setRoleFilter("all")} className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600">
                All
              </button>
            )}
          </div>
        </form>

        {/* Advanced fighter filters */}
        {roleFilter === "fighter" && (
          <div className="border-t border-slate-200 pt-4 mt-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-700">Advanced Fighter Filters</h3>
              <button type="button" onClick={() => setShowAdvanced((v) => !v)} className="text-xs text-purple-700 hover:underline">
                {showAdvanced ? "Hide" : "Show"}
              </button>
            </div>
            {showAdvanced && (
              <div className="grid gap-3 md:grid-cols-3 text-xs text-slate-600">
                <label className="space-y-1">
                  <span>Level</span>
                  <select
                    className="w-full rounded-xl border px-3 py-2 text-sm bg-white"
                    value={levelFilter}
                    onChange={(e) => setLevelFilter(e.target.value)}
                  >
                    <option value="">Any level</option>
                    {LEVEL_OPTIONS.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 md:col-span-2">
                  <span>Maximum weight</span>
                  <div className="flex items-center gap-2">
                    <select className="rounded-xl border px-2 py-1 bg-white text-xs" value={weightUnitFilter} onChange={(e) => setWeightUnitFilter(e.target.value as "any" | "kg" | "lb")}>
                      <option value="any">Any unit</option>
                      <option value="kg">kg</option>
                      <option value="lb">lb</option>
                    </select>
                    <input type="number" min={0} className="w-full rounded-xl border px-3 py-2 text-sm" value={maxWeight} onChange={(e) => setMaxWeight(e.target.value)} placeholder="e.g. 70" />
                  </div>
                </label>
              </div>
            )}
          </div>
        )}

        {/* Recent searches */}
        {recentSearches.length > 0 && (
          <div className="flex flex-wrap gap-3 text-xs text-slate-600">
            <span className="text-[11px] uppercase tracking-wide text-slate-400">Recent:</span>
            {recentSearches.map((term) => (
              <button key={term} type="button" onClick={() => handleRecentClick(term)} className="px-4 py-1.5 rounded-full border-2 border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50 transition-all text-xs font-medium">
                {term}
              </button>
            ))}
          </div>
        )}

        {/* Discipline + location filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center pt-2">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-600">{t("Search.discipline")}</span>
              <select className="rounded-xl border px-2 py-1 bg-white text-xs" value={artFilter} onChange={(e) => setArtFilter(e.target.value)}>
                {ART_FILTERS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
                <option value="Other">Other / mixed</option>
              </select>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-600">{t("Search.location")}</span>
              <input className="rounded-xl border px-2 py-1 bg-white text-xs w-40" placeholder="e.g. Edinburgh, Scotland" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} />
            </div>
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
        )}
      </section>

      {/* Sponsorship banner */}
      <section className="w-[95%] mx-auto">
        {sponsorships.length > 0 ? (
          sponsorships.map((s) => (
            <SponsorshipBanner key={s.id} sponsorship={s} variant="vertical" />
          ))
        ) : (
          <div className="card border-2 border-dashed border-purple-300 bg-gradient-to-br from-purple-50 to-indigo-50">
            <div className="flex items-center gap-4 py-6 px-4">
              <div className="w-16 h-16 rounded-xl bg-purple-200 flex items-center justify-center flex-shrink-0">
                <ALogo size={40} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-slate-900 mb-1">Sponsor Placement Available</h3>
                <p className="text-sm text-slate-600 mb-2">Your sponsor will appear here — high-visibility placement above search results.</p>
                <a href="mailto:sponsors@apexcombatevents.com" className="text-sm text-purple-700 font-medium hover:underline block break-all">
                  sponsors@apexcombatevents.com
                </a>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Results */}
      <section className="space-y-4">
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-5 animate-pulse flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && searched && profileResults.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-slate-600">
              {query || artFilter !== "all" || locationFilter
                ? "No profiles found. Try adjusting your search or filters."
                : `No ${activeRoleLabel.toLowerCase()} found yet.`}
            </p>
          </div>
        )}

        {!loading && profileResults.length > 0 && (
          <div className="space-y-4">
            <div className="section-header">
              <h2 className="section-title">
                {roleFilter !== "all"
                  ? `${activeRoleLabel} (${profileResults.length})`
                  : `All Profiles (${profileResults.length})`}
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {profileResults.map((p) => <ProfileCard key={p.id} profile={p} />)}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Profile card (larger, richer layout) ─────────────────────────────────────

function ProfileCard({ profile }: { profile: ProfileResult }) {
  const { full_name, username, role, avatar_url, country, martial_arts, social_links, record, rank, weight, weight_unit } = profile;
  const flag = countryToFlag(country);
  const mainArts = martial_arts?.slice(0, 3).join(" · ");
  const gymHandle = typeof social_links === "object" && social_links?.gym_username ? social_links.gym_username : null;
  const roleBadgeClass = role ? (ROLE_COLORS[role] ?? "bg-slate-100 text-slate-700 border-slate-200") : "";

  const { wins, losses, draws } = parseRecord(record);
  const hasRecord = wins !== null && losses !== null;

  const displayName = full_name || username || "Unnamed profile";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link
      href={username ? `/profile/${username}` : "#"}
      className={`block card hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 p-5 ${
        username ? "" : "pointer-events-none opacity-70"
      }`}
    >
      {/* Avatar + name row */}
      <div className="flex items-start gap-4 mb-4">
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-200 to-slate-200 overflow-hidden flex-shrink-0 shadow-sm flex items-center justify-center">
          {avatar_url ? (
            <Image
              src={avatar_url}
              alt={displayName}
              width={64}
              height={64}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xl font-bold text-purple-700 select-none">{initials}</span>
          )}
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <h3 className="text-base font-bold text-slate-900 leading-tight truncate">{displayName}</h3>
          {username && (
            <p className="text-xs text-slate-500 truncate mt-0.5">@{username}</p>
          )}
          {role && (
            <span className={`inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${roleBadgeClass}`}>
              {role}
            </span>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 text-xs text-slate-600">
        {/* Martial arts */}
        {mainArts && (
          <div className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-purple-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span className="font-medium text-slate-700">{mainArts}</span>
          </div>
        )}

        {/* Level — fighters only */}
        {role === "fighter" && rank && (
          <div className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-purple-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="font-medium text-purple-700">{rank}</span>
          </div>
        )}

        {/* Record — fighters only */}
        {role === "fighter" && hasRecord && (
          <div className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            <span>
              <span className="font-semibold text-green-700">{wins}W</span>
              <span className="mx-1 text-slate-400">/</span>
              <span className="font-semibold text-red-600">{losses}L</span>
              {draws !== null && draws > 0 && (
                <>
                  <span className="mx-1 text-slate-400">/</span>
                  <span className="font-semibold text-slate-500">{draws}D</span>
                </>
              )}
            </span>
          </div>
        )}

        {/* Weight — fighters only */}
        {role === "fighter" && weight && weight_unit && (
          <div className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
            <span>{weight} {weight_unit}</span>
          </div>
        )}

        {/* Gym affiliation — fighters only */}
        {role === "fighter" && gymHandle && (
          <div className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>@{gymHandle}</span>
          </div>
        )}

        {/* Country */}
        {country && (
          <div className="flex items-center gap-1.5">
            {flag ? (
              <span className="text-sm" aria-hidden="true">{flag}</span>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
              </svg>
            )}
            <span>{country}</span>
          </div>
        )}
      </div>

      {/* View profile CTA */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-purple-600 font-semibold">View profile</span>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}
