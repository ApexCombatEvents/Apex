// app/search/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { countryToFlag } from "@/lib/countries";
import { getCurrentLocation, getGoogleMapsUrl, getCountryForCity } from "@/lib/location";
import { getCitiesForCountrySearch } from "@/lib/cities-to-countries";
import SponsorshipBanner from "@/components/sponsors/SponsorshipBanner";
import { getSponsorshipsForPlacement, type Sponsorship } from "@/lib/sponsorships";
import ALogo from "@/components/logos/ALogo";
import { useTranslation } from "@/hooks/useTranslation";

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
  weight: number | null;
  weight_unit: "kg" | "lb" | null;
};

type EventResult = {
  id: string;
  title: string | null;
  name: string | null;
  event_date: string | null;
  event_time: string | null;
  location: string | null;
  location_city: string | null;
  location_country: string | null;
  martial_art: string | null;
  banner_url: string | null;
  is_featured?: boolean | null;
  featured_until?: string | null;
};

// --- helpers ----------------------------------------------------

function parseRecord(record?: string | null) {
  if (!record) {
    return {
      wins: null as number | null,
      losses: null as number | null,
      draws: null as number | null,
    };
  }
  const m = record.match(/^(\d+)-(\d+)-(\d+)$/);
  if (!m) {
    return { wins: null, losses: null, draws: null };
  }
  return {
    wins: parseInt(m[1], 10),
    losses: parseInt(m[2], 10),
    draws: parseInt(m[3], 10),
  };
}

const ROLE_FILTERS: { key: "all" | Role; label: string }[] = [
  { key: "all", label: "All" },
  { key: "fighter", label: "Fighters" },
  { key: "coach", label: "Coaches" },
  { key: "gym", label: "Gyms" },
  { key: "promotion", label: "Promotions" },
];

const ART_FILTERS = [
  { key: "all", label: "All disciplines" },
  { key: "Muay Thai", label: "Muay Thai" },
  { key: "Boxing", label: "Boxing" },
  { key: "MMA", label: "MMA" },
  { key: "BJJ", label: "BJJ" },
  { key: "Kickboxing", label: "Kickboxing" },
  { key: "K1", label: "K1" },
];

const RECENTS_KEY = "legacy_recent_searches";

// Helper function to insert sponsorships between events
// If no sponsorships exist, insert placeholder example
function insertSponsorshipsBetweenEvents(eventList: EventResult[], sponsorships: Sponsorship[], interval: number = 3) {
  const result: (EventResult | { __isSponsorship: true; sponsorship: Sponsorship } | { __isSponsorExample: true })[] = [];
  let sponsorshipIndex = 0;
  
  eventList.forEach((event, index) => {
    result.push(event);
    // Insert sponsorship after every N events (but not after the last one)
    if ((index + 1) % interval === 0 && index < eventList.length - 1) {
      if (sponsorships.length > 0) {
        // Use actual sponsorship
        const sponsorship = sponsorships[sponsorshipIndex % sponsorships.length];
        result.push({ __isSponsorship: true, sponsorship });
        sponsorshipIndex++;
      } else {
        // Show placeholder example
        result.push({ __isSponsorExample: true });
      }
    }
  });
  
  return result;
}

