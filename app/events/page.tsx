// app/events/page.tsx — public events listing, no auth required
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import SponsorshipBanner from "@/components/sponsors/SponsorshipBanner";
import { getSponsorshipsForPlacement, type Sponsorship } from "@/lib/sponsorships";
import ALogo from "@/components/logos/ALogo";
import { getGoogleMapsUrl } from "@/lib/location";
import { DISCIPLINES } from "@/lib/disciplines";
import FilterSelect from "@/components/ui/FilterSelect";

// ─── Types ────────────────────────────────────────────────────────────────────

type EventRow = {
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
  is_featured: boolean | null;
  featured_until: string | null;
  event_type: "fight" | "general" | null;
};

type EventTypeFilter = "all" | "fight" | "general";

type Tab = "upcoming" | "past" | "all";

const ART_FILTERS = [
  { key: "all", label: "All disciplines" },
  ...DISCIPLINES.map((d) => ({ key: d, label: d })),
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isFeaturedActive(event: EventRow): boolean {
  if (!event.is_featured) return false;
  if (!event.featured_until) return true;
  return new Date(event.featured_until) > new Date();
}

// Times are entered through <input type="time">, so they arrive as "19:00", or
// as "19:00:00" when Postgres hands back a time column. Keep 24-hour, no seconds.
function formatEventTime(value: string | null): string | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value.trim() || null;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

// Multi-discipline events are stored as a comma-joined string by /create-event.
// Deduplicated because the value is free-form and each chip is keyed by name.
function splitDisciplines(value: string | null): string[] {
  if (!value) return [];
  return Array.from(
    new Set(
      value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
    )
  );
}

function insertSponsorsBetween(
  events: EventRow[],
  sponsorships: Sponsorship[],
  interval = 4
): (EventRow | { __sponsor: Sponsorship } | { __sponsorPlaceholder: true })[] {
  const result: (
    | EventRow
    | { __sponsor: Sponsorship }
    | { __sponsorPlaceholder: true }
  )[] = [];
  let sIdx = 0;
  events.forEach((event, i) => {
    result.push(event);
    if ((i + 1) % interval === 0 && i < events.length - 1) {
      if (sponsorships.length > 0) {
        result.push({ __sponsor: sponsorships[sIdx % sponsorships.length] });
        sIdx++;
      } else {
        result.push({ __sponsorPlaceholder: true });
      }
    }
  });
  return result;
}

// ─── Event card ───────────────────────────────────────────────────────────────

// The whole card is a Link, so the maps action cannot be an anchor of its own.
// It needs explicit key handling to be reachable without a mouse.
function EventLocation({
  label,
  mapsUrl,
}: {
  label: string;
  mapsUrl: string | null;
}) {
  if (!mapsUrl) {
    return <span className="text-slate-700">{label}</span>;
  }

  const openMaps = () => window.open(mapsUrl, "_blank", "noopener");

  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={`Open ${label} in Google Maps`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openMaps();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          openMaps();
        }
      }}
      className="rounded text-slate-700 cursor-pointer hover:text-purple-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
    >
      {label}
    </span>
  );
}

