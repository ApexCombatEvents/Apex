"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type Profile = {
  id: string;
  role?: string | null;
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
};

type SuggestionView = {
  id: string;
  side: "red" | "blue";
  created_at: string;
  fighter: Profile;
  bout: {
    id: string;
    card_type: string | null;
    order_index: number | null;
    weight?: string | null;
    red_name?: string | null;
    blue_name?: string | null;
  };
  event: {
    id: string;
    title: string;
    event_date?: string | null;
    location?: string | null;
  };
};

export default function MyOffersCard() {
  const supabase = createSupabaseBrowser();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<SuggestionView[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setMessage(null);

      // 1) current user + profile
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user ?? null;
      if (!user) {
        if (!cancelled) {
          setProfile(null);
          setSuggestions([]);
          setLoading(false);
        }
        return;
      }

      const { data: profileRow, error: profileError } = await supabase
        .from("profiles")
        .select("id, role, full_name, username, avatar_url")
        .eq("id", user.id)
        .single<Profile>();

      if (profileError || !profileRow) {
        console.error("MyOffersCard profile error", profileError);
        if (!cancelled) {
          setProfile(null);
          setSuggestions([]);
          setLoading(false);
        }
        return;
      }

      // Only for coach / gym - convert to lowercase for comparison (database stores in uppercase)
      const roleLower = (profileRow.role || "").toLowerCase();
      if (roleLower !== "coach" && roleLower !== "gym") {
        if (!cancelled) {
          setProfile(null);
          setSuggestions([]);
          setLoading(false);
        }
        return;
      }

      if (cancelled) return;
      setProfile(profileRow);

      // 2) load suggestions for this gym/coach
      const {
        data: suggestionsData,
        error: suggestionsError,
      } = await supabase
        .from("event_bout_suggestions")
        .select("id, bout_id, side, fighter_profile_id, status, created_at")
        .eq("gym_profile_id", profileRow.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (suggestionsError || !suggestionsData || suggestionsData.length === 0) {
        if (!cancelled) {
          if (suggestionsError) {
            console.error("MyOffersCard suggestions error", suggestionsError);
          }
          setSuggestions([]);
          setLoading(false);
        }
        return;
      }

      const raw = suggestionsData as {
        id: string;
        bout_id: string;
        side: "red" | "blue";
        fighter_profile_id: string;
        created_at: string;
      }[];

      const boutIds = Array.from(new Set(raw.map((r) => r.bout_id)));
      const fighterIds = Array.from(
        new Set(raw.map((r) => r.fighter_profile_id))
      );

      // 3) load bouts
      const { data: boutsData, error: boutsError } = await supabase
        .from("event_bouts")
        .select(
          "id, event_id, card_type, order_index, red_name, blue_name, weight"
        )
        .in("id", boutIds);

      if (boutsError || !boutsData) {
        console.error("MyOffersCard bouts error", boutsError);
        if (!cancelled) {
          setSuggestions([]);
          setLoading(false);
        }
        return;
      }

      const boutsById = Object.fromEntries(
        (boutsData as any[]).map((b) => [b.id, b])
      );

      // 4) load events
      const eventIds = Array.from(
        new Set(
          (boutsData as any[]).map((b) => b.event_id).filter((x: any) => !!x)
        )
      );

      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("id, title, name, event_date, location")
        .in("id", eventIds);

      if (eventsError || !eventsData) {
        console.error("MyOffersCard events error", eventsError);
        if (!cancelled) {
          setSuggestions([]);
          setLoading(false);
        }
        return;
      }

      const eventsById = Object.fromEntries(
        (eventsData as any[]).map((e) => [e.id, e])
      );

      // 5) load fighters
      const { data: fightersData, error: fightersError } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", fighterIds);

      if (fightersError || !fightersData) {
        console.error("MyOffersCard fighters error", fightersError);
        if (!cancelled) {
          setSuggestions([]);
          setLoading(false);
        }
        return;
      }

      const fightersById = Object.fromEntries(
        (fightersData as any[]).map((p) => [p.id, p])
      );

      const views: SuggestionView[] = raw.map((r) => {
        const bout = boutsById[r.bout_id] || {};
        const event = eventsById[bout.event_id] || {};
        const fighter = fightersById[r.fighter_profile_id] || {};

        const eventTitle = event.title || event.name || "Event";

        return {
          id: r.id,
          side: r.side,
          created_at: r.created_at,
          fighter,
          bout: {
            id: r.bout_id,
            card_type: bout.card_type || null,
            order_index: bout.order_index ?? null,
            weight: bout.weight || null,
            red_name: bout.red_name || null,
            blue_name: bout.blue_name || null,
          },
          event: {
            id: event.id,
            title: eventTitle,
            event_date: event.event_date || null,
            location: event.location || null,
          },
        };
      });

      if (!cancelled) {
        setSuggestions(views);
        setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSendOffer(s: SuggestionView) {
    if (!profile) return;

    setMessage(null);

    // 1) create real offer to event organiser
    const { error: offerError } = await supabase
      .from("event_bout_offers")
      .insert({
        bout_id: s.bout.id,
        side: s.side,
        from_profile_id: profile.id,
        fighter_profile_id: s.fighter.id,
        status: "pending",
      });

    if (offerError) {
      console.error("MyOffersCard send offer error", offerError);
      setMessage(offerError.message);
      return;
    }

    // Create notification for event owner
    try {
      const { data: event } = await supabase
        .from("events")
        .select("id, name, title, owner_profile_id, profile_id")
        .eq("id", s.event.id)
        .single();

      if (event) {
        const ownerId = event.owner_profile_id || event.profile_id;
        
        const senderName = profile.full_name || profile.username || "A coach/gym";
        const fighterName = s.fighter.full_name || s.fighter.username || "A fighter";

        await supabase.from("notifications").insert({
          profile_id: ownerId,
          type: "bout_offer",
          actor_profile_id: profile.id,
          data: {
            bout_id: s.bout.id,
            event_id: event.id,
            event_name: event.title || event.name,
            fighter_profile_id: s.fighter.id,
            fighter_name: fighterName,
            from_profile_id: profile.id,
            from_name: senderName,
            side: s.side,
          },
        });
      }
    } catch (notifError) {
      console.error("MyOffersCard notification error", notifError);
      // Don't throw - the offer was sent successfully
    }

    // 2) mark suggestion as converted
    const { error: updateError } = await supabase
      .from("event_bout_suggestions")
      .update({ status: "converted" })
      .eq("id", s.id);

    if (updateError) {
      console.error("MyOffersCard suggestion update error", updateError);
      setMessage(updateError.message);
      return;
    }

    setSuggestions((prev) => prev.filter((x) => x.id !== s.id));
    setMessage("Offer sent to the event organiser.");
  }

  async function handleDismiss(s: SuggestionView) {
    const { error } = await supabase
      .from("event_bout_suggestions")
      .update({ status: "dismissed" })
      .eq("id", s.id);

    if (error) {
      console.error("MyOffersCard dismiss error", error);
      setMessage(error.message);
      return;
    }

    setSuggestions((prev) => prev.filter((x) => x.id !== s.id));
  }

  // Convert role to lowercase for comparison (database stores in uppercase)
  const roleLower = profile?.role ? profile.role.toLowerCase() : "";
  if (!profile || (roleLower !== "coach" && roleLower !== "gym")) {
    return null;
  }

  return (
    <section className="card mt-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold">Bout suggestions from fighters</h2>
        <span className="text-[11px] text-slate-500">
          Only visible to you
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-slate-600">Loading suggestions…</p>
      ) : suggestions.length === 0 ? (
        <p className="text-sm text-slate-600">
          No suggestions yet. When your fighters send you bouts, they&apos;ll
          appear here.
        </p>
      ) : (
        <div className="space-y-3 text-xs">
          {suggestions.map((s) => {
            const dateLabel = s.event.event_date
              ? new Date(s.event.event_date).toLocaleDateString()
              : "Date TBC";

            const sideLabel =
              s.side === "red" ? "Red corner" : "Blue corner";

            const boutLabelParts: string[] = [];
            if (s.bout.card_type === "main") {
              boutLabelParts.push("Main card");
            } else if (s.bout.card_type === "undercard") {
              boutLabelParts.push("Undercard");
            }
            if (s.bout.order_index != null) {
              boutLabelParts.push(`Fight ${s.bout.order_index + 1}`);
            }

            const boutLabel =
              boutLabelParts.length > 0
                ? boutLabelParts.join(" • ")
                : "Bout";

            return (
              <div
                key={s.id}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold text-slate-600">
                      {boutLabel}
                    </span>
                    <Link
                      href={`/events/${s.event.id}`}
                      className="text-sm font-medium text-slate-900 hover:underline"
                    >
                      {s.event.title}
                    </Link>
                    <span className="text-[11px] text-slate-500">
                      {dateLabel}
                      {s.event.location ? ` • ${s.event.location}` : ""}
                    </span>
                  </div>
                </div>

                <div className="mt-1 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-slate-200 overflow-hidden">
                      {s.fighter.avatar_url && (
                        <Image
                          src={s.fighter.avatar_url}
                          alt={s.fighter.full_name || "Fighter"}
                          width={28}
                          height={28}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900">
                        {s.fighter.full_name || s.fighter.username || "Fighter"}
                      </span>
                      {s.fighter.username && (
                        <span className="text-[11px] text-slate-500">
                          @{s.fighter.username} • wants {sideLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {s.bout.weight && (
                      <span className="text-[11px] text-slate-600">
                        {s.bout.weight}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDismiss(s)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-500 hover:bg-slate-50"
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendOffer(s)}
                      className="rounded-full bg-purple-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-purple-700"
                    >
                      Send offer
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {message && (
        <p className="mt-2 text-[11px] text-slate-600 whitespace-pre-line">
          {message}
        </p>
      )}
    </section>
  );
}
