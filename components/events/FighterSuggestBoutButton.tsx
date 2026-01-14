"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type Props = {
  boutId: string;
  side: "red" | "blue";
};

type ProfileRow = {
  id: string;
  role?: string | null;
  username?: string | null;
  social_links?: {
    gym_username?: string;
    coach_username?: string;
    [key: string]: any;
  } | null;
};

type CoachGymOption = {
  id: string;
  username: string | null;
  full_name: string | null;
  role: string;
  type: "coach" | "gym";
};

export default function FighterSuggestBoutButton({ boutId, side }: Props) {
  const supabase = createSupabaseBrowser();

  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showChooser, setShowChooser] = useState(false);

  const [fighterId, setFighterId] = useState<string | null>(null);
  const [coachGymOptions, setCoachGymOptions] = useState<CoachGymOption[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CoachGymOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

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

      // 2) load fighter profile (for role)
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, role, username, social_links")
        .eq("id", user.id)
        .single<ProfileRow>();

      if (profileError || !profile) {
        if (!cancelled) {
          console.error("FighterSuggestBoutButton profile error", profileError);
          setAvailable(false);
          setLoading(false);
        }
        return;
      }

      // Check if role is fighter (handle both uppercase and lowercase)
      const roleLower = (profile.role || "").toLowerCase();
      if (roleLower !== "fighter") {
        if (!cancelled) {
          setAvailable(false);
          setLoading(false);
        }
        return;
      }

      // 3) Load linked coach/gym if available (for quick access)
      const gymUsername = profile.social_links?.gym_username || "";
      const coachUsername = profile.social_links?.coach_username || "";
      const options: CoachGymOption[] = [];
      
      if (coachUsername) {
        const { data: coachProfile, error: coachError } = await supabase
          .from("profiles")
          .select("id, username, full_name, role")
          .eq("username", coachUsername)
          .or("role.eq.coach,role.eq.COACH")
          .maybeSingle<{ id: string; username: string | null; full_name: string | null; role: string }>();

        if (!coachError && coachProfile) {
          options.push({
            id: coachProfile.id,
            username: coachProfile.username,
            full_name: coachProfile.full_name,
            role: coachProfile.role,
            type: "coach",
          });
        }
      }

      if (gymUsername) {
        const { data: gymProfile, error: gymError } = await supabase
          .from("profiles")
          .select("id, username, full_name, role")
          .eq("username", gymUsername)
          .or("role.eq.gym,role.eq.GYM")
          .maybeSingle<{ id: string; username: string | null; full_name: string | null; role: string }>();

        if (!gymError && gymProfile) {
          options.push({
            id: gymProfile.id,
            username: gymProfile.username,
            full_name: gymProfile.full_name,
            role: gymProfile.role,
            type: "gym",
          });
        }
      }

      if (!cancelled) {
        setFighterId(profile.id);
        setCoachGymOptions(options);
        // If only one option, auto-select it
        if (options.length === 1) {
          setSelectedRecipientId(options[0].id);
        }
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

  async function searchCoachesGyms(query: string) {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      // Search for coaches and gyms by username or full_name
      // First filter by role (coach or gym), then search by name
      let profileQuery = supabase
        .from("profiles")
        .select("id, username, full_name, role")
        .or("role.eq.coach,role.eq.COACH,role.eq.gym,role.eq.GYM");
      
      if (query.trim()) {
        profileQuery = profileQuery.or(`username.ilike.%${query}%,full_name.ilike.%${query}%`);
      }
      
      const { data: profiles, error } = await profileQuery.limit(10);

      if (error) {
        console.error("Search error", error);
        setSearchResults([]);
      } else {
        const results: CoachGymOption[] = (profiles || []).map((p) => ({
          id: p.id,
          username: p.username,
          full_name: p.full_name,
          role: p.role || "",
          type: (p.role || "").toLowerCase() === "coach" ? "coach" : "gym",
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
    if (!fighterId || !selectedRecipientId) {
      setError("Please select a coach or gym");
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
          `and(profile_a.eq.${fighterId},profile_b.eq.${selectedRecipientId}),and(profile_a.eq.${selectedRecipientId},profile_b.eq.${fighterId})`
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
            profile_a: fighterId,
            profile_b: selectedRecipientId,
          })
          .select("id")
          .single();

        if (threadError || !newThread) {
          console.error("FighterSuggestBoutButton thread creation error", threadError);
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

      // 3) Create message with bout request
      // Format: Bout label, corner info, bout details
      let boutLabel = "Bout";
      if (bout) {
        const cardType = bout.card_type === "main" ? "MAIN CARD" : "UNDERCARD";
        const fightNum = bout.order_index != null ? bout.order_index + 1 : 1;
        boutLabel = `${cardType} • FIGHT ${fightNum}`;
      }

      const cornerInfo = cornerName ? `${side.toUpperCase()} Corner: ${cornerName}` : `${side.toUpperCase()} Corner: Looking for opponent`;
      const boutDetails = bout?.bout_details || bout?.weight || "Bout details TBC";
      
      const eventName = event?.title || event?.name || "Event";
      const eventUrl = bout?.event_id ? `/events/${bout.event_id}` : "";
      
      // Store structured data in message for easy parsing
      const messageBody = `🥊 Bout Request\n\n${boutLabel}\n${cornerInfo}\n${boutDetails}\n\nEvent: ${eventName}${eventUrl ? `\nEvent ID: ${bout?.event_id}` : ""}\nBout ID: ${boutId}`;

      const { error: messageError } = await supabase
        .from("chat_messages")
        .insert({
          thread_id: threadId,
          sender_profile_id: fighterId,
          body: messageBody,
        });

      if (messageError) {
        console.error("FighterSuggestBoutButton message error", messageError);
        setError("Could not send bout request");
        setSending(false);
        return;
      }

      // 4) Create notification for coach/gym
      // Find recipient in both linked options and search results
      const allOptionsList = [...coachGymOptions, ...searchResults.filter(
        (r) => !coachGymOptions.some((o) => o.id === r.id)
      )];
      const recipientProfile = allOptionsList.find((o) => o.id === selectedRecipientId);
      
      const { data: fighterProfile } = await supabase
        .from("profiles")
        .select("full_name, username")
        .eq("id", fighterId)
        .single();

      const fighterName =
        fighterProfile?.full_name || fighterProfile?.username || "A fighter";

      await supabase.from("notifications").insert({
        profile_id: selectedRecipientId,
        type: "bout_request",
        actor_profile_id: fighterId,
        data: {
          bout_id: boutId,
          side,
          thread_id: threadId,
          fighter_name: fighterName,
          fighter_username: fighterProfile?.username,
        },
      });

      setSent(true);
      setShowChooser(false);
    } catch (err: any) {
      console.error("FighterSuggestBoutButton error", err);
      setError(err.message || "Something went wrong");
    }

    setSending(false);
  }

  if (loading || !available) {
    return null;
  }

  const allOptions = [...coachGymOptions, ...searchResults.filter(
    (r) => !coachGymOptions.some((o) => o.id === r.id)
  )];

  if (showChooser || showSearch) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="bg-white border border-purple-200 rounded-lg p-3 shadow-sm min-w-[280px] max-w-sm">
          <p className="text-[10px] text-slate-600 mb-2 text-center font-medium">
            Send bout request to:
          </p>
          
          {/* Search input */}
          <div className="mb-3">
            <input
              type="text"
              placeholder="Search coaches/gyms..."
              value={searchQuery}
              onChange={(e) => {
                const query = e.target.value;
                setSearchQuery(query);
                searchCoachesGyms(query);
                setShowSearch(true);
              }}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {/* Options list */}
          <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto">
            {allOptions.length === 0 && !searching && (
              <p className="text-[10px] text-slate-500 text-center py-2">
                {searchQuery ? "No results found" : "No coaches/gyms available"}
              </p>
            )}
            {searching && (
              <p className="text-[10px] text-slate-500 text-center py-2">Searching...</p>
            )}
            {allOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setSelectedRecipientId(option.id);
                  setShowChooser(false);
                  setShowSearch(false);
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                className={`text-[11px] px-3 py-1.5 rounded border text-left ${
                  selectedRecipientId === option.id
                    ? "bg-purple-50 border-purple-300 text-purple-700"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {option.full_name || option.username || `@${option.username}`}
                  </span>
                  <span className="text-[10px] text-slate-500 ml-2">
                    ({option.type === "coach" ? "Coach" : "Gym"})
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
        
        {selectedRecipientId && (
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
                : "Send Request"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowChooser(false);
                setShowSearch(false);
                setSearchQuery("");
                setSearchResults([]);
                setSelectedRecipientId(null);
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
          if (coachGymOptions.length > 1) {
            setShowChooser(true);
          } else if (coachGymOptions.length === 1) {
            setSelectedRecipientId(coachGymOptions[0].id);
            handleSend();
          } else {
            // No linked coaches/gyms, show search
            setShowSearch(true);
          }
        }}
        className={`rounded-full px-3 py-1 text-[11px] font-medium ${
          sent
            ? "bg-slate-100 text-slate-500 border border-slate-200"
            : "bg-white text-purple-700 border border-purple-200 hover:bg-purple-50"
        } disabled:opacity-70`}
      >
        {sent
          ? `Sent to ${allOptions.find((o) => o.id === selectedRecipientId)?.type === "coach" ? "coach" : "gym"}`
          : sending
          ? "Sending…"
          : coachGymOptions.length > 1
          ? "Send to coach/gym"
          : coachGymOptions.length === 1
          ? `Send to ${coachGymOptions[0]?.type === "coach" ? "coach" : "gym"}`
          : "Send to coach/gym"}
      </button>
      {error && (
        <span className="text-[10px] text-red-500 text-center">{error}</span>
      )}
    </div>
  );
}
