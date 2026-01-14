"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { getGoogleMapsUrl } from "@/lib/location";
import FollowStats from "@/components/social/FollowStats";
import PostReactions from "@/components/social/PostReactions";
import MessageButton from "@/components/messaging/MessageButton";
import CreatePostModal from "@/components/social/CreatePostModal";
import PostActionsMenu from "@/components/social/PostActionsMenu";
import { useRouter, usePathname } from "next/navigation";

type Profile = {
  id: string;
  full_name?: string | null;
  username?: string | null;
  handle?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  bio?: string | null;
  country?: string | null;
  martial_arts?: string[] | null;
  role?: string | null;
  follower_count?: number | null;
  following_count?: number | null;

  social_links?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    tiktok?: string;
    website?: string;
    gym_username?: string;
    [key: string]: any;
  } | null;
};

type FighterSummary = {
  id: string;
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  country?: string | null;
};

type Post = {
  id: string;
  content: string | null;
  created_at: string;
  image_url?: string | null;
};

type EventSummary = {
  id: string;
  profile_id?: string | null;
  title?: string | null;
  name?: string | null;
  event_date?: string | null;
  location?: string | null;
  banner_url?: string | null;
};

export default function GymProfile({
  profile,
  fighters = [],
  posts = [],
  isOwnProfile = false,
  profileIdentifier: propProfileIdentifier,
}: {
  profile: Profile;
  fighters?: FighterSummary[];
  posts?: Post[];
  isOwnProfile?: boolean;
  profileIdentifier?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    full_name,
    username,
    handle,
    avatar_url,
    banner_url,
    bio,
    country,
    martial_arts,
    social_links,
  } = profile;

  // Use the identifier passed from parent (most reliable), otherwise extract from URL, then fallback
  const urlIdentifier = pathname?.match(/^\/profile\/([^\/]+)/)?.[1];
  const profileIdentifier = propProfileIdentifier || urlIdentifier || username || handle;
  
  // If we still don't have an identifier, don't render the links
  if (!profileIdentifier) {
    console.warn("GymProfile: No profile identifier available", { username, handle, urlIdentifier, pathname, propProfileIdentifier });
  }

  const arts = martial_arts && martial_arts.length ? martial_arts : [];
  const locationText = country ? String(country).trim() : "";

  const [events, setEvents] = useState<EventSummary[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  const [fighterEvents, setFighterEvents] = useState<any[]>([]);
  const [fighterEventsLoading, setFighterEventsLoading] = useState(true);
  const [activeEventTab, setActiveEventTab] = useState<"events" | "fighter-events">("events");

  const [coaches, setCoaches] = useState<FighterSummary[]>([]);
  const [coachesLoading, setCoachesLoading] = useState(true);
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  // Start at page 0 (newest posts)
  const [postPage, setPostPage] = useState(0);

  // figure out if this is my own profile (hide Message on my own gym)
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      setMyId(data.user?.id ?? null);
    });
  }, []);

  const isMe = myId === profile.id;

  // Events for this gym
  useEffect(() => {
    const supabase = createSupabaseBrowser();

    (async () => {
      setEventsLoading(true);
      const { data, error } = await supabase
        .from("events")
        .select("id, profile_id, title, name, event_date, location, banner_url")
        .eq("profile_id", profile.id)
        .order("event_date", { ascending: true });

      if (error) {
        console.error("GymProfile events error", error);
        setEvents([]);
      } else {
        setEvents((data as EventSummary[]) || []);
      }
      setEventsLoading(false);
    })();
  }, [profile.id]);

  // Fighter events (upcoming fights for fighters, excluding events the gym owns)
  useEffect(() => {
    const supabase = createSupabaseBrowser();
    let cancelled = false;

    (async () => {
      setFighterEventsLoading(true);

      if (fighters.length === 0) {
        setFighterEvents([]);
        setFighterEventsLoading(false);
        return;
      }

      const fighterIds = fighters.map((f) => f.id);
      if (fighterIds.length === 0) {
        if (!cancelled) {
          setFighterEvents([]);
          setFighterEventsLoading(false);
        }
        return;
      }

      // Get all bouts where fighters from this gym are participating
      // Query for red_fighter_id first
      const { data: redBouts, error: redError } = await supabase
        .from("event_bouts")
        .select("id, event_id, red_fighter_id, blue_fighter_id")
        .in("red_fighter_id", fighterIds);

      // Query for blue_fighter_id
      const { data: blueBouts, error: blueError } = await supabase
        .from("event_bouts")
        .select("id, event_id, red_fighter_id, blue_fighter_id")
        .in("blue_fighter_id", fighterIds);

      if (redError || blueError) {
        console.error("GymProfile fighter events error", redError || blueError);
        if (!cancelled) {
          setFighterEvents([]);
          setFighterEventsLoading(false);
        }
        return;
      }

      // Combine and deduplicate bouts
      const allBouts = [...(redBouts || []), ...(blueBouts || [])];
      const uniqueBouts = Array.from(
        new Map(allBouts.map((b) => [b.id, b])).values()
      );

      if (uniqueBouts.length === 0) {
        if (!cancelled) {
          setFighterEvents([]);
          setFighterEventsLoading(false);
        }
        return;
      }

      const eventIds = Array.from(new Set(uniqueBouts.map((b) => b.event_id).filter(Boolean))) as string[];

      if (eventIds.length === 0) {
        if (!cancelled) {
          setFighterEvents([]);
          setFighterEventsLoading(false);
        }
        return;
      }

      // Get events for these bouts
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("id, profile_id, title, name, event_date, location, banner_url")
        .in("id", eventIds)
        .neq("profile_id", profile.id); // Exclude events the gym owns

      if (eventsError || !eventsData || eventsData.length === 0) {
        if (!cancelled) {
          setFighterEvents([]);
          setFighterEventsLoading(false);
        }
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Create a map of event_id to event
      const eventsMap: Record<string, any> = {};
      eventsData.forEach((ev) => {
        eventsMap[ev.id] = ev;
      });

      // Create a fighters map
      const fightersMap: Record<string, FighterSummary> = {};
      fighters.forEach((f) => {
        fightersMap[f.id] = f;
      });

      // Group bouts by event and create event summaries
      const eventsWithFighters: Record<string, { event: any; fighters: string[] }> = {};

      uniqueBouts.forEach((bout) => {
        const eventId = bout.event_id;
        if (!eventsMap[eventId]) return; // Skip if event is owned by gym

        const event = eventsMap[eventId];
        const eventDate = event.event_date ? new Date(event.event_date) : null;
        const isUpcoming = !eventDate || eventDate >= today;

        if (!isUpcoming) return; // Only include upcoming events

        if (!eventsWithFighters[eventId]) {
          eventsWithFighters[eventId] = {
            event,
            fighters: [],
          };
        }

        // Add fighter names
        if (bout.red_fighter_id && fightersMap[bout.red_fighter_id]) {
          const fighter = fightersMap[bout.red_fighter_id];
          const fighterName = fighter.full_name || fighter.username || "";
          if (fighterName && !eventsWithFighters[eventId].fighters.includes(fighterName)) {
            eventsWithFighters[eventId].fighters.push(fighterName);
          }
        }
        if (bout.blue_fighter_id && fightersMap[bout.blue_fighter_id]) {
          const fighter = fightersMap[bout.blue_fighter_id];
          const fighterName = fighter.full_name || fighter.username || "";
          if (fighterName && !eventsWithFighters[eventId].fighters.includes(fighterName)) {
            eventsWithFighters[eventId].fighters.push(fighterName);
          }
        }
      });

      // Convert to array and sort by date
      const fighterEventsList = Object.values(eventsWithFighters)
        .map((item) => ({
          ...item.event,
          fighters: item.fighters,
        }))
        .sort((a, b) => {
          const dateA = a.event_date ? new Date(a.event_date).getTime() : Infinity;
          const dateB = b.event_date ? new Date(b.event_date).getTime() : Infinity;
          return dateA - dateB;
        });

      if (!cancelled) {
        setFighterEvents(fighterEventsList);
        setFighterEventsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fighters, profile.id]);

  // Coaches linked to this gym
  useEffect(() => {
    // Use username or handle (fallback)
    const gymIdentifier = username || (profile as any).handle;
    
    if (!gymIdentifier) {
      setCoaches([]);
      setCoachesLoading(false);
      return;
    }

    const supabase = createSupabaseBrowser();

    (async () => {
      setCoachesLoading(true);
      // Query for coaches - handle both uppercase and lowercase role values
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, country, social_links")
        .or("role.eq.coach,role.eq.COACH")
        .contains("social_links", { gym_username: gymIdentifier });

      if (error) {
        console.error("GymProfile coaches error", error);
        setCoaches([]);
      } else {
        setCoaches((data as FighterSummary[]) || []);
      }
      setCoachesLoading(false);
    })();
  }, [username, profile]);

  return (
    <div className="space-y-6">
      {/* SECTION 1 – Banner / header */}
      <section className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
        {/* Banner */}
        <div className="relative h-40 w-full bg-slate-200">
          {banner_url && (
            <Image
              src={banner_url}
              alt="Gym banner"
              fill
              className="object-cover"
            />
          )}
        </div>

        <div className="px-5 pb-5 relative">
          <div className="flex items-center gap-4">
            {/* Avatar overlapping banner */}
            <div className="-mt-14 md:-mt-16">
              <div className="h-28 w-28 md:h-32 md:w-32 rounded-full border-4 border-white bg-slate-200 overflow-hidden">
                {avatar_url && (
                  <Image
                    src={avatar_url}
                    alt={full_name || "Gym"}
                    width={128}
                    height={128}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
            </div>

            {/* Name + location / arts + follow stats + message */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                {/* Left: name + username */}
                <div className="flex flex-col">
                  <h1 className="text-lg md:text-xl font-semibold">
                    {full_name || "Gym name"}
                  </h1>
                  {username && (
                    <Link
                      href={`/profile/${username}`}
                      className="mt-0.5 inline-flex items-center text-xs text-slate-600 hover:text-slate-900 hover:underline underline-offset-4"
                    >
                      @{username}
                    </Link>
                  )}
                </div>

                {/* Right: location + arts + follow stats + Message */}
                <div className="flex flex-col md:ml-6 text-xs text-slate-600">
                  {(locationText || arts.length > 0) && (
                    <div className="flex flex-wrap gap-2">
                      {locationText && (() => {
                        const mapsUrl = getGoogleMapsUrl(locationText);
                        return mapsUrl ? (
                          <Link
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors inline-flex items-center gap-1"
                          >
                            {locationText}
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-3 w-3"
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
                          <span className="px-2 py-1 rounded-full bg-slate-100">
                            {locationText}
                          </span>
                        );
                      })()}

                      {arts.length > 0 &&
                        arts.map((art) => (
                          <span
                            key={art}
                            className="px-2 py-1 rounded-full bg-purple-50 text-purple-700"
                          >
                            {art}
                          </span>
                        ))}
                    </div>
                  )}

                  {/* Follow stats + Message button */}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <FollowStats
                      profileId={profile.id}
                      username={profile.username}
                    />

                     {!isMe && (
                      <MessageButton
                        targetProfileId={profile.id}
                        targetUsername={profileIdentifier}
                      />
                     )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 – Bio */}
      <section className="card">
        <div className="section-header mb-4">
          <h2 className="section-title text-lg">Bio</h2>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed min-h-[60px]">
          {bio || (isMe ? "Describe your gym, philosophy, and fighters." : "")}
        </p>
      </section>

      {/* SECTION – Head coaches & fighters */}
      <section className="card">
        <div className="section-header mb-4">
          <h2 className="section-title text-lg">Head coaches & fighters</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          {/* Coaches card */}
          {profileIdentifier ? (
            <Link
              href={`/profile/${profileIdentifier}/coaches`}
              className="block card-compact hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
            >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-600 mb-1">
                  Head coaches
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-semibold text-slate-900">
                  {coachesLoading ? "..." : coaches.length}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  linked coaches
                </p>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-[11px] text-slate-500">
                {coachesLoading
                  ? "Loading..."
                  : coaches.length === 0
                  ? (isMe ? "No coaches linked yet" : "")
                  : `View all ${coaches.length} coach${coaches.length !== 1 ? "es" : ""}`}
              </p>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-slate-400"
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
            </div>
          </Link>
          ) : (
            <div className="block card-compact">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-600 mb-1">
                    Head coaches
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-semibold text-slate-900">
                    {coachesLoading ? "..." : coaches.length}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    linked coaches
                  </p>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-[11px] text-slate-500">
                  Profile identifier missing
                </p>
              </div>
            </div>
          )}

          {/* Fighters card */}
          {profileIdentifier ? (
            <Link
              href={`/profile/${profileIdentifier}/fighters`}
              className="block card-compact hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
            >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-600 mb-1">
                  Number of fighters
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-semibold text-slate-900">
                  {fighters.length}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  linked fighters
                </p>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-[11px] text-slate-500">
                {fighters.length === 0
                  ? (isMe ? "No fighters linked yet" : "")
                  : `View all ${fighters.length} fighter${fighters.length !== 1 ? "s" : ""}`}
              </p>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-slate-400"
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
            </div>
          </Link>
          ) : (
            <div className="block card-compact">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-600 mb-1">
                    Number of fighters
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-slate-900">
                    {fighters.length}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    linked fighters
                  </p>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-[11px] text-slate-500">
                  Profile identifier missing
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SECTION – Events & Fighter Events */}
      <section className="card">
        <div className="mb-4">
          <div className="flex items-center gap-4 border-b border-slate-200">
            <button
              onClick={() => setActiveEventTab("events")}
              className={`pb-3 px-1 text-sm font-medium transition-all duration-200 ${
                activeEventTab === "events"
                  ? "text-purple-700 border-b-2 border-purple-700"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Events
            </button>
            <button
              onClick={() => setActiveEventTab("fighter-events")}
              className={`pb-3 px-1 text-sm font-medium transition-all duration-200 ${
                activeEventTab === "fighter-events"
                  ? "text-purple-700 border-b-2 border-purple-700"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Fighter Events
            </button>
          </div>
        </div>

        <div className="relative min-h-[200px]">
          {/* Events (created by gym) */}
          <div
            className={`transition-opacity duration-300 ${
              activeEventTab === "events" ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none"
            }`}
          >
            {eventsLoading ? (
              <p className="text-sm text-slate-600">Loading events…</p>
            ) : events.length === 0 ? (
              <p className="text-sm text-slate-600">
                No events created yet. Use the create event page to add your first
                show.
              </p>
            ) : (
              <div className="space-y-2">
                {events.map((ev) => {
                  const title = ev.title || ev.name || "Untitled event";
                  const dateLabel = ev.event_date
                    ? new Date(ev.event_date).toLocaleDateString()
                    : "Date TBC";

                  return (
                    <Link
                      key={ev.id}
                      href={`/events/${ev.id}`}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs hover:border-purple-400 hover:bg-purple-50"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900">
                          {title}
                        </span>
                        <span className="text-[11px] text-slate-600">
                          {dateLabel}
                          {ev.location ? ` • ${ev.location}` : ""}
                        </span>
                      </div>

                      {ev.banner_url && (
                        <div className="h-10 w-16 rounded-md overflow-hidden bg-slate-200 flex-shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={ev.banner_url}
                            alt={title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Fighter Events (fighters fighting on other promotions) */}
          <div
            className={`transition-opacity duration-300 ${
              activeEventTab === "fighter-events" ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none"
            }`}
          >
            {fighterEventsLoading ? (
              <p className="text-sm text-slate-600">Loading fighter events…</p>
            ) : fighterEvents.length === 0 ? (
              <p className="text-sm text-slate-600">
                No upcoming fights for your fighters on other promotions.
              </p>
            ) : (
              <div className="space-y-2">
                {fighterEvents.map((ev: any) => {
                  const title = ev.title || ev.name || "Untitled event";
                  const dateLabel = ev.event_date
                    ? new Date(ev.event_date).toLocaleDateString()
                    : "Date TBC";
                  const fightersLabel = ev.fighters && ev.fighters.length > 0
                    ? ev.fighters.join(", ")
                    : "Fighters";

                  return (
                    <Link
                      key={ev.id}
                      href={`/events/${ev.id}`}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs hover:border-purple-400 hover:bg-purple-50"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900">
                          {title}
                        </span>
                        <span className="text-[11px] text-slate-600">
                          {dateLabel}
                          {ev.location ? ` • ${ev.location}` : ""}
                        </span>
                        {ev.fighters && ev.fighters.length > 0 && (
                          <span className="text-[10px] text-slate-500 mt-0.5">
                            {fightersLabel}
                          </span>
                        )}
                      </div>

                      {ev.banner_url && (
                        <div className="h-10 w-16 rounded-md overflow-hidden bg-slate-200 flex-shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={ev.banner_url}
                            alt={title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SECTION – Social feed (posts) */}
      <section className="card">
        <div className="section-header mb-4">
          <h2 className="section-title text-lg">Social feed</h2>
        </div>
        <div className="flex items-center justify-between mb-4">
          {isOwnProfile && (
            <button
              onClick={() => setIsCreatePostModalOpen(true)}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-600 text-white hover:bg-purple-700 transition-colors"
              title="Create new post"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          )}
        </div>
        {posts.length === 0 ? (
          <div className="h-24 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400">
            No posts yet.
          </div>
        ) : (
          <div className="relative">
            {posts.length >= 6 && (
              <>
                <button
                  type="button"
                  onClick={() => setPostPage(Math.max(0, postPage - 1))}
                  disabled={postPage === 0}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white rounded-full p-2 shadow-lg border border-slate-200 hover:bg-purple-50 hover:border-purple-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Show newer posts"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-slate-700"
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
                </button>
                <button
                  type="button"
                  onClick={() => setPostPage(Math.min(Math.ceil(posts.length / 6) - 1, postPage + 1))}
                  disabled={postPage >= Math.ceil(posts.length / 6) - 1}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white rounded-full p-2 shadow-lg border border-slate-200 hover:bg-purple-50 hover:border-purple-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Show older posts"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-slate-700"
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
                </button>
              </>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {(posts.length >= 6
                ? posts.slice(postPage * 6, postPage * 6 + 6)
                : posts
              ).map((post) => (
              <article
                key={post.id}
                onClick={() => router.push(`/posts/${post.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/posts/${post.id}`);
                  }
                }}
                className="group relative rounded-xl border border-slate-200 bg-white overflow-hidden hover:border-purple-400 hover:shadow-md transition-all cursor-pointer"
              >
                {isOwnProfile && (
                  <PostActionsMenu
                    postId={post.id}
                    initialContent={post.content || null}
                    initialImageUrl={post.image_url || null}
                    variant={post.image_url ? "dark" : "light"}
                  />
                )}
                {post.image_url ? (
                  <div className="relative aspect-square overflow-hidden bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.image_url}
                      alt={post.content || "Post image"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* Overlay with content and date */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                        {post.content && (
                          <p className="text-xs font-medium mb-1 line-clamp-2">
                            {post.content}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <div className="text-[10px] text-white/80">
                            {new Date(post.created_at).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-3">
                              <PostReactions
                                postId={post.id}
                                commentHref={`/posts/${post.id}`}
                              />
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Date badge - always visible */}
                    <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1">
                      <span className="text-[10px] text-white font-medium">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-square p-4 flex flex-col justify-between bg-gradient-to-br from-purple-50 to-slate-50">
                    <div>
                      {post.content && (
                        <p className="text-sm text-slate-800 line-clamp-4 mb-2">
                          {post.content}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] text-slate-500">
                        {new Date(post.created_at).toLocaleDateString()}
                      </div>
                      <PostReactions
                        postId={post.id}
                        commentHref={`/posts/${post.id}`}
                      />
                    </div>
                  </div>
                )}
              </article>
              ))}
            </div>
          </div>
        )}
        {isOwnProfile && (
          <CreatePostModal
            isOpen={isCreatePostModalOpen}
            onClose={() => setIsCreatePostModalOpen(false)}
            profileId={profile.id}
          />
        )}
      </section>

      {/* SECTION – Social media links */}
      {((social_links?.instagram || social_links?.facebook || social_links?.twitter || social_links?.tiktok || social_links?.youtube) ||
        (social_links?.websites && Array.isArray(social_links.websites) && social_links.websites.length > 0) ||
        (social_links?.website)) && (
        <section className="card">
          <div className="section-header mb-4">
            <h2 className="section-title text-lg">Social media links</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {social_links?.instagram && (
              <GymSocialRow label="Instagram" value={social_links.instagram} />
            )}
            {social_links?.facebook && (
              <GymSocialRow label="Facebook" value={social_links.facebook} />
            )}
            {social_links?.twitter && (
              <GymSocialRow label="Twitter / X" value={social_links.twitter} />
            )}
            {social_links?.tiktok && (
              <GymSocialRow label="TikTok" value={social_links.tiktok} />
            )}
            {social_links?.youtube && (
              <GymSocialRow label="YouTube" value={social_links.youtube} />
            )}
            {/* Multiple website links */}
            {social_links?.websites && Array.isArray(social_links.websites) && social_links.websites.length > 0
              ? social_links.websites.map((website: { name: string; url: string }, index: number) => (
                  <GymSocialRow key={index} label={website.name || "Website"} value={website.url} />
                ))
              : social_links?.website && (
                  <GymSocialRow label="Website" value={social_links.website} />
                )}
          </div>
        </section>
      )}
    </div>
  );
}

function GymSocialRow({ label, value }: { label: string; value?: string }) {
  if (!value) {
    return null; // Don't render empty links
  }

  // Format URL for display and href
  const formatUrl = (url: string): { display: string; href: string } => {
    const trimmed = url.trim();
    
    // Handle @handles for social media
    if (trimmed.startsWith("@")) {
      const handle = trimmed.substring(1);
      // Determine platform URL based on label
      let baseUrl = "";
      if (label.toLowerCase().includes("instagram")) {
        baseUrl = "https://instagram.com/";
      } else if (label.toLowerCase().includes("twitter") || label.toLowerCase().includes("x")) {
        baseUrl = "https://twitter.com/";
      } else if (label.toLowerCase().includes("tiktok")) {
        baseUrl = "https://tiktok.com/@";
      } else if (label.toLowerCase().includes("youtube")) {
        baseUrl = "https://youtube.com/@";
      } else if (label.toLowerCase().includes("facebook")) {
        baseUrl = "https://facebook.com/";
      }
      return {
        display: trimmed,
        href: baseUrl ? `${baseUrl}${handle}` : trimmed,
      };
    }
    
    // If it already has http:// or https://, use as is
    if (/^https?:\/\//i.test(trimmed)) {
      return {
        display: trimmed.replace(/^https?:\/\//, ""),
        href: trimmed,
      };
    }
    
    // Otherwise, add https://
    return {
      display: trimmed,
      href: `https://${trimmed}`,
    };
  };

  const { display, href } = formatUrl(value);

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-slate-700 text-xs hover:border-purple-400 hover:text-purple-700 transition-colors"
    >
      <span>{label}</span>
      <span className="font-medium truncate max-w-[160px]">{display}</span>
    </Link>
  );
}




