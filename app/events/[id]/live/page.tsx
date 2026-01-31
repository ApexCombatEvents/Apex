"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { countryToFlagUrl } from "@/lib/countries";
import { diffForSide, type Winner, type Side } from "@/lib/records";

// --- TYPES ---
type Event = {
  id: string;
  title?: string | null;
  name?: string | null;
  event_date?: string | null;
  event_time?: string | null;
  location?: string | null;
  is_live?: boolean | null;
  is_started?: boolean | null;
};

type Bout = {
  id: string;
  event_id: string;
  card_type: "main" | "undercard";
  order_index: number;
  sequence_number?: number | null;
  red_name?: string | null;
  blue_name?: string | null;
  weight?: string | null;
  bout_details?: string | null;
  red_fighter_id?: string | null;
  blue_fighter_id?: string | null;
  is_live?: boolean | null;
  winner_side?: "red" | "blue" | "draw" | null;
  result_method?: string | null;
  result_round?: string | null;
  result_time?: string | null;
};

type ProfileLite = {
  id: string;
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  country?: string | null;
  social_links?: {
    gym_username?: string;
    [key: string]: any;
  } | null;
};

export default function LiveEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const supabase = createSupabaseBrowser();

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);
  const [bouts, setBouts] = useState<Bout[]>([]);
  const [fightersById, setFightersById] = useState<Record<string, ProfileLite>>({});
  const [canEdit, setCanEdit] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function loadData() {
    setLoading(true);
    setMessage(null);

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      router.push(`/events/${eventId}`);
      return;
    }

    // 1. Load event
    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single<Event>();

    if (eventError || !eventData) {
      console.error("Event error", eventError);
      router.push(`/events/${eventId}`);
      return;
    }

    const ownerId = (eventData as any).owner_profile_id || (eventData as any).profile_id;
    if (user.id !== ownerId) {
      router.push(`/events/${eventId}`);
      return;
    }

    setCanEdit(true);
    setEvent(eventData);

    // 2. Load bouts
    // Load strictly by order_index so it visually matches your setup page
    const { data: boutsData, error: boutsError } = await supabase
      .from("event_bouts")
      .select("*")
      .eq("event_id", eventId)
      .order("order_index", { ascending: true });

    if (boutsError) {
      console.error("Bouts error", boutsError);
      setMessage("Failed to load bouts.");
      setLoading(false);
      return;
    }

    let loadedBouts = (boutsData as Bout[]) || [];

    // --- AUTO-FIX SEQUENCE LOGIC START ---
    // Goal: Sequence 1 starts at Bottom of Undercard -> Top of Undercard -> Bottom of Main -> Top of Main
    
    // Step A: Separate lists
    const mainBoutsForCalc = loadedBouts.filter(b => b.card_type === 'main');
    const undercardBoutsForCalc = loadedBouts.filter(b => b.card_type === 'undercard');

    // Step B: Sort both lists DESCENDING by order_index (Bottom to Top)
    // Assuming order_index 0 is Top and order_index N is Bottom
    mainBoutsForCalc.sort((a, b) => (b.order_index ?? 0) - (a.order_index ?? 0));
    undercardBoutsForCalc.sort((a, b) => (b.order_index ?? 0) - (a.order_index ?? 0));

    // Step C: Combine (Undercard first, then Main)
    const calculationOrder = [...undercardBoutsForCalc, ...mainBoutsForCalc];

    const updates = [];
    // Step D: Assign Sequence Numbers
    for (let i = 0; i < calculationOrder.length; i++) {
      const correctSeq = i + 1; // 1, 2, 3...
      const bout = calculationOrder[i];
      
      // Find the actual bout object in our main list to update it
      const originalBout = loadedBouts.find(b => b.id === bout.id);

      if (originalBout && originalBout.sequence_number !== correctSeq) {
        updates.push({ id: originalBout.id, sequence_number: correctSeq });
        originalBout.sequence_number = correctSeq; // Update local state immediately
      }
    }

    if (updates.length > 0) {
      console.log("Auto-correcting sequence numbers...", updates);
      Promise.all(
        updates.map(u => 
          supabase.from('event_bouts').update({ sequence_number: u.sequence_number }).eq('id', u.id)
        )
      ).catch(err => console.error("Auto-fix sequence error:", err));
    }

    // Update state. loadedBouts is still sorted by 'order_index' ASC (Visual Top-to-Bottom)
    // so the display remains stable.
    setBouts(loadedBouts);
    // --- AUTO-FIX SEQUENCE LOGIC END ---

    // 3. Load fighter profiles
    const fighterIds = Array.from(
      new Set(
        loadedBouts
          .flatMap((b) => [b.red_fighter_id, b.blue_fighter_id])
          .filter((id): id is string => !!id)
      )
    );

    if (fighterIds.length > 0) {
      const { data: fightersData, error: fightersError } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, country, social_links")
        .in("id", fighterIds);

      if (fightersError) {
        console.error("Fighters error", fightersError);
      } else if (fightersData) {
        const fightersMap: Record<string, ProfileLite> = {};
        (fightersData as ProfileLite[]).forEach((f) => {
          fightersMap[f.id] = f;
        });
        setFightersById(fightersMap);
      }
    }

    setLoading(false);
  }

  async function handleToggleLiveBout(boutId: string, isLive: boolean) {
    setUpdating(true);
    setMessage(null);

    try {
      // If making a bout live, first clear all other live bouts
      if (isLive) {
        const { error: clearError } = await supabase
          .from("event_bouts")
          .update({ is_live: false })
          .eq("event_id", eventId)
          .neq("id", boutId);

        if (clearError) {
          console.error("Clear other live bouts error", clearError);
          setMessage("Failed to clear other live bouts: " + clearError.message);
          setUpdating(false);
          return;
        }

        // AUTO-START EVENT: If the event isn't live yet, start it automatically
        if (event && !event.is_live) {
          const { error: eventError } = await supabase
            .from("events")
            .update({ is_live: true, is_started: true })
            .eq("id", eventId);

          if (eventError) {
            console.error("Auto-start event error", eventError);
            // We continue anyway as the bout status is more important
          } else {
            // Notify followers that event is live
            fetch(`/api/events/${eventId}/notify-live`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            }).catch(err => console.error("Notify live error", err));
          }
        }
      }

      // Use API route to update bout and trigger notifications
      const response = await fetch(`/api/bouts/${boutId}/live`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_live: isLive,
          bout_started_at: isLive ? new Date().toISOString() : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setMessage("Failed to update bout: " + (errorData.error || "Unknown error"));
        setUpdating(false);
        return;
      }

      await loadData();
      setUpdating(false);
    } catch (error) {
      console.error("Toggle live bout error", error);
      setMessage("Failed to update bout: " + (error instanceof Error ? error.message : "Unknown error"));
      setUpdating(false);
    }
  }

  async function handleNextFight() {
    setUpdating(true);
    setMessage(null);

    try {
      const currentLive = bouts.find(b => b.is_live);
      if (!currentLive) {
        setMessage("No bout is currently live.");
        return;
      }

      const currentSeq = currentLive.sequence_number;
      if (!currentSeq) {
        setMessage("Current bout has no sequence number.");
        return;
      }

      const nextBout = bouts.find(b => b.sequence_number === currentSeq + 1);
      if (!nextBout) {
        setMessage("This is the last fight in the event.");
        return;
      }

      const { error: currentError } = await supabase
        .from("event_bouts")
        .update({ is_live: false })
        .eq("id", currentLive.id);

      if (currentError) {
        setMessage("Failed to update current fight: " + currentError.message);
        return;
      }

      const { error: nextError } = await supabase
        .from("event_bouts")
        .update({ 
          is_live: true,
          bout_started_at: new Date().toISOString(),
        })
        .eq("id", nextBout.id);

      if (nextError) {
        setMessage("Failed to start next fight: " + nextError.message);
        return;
      }

      // Notify event followers that next fight has started
      try {
        const response = await fetch(`/api/events/${eventId}/notify-bout-started`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            boutId: nextBout.id,
          }),
        });

        if (!response.ok) {
          console.error("Failed to notify followers about next fight");
        }
      } catch (notifError) {
        console.error("Error notifying followers:", notifError);
        // Don't fail the operation if notification fails
      }

      await loadData();
      setMessage(null);

    } catch (error) {
      console.error("Error in handleNextFight:", error);
      setMessage("An error occurred: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setUpdating(false);
    }
  }

  async function handleStartEvent() {
    if (!confirm("Start this event? This will mark the event as live and start with the first bout.")) {
      return;
    }

    setUpdating(true);
    setMessage(null);

    try {
      // Find the first bout (sequence_number = 1)
      const firstBout = bouts.find(b => b.sequence_number === 1);

      if (!firstBout) {
        setMessage("No bouts found to start. Please add bouts to the event first.");
        setUpdating(false);
        return;
      }

      // Mark event as live
      const { error: eventError } = await supabase
        .from("events")
        .update({ is_live: true, is_started: true })
        .eq("id", eventId);

      if (eventError) {
        setMessage("Failed to start event: " + eventError.message);
        setUpdating(false);
        return;
      }

      // Mark the first bout as live
      const { error: boutError } = await supabase
        .from("event_bouts")
        .update({ is_live: true, bout_started_at: new Date().toISOString() })
        .eq("id", firstBout.id);

      if (boutError) {
        setMessage("Failed to start first bout: " + boutError.message);
        setUpdating(false);
        return;
      }

      // Notify followers that event is live
      try {
        await fetch(`/api/events/${eventId}/notify-live`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
      } catch (notifError) {
        console.error("Error notifying followers:", notifError);
      }

      // Notify about first bout starting
      try {
        await fetch(`/api/events/${eventId}/notify-bout-started`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ boutId: firstBout.id }),
        });
      } catch (notifError) {
        console.error("Error notifying bout start:", notifError);
      }

      await loadData();
      setMessage(null);
    } catch (error) {
      console.error("Error starting event:", error);
      setMessage("An error occurred: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setUpdating(false);
    }
  }

  async function handleEndLiveEvent() {
    if (!confirm("Are you sure you want to end the live event? This will mark the event as no longer live and stop all live bouts.")) {
      return;
    }

    setUpdating(true);
    setMessage(null);

    try {
      // Set all bouts to not live
      const { error: boutsError } = await supabase
        .from("event_bouts")
        .update({ is_live: false })
        .eq("event_id", eventId);

      if (boutsError) {
        setMessage("Failed to end live bouts: " + boutsError.message);
        setUpdating(false);
        return;
      }

      // Set event to not live
      const { error: eventError } = await supabase
        .from("events")
        .update({ is_live: false })
        .eq("id", eventId);

      if (eventError) {
        setMessage("Failed to end live event: " + eventError.message);
        setUpdating(false);
        return;
      }

      // Reload data and redirect to event page
      await loadData();
      router.push(`/events/${eventId}`);
      router.refresh();
    } catch (error) {
      console.error("Error ending live event:", error);
      setMessage("An error occurred: " + (error instanceof Error ? error.message : String(error)));
      setUpdating(false);
    }
  }

  async function handleUpdateResult(
    boutId: string,
    winnerSide: "red" | "blue" | "draw" | null,
    method: string,
    round: string,
    time: string
  ) {
    setUpdating(true);
    setMessage(null);

    const updates: any = {};
    if (winnerSide) updates.winner_side = winnerSide;
    if (method) updates.result_method = method;
    if (round) updates.result_round = round;
    if (time) updates.result_time = time;

    // Get bout data including previous result for record update
    const { data: boutData } = await supabase
      .from("event_bouts")
      .select("red_fighter_id, blue_fighter_id, red_name, blue_name, winner_side")
      .eq("id", boutId)
      .single();

    const previousWinner = (boutData?.winner_side || null) as Winner;

    const { error } = await supabase
      .from("event_bouts")
      .update(updates)
      .eq("id", boutId);

    if (error) {
      console.error("Update result error", error);
      setMessage("Failed to update result: " + error.message);
      setUpdating(false);
      return;
    }

    // Update fighter records if result changed
    const newWinner = (winnerSide || null) as Winner;

    if (boutData && newWinner !== previousWinner) {
      // Update red corner fighter's record using API route (bypasses RLS)
      if (boutData.red_fighter_id) {
        try {
          const response = await fetch("/api/fighters/update-record", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fighterId: boutData.red_fighter_id,
            }),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            console.error("Failed to update red corner record:", errorData);
          }
        } catch (redErr) {
          console.error("Error updating red corner record:", redErr);
        }
      }

      // Update blue corner fighter's record using API route (bypasses RLS)
      if (boutData.blue_fighter_id) {
        try {
          const response = await fetch("/api/fighters/update-record", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fighterId: boutData.blue_fighter_id,
            }),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            console.error("Failed to update blue corner record:", errorData);
          }
        } catch (blueErr) {
          console.error("Error updating blue corner record:", blueErr);
        }
      }
    }

    // Notify followers if a result was saved
    if (winnerSide && winnerSide !== "draw") {
      try {
        let winnerName = "Winner";
        let cornerText = "";

        if (boutData) {
          if (winnerSide === "red") {
            if (boutData.red_fighter_id) {
              const fighter = fightersById[boutData.red_fighter_id];
              winnerName = fighter?.full_name || fighter?.username || "Red corner";
            } else {
              winnerName = boutData.red_name || "Red corner";
            }
            cornerText = "Red corner";
          } else if (winnerSide === "blue") {
            if (boutData.blue_fighter_id) {
              const fighter = fightersById[boutData.blue_fighter_id];
              winnerName = fighter?.full_name || fighter?.username || "Blue corner";
            } else {
              winnerName = boutData.blue_name || "Blue corner";
            }
            cornerText = "Blue corner";
          }
        }

        const roundInt = round.trim() === "" ? null : parseInt(round, 10) || null;

        const response = await fetch(`/api/events/${eventId}/notify-bout-result`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bout_id: boutId,
            winner_side: winnerSide,
            winner_name: winnerName,
            corner_text: cornerText,
            method: method || null,
            round: roundInt,
            time: time || null,
          }),
        });

        if (!response.ok) {
          console.error("Failed to notify followers about bout result");
        }
      } catch (notifError) {
        console.error("Error notifying followers about bout result:", notifError);
        // Don't fail the save if notification fails
      }
    } else if (winnerSide === "draw") {
      // Notify about draw
      try {
        const roundInt = round.trim() === "" ? null : parseInt(round, 10) || null;

        const response = await fetch(`/api/events/${eventId}/notify-bout-result`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bout_id: boutId,
            winner_side: "draw",
            winner_name: "Draw",
            corner_text: "",
            method: method || null,
            round: roundInt,
            time: time || null,
          }),
        });

        if (!response.ok) {
          console.error("Failed to notify followers about bout result");
        }
      } catch (notifError) {
        console.error("Error notifying followers about bout result:", notifError);
        // Don't fail the save if notification fails
      }
    }

    await loadData();
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <p className="text-sm sm:text-base text-slate-600">Loading live event...</p>
      </div>
    );
  }

  if (!event || !canEdit) {
    return (
      <div className="max-w-6xl mx-auto">
        <p className="text-sm sm:text-base text-slate-600">Event not found or you don&apos;t have permission.</p>
        <Link href={`/events/${eventId}`} className="text-purple-700 hover:underline mt-3 inline-block text-sm sm:text-base">
          Back to event
        </Link>
      </div>
    );
  }

  const title = event.title || event.name || "Untitled event";
  const currentLiveBout = bouts.find((b) => b.is_live);
  
  // Find Next Bout using sequence numbers
  const getNextBout = () => {
    if (!currentLiveBout || !currentLiveBout.sequence_number) {
      return null;
    }
    return bouts.find(b => b.sequence_number === (currentLiveBout.sequence_number || 0) + 1);
  };
  
  const nextBout = getNextBout();

  // VISUAL DISPLAY LOGIC
  // We strictly sort by order_index ASC (Top to Bottom) for display
  const mainBouts = bouts
    .filter(b => b.card_type === "main" && !b.is_live)
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    
  const undercardBouts = bouts
    .filter(b => b.card_type === "undercard" && !b.is_live)
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{title} - Live Control</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-2">
            Manage your live event and update bout results in real-time
          </p>
        </div>
        <Link
          href={`/events/${eventId}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors whitespace-nowrap self-start sm:self-auto"
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
          <span>Back to event</span>
        </Link>
      </div>

      {message && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </div>
      )}

      {/* Event not started - Show Start Event button */}
      {!event.is_live && (
        <div className="rounded-xl border-2 border-purple-200 bg-purple-50/50 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-purple-900">Event Not Started</h2>
              <p className="text-sm text-purple-700 mt-1">
                Click &quot;Start Event&quot; to begin. This will mark the event as live and start with the first bout in the sequence.
              </p>
            </div>
            <button
              onClick={handleStartEvent}
              disabled={updating || bouts.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {updating ? (
                "Starting..."
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  Start Event
                </>
              )}
            </button>
          </div>
          {bouts.length === 0 && (
            <p className="text-xs text-amber-700 mt-3">
              ⚠️ No bouts found. Please add bouts to the event before starting.
            </p>
          )}
        </div>
      )}

      {/* Live Event Controls - Show at top if event is live */}
      {event.is_live && (
        <div className="card p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-3 w-3 rounded-full bg-red-600 animate-pulse"></div>
              <span className="text-sm font-semibold text-red-900">
                {currentLiveBout 
                  ? `Currently Live: Bout ${currentLiveBout.sequence_number || 'N/A'}`
                  : "Event is live"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {currentLiveBout && (
                <button
                  onClick={handleNextFight}
                  disabled={updating || !nextBout}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-red-700 hover:shadow-md disabled:opacity-60"
                >
                  {updating ? "Updating..." : "Next Fight →"}
                </button>
              )}
              <button
                onClick={handleEndLiveEvent}
                disabled={updating}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-700 hover:shadow-md disabled:opacity-60"
              >
                {updating ? "Ending..." : "End Live Event"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALL BOUTS */}
      <section className="card p-6">
        <div className="flex items-center justify-between text-sm text-slate-600 mb-4">
          <div className="font-semibold">Red corner</div>
          <div className="text-xs uppercase tracking-wide text-slate-400">
            VS
          </div>
          <div className="font-semibold text-right">Blue corner</div>
        </div>

        {mainBouts.length > 0 && (
          <div className="mt-4">
            <h2 className="text-base sm:text-lg font-bold mb-4">Main card</h2>
            <div className="space-y-4">
              {mainBouts.map((bout) => (
                <BoutCard
                  key={bout.id}
                  bout={bout}
                  label="MAIN CARD"
                  fightersById={fightersById}
                  onUpdateResult={handleUpdateResult}
                  onToggleLive={(isLive) => handleToggleLiveBout(bout.id, isLive)}
                  isLive={bout.id === currentLiveBout?.id}
                  isNext={nextBout?.id === bout.id}
                  showSequenceNumber={true}
                />
              ))}
            </div>
          </div>
        )}

        {undercardBouts.length > 0 && (
          <div className={mainBouts.length > 0 ? "mt-8" : "mt-4"}>
            <h2 className="text-base sm:text-lg font-bold mb-4">Undercard</h2>
            <div className="space-y-4">
              {undercardBouts.map((bout) => (
                <BoutCard
                  key={bout.id}
                  bout={bout}
                  label="UNDERCARD"
                  fightersById={fightersById}
                  onUpdateResult={handleUpdateResult}
                  onToggleLive={(isLive) => handleToggleLiveBout(bout.id, isLive)}
                  isLive={bout.id === currentLiveBout?.id}
                  isNext={nextBout?.id === bout.id}
                  showSequenceNumber={true}
                />
              ))}
            </div>
          </div>
        )}
       
        {bouts.length === 0 && (
          <p className="text-sm text-slate-600 mt-2">
            No bouts added yet.
          </p>
        )}
      </section>
    </div>
  );
}

function BoutCard({
  bout,
  label,
  fightersById,
  onUpdateResult,
  onToggleLive,
  isLive,
  isNext = false,
  showSequenceNumber = false,
}: {
  bout: Bout;
  label?: string;
  fightersById: Record<string, ProfileLite>;
  onUpdateResult: (
    boutId: string,
    winnerSide: "red" | "blue" | "draw" | null,
    method: string,
    round: string,
    time: string
  ) => void;
  onToggleLive: (isLive: boolean) => void;
  isLive: boolean;
  isNext?: boolean;
  showSequenceNumber?: boolean;
}) {
  const [showResultForm, setShowResultForm] = useState(false);
  const [winnerSide, setWinnerSide] = useState<"red" | "blue" | "draw" | "">(
    (bout.winner_side as "red" | "blue" | "draw") || ""
  );
  const [method, setMethod] = useState(bout.result_method || "");
  const [round, setRound] = useState(bout.result_round || "");
  const [time, setTime] = useState(bout.result_time || "");

  const redFighter = bout.red_fighter_id ? fightersById[bout.red_fighter_id] : undefined;
  const blueFighter = bout.blue_fighter_id ? fightersById[bout.blue_fighter_id] : undefined;

  const redNameBase = redFighter
    ? redFighter.full_name || redFighter.username || "Fighter"
    : bout.red_name || "TBC";
  const blueNameBase = blueFighter
    ? blueFighter.full_name || blueFighter.username || "Fighter"
    : bout.blue_name || "TBC";

  const redGymHandle = redFighter?.social_links?.gym_username || "";
  const blueGymHandle = blueFighter?.social_links?.gym_username || "";
  const redFlagUrl = countryToFlagUrl(redFighter?.country);
  const blueFlagUrl = countryToFlagUrl(blueFighter?.country);

  const redCountry = redFighter?.country || "";
  const blueCountry = blueFighter?.country || "";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onUpdateResult(
      bout.id,
      winnerSide || null,
      method,
      round,
      time
    );
    setShowResultForm(false);
  }

  // Use provided label or default based on card type
  const displayLabel = label || (bout.card_type === "main" ? "MAIN CARD" : "UNDERCARD");

  return (
    <div
      className={`rounded-xl border p-5 sm:p-6 relative ${
        isLive
          ? "border-red-500 bg-red-50/30 shadow-lg"
          : bout.winner_side
          ? "border-green-200 bg-green-50/30"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      {isLive && (
        <div className="absolute top-2 right-2 z-10">
          <div className="bg-red-600 text-white px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 shadow-lg animate-pulse">
            <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-white"></span>
            </span>
            LIVE
          </div>
        </div>
      )}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <span className="font-semibold text-slate-900 text-sm sm:text-base">
            {displayLabel}
          </span>
          {showSequenceNumber && bout.sequence_number && (
            <span className="text-xs font-mono text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
              #{bout.sequence_number}
            </span>
          )}
          {isNext && !isLive && (
            <div className="flex items-center gap-2">
              <div className="flex h-2 w-2 rounded-full bg-blue-600"></div>
              <span className="text-xs font-semibold text-blue-700">NEXT FIGHT</span>
            </div>
          )}
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-slate-700 self-start sm:self-auto">
          <input
            type="checkbox"
            className="h-5 w-5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
            checked={isLive}
            onChange={(e) => onToggleLive(e.target.checked)}
          />
          <span className="font-medium">Mark as live</span>
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto,1fr] gap-5 sm:gap-6 items-center">
        {/* RED CORNER */}
        <div className="flex justify-center">
          {(redFighter || bout.red_name) ? (
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex items-center gap-1.5">
                  {redFlagUrl && (
                    <Image
                      src={redFlagUrl}
                      alt={redCountry || "Country flag"}
                      width={20}
                      height={16}
                      className="w-5 h-4 object-cover rounded"
                      style={{ imageRendering: "crisp-edges" }}
                    />
                  )}
                  <div className="h-12 w-12 rounded-xl bg-slate-200 overflow-hidden">
                    {redFighter?.avatar_url && (
                      <Image
                        src={redFighter.avatar_url}
                        alt={redNameBase}
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                </div>
                {redCountry && (
                  <span className="text-xs text-slate-500">{redCountry}</span>
                )}
              </div>

              <div className="flex flex-col items-start">
                <span className="font-semibold text-sm sm:text-base leading-tight">
                  {redNameBase}
                </span>
                {redGymHandle && (
                  <Link
                    href={`/profile/${redGymHandle}`}
                    className="text-xs text-purple-700 hover:underline"
                  >
                    Gym: @{redGymHandle}
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <span className="text-sm text-slate-500">TBC</span>
          )}
        </div>

        {/* MIDDLE */}
        <div className="flex flex-col items-center text-center text-sm text-slate-600 px-3 sm:px-5 order-first sm:order-none mb-3 sm:mb-0">
          <div className="font-medium">{bout.weight || "Weight TBC"}</div>
          <div className="mt-1">{bout.bout_details || "Details TBC"}</div>
          {bout.winner_side && (
            <div className="mt-2 text-green-700 font-semibold">
              {bout.winner_side === "red"
                ? `${redNameBase} won`
                : bout.winner_side === "blue"
                ? `${blueNameBase} won`
                : "Draw"}
              {bout.result_method && ` by ${bout.result_method}`}
              {bout.result_round && ` (R${bout.result_round}`}
              {bout.result_time && ` @ ${bout.result_time})`}
            </div>
          )}
        </div>

        {/* BLUE CORNER */}
        <div className="flex justify-center">
          {(blueFighter || bout.blue_name) ? (
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex items-center gap-1.5">
                  {blueFlagUrl && (
                    <Image
                      src={blueFlagUrl}
                      alt={blueCountry || "Country flag"}
                      width={20}
                      height={16}
                      className="w-5 h-4 object-cover rounded"
                      style={{ imageRendering: "crisp-edges" }}
                    />
                  )}
                  <div className="h-12 w-12 rounded-xl bg-slate-200 overflow-hidden">
                    {blueFighter?.avatar_url && (
                      <Image
                        src={blueFighter.avatar_url}
                        alt={blueNameBase}
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                </div>
                {blueCountry && (
                  <span className="text-xs text-slate-500">{blueCountry}</span>
                )}
              </div>

              <div className="flex flex-col items-start">
                <span className="font-semibold text-sm sm:text-base leading-tight">
                  {blueNameBase}
                </span>
                {blueGymHandle && (
                  <Link
                    href={`/profile/${blueGymHandle}`}
                    className="text-xs text-purple-700 hover:underline"
                  >
                    Gym: @{blueGymHandle}
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <span className="text-sm text-slate-500">TBC</span>
          )}
        </div>
      </div>

      {/* RESULT FORM */}
      {!showResultForm && !bout.winner_side && (
        <div className="mt-5 pt-5 border-t border-slate-200">
          <button
            onClick={() => setShowResultForm(true)}
            className="text-base text-purple-700 hover:underline"
          >
            + Add Result
          </button>
        </div>
      )}

      {showResultForm && (
        <form onSubmit={handleSubmit} className="mt-5 pt-5 border-t border-slate-200 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-600 block mb-2">Winner</label>
              <select
                value={winnerSide}
                onChange={(e) => setWinnerSide(e.target.value as "red" | "blue" | "draw" | "")}
                className="w-full rounded-lg border px-4 py-2.5 text-sm"
              >
                <option value="">Select winner</option>
                <option value="red">{redNameBase}</option>
                <option value="blue">{blueNameBase}</option>
                <option value="draw">Draw / No Contest</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-600 block mb-2">Method</label>
              <input
                type="text"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                placeholder="e.g. KO, Decision"
                className="w-full rounded-lg border px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-slate-600 block mb-2">Round</label>
              <input
                type="text"
                value={round}
                onChange={(e) => setRound(e.target.value)}
                placeholder="e.g. 3"
                className="w-full rounded-lg border px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-slate-600 block mb-2">Time</label>
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="e.g. 2:30"
                className="w-full rounded-lg border px-4 py-2.5 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-purple-700"
            >
              Save Result
            </button>
            <button
              type="button"
              onClick={() => {
                setShowResultForm(false);
                setWinnerSide((bout.winner_side as "red" | "blue" | "draw") || "");
                setMethod(bout.result_method || "");
                setRound(bout.result_round || "");
                setTime(bout.result_time || "");
              }}
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}