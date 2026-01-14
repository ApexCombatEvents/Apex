"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type Props = {
  boutId: string;
  side: "red" | "blue";
};

type FighterOption = {
  id: string;
  username: string | null;
  full_name: string | null;
  role: string;
};

export default function CoachGymBoutOfferButton({ boutId, side }: Props) {
  const supabase = createSupabaseBrowser();

  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showChooser, setShowChooser] = useState(false);

  const [coachGymId, setCoachGymId] = useState<string | null>(null);
  const [linkedFighters, setLinkedFighters] = useState<FighterOption[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FighterOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedFighterId, setSelectedFighterId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError(null);

      // 1) current user
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user ?? null;
      if (!user) {
        if (!cancelled) {
          setAvailable(false);
          setLoading(false);
        }
        return;
      }

      // 2) load profile (for role + gym username)
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, role, username, social_links")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        if (!cancelled) {
          console.error("CoachGymBoutOfferButton profile error", profileError);
          setAvailable(false);
          setLoading(false);
        }
        return;
      }

      const roleLower = (profile.role || "").toLowerCase();
      if (roleLower !== "coach" && roleLower !== "gym") {
        if (!cancelled) {
          setAvailable(false);
          setLoading(false);
        }
        return;
      }

      // 3) Work out the gym username
      let gymUsername: string | null = null;
      if (roleLower === "gym") {
        gymUsername = profile.username ?? null;
      } else if (roleLower === "coach") {
        const social = (profile as any).social_links || {};
        gymUsername = social.gym_username || null;
      }

      // 4) Load linked fighters if gym username exists
      const linked: FighterOption[] = [];
      if (gymUsername) {
        const { data: fightersData, error: fightersError } = await supabase
          .from("profiles")
          .select("id, full_name, username, role")
          .or("role.eq.fighter,role.eq.FIGHTER")
          .contains("social_links", { gym_username: gymUsername });

        if (!fightersError && fightersData) {
          linked.push(...(fightersData as FighterOption[]));
        }
      }

      if (!cancelled) {
        setCoachGymId(profile.id);
        setLinkedFighters(linked);
        setAvailable(true);
        setLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boutId, side]);

  async function searchFighters(query: string) {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      // Search for fighters by username or full_name
      // First filter by role (fighter), then search by name
      let profileQuery = supabase
        .from("profiles")
        .select("id, username, full_name, role")
        .or("role.eq.fighter,role.eq.FIGHTER");
      
      if (query.trim()) {
        profileQuery = profileQuery.or(`username.ilike.%${query}%,full_name.ilike.%${query}%`);
      }
      
      const { data: profiles, error } = await profileQuery.limit(10);

      if (error) {
        console.error("Search error", error);
        setSearchResults([]);
      } else {
        const results: FighterOption[] = (profiles || []).map((p) => ({
          id: p.id,
          username: p.username,
          full_name: p.full_name,
          role: p.role || "",
        }));
        setSearchResults(results);
      }
    } catch (err) {
      console.error("Search error", err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function handleSend() {
    if (!coachGymId || !selectedFighterId) {
      setError("Please select a fighter");
      return;
    }

    setSending(true);
    setError(null);

    try {
      // 1) Get or create message thread
      const { data: existingThread } = await supabase
        .from("message_threads")
        .select("id")
        .or(
          `and(profile_a.eq.${coachGymId},profile_b.eq.${selectedFighterId}),and(profile_a.eq.${selectedFighterId},profile_b.eq.${coachGymId})`
        )
        .maybeSingle();

      let threadId: string;
      if (existingThread) {
        threadId = existingThread.id;
      } else {
        // Create new thread
        const { data: newThread, error: threadError } = await supabase
          .from("message_threads")
          .insert({
            profile_a: coachGymId,
            profile_b: selectedFighterId,
          })
          .select("id")
          .single();

        if (threadError || !newThread) {
          console.error("CoachGymBoutOfferButton thread creation error", threadError);
          setError("Could not create conversation");
          setSending(false);
          return;
        }
        threadId = newThread.id;
      }

      // 2) Get bout details for the message
      const { data: bout } = await supabase
        .from("event_bouts")
        .select("id, event_id, card_type, order_index, weight, bout_details, red_name, blue_name, red_fighter_id, blue_fighter_id")
        .eq("id", boutId)
        .single();

      const { data: event } = bout?.event_id
        ? await supabase
            .from("events")
            .select("id, name, title, event_date")
            .eq("id", bout.event_id)
            .single()
        : { data: null };

      // Get fighter name if assigned
      let cornerName = "";
      if (side === "red" && bout?.red_fighter_id) {
        const { data: fighter } = await supabase
          .from("profiles")
          .select("full_name, username")
          .eq("id", bout.red_fighter_id)
          .single();
        cornerName = fighter?.full_name || fighter?.username || "";
      } else if (side === "blue" && bout?.blue_fighter_id) {
        const { data: fighter } = await supabase
          .from("profiles")
          .select("full_name, username")
          .eq("id", bout.blue_fighter_id)
          .single();
        cornerName = fighter?.full_name || fighter?.username || "";
      } else if (side === "red" && bout?.red_name) {
        cornerName = bout.red_name;
      } else if (side === "blue" && bout?.blue_name) {
        cornerName = bout.blue_name;
      }

      // 3) Create message with bout offer
      let boutLabel = "Bout";
      if (bout) {
        const cardType = bout.card_type === "main" ? "MAIN CARD" : "UNDERCARD";
        const fightNum = bout.order_index != null ? bout.order_index + 1 : 1;
        boutLabel = `${cardType} • FIGHT ${fightNum}`;
      }

      const cornerInfo = cornerName ? `${side.toUpperCase()} Corner: ${cornerName}` : `${side.toUpperCase()} Corner: Looking for opponent`;
      const boutDetails = bout?.bout_details || bout?.weight || "Bout details TBC";
      
      const eventName = event?.title || event?.name || "Event";
      
      // Store structured data in message for easy parsing
      const messageBody = `🥊 Bout Offer\n\n${boutLabel}\n${cornerInfo}\n${boutDetails}\n\nEvent: ${eventName}${bout?.event_id ? `\nEvent ID: ${bout.event_id}` : ""}\nBout ID: ${boutId}`;

      const { error: messageError } = await supabase
        .from("chat_messages")
        .insert({
          thread_id: threadId,
          sender_profile_id: coachGymId,
          body: messageBody,
        });

      if (messageError) {
        console.error("CoachGymBoutOfferButton message error", messageError);
        setError("Could not send bout offer");
        setSending(false);
        return;
      }

      // 4) Create notification for fighter
      const selectedFighter = [...linkedFighters, ...searchResults].find((f) => f.id === selectedFighterId);
      const { data: coachGymProfile } = await supabase
        .from("profiles")
        .select("full_name, username")
        .eq("id", coachGymId)
        .single();

      const coachGymName =
        coachGymProfile?.full_name || coachGymProfile?.username || "A coach/gym";

      await supabase.from("notifications").insert({
        profile_id: selectedFighterId,
        type: "bout_offer",
        actor_profile_id: coachGymId,
        data: {
          bout_id: boutId,
          side,
          thread_id: threadId,
          coach_gym_name: coachGymName,
          coach_gym_username: coachGymProfile?.username,
        },
      });

      setSent(true);
      setShowChooser(false);
      setSearchQuery("");
      setSearchResults([]);
    } catch (err: any) {
      console.error("CoachGymBoutOfferButton error", err);
      setError(err.message || "Something went wrong");
    }

    setSending(false);
  }

  if (loading || !available) {
    return null;
  }

  const allFighters = [...linkedFighters, ...searchResults.filter(
    (r) => !linkedFighters.some((f) => f.id === r.id)
  )];

  if (showChooser) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="bg-white border border-purple-200 rounded-lg p-3 shadow-sm min-w-[280px] max-w-sm">
          <p className="text-[10px] text-slate-600 mb-2 text-center font-medium">
            Send bout offer to:
          </p>
          
          {/* Search input */}
          <div className="mb-3">
            <input
              type="text"
              placeholder="Search fighters..."
              value={searchQuery}
              onChange={(e) => {
                const query = e.target.value;
                setSearchQuery(query);
                searchFighters(query);
              }}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {/* Options list */}
          <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto">
            {allFighters.length === 0 && !searching && (
              <p className="text-[10px] text-slate-500 text-center py-2">
                {searchQuery ? "No results found" : "No fighters available"}
              </p>
            )}
            {searching && (
              <p className="text-[10px] text-slate-500 text-center py-2">Searching...</p>
            )}
            {allFighters.map((fighter) => (
              <button
                key={fighter.id}
                type="button"
                onClick={() => {
                  setSelectedFighterId(fighter.id);
                }}
                className={`text-[11px] px-3 py-1.5 rounded border text-left ${
                  selectedFighterId === fighter.id
                    ? "bg-purple-50 border-purple-300 text-purple-700"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="font-medium">
                  {fighter.full_name || fighter.username || "Fighter"}
                </div>
                {fighter.username && (
                  <div className="text-[10px] text-slate-500">@{fighter.username}</div>
                )}
              </button>
            ))}
          </div>
        </div>
        
        {selectedFighterId && (
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              disabled={sending || sent}
              onClick={handleSend}
              className={`rounded-full px-3 py-1 text-[11px] font-medium ${
                sent
                  ? "bg-slate-100 text-slate-500 border border-slate-200"
                  : "bg-white text-purple-700 border border-purple-200 hover:bg-purple-50"
              } disabled:opacity-70`}
            >
              {sent
                ? "Sent"
                : sending
                ? "Sending…"
                : "Send Offer"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowChooser(false);
                setSearchQuery("");
                setSearchResults([]);
                setSelectedFighterId(null);
              }}
              className="text-[10px] text-slate-500 hover:text-slate-700 hover:underline"
            >
              Cancel
            </button>
          </div>
        )}
        {error && (
          <span className="text-[10px] text-red-500 text-center max-w-xs">{error}</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        disabled={sending || sent}
        onClick={() => {
          setShowChooser(true);
        }}
        className={`rounded-full px-3 py-1 text-[11px] font-medium ${
          sent
            ? "bg-slate-100 text-slate-500 border border-slate-200"
            : "bg-white text-purple-700 border border-purple-200 hover:bg-purple-50"
        } disabled:opacity-70`}
      >
        {sent
          ? "Offer sent"
          : sending
          ? "Sending…"
          : "Send via message"}
      </button>
      {error && (
        <span className="text-[10px] text-red-500 text-center">{error}</span>
      )}
    </div>
  );
}
