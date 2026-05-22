// app/my-events/page.tsx — event management for gym / promotion users
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

type Event = {
  id: string;
  name: string;
  title?: string | null;
  event_date: string | null;
  date_end: string | null;
  city: string | null;
  country: string | null;
  venue: string | null;
  status: "draft" | "published" | "completed" | "cancelled";
  martial_arts: string[] | null;
  is_live?: boolean | null;
  is_featured?: boolean | null;
  featured_until?: string | null;
  has_live_bout?: boolean;
};

export default function MyEventsPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowser();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);

  const sortEventsByDateDescNullLast = (rows: Event[]) =>
    [...rows].sort((a, b) => {
      const aDate = a?.event_date ? new Date(a.event_date).getTime() : null;
      const bDate = b?.event_date ? new Date(b.event_date).getTime() : null;
      if (aDate === null && bDate === null) return 0;
      if (aDate === null) return 1;
      if (bDate === null) return -1;
      return bDate - aDate;
    });

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData.user;

      if (!authUser) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authUser.id)
        .single();

      const userRole = profile?.role?.toLowerCase() || null;

      if (userRole !== "gym" && userRole !== "promotion") {
        router.push("/");
        return;
      }

      // Load events for this user
      const { data: eventsData, error } = await supabase
        .from("events")
        .select("*, title")
        .or(`owner_profile_id.eq.${authUser.id},profile_id.eq.${authUser.id}`)
        .order("event_date", { ascending: false });

      let eventsToSet: Event[] = [];

      if (error) {
        const { data: eventsData2 } = await supabase
          .from("events")
          .select("*, title")
          .eq("owner_profile_id", authUser.id)
          .order("event_date", { ascending: false });
        eventsToSet = eventsData2 || [];
      } else {
        eventsToSet = eventsData || [];
      }

      // Check for live bouts
      if (eventsToSet.length > 0) {
        const eventIds = eventsToSet.map((e) => e.id);
        const { data: liveBoutsData } = await supabase
          .from("event_bouts")
          .select("event_id")
          .in("event_id", eventIds)
          .eq("is_live", true);

        const eventsWithLiveBouts = new Set(
          (liveBoutsData || []).map((b: any) => b.event_id)
        );

        setEvents(
          sortEventsByDateDescNullLast(
            eventsToSet.map((event) => ({
              ...event,
              has_live_bout: eventsWithLiveBouts.has(event.id),
            }))
          )
        );
      } else {
        setEvents([]);
      }

      setLoading(false);
    }

    load();
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <p className="text-sm text-slate-600">Loading your events…</p>
      </div>
    );
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const currentEvents = events.filter((event) => {
    if (event.status === "completed" || event.status === "cancelled") return false;
    if (!event.event_date) return true;
    const eventDate = new Date(event.event_date);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate >= now;
  });

  const pastEvents = events.filter((event) => {
    if (event.status === "completed" || event.status === "cancelled") return true;
    if (!event.event_date) return false;
    const eventDate = new Date(event.event_date);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate < now;
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Date TBC";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-slate-200 text-slate-700",
      published: "bg-blue-100 text-blue-700",
      completed: "bg-green-100 text-green-700",
      cancelled: "bg-red-100 text-red-700",
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-[10px] font-medium uppercase ${colors[status] ?? "bg-slate-200 text-slate-700"}`}
      >
        {status}
      </span>
    );
  };

  const isFeaturedActive = (event: Event) => {
    if (!event.is_featured) return false;
    if (!event.featured_until) return true;
    return new Date(event.featured_until) > new Date();
  };

  const EventCard = ({ event, dimmed = false }: { event: Event; dimmed?: boolean }) => (
    <div
      className={`card p-6 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ${dimmed ? "opacity-75 hover:opacity-100" : ""}`}
    >
      <Link href={`/events/${event.id}`} className="block">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <h3 className="text-lg sm:text-xl font-semibold text-slate-900">
                {event.title || event.name}
              </h3>
              {getStatusBadge(event.status)}
              {isFeaturedActive(event) && (
                <span className="badge badge-featured text-[10px]">⭐ Featured</span>
              )}
              {event.has_live_bout && (
                <span className="badge badge-live">
                  <span className="flex h-2 w-2 rounded-full bg-white animate-pulse mr-1.5" />
                  Live
                </span>
              )}
            </div>
            <div className="space-y-1 text-sm text-slate-600">
              <p>
                {formatDate(event.event_date)}
                {event.venue && ` • ${event.venue}`}
              </p>
              {event.city && event.country && (
                <p>
                  {event.city}, {event.country}
                </p>
              )}
              {event.martial_arts && event.martial_arts.length > 0 && (
                <p className="text-slate-500">{event.martial_arts.join(", ")}</p>
              )}
            </div>
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-slate-400 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My Events</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage your events, track bouts, and feature your shows.
          </p>
        </div>
        <Link href="/create-event" className="btn btn-primary">
          + Create Event
        </Link>
      </div>

      {/* Current / Upcoming */}
      <section className="space-y-4">
        <div className="section-header">
          <h2 className="section-title text-xl font-bold">
            Current &amp; Upcoming ({currentEvents.length})
          </h2>
        </div>
        {currentEvents.length === 0 ? (
          <div className="card p-6">
            <p className="text-sm text-slate-600">
              No current or upcoming events.{" "}
              <Link href="/create-event" className="text-purple-600 font-medium hover:underline">
                Create your first event
              </Link>{" "}
              to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {currentEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <section className="space-y-4">
          <div className="section-header">
            <h2 className="section-title text-xl font-bold">
              Past Events ({pastEvents.length})
            </h2>
          </div>
          <div className="space-y-4">
            {pastEvents.map((event) => (
              <EventCard key={event.id} event={event} dimmed />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