export default function SearchPage() {
  const supabase = createSupabaseBrowser();
  const { t } = useTranslation();

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  const [artFilter, setArtFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState("");
  const [upcomingOnly, setUpcomingOnly] = useState(true);

  const [showAdvanced, setShowAdvanced] = useState(false);

  // Auto-show advanced filters when fighter filter is selected
  useEffect(() => {
    if (roleFilter === "fighter") {
      setShowAdvanced(true);
    }
  }, [roleFilter]);
  const [minWins, setMinWins] = useState("");
  const [maxWeight, setMaxWeight] = useState("");
  const [weightUnitFilter, setWeightUnitFilter] = useState<"any" | "kg" | "lb">(
    "any"
  );

  const [profileResults, setProfileResults] = useState<ProfileResult[]>([]);
  const [eventResults, setEventResults] = useState<EventResult[]>([]);
  const [featuredEvents, setFeaturedEvents] = useState<EventResult[]>([]);
  const [regularEvents, setRegularEvents] = useState<EventResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ country?: string; city?: string } | null>(null);
  const [userCoordinates, setUserCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPermissionRequested, setLocationPermissionRequested] = useState(false);
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);

  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // load recent searches from localStorage and user location
  useEffect(() => {
    // Load recent searches
    try {
      if (typeof window === "undefined") return;
      const raw = window.localStorage.getItem(RECENTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setRecentSearches(
            parsed
              .map((v) => String(v))
              .filter((v) => v.trim().length > 0)
              .slice(0, 8)
          );
        }
      }
    } catch {
      // ignore
    }

    // Load user location from profile
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
      } catch (err) {
        console.error("Error loading user location:", err);
      }
    })();

    // Request geolocation permission
    if (!locationPermissionRequested && typeof window !== "undefined") {
      setLocationPermissionRequested(true);
      getCurrentLocation().then((coords) => {
        if (coords) {
          setUserCoordinates(coords);
          // Re-run search with accurate coordinates
          runSearch("auto");
        }
      });
    }

    // Load sponsorships for search page
    async function loadSponsorships() {
      try {
        const searchSponsorships = await getSponsorshipsForPlacement("search_page");
        setSponsorships(searchSponsorships);
      } catch (error) {
        console.error("Error loading search page sponsorships:", error);
      }
    }
    loadSponsorships();
  }, [supabase, locationPermissionRequested]);

  function saveRecents(term: string) {
    const trimmed = term.trim();
    if (!trimmed) return;

    setRecentSearches((prev) => {
      const withoutDupes = prev.filter(
        (t) => t.toLowerCase() !== trimmed.toLowerCase()
      );
      const next = [trimmed, ...withoutDupes].slice(0, 8);
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
        }
      } catch {
        // ignore
      }
      return next;
    });
  }

  // Auto-load all events on mount
  useEffect(() => {
    // Run initial search to show all events
    runSearch("auto");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // runSearch is defined below, so we intentionally exclude it

  // debounce search on query + filters (auto search)
  useEffect(() => {
    const handler = setTimeout(() => {
      runSearch("auto");
    }, 300);

    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    query,
    roleFilter,
    artFilter,
    locationFilter,
    upcomingOnly,
    minWins,
    maxWeight,
    weightUnitFilter,
  ]);

  async function runSearch(source: "auto" | "submit" = "auto") {
    const trimmed = query.trim();
    const locTrimmed = locationFilter.trim();

    // Always run search - we want to show all events by default

    setLoading(true);
    setError(null);

    try {
      // ---------- EVENTS (Search first, main purpose) ----------
      // Always search events - show all if no filters
      let eventQuery = supabase
        .from("events")
        .select(
          "id, title, name, event_date, event_time, location, location_city, location_country, martial_art, banner_url, is_featured, featured_until"
        );

      const orParts: string[] = [];
      if (trimmed) {
        // Search in title, name, and location fields (including country)
        orParts.push(
          `title.ilike.%${trimmed}%`,
          `name.ilike.%${trimmed}%`,
          `location.ilike.%${trimmed}%`,
          `location_city.ilike.%${trimmed}%`,
          `location_country.ilike.%${trimmed}%`
        );
        
        // If searching for a country, also search for cities in that country
        const citiesForCountry = getCitiesForCountrySearch(trimmed);
        if (citiesForCountry.length > 0) {
          // Add searches for each city in the country
          citiesForCountry.forEach(city => {
            orParts.push(
              `location.ilike.%${city}%`,
              `location_city.ilike.%${city}%`
            );
          });
        }
      }
      if (locTrimmed) {
        // Location filter searches in all location fields
        orParts.push(
          `location.ilike.%${locTrimmed}%`,
          `location_city.ilike.%${locTrimmed}%`,
          `location_country.ilike.%${locTrimmed}%`
        );
        
        // If searching for a country in location filter, also search for cities in that country
        const citiesForCountry = getCitiesForCountrySearch(locTrimmed);
        if (citiesForCountry.length > 0) {
          // Add searches for each city in the country
          citiesForCountry.forEach(city => {
            orParts.push(
              `location.ilike.%${city}%`,
              `location_city.ilike.%${city}%`
            );
          });
        }
      }
      // Apply search filters if provided, otherwise show all
      // Note: Featured events should always be included, so we'll handle them separately if needed
      if (orParts.length > 0) {
        eventQuery = eventQuery.or(orParts.join(","));
      }

      if (artFilter !== "all") {
        eventQuery = eventQuery.ilike("martial_art", `%${artFilter}%`);
      }

      if (upcomingOnly) {
        const today = new Date().toISOString().slice(0, 10);
        eventQuery = eventQuery.gte("event_date", today);
      }

      // Always include featured events - add them even if they don't match search
      // We'll fetch featured events separately and merge them
      eventQuery = eventQuery.limit(100);

      const { data: eventsData, error: eventsError } = await eventQuery;

      if (eventsError) {
        console.error("Search events error", eventsError);
        setError((prev) => prev || eventsError.message);
      } else {
        const now = new Date();
        let allEvents = ((eventsData || []) as EventResult[]).map(event => ({
          ...event,
          // Check if featured status is still valid
          is_featured: event.is_featured && (!event.featured_until || new Date(event.featured_until) > now)
        }));
        
        // Always fetch featured events separately to ensure they're shown
        // Featured events should appear regardless of search filters
        try {
          const { data: featuredEventsData } = await supabase
            .from("events")
            .select("id, title, name, event_date, event_time, location, location_city, location_country, martial_art, banner_url, is_featured, featured_until")
            .eq("is_featured", true)
            .or("featured_until.is.null,featured_until.gt." + now.toISOString())
            .limit(20);
          
          if (featuredEventsData) {
            const validFeaturedEvents = featuredEventsData
              .filter(event => {
                const featuredUntil = event.featured_until ? new Date(event.featured_until) : null;
                return event.is_featured === true && (!featuredUntil || featuredUntil > now);
              })
              .map(event => ({
                ...event,
                is_featured: true
              }));
            
            // Merge featured events with search results, avoiding duplicates
            const existingIds = new Set(allEvents.map(e => e.id));
            const newFeaturedEvents = validFeaturedEvents.filter(e => !existingIds.has(e.id));
            allEvents = [...allEvents, ...newFeaturedEvents];
          }
        } catch (featuredError) {
          console.warn("Error fetching featured events:", featuredError);
          // Continue with regular events if featured events fetch fails
        }
        
        // If searching for a country, also check cities that aren't in our mapping
        const searchTerm = trimmed || locTrimmed;
        if (searchTerm) {
          // Check if search term might be a country (not already matched)
          const countryVariations: Record<string, string> = {
            "united kingdom": "United Kingdom",
            "uk": "United Kingdom",
            "u.k.": "United Kingdom",
            "england": "England",
            "scotland": "Scotland",
            "wales": "Wales",
            "united states": "United States",
            "usa": "United States",
            "u.s.a.": "United States",
            "america": "United States",
            "united states of america": "United States",
            "us": "United States",
          };
          
          const normalizedSearch = searchTerm.toLowerCase().trim();
          const targetCountry = countryVariations[normalizedSearch] || 
            (normalizedSearch.charAt(0).toUpperCase() + normalizedSearch.slice(1));
          
          // Check if any events have cities that might belong to this country
          // Create a cache for geocoding results to avoid repeated API calls
          const cityCountryCache = new Map<string, string | null>();
          
          // Get unique cities from events that don't already match the country
          const citiesToCheck = new Set<string>();
          allEvents.forEach(event => {
            const city = event.location_city || event.location;
            if (city && city.trim()) {
              const cityLower = city.toLowerCase().trim();
              const countryLower = event.location_country?.toLowerCase() || "";
              const locationLower = event.location?.toLowerCase() || "";
              
              // Only check cities that don't already match the country
              if (!countryLower.includes(normalizedSearch) && 
                  !locationLower.includes(normalizedSearch) &&
                  !getCitiesForCountrySearch(searchTerm).some(mappedCity => 
                    cityLower.includes(mappedCity.toLowerCase()) || 
                    mappedCity.toLowerCase().includes(cityLower)
                  )) {
                citiesToCheck.add(city.trim());
              }
            }
          });
          
          // Geocode cities to check if they belong to the target country
          // Limit to 10 cities to avoid rate limits (Nominatim allows 1 request/second)
          const citiesArray = Array.from(citiesToCheck).slice(0, 10);
          const geocodingPromises = citiesArray.map(async (city, index) => {
            // Add delay to respect rate limits (1 request per second)
            if (index > 0) {
              await new Promise(resolve => setTimeout(resolve, 1000 * index));
            }
            
            if (cityCountryCache.has(city)) {
              return { city, country: cityCountryCache.get(city) };
            }
            
            const country = await getCountryForCity(city);
            cityCountryCache.set(city, country);
            return { city, country };
          });
          
          const geocodingResults = await Promise.all(geocodingPromises);
          
          // Create a set of cities that belong to the target country
          const matchingCities = new Set<string>();
          geocodingResults.forEach(({ city, country }) => {
            if (country && country.toLowerCase().includes(targetCountry.toLowerCase())) {
              matchingCities.add(city.toLowerCase());
            }
          });
          
          // If we found matching cities, also fetch events that weren't in initial results
          // but have cities that match
          if (matchingCities.size > 0) {
            const cityOrParts: string[] = [];
            matchingCities.forEach(city => {
              cityOrParts.push(
                `location.ilike.%${city}%`,
                `location_city.ilike.%${city}%`
              );
            });
            
            if (cityOrParts.length > 0) {
              let additionalEventQuery = supabase
                .from("events")
                .select(
                  "id, title, name, event_date, event_time, location, location_city, location_country, martial_art, banner_url, is_featured, featured_until"
                )
                .or(cityOrParts.join(","));
              
              if (artFilter !== "all") {
                additionalEventQuery = additionalEventQuery.ilike("martial_art", `%${artFilter}%`);
              }
              
              if (upcomingOnly) {
                const today = new Date().toISOString().slice(0, 10);
                additionalEventQuery = additionalEventQuery.gte("event_date", today);
              }
              
              additionalEventQuery = additionalEventQuery.limit(100);
              
              const { data: additionalEventsData } = await additionalEventQuery;
              
              if (additionalEventsData) {
                const additionalEvents = (additionalEventsData as EventResult[]).map(event => ({
                  ...event,
                  is_featured: event.is_featured && (!event.featured_until || new Date(event.featured_until) > now)
                }));
                
                // Merge with existing events, avoiding duplicates
                const existingIds = new Set(allEvents.map(e => e.id));
                const newEvents = additionalEvents.filter(e => !existingIds.has(e.id));
                allEvents = [...allEvents, ...newEvents];
              }
            }
          }
        }
        
        // Separate featured and regular events
        const featuredEvents = allEvents.filter(e => e.is_featured === true);
        const regularEvents = allEvents.filter(e => e.is_featured !== true);
        
        // Sort featured events alphabetically (or by location proximity)
        const sortEvents = (events: EventResult[]) => {
          return events.sort((a: EventResult, b: EventResult) => {
            // If user location is available, prioritize nearby events
            if (userLocation && (userLocation.country || userLocation.city)) {
              // Check city match
              const aCityMatch = userLocation.city && (
                a.location_city?.toLowerCase() === userLocation.city.toLowerCase() ||
                a.location?.toLowerCase().includes(userLocation.city.toLowerCase())
              );
              const bCityMatch = userLocation.city && (
                b.location_city?.toLowerCase() === userLocation.city.toLowerCase() ||
                b.location?.toLowerCase().includes(userLocation.city.toLowerCase())
              );
              
              // Check country match
              const aCountryMatch = userLocation.country && (
                a.location_country?.toLowerCase() === userLocation.country.toLowerCase() ||
                a.location?.toLowerCase().includes(userLocation.country.toLowerCase())
              );
              const bCountryMatch = userLocation.country && (
                b.location_country?.toLowerCase() === userLocation.country.toLowerCase() ||
                b.location?.toLowerCase().includes(userLocation.country.toLowerCase())
              );
              
              // Priority: same city > same country > others
              if (aCityMatch && !bCityMatch) return -1;
              if (!aCityMatch && bCityMatch) return 1;
              if (aCountryMatch && !bCountryMatch) return -1;
              if (!aCountryMatch && bCountryMatch) return 1;
            }
            
            // Then sort alphabetically by title (or name)
            const aTitle = (a.title || a.name || "").toLowerCase();
            const bTitle = (b.title || b.name || "").toLowerCase();
            return aTitle.localeCompare(bTitle);
          });
        };
        
        const sortedFeatured = sortEvents([...featuredEvents]);
        const sortedRegular = sortEvents([...regularEvents]);
        
        // Store featured and regular events separately for display
        setFeaturedEvents(sortedFeatured);
        setRegularEvents(sortedRegular);
        // Also store combined for backward compatibility
        setEventResults([...sortedFeatured, ...sortedRegular]);
      }

      // ---------- PROFILES (Secondary search, only if role filter is set or query provided) ----------
      if (roleFilter !== "all" || trimmed) {
        let profileQuery = supabase
          .from("profiles")
          .select(
            "id, full_name, username, role, avatar_url, country, martial_arts, social_links, record, weight, weight_unit"
          )
          .not("role", "is", null);

        if (trimmed) {
          profileQuery = profileQuery.or(
            `full_name.ilike.%${trimmed}%,username.ilike.%${trimmed}%`
          );
        }

        if (roleFilter !== "all") {
          // Convert roleFilter to uppercase to match database storage (FIGHTER, COACH, GYM, PROMOTION)
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
          // Normalize roles from database (uppercase) to lowercase for code
          let profiles = ((profilesData || []) as any[]).map((p: any) => ({
            ...p,
            role: p.role?.toLowerCase() as Role | null,
          })) as ProfileResult[];

          // --- advanced fighter filters (client-side) ---
          const minWinsNum =
            minWins.trim() === ""
              ? null
              : Math.max(0, parseInt(minWins, 10) || 0);
          const maxWeightNum =
            maxWeight.trim() === ""
              ? null
              : Math.max(0, parseFloat(maxWeight) || 0);

          if (
            minWinsNum !== null ||
            (maxWeightNum !== null && weightUnitFilter !== "any")
          ) {
            profiles = profiles.filter((p) => {
              if (p.role !== "fighter") return true;

              // Wins filter
              if (minWinsNum !== null) {
                const { wins } = parseRecord(p.record);
                if (wins === null || wins < minWinsNum) {
                  return false;
                }
              }

              // Weight filter
              if (
                maxWeightNum !== null &&
                weightUnitFilter !== "any" &&
                p.weight !== null &&
                p.weight_unit
              ) {
                let w = p.weight;

                if (weightUnitFilter === "kg") {
                  if (p.weight_unit === "lb") {
                    w = w / 2.20462;
                  }
                } else if (weightUnitFilter === "lb") {
                  if (p.weight_unit === "kg") {
                    w = w * 2.20462;
                  }
                }

                if (w > maxWeightNum) {
                  return false;
                }
              }

              return true;
            });
          }

          // Sort profiles alphabetically by name (or username)
          profiles = profiles.sort((a, b) => {
            const aName = (a.full_name || a.username || "").toLowerCase();
            const bName = (b.full_name || b.username || "").toLowerCase();
            return aName.localeCompare(bName);
          });

          setProfileResults(profiles);
        }
      } else {
        // Clear profile results if no role filter and no query
        setProfileResults([]);
      }

      // only save to recents when user manually submits
      if (source === "submit" && trimmed) {
        saveRecents(trimmed);
      }
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
    // run a manual search immediately with that term
    runSearch("submit");
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <header className="section-header">
        <h1 className="section-title">{t('Search.title')}</h1>
        <p className="section-subtitle">
          {t('Search.subtitle')}
        </p>
      </header>

      {/* Search + filters */}
      <section className="card space-y-5 p-6">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6"
        >
          <input
            className="flex-1 rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
            placeholder={t('Search.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className="flex flex-wrap gap-3 items-center">
            <button
              type="submit"
              className="btn btn-primary"
            >
              {t('Search.button')}
            </button>
            
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{t('Search.alsoSearch')}</span>
            </div>
            
            <button
              type="button"
              onClick={() => setRoleFilter("fighter")}
              className={`px-4 py-2 rounded-full text-xs font-medium border-2 transition-all ${
                roleFilter === "fighter"
                  ? "border-purple-400 bg-purple-100 text-purple-700 shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-purple-300 hover:bg-purple-50"
              }`}
            >
              {t('Search.fighters')}
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("coach")}
              className={`px-4 py-2 rounded-full text-xs font-medium border-2 transition-all ${
                roleFilter === "coach"
                  ? "border-purple-400 bg-purple-100 text-purple-700 shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-purple-300 hover:bg-purple-50"
              }`}
            >
              {t('Search.coaches')}
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("gym")}
              className={`px-4 py-2 rounded-full text-xs font-medium border-2 transition-all ${
                roleFilter === "gym"
                  ? "border-purple-400 bg-purple-100 text-purple-700 shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-purple-300 hover:bg-purple-50"
              }`}
            >
              {t('Search.gyms')}
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter("promotion")}
              className={`px-4 py-2 rounded-full text-xs font-medium border-2 transition-all ${
                roleFilter === "promotion"
                  ? "border-purple-400 bg-purple-100 text-purple-700 shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-purple-300 hover:bg-purple-50"
              }`}
            >
              {t('Search.promotions')}
            </button>
            
            {roleFilter !== "all" && (
              <button
                type="button"
                onClick={() => setRoleFilter("all")}
                className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700"
              >
                Clear
              </button>
            )}
          </div>
        </form>

        {/* Advanced fighter filters - Show at top when fighter filter is active */}
        {roleFilter === "fighter" && (
          <div className="border-t border-slate-200 pt-4 mt-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-700">Advanced Fighter Filters</h3>
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="text-xs text-purple-700 hover:underline"
              >
                {showAdvanced ? "Hide" : "Show"}
              </button>
            </div>

            {showAdvanced && (
              <div className="grid gap-3 md:grid-cols-3 text-xs text-slate-600">
                <label className="space-y-1">
                  <span>Minimum wins (fighters)</span>
                  <input
                    type="number"
                    min={0}
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    value={minWins}
                    onChange={(e) => setMinWins(e.target.value)}
                    placeholder="e.g. 5"
                  />
                </label>

                <label className="space-y-1 md:col-span-2">
                  <span>Maximum weight (fighters)</span>
                  <div className="flex items-center gap-2">
                    <select
                      className="rounded-xl border px-2 py-1 bg-white text-xs"
                      value={weightUnitFilter}
                      onChange={(e) =>
                        setWeightUnitFilter(
                          e.target.value as "any" | "kg" | "lb"
                        )
                      }
                    >
                      <option value="any">Any unit</option>
                      <option value="kg">kg</option>
                      <option value="lb">lb</option>
                    </select>
                    <input
                      type="number"
                      min={0}
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                      value={maxWeight}
                      onChange={(e) => setMaxWeight(e.target.value)}
                      placeholder="e.g. 70"
                    />
                  </div>
                </label>
              </div>
            )}
          </div>
        )}

        {/* Recent searches */}
        {recentSearches.length > 0 && (
          <div className="flex flex-wrap gap-3 text-xs text-slate-600">
            <span className="text-[11px] uppercase tracking-wide text-slate-400">
              Recent:
            </span>
            {recentSearches.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => handleRecentClick(term)}
                className="px-4 py-1.5 rounded-full border-2 border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50 transition-all text-xs font-medium"
              >
                {term}
              </button>
            ))}
          </div>
        )}

        {/* Second filter row – discipline, location + upcoming toggle */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pt-2">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-600">{t('Search.discipline')}</span>
              <select
                className="rounded-xl border px-2 py-1 bg-white text-xs"
                value={artFilter}
                onChange={(e) => setArtFilter(e.target.value)}
              >
                {ART_FILTERS.map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.label}
                  </option>
                ))}
                <option value="Other">Other / mixed</option>
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-600">{t('Search.location')}</span>
              <input
                className="rounded-xl border px-2 py-1 bg-white text-xs w-40"
                placeholder="e.g. Edinburgh, Scotland"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              className="rounded border-slate-300"
              checked={upcomingOnly}
              onChange={(e) => setUpcomingOnly(e.target.checked)}
            />
            <span className="font-medium">{t('Search.upcomingOnly')}</span>
          </label>
        </div>


        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {error}
          </p>
        )}
      </section>

      {/* Sponsorship Banner */}
      <section className="w-[95%] mx-auto">
        {sponsorships.length > 0 ? (
          sponsorships.map((sponsorship) => (
            <SponsorshipBanner
              key={sponsorship.id}
              sponsorship={sponsorship}
              variant="vertical"
            />
          ))
        ) : (
          <div className="card border-2 border-dashed border-purple-300 bg-gradient-to-br from-purple-50 to-indigo-50">
            <div className="flex items-center gap-4 py-6 px-4">
              <div className="w-16 h-16 rounded-xl bg-purple-200 flex items-center justify-center flex-shrink-0">
                <ALogo size={40} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-slate-900 mb-1">Sponsor Placement Available</h3>
                <p className="text-sm text-slate-600 mb-2">
                  Your sponsor will appear here. High-visibility placement above search results.
                </p>
                <a 
                  href="mailto:sponsors@apexcombatevents.com" 
                  className="text-sm text-purple-700 font-medium hover:underline block"
                >
                  Contact: sponsors@apexcombatevents.com
                </a>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* RESULTS */}
      <section className="space-y-6">
        {loading && <p className="text-sm text-slate-600">Searching events…</p>}

        {!loading &&
          searched &&
          profileResults.length === 0 &&
          featuredEvents.length === 0 &&
          regularEvents.length === 0 && (
            <p className="text-sm text-slate-600">
              No events found. Try a different event title or location.
            </p>
          )}

        {/* Profiles/Fighters - Show FIRST when role filter is active (especially with advanced filters) */}
        {!loading && profileResults.length > 0 && roleFilter !== "all" && (
          <section className="space-y-4">
            <div className="section-header">
              <h2 className="section-title">
                {ROLE_FILTERS.find(f => f.key === roleFilter)?.label} ({profileResults.length})
              </h2>
            </div>
            <div className="space-y-3">
              {profileResults.map((p) => (
                <ProfileResultRow key={p.id} profile={p} />
              ))}
            </div>
          </section>
        )}

        {/* Featured Events - Show after profiles when role filter is active */}
        {!loading && featuredEvents.length > 0 && (
          <section className="space-y-4">
            <div className="section-header">
              <h2 className="section-title">Featured Events ({featuredEvents.length})</h2>
              <p className="section-subtitle">Sponsored events at the top</p>
            </div>
            <div className="space-y-4">
              {insertSponsorshipsBetweenEvents(featuredEvents, sponsorships, 3).map((item, index) => {
                if ('__isSponsorship' in item && item.__isSponsorship) {
                  return (
                    <div key={`sponsor-featured-${index}`} className="my-4">
                      <SponsorshipBanner
                        sponsorship={item.sponsorship}
                        variant={item.sponsorship.variant as "horizontal" | "vertical" | "compact" || "horizontal"}
                      />
                    </div>
                  );
                }
                if ('__isSponsorExample' in item && item.__isSponsorExample) {
                  return (
                    <div key={`sponsor-example-featured-${index}`} className="my-4">
                      <div className="rounded-2xl border-2 border-dashed border-purple-400 bg-gradient-to-br from-purple-50 to-indigo-50/30 shadow-sm p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center flex-shrink-0 shadow-md">
                            <ALogo size={32} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-base text-slate-900 mb-1">Sponsor Placement Available</h4>
                            <p className="text-sm text-slate-600 mb-2">
                              Your sponsor will appear here. High-visibility placement above search results.
                            </p>
                            <a
                              href="mailto:sponsors@apexcombatevents.com"
                              className="text-sm text-purple-700 font-medium hover:underline"
                            >
                              Contact: sponsors@apexcombatevents.com
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                // At this point, item must be EventResult
                const event = item as EventResult;
                return <EventResultRow key={event.id} event={event} />;
              })}
            </div>
          </section>
        )}

        {/* Regular Events - Show after featured events */}
        {!loading && regularEvents.length > 0 && (
          <section className={`space-y-4 ${(featuredEvents.length > 0 || (profileResults.length > 0 && roleFilter !== "all")) ? 'border-t border-slate-200 pt-8' : ''}`}>
            <div className="section-header">
              <h2 className="section-title">Events ({regularEvents.length})</h2>
              <p className="section-subtitle">Click to view event details and participate</p>
            </div>
            <div className="space-y-4">
              {insertSponsorshipsBetweenEvents(regularEvents, sponsorships, 3).map((item, index) => {
                if ('__isSponsorship' in item && item.__isSponsorship) {
                  return (
                    <div key={`sponsor-regular-${index}`} className="my-4">
                      <SponsorshipBanner
                        sponsorship={item.sponsorship}
                        variant={item.sponsorship.variant as "horizontal" | "vertical" | "compact" || "horizontal"}
                      />
                    </div>
                  );
                }
                if ('__isSponsorExample' in item && item.__isSponsorExample) {
                  return (
                    <div key={`sponsor-example-regular-${index}`} className="my-4">
                      <div className="rounded-2xl border-2 border-dashed border-purple-400 bg-gradient-to-br from-purple-50 to-indigo-50/30 shadow-sm p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center flex-shrink-0 shadow-md">
                            <ALogo size={32} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-base text-slate-900 mb-1">Sponsor Placement Available</h4>
                            <p className="text-sm text-slate-600 mb-2">
                              Your sponsor will appear here. High-visibility placement above search results.
                            </p>
                            <a
                              href="mailto:sponsors@apexcombatevents.com"
                              className="text-sm text-purple-700 font-medium hover:underline"
                            >
                              Contact: sponsors@apexcombatevents.com
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                // At this point, item must be EventResult
                const event = item as EventResult;
                return <EventResultRow key={event.id} event={event} />;
              })}
            </div>
          </section>
        )}

      </section>
    </div>
  );
}

// ---------- RESULT ROWS ----------

function ProfileResultRow({ profile }: { profile: ProfileResult }) {
  const {
    full_name,
    username,
    role,
    avatar_url,
    country,
    martial_arts,
    social_links,
  } = profile;

  const flag = countryToFlag(country);
  const mainArts = martial_arts?.join(", ");

  const gymHandle =
    typeof social_links === "object" && social_links?.gym_username
      ? social_links.gym_username
      : null;

  return (
    <Link
      href={username ? `/profile/${username}` : "#"}
      className={`block card-compact hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${
        username ? "" : "pointer-events-none opacity-70"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
          {avatar_url && (
            <Image
              src={avatar_url}
              alt={full_name || username || "Profile"}
              width={40}
              height={40}
              className="h-full w-full object-cover"
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-900 truncate">
              {full_name || username || "Unnamed profile"}
            </span>
            {username && (
              <span className="text-[11px] text-slate-500 truncate">
                @{username}
              </span>
            )}
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px]">
            {role && (
              <span className="badge badge-primary">
                {role}
              </span>
            )}

            {mainArts && (
              <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 font-medium border border-purple-200">
                {mainArts}
              </span>
            )}

            {gymHandle && role === "fighter" && (
              <span className="px-2 py-0.5 rounded-full bg-slate-50 text-slate-600">
                Gym: @{gymHandle}
              </span>
            )}

            {country && (
              <span className="flex items-center gap-1">
                {flag && (
                  <span className="text-[14px]" aria-hidden="true">
                    {flag}
                  </span>
                )}
                <span>{country}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function EventResultRow({ event }: { event: EventResult }) {
  const title = event.title || event.name || "Untitled event";
  const dateLabel = event.event_date
    ? new Date(event.event_date).toLocaleDateString()
    : "Date TBC";

  const locationLabel =
    event.location ||
    [event.location_city, event.location_country].filter(Boolean).join(", ") ||
    "Location TBC";
  
  const mapsUrl = getGoogleMapsUrl(locationLabel !== "Location TBC" ? locationLabel : null);
  const isFeatured = event.is_featured === true;

  return (
    <Link
      href={`/events/${event.id}`}
      className={`block card hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ${
        isFeatured ? "border-purple-300 bg-gradient-to-br from-purple-50/50 to-white" : ""
      }`}
    >
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 sm:p-6">
        <div className="h-40 sm:h-20 w-full sm:w-28 rounded-lg bg-slate-200 overflow-hidden flex-shrink-0 relative">
          {event.banner_url ? (
            <Image
              src={event.banner_url}
              alt={title}
              fill
              sizes="(max-width: 640px) 100vw, 112px"
              className="object-cover"
            />
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-100 to-slate-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 sm:h-5 sm:w-5 text-slate-400 mb-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <div className="text-[10px] sm:text-[8px] text-slate-500 text-center leading-tight px-1">
                Event Image
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold text-slate-900 break-words line-clamp-2">
                  {title}
                </h3>
                {isFeatured && (
                  <span className="badge badge-featured whitespace-nowrap flex-shrink-0">
                    Featured
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-1 flex-shrink-0 mt-1 sm:mt-0">
              <span className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-1 rounded-lg whitespace-nowrap">
                {dateLabel}
              </span>
              {event.event_time && (
                <span className="text-[10px] text-slate-500 whitespace-nowrap">
                  {event.event_time}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mb-3 mt-auto">
            {mapsUrl ? (
              <Link
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-purple-600 transition-colors max-w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5 text-slate-400 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="underline truncate">{locationLabel}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3 w-3 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </Link>
            ) : (
              <div className="flex items-center gap-1 max-w-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5 text-slate-400 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="truncate">{locationLabel}</span>
              </div>
            )}
            {event.martial_art && (
              <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium whitespace-nowrap">
                {event.martial_art}
              </span>
            )}
          </div>

          <div className="text-[11px] text-purple-600 font-medium">
            View event details →
          </div>
        </div>
      </div>
    </Link>
  );
}