function EventCard({ event }: { event: EventRow }) {
  const title = event.title || event.name || "Untitled event";
  const dateLabel = event.event_date
    ? new Date(event.event_date).toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Date TBC";
  const locationLabel =
    event.location ||
    [event.location_city, event.location_country].filter(Boolean).join(", ") ||
    "Location TBC";
  const hasLocation = locationLabel !== "Location TBC";
  const mapsUrl = getGoogleMapsUrl(hasLocation ? locationLabel : null);
  const featured = isFeaturedActive(event);
  const timeLabel = formatEventTime(event.event_time);
  const disciplines = splitDisciplines(event.martial_art);

  return (
    <Link
      href={`/events/${event.id}`}
      className={`block card hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ${
        featured ? "border-purple-300 bg-gradient-to-br from-purple-50/50 to-white" : ""
      }`}
    >
      {/* Mobile layout — always show banner */}
      <div className="md:hidden p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-bold text-slate-900 leading-tight">{title}</h3>
          {featured && <span className="badge badge-featured shrink-0">Featured</span>}
        </div>
        <div className="aspect-[16/9] w-full rounded-xl overflow-hidden relative shadow-sm bg-slate-100">
          {event.banner_url ? (
            <Image src={event.banner_url} alt={title} fill className="object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-slate-100">
              <ALogo size={40} className="opacity-20" />
            </div>
          )}
        </div>
        <div className="space-y-1 text-sm">
          <div>
            <span className="font-semibold text-slate-900">{dateLabel}</span>
            {timeLabel && <span className="ml-2 text-slate-500">{timeLabel}</span>}
          </div>
          {hasLocation && (
            <div>
              <EventLocation label={locationLabel} mapsUrl={mapsUrl} />
            </div>
          )}
        </div>
        {disciplines.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {disciplines.map((art) => (
              <span key={art} className="badge badge-primary">
                {art}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Desktop layout — always show banner thumbnail */}
      <div className="hidden md:flex gap-5 p-5">
        <div className="w-48 h-32 rounded-xl overflow-hidden relative bg-slate-100 shrink-0 shadow-sm">
          {event.banner_url ? (
            <Image src={event.banner_url} alt={title} fill className="object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-slate-100">
              <ALogo size={36} className="opacity-20" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 py-1">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              {featured && <span className="badge badge-featured">Featured</span>}
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-slate-400 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div className="space-y-1 text-sm">
            <div>
              <span className="font-semibold text-slate-900">{dateLabel}</span>
              {timeLabel && <span className="ml-2 text-slate-500">{timeLabel}</span>}
            </div>
            {hasLocation && (
              <div>
                <EventLocation label={locationLabel} mapsUrl={mapsUrl} />
              </div>
            )}
          </div>
          {disciplines.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {disciplines.map((art) => (
                <span key={art} className="badge badge-primary">
                  {art}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Sponsor placeholder ──────────────────────────────────────────────────────

function SponsorPlaceholder() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-purple-300 bg-gradient-to-br from-purple-50 to-indigo-50/30 p-4">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center shrink-0">
          <ALogo size={28} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm text-slate-900 mb-0.5">Sponsor Placement Available</h4>
          <p className="text-xs text-slate-600 mb-1">
            High-visibility placement between event listings.
          </p>
          <a
            href="mailto:sponsors@apexcombatevents.com"
            className="text-xs text-purple-700 font-medium hover:underline break-all"
            onClick={(e) => e.stopPropagation()}
          >
            sponsors@apexcombatevents.com
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Filter controls ──────────────────────────────────────────────────────────

const TAB_LABELS: Record<Tab, string> = {
  upcoming: "Upcoming",
  past: "Past",
  all: "All",
};

const EVENT_TYPE_LABELS: Record<EventTypeFilter, string> = {
  all: "All events",
  fight: "Fight events",
  general: "General events",
};

/** The segmented control shared by every filter, so the row reads as one strip. */
function SegmentedBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">{children}</div>
  );
}

function SegmentButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
        active
          ? "bg-white text-purple-700 shadow-sm"
          : "text-slate-600 hover:text-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EventsPage() {
  const supabase = createSupabaseBrowser();

  const [allEvents, setAllEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);

  // Filters / tab
  const [searchQuery, setSearchQuery] = useState("");
  const [artFilter, setArtFilter] = useState("all");
  const [tab, setTab] = useState<Tab>("upcoming");
  const [eventTypeFilter, setEventTypeFilter] = useState<EventTypeFilter>("all");

  useEffect(() => {
    async function load() {
      try {
        const [{ data: eventsData }, eventSponsorships] = await Promise.all([
          supabase
            .from("events")
            .select(
              "id, title, name, event_date, event_time, location, location_city, location_country, martial_art, banner_url, is_featured, featured_until, event_type"
            )
            .order("event_date", { ascending: true })
            .limit(300),
          getSponsorshipsForPlacement("events_page"),
        ]);

        setAllEvents((eventsData as EventRow[]) || []);
        setSponsorships(eventSponsorships);
      } catch (err) {
        console.error("Failed to load events:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [supabase]);

  // ── Derived lists ──────────────────────────────────────────────────────────

  const todayStr = new Date().toISOString().slice(0, 10);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allEvents.filter((e) => {
      // Art filter — use includes() to support comma-separated or multi-discipline values
      if (artFilter !== "all" && !e.martial_art?.toLowerCase().includes(artFilter.toLowerCase())) {
        return false;
      }
      // Search query
      if (q) {
        const titleMatch = (e.title || e.name || "").toLowerCase().includes(q);
        const locMatch =
          (e.location || "").toLowerCase().includes(q) ||
          (e.location_city || "").toLowerCase().includes(q) ||
          (e.location_country || "").toLowerCase().includes(q);
        if (!titleMatch && !locMatch) return false;
      }
      return true;
    });
  }, [allEvents, searchQuery, artFilter]);

  const tabFiltered = useMemo(() => {
    if (tab === "all") return filtered;
    if (tab === "upcoming") return filtered.filter((e) => !e.event_date || e.event_date >= todayStr);
    return filtered.filter((e) => !!e.event_date && e.event_date < todayStr);
  }, [filtered, tab, todayStr]);

  const featuredEvents = useMemo(
    () => tabFiltered.filter(isFeaturedActive),
    [tabFiltered]
  );

  // Regular events respect the event type filter; featured always show regardless
  const regularEvents = useMemo(
    () => tabFiltered.filter((e) => !isFeaturedActive(e)),
    [tabFiltered]
  );

  const filteredRegular = useMemo(() => {
    if (eventTypeFilter === "all") return regularEvents;
    return regularEvents.filter(
      (e) => (e.event_type ?? "fight") === eventTypeFilter
    );
  }, [regularEvents, eventTypeFilter]);


  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Events</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Browse upcoming fights, shows, and combat sports events.
          </p>
        </div>
      </div>

      {/* Search + filters */}
      <div className="card p-4 space-y-4">
        {/* Search bar */}
        <div className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by event name or location…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filters. One segmented style across all three, so when-then-what
            reads left to right as a single strip. */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <SegmentedBar>
            {(["upcoming", "past", "all"] as Tab[]).map((t) => (
              <SegmentButton key={t} active={tab === t} onClick={() => setTab(t)}>
                {TAB_LABELS[t]}
              </SegmentButton>
            ))}
          </SegmentedBar>

          <SegmentedBar>
            {(["all", "fight", "general"] as EventTypeFilter[]).map((type) => (
              <SegmentButton
                key={type}
                active={eventTypeFilter === type}
                onClick={() => setEventTypeFilter(type)}
              >
                {EVENT_TYPE_LABELS[type]}
              </SegmentButton>
            ))}
          </SegmentedBar>

          <FilterSelect
            value={artFilter}
            onChange={setArtFilter}
            label="Filter by discipline"
            options={ART_FILTERS.map((f) => ({ value: f.key, label: f.label }))}
          />
        </div>
      </div>

      {/* Main sponsor placement — prominent banner below filters */}
      <section className="w-[95%] mx-auto">
        {sponsorships.length > 0 ? (
          sponsorships.slice(0, 1).map((s) => (
            <SponsorshipBanner key={s.id} sponsorship={s} variant="vertical" />
          ))
        ) : (
          <div className="card border-2 border-dashed border-purple-300 bg-gradient-to-br from-purple-50 to-indigo-50">
            <div className="flex items-center gap-4 py-6 px-5">
              <div className="w-16 h-16 rounded-xl bg-purple-200 flex items-center justify-center shrink-0">
                <ALogo size={40} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base text-slate-900 mb-1">Sponsor Placement Available</h3>
                <p className="text-sm text-slate-600 mb-2">
                  Your brand will appear here on the events page — high-visibility placement seen by every visitor.
                </p>
                <a
                  href="mailto:sponsors@apexcombatevents.com"
                  className="text-sm text-purple-700 font-medium hover:underline break-all"
                >
                  sponsors@apexcombatevents.com
                </a>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/3 mb-3" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && featuredEvents.length === 0 && filteredRegular.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-slate-600 mb-2">
            {searchQuery || artFilter !== "all" || eventTypeFilter !== "all"
              ? "No events match your filters. Try adjusting your search."
              : tab === "past"
              ? "No past events found."
              : "No upcoming events yet. Check back soon!"}
          </p>
          {(searchQuery || artFilter !== "all" || eventTypeFilter !== "all") && (
            <button
              onClick={() => { setSearchQuery(""); setArtFilter("all"); setEventTypeFilter("all"); }}
              className="text-sm text-purple-600 font-medium hover:underline mt-1"
            >
              View all events
            </button>
          )}
        </div>
      )}

      {/* Featured events */}
      {!loading && featuredEvents.length > 0 && (
        <section className="space-y-4">
          <div className="section-header">
            <h2 className="section-title">
              Featured Events
              <span className="ml-2 text-sm font-normal text-slate-500">
                ({featuredEvents.length})
              </span>
            </h2>
            <p className="section-subtitle">Sponsored events — get maximum visibility</p>
          </div>
          <div className="space-y-4">
            {insertSponsorsBetween(featuredEvents, sponsorships, 3).map((item, idx) => {
              if ("__sponsor" in item)
                return (
                  <div key={`sp-f-${idx}`} className="my-2">
                    <SponsorshipBanner
                      sponsorship={item.__sponsor}
                      variant={(item.__sponsor.variant as "horizontal" | "vertical" | "compact") || "horizontal"}
                    />
                  </div>
                );
              if ("__sponsorPlaceholder" in item)
                return <SponsorPlaceholder key={`sph-f-${idx}`} />;
              return <EventCard key={(item as EventRow).id} event={item as EventRow} />;
            })}
          </div>
        </section>
      )}

      {/* All / regular events */}
      {!loading && filteredRegular.length > 0 && (
        <section className="space-y-4">
          {featuredEvents.length > 0 && (
            <div className="section-header">
              <h2 className="section-title">
                {eventTypeFilter === "fight"
                  ? "Fight Events"
                  : eventTypeFilter === "general"
                  ? "General Events"
                  : tab === "past"
                  ? "Past Events"
                  : tab === "upcoming"
                  ? "Upcoming Events"
                  : "All Events"}
                <span className="ml-2 text-sm font-normal text-slate-500">
                  ({filteredRegular.length})
                </span>
              </h2>
            </div>
          )}
          <div className="space-y-4">
            {insertSponsorsBetween(filteredRegular, sponsorships, 3).map((item, idx) => {
              if ("__sponsor" in item)
                return (
                  <div key={`sp-r-${idx}`} className="my-2">
                    <SponsorshipBanner
                      sponsorship={item.__sponsor}
                      variant={(item.__sponsor.variant as "horizontal" | "vertical" | "compact") || "horizontal"}
                    />
                  </div>
                );
              if ("__sponsorPlaceholder" in item)
                return <SponsorPlaceholder key={`sph-r-${idx}`} />;
              return <EventCard key={(item as EventRow).id} event={item as EventRow} />;
            })}
          </div>
        </section>
      )}

    </div>
  );
}
