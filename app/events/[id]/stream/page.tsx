// app/events/[id]/stream/page.tsx
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabaseServer";
import StreamContent from "@/components/events/StreamContent";

type Event = {
  id: string;
  title?: string | null;
  name?: string | null;
  description?: string | null;
  event_date?: string | null;
  location?: string | null;
  banner_url?: string | null;
  is_live?: boolean | null;
  profile_id?: string | null;
  owner_profile_id?: string | null;
  event_time?: string | null;
  stream_price?: number | null;
  fighter_percentage?: number | null;
};

type ProfileLite = {
  id: string;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
};

export default async function EventStreamPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createSupabaseServer();

  // Ensure params.id is a string (handle potential Promise in Next.js 15+)
  const eventId = typeof params.id === 'string' ? params.id : await params.id;

  // Load event
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle<Event>();

  if (eventError || !event) {
    return (
      <div className="max-w-6xl mx-auto">
        <p className="text-lg font-semibold mb-2">Event not found.</p>
        <Link
          href="/stream"
          className="inline-flex px-4 py-2 rounded-xl bg-purple-600 text-white text-sm hover:bg-purple-700"
        >
          Back to streams
        </Link>
      </div>
    );
  }

  // Load organiser profile
  const organiserId = event.owner_profile_id || event.profile_id;
  const { data: organiser } = organiserId
    ? await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .eq("id", organiserId)
        .maybeSingle<ProfileLite>()
    : { data: null };

  const title = event.title || event.name || "Untitled event";
  const isLive = event.is_live || false;
  const streamPrice = event.stream_price || null;
  const fighterPercentage = event.fighter_percentage || 0;

  // Load fighters from bouts
  const { data: boutsData } = await supabase
    .from("event_bouts")
    .select("red_fighter_id, blue_fighter_id")
    .eq("event_id", eventId);

  const fighterIds = Array.from(
    new Set(
      (boutsData || [])
        .flatMap((b) => [b.red_fighter_id, b.blue_fighter_id])
        .filter((id): id is string => !!id)
    )
  );

  let fighters: ProfileLite[] = [];
  if (fighterIds.length > 0) {
    const { data: fightersData } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .in("id", fighterIds);

    fighters = (fightersData as ProfileLite[]) || [];
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-purple-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/stream"
                className="text-slate-600 hover:text-purple-700 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
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
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
                {organiser && (
                  <p className="text-sm text-slate-600">
                    Hosted by {organiser.full_name || organiser.username}
                  </p>
                )}
              </div>
            </div>
            <Link
              href={`/events/${eventId}?from=stream`}
              className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors"
            >
              View Event Details
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content - Using StreamContent component for payment handling */}
      <StreamContent
        eventId={eventId}
        eventTitle={title}
        streamPrice={streamPrice}
        fighterPercentage={fighterPercentage}
        isLive={isLive}
        fighters={fighters}
      />
    </div>
  );
}

