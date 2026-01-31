"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type CardType = "main" | "undercard";

// ---------- Record helpers ----------

type Winner = "red" | "blue" | "draw" | "no_contest" | null;
type Side = "red" | "blue";

type RecordTriple = {
  wins: number;
  losses: number;
  draws: number;
};

function parseRecord(record?: string | null): RecordTriple {
  if (!record) return { wins: 0, losses: 0, draws: 0 };

  // Grab all numbers anywhere in the string: "5-2-1", "5 - 2 - 1",
  // "5-2-1 (pro)" → ["5","2","1"]
  const nums = record.match(/\d+/g);
  if (!nums || nums.length === 0) {
    return { wins: 0, losses: 0, draws: 0 };
  }

  const wins = Number(nums[0] ?? 0) || 0;
  const losses = Number(nums[1] ?? 0) || 0;
  const draws = Number(nums[2] ?? 0) || 0;

  return { wins, losses, draws };
}


function formatRecord(r: RecordTriple): string {
  return `${Math.max(0, r.wins)}-${Math.max(0, r.losses)}-${Math.max(
    0,
    r.draws
  )}`;
}

function diffForSide(
  oldWinner: Winner,
  newWinner: Winner,
  side: Side
): RecordTriple {
  const delta: RecordTriple = { wins: 0, losses: 0, draws: 0 };

  const apply = (winner: Winner, sign: 1 | -1) => {
    if (!winner || winner === "no_contest") return;
    if (winner === "draw") {
      delta.draws += sign;
      return;
    }
    const fighterWon = winner === side;
    if (fighterWon) delta.wins += sign;
    else delta.losses += sign;
  };

  // remove old, add new
  apply(oldWinner, -1);
  apply(newWinner, 1);

  return delta;
}

function applyRecordDelta(
  currentRecord: string | null | undefined,
  delta: RecordTriple
): string {
  const base = parseRecord(currentRecord);
  return formatRecord({
    wins: base.wins + delta.wins,
    losses: base.losses + delta.losses,
    draws: base.draws + delta.draws,
  });
}

// ---------- Types for event / bouts ----------

type EventRow = {
  id: string;
  profile_id: string;
  owner_profile_id?: string | null;
  name?: string | null;
  title?: string | null;
  description?: string | null;
  event_date?: string | null;
  event_time?: string | null;
  location?: string | null;
  martial_art?: string | null;
  banner_url?: string | null;
  is_live?: boolean | null;
  is_started?: boolean | null;
  will_stream?: boolean | null;
  stream_price?: number | null;
  fighter_percentage?: number | null;
  is_featured?: boolean | null;
  featured_until?: string | null;
};

type BoutDb = {
  id: string;
  event_id: string;
  card_type: CardType;
  order_index: number;
  red_name?: string | null;
  blue_name?: string | null;
  weight?: string | null;
  bout_details?: string | null;
  red_looking_for_opponent?: boolean | null;
  blue_looking_for_opponent?: boolean | null;
  red_fighter_id?: string | null;
  blue_fighter_id?: string | null;
  winner_side?: Winner;
  result_method?: string | null;
  result_round?: number | null;
  result_time?: string | null;
  is_live?: boolean | null;
  offer_fee?: number | null;
};

type FighterLite = {
  id: string;
  username?: string | null;
  full_name?: string | null;
};

type BoutForm = {
  id: string; // db id or local id
  isNew: boolean;
  cardType: CardType;
  redHandle: string;
  redName: string;
  blueHandle: string;
  blueName: string;
  weight: string;
  boutDetails: string;
  redLooking: boolean;
  blueLooking: boolean;
  redFighterId: string | null;
  blueFighterId: string | null;

  // Results (UI state)
  winnerSide: "red" | "blue" | "draw" | "no_contest" | "none";
  resultMethod: string;
  resultRound: string;
  resultTime: string;
  isLive: boolean;
  
  // Offer fee (in cents, null = no fee required)
  offerFee: string; // UI uses string for input, will convert to number
};

function createEmptyBout(cardType: CardType): BoutForm {
  return {
    id: crypto.randomUUID(),
    isNew: true,
    cardType,
    redHandle: "",
    redName: "",
    blueHandle: "",
    blueName: "",
    weight: "",
    boutDetails: "",
    redLooking: false,
    blueLooking: false,
    redFighterId: null,
    blueFighterId: null,
    winnerSide: "none",
    resultMethod: "",
    resultRound: "",
    resultTime: "",
    isLive: false,
    offerFee: "",
  };
}

export default function EditEventPage() {
  const supabase = createSupabaseBrowser();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [event, setEvent] = useState<EventRow | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [location, setLocation] = useState("");
  const [martialArt, setMartialArt] = useState("");

  // banner editing
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const [willStream, setWillStream] = useState(false);
  const [streamPrice, setStreamPrice] = useState<string>("");
  const [fighterPercentage, setFighterPercentage] = useState<string>("0");
  
  // Featured status
  const [isFeatured, setIsFeatured] = useState(false);

  const [bouts, setBouts] = useState<BoutForm[]>([]);
  const [originalBoutIds, setOriginalBoutIds] = useState<string[]>([]);

  // Event sponsorships
  type SponsorshipForm = {
    id: string; // temporary ID for new items
    image_url: string;
    link_url: string;
    display_order: number;
    isNew?: boolean; // Track if this needs to be inserted
    existingId?: string; // Track existing ID for updates/deletes
  };
  const [sponsorships, setSponsorships] = useState<SponsorshipForm[]>([]);
  const [uploadingSponsorship, setUploadingSponsorship] = useState<string | null>(null);
  
  // Bout results section collapsed state
  const [boutResultsExpanded, setBoutResultsExpanded] = useState(false);

  const [notAllowed, setNotAllowed] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [featuredLoading, setFeaturedLoading] = useState(false);

  // Handle payment success redirect
  useEffect(() => {
    const featuredSuccess = searchParams.get('featured_success');
    const sessionId = searchParams.get('session_id');
    
    if (featuredSuccess === 'true' && sessionId) {
      // Verify payment with Stripe
      (async () => {
        try {
          const response = await fetch('/api/stripe/verify-featured-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sessionId }),
          });

          const data = await response.json();

          if (response.ok && data.success) {
            if (data.featured) {
              setMessage('✓ Payment successful! Your event is now featured.');
              setIsFeatured(true);
              // Reload event data to get updated featured status from database
              const { data: eventData } = await supabase
                .from("events")
                .select("*")
                .eq("id", eventId)
                .single<EventRow>();
              
              if (eventData) {
                setEvent(eventData);
                const now = new Date();
                const featuredUntil = eventData.featured_until ? new Date(eventData.featured_until) : null;
                const isCurrentlyFeatured = eventData.is_featured === true && (!featuredUntil || featuredUntil > now);
                setIsFeatured(isCurrentlyFeatured);
              } else {
                // If event not loaded yet, reload page to get fresh data
                setTimeout(() => {
                  window.location.reload();
                }, 1000);
              }
            } else {
              setMessage('Payment verified. Featured status will be updated shortly. Please wait a moment...');
              // Check again after a delay
              setTimeout(async () => {
                const retryResponse = await fetch('/api/stripe/verify-featured-payment', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ sessionId }),
                });
                const retryData = await retryResponse.json();
                if (retryData.success && retryData.featured) {
                  setMessage('✓ Payment successful! Your event is now featured.');
                  setIsFeatured(true);
                  // Reload event data to get updated featured status from database
                  const { data: eventData } = await supabase
                    .from("events")
                    .select("*")
                    .eq("id", eventId)
                    .single<EventRow>();
                  
                  if (eventData) {
                    setEvent(eventData);
                    const now = new Date();
                    const featuredUntil = eventData.featured_until ? new Date(eventData.featured_until) : null;
                    const isCurrentlyFeatured = eventData.is_featured === true && (!featuredUntil || featuredUntil > now);
                    setIsFeatured(isCurrentlyFeatured);
                  } else {
                    window.location.reload();
                  }
                } else {
                  // If still not featured, reload page to get fresh data
                  setTimeout(() => window.location.reload(), 2000);
                }
              }, 2000);
            }
          } else {
            setMessage(data.error || 'Payment verification failed. Please refresh the page.');
          }

          // Remove query params
          const url = new URL(window.location.href);
          url.searchParams.delete('featured_success');
          url.searchParams.delete('session_id');
          router.replace(url.pathname + url.search, { scroll: false });
        } catch (err) {
          console.error('Payment verification error:', err);
          setMessage('Payment completed. If featured status doesn\'t update, please refresh the page.');
        }
      })();
    }
  }, [searchParams, eventId, router, supabase]);

  useEffect(() => {
    if (!eventId) return;

    (async () => {
      setLoading(true);
      setMessage(null);

      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        setNotAllowed(true);
        setLoading(false);
        return;
      }
      setUserId(user.id);

      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single<EventRow>();

      if (eventError || !eventData) {
        console.error("Edit event load error", eventError);
        setMessage("Event not found.");
        setLoading(false);
        return;
      }

      const ownerId = eventData.owner_profile_id || eventData.profile_id;
      if (user.id !== ownerId) {
        setNotAllowed(true);
        setLoading(false);
        return;
      }

      setEvent(eventData);
      setTitle(eventData.title || eventData.name || "");
      setDescription(eventData.description || "");
      setEventDate(eventData.event_date || "");
      setEventTime(eventData.event_time || "");
      setLocation(eventData.location || "");
      setMartialArt(eventData.martial_art || "");
      setBannerUrl(eventData.banner_url || null);
      setBannerPreview(eventData.banner_url || null);
      setWillStream(eventData.will_stream || false);
      setStreamPrice(eventData.stream_price ? (eventData.stream_price / 100).toFixed(2) : "");
      setFighterPercentage(eventData.fighter_percentage?.toString() || "0");
      
      // Set event data first
      setEvent(eventData);
      
      // Load featured status (check if still valid)
      const now = new Date();
      const featuredUntil = eventData.featured_until ? new Date(eventData.featured_until) : null;
      const isCurrentlyFeatured = eventData.is_featured === true && (!featuredUntil || featuredUntil > now);
      setIsFeatured(isCurrentlyFeatured);

      // Load bouts
      const { data: boutsData, error: boutsError } = await supabase
        .from("event_bouts")
        .select("*")
        .eq("event_id", eventData.id)
        .order("card_type", { ascending: false })
        .order("order_index", { ascending: true });

      if (boutsError) {
        console.error("Edit event bouts error", boutsError);
        setMessage("Failed to load bouts.");
        setLoading(false);
        return;
      }

      const dbBouts = (boutsData as BoutDb[]) || [];
      const originalIds = dbBouts.map((b) => b.id);

      // Load fighter usernames for existing fighter links
      const fighterIds = Array.from(
        new Set(
          dbBouts
            .flatMap((b) => [b.red_fighter_id, b.blue_fighter_id])
            .filter((id): id is string => !!id)
        )
      );

      let fightersById: Record<string, FighterLite> = {};
      if (fighterIds.length > 0) {
        const { data: fighters, error: fightersError } = await supabase
          .from("profiles")
          .select("id, username, full_name")
          .in("id", fighterIds);

        if (fightersError) {
          console.error("Edit event fighters error", fightersError);
        } else if (fighters) {
          (fighters as FighterLite[]).forEach((f) => {
            fightersById[f.id] = f;
          });
        }
      }

      const mappedBouts: BoutForm[] = dbBouts.map((b) => {
        const redFighter =
          b.red_fighter_id && fightersById[b.red_fighter_id]
            ? fightersById[b.red_fighter_id]
            : undefined;
        const blueFighter =
          b.blue_fighter_id && fightersById[b.blue_fighter_id]
            ? fightersById[b.blue_fighter_id]
            : undefined;

        return {
          id: b.id,
          isNew: false,
          cardType: b.card_type || "main",
          redHandle: redFighter?.username ? `@${redFighter.username}` : "",
          // Load red_name only if there's no profile match (name-only fighter)
          redName: !redFighter ? (b.red_name || "") : "",
          blueHandle: blueFighter?.username ? `@${blueFighter.username}` : "",
          // Load blue_name only if there's no profile match (name-only fighter)
          blueName: !blueFighter ? (b.blue_name || "") : "",
          weight: b.weight || "",
          boutDetails: b.bout_details || "",
          redLooking: !!b.red_looking_for_opponent,
          blueLooking: !!b.blue_looking_for_opponent,
          // Only set fighter IDs if there's actually a profile match
          redFighterId: redFighter?.id || null,
          blueFighterId: blueFighter?.id || null,
          winnerSide: (b.winner_side as Winner | null) || "none",
          resultMethod: b.result_method || "",
          resultRound:
            b.result_round === null || b.result_round === undefined
              ? ""
              : String(b.result_round),
          resultTime: b.result_time || "",
          isLive: !!b.is_live,
          offerFee: b.offer_fee ? (b.offer_fee / 100).toFixed(2) : "",
        };
      });

      setOriginalBoutIds(originalIds);
      setBouts(mappedBouts.length > 0 ? mappedBouts : [createEmptyBout("main")]);
      
      // Load sponsorships
      const { data: sponsorshipsData } = await supabase
        .from("event_sponsorships")
        .select("*")
        .eq("event_id", eventData.id)
        .order("display_order", { ascending: true });
      
      const mappedSponsorships: SponsorshipForm[] = (sponsorshipsData || []).map((s, idx) => ({
        id: `sponsor-${idx}`,
        image_url: s.image_url,
        link_url: s.link_url || "",
        display_order: s.display_order || idx,
        existingId: s.id,
      }));
      
      setSponsorships(mappedSponsorships);
      setLoading(false);
    })();
  }, [supabase, eventId]);

  function updateBout(id: string, patch: Partial<BoutForm>) {
    setBouts((prev) => {
      // If setting a bout to live, ensure all others are not live
      if (patch.isLive === true) {
        return prev.map((b) =>
          b.id === id ? { ...b, ...patch } : { ...b, isLive: false }
        );
      }
      return prev.map((b) => (b.id === id ? { ...b, ...patch } : b));
    });
  }

  function addBout(type: CardType) {
    setBouts((prev) => [...prev, createEmptyBout(type)]);
  }

  function removeBout(id: string) {
    setBouts((prev) => prev.filter((b) => b.id !== id));
  }

  function moveBoutUp(id: string) {
    setBouts((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      if (index <= 0) return prev; // Can't move up if first or not found
      
      const bout = prev[index];
      const previousBout = prev[index - 1];
      
      // Only allow moving within the same card type
      if (bout.cardType !== previousBout.cardType) return prev;
      
      const newBouts = [...prev];
      newBouts[index] = previousBout;
      newBouts[index - 1] = bout;
      return newBouts;
    });
  }

  function moveBoutDown(id: string) {
    setBouts((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      if (index < 0 || index >= prev.length - 1) return prev; // Can't move down if last or not found
      
      const bout = prev[index];
      const nextBout = prev[index + 1];
      
      // Only allow moving within the same card type
      if (bout.cardType !== nextBout.cardType) return prev;
      
      const newBouts = [...prev];
      newBouts[index] = nextBout;
      newBouts[index + 1] = bout;
      return newBouts;
    });
  }

  function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  }

  async function handleAddSponsorship(file: File) {
    if (!userId) return;
    
    const tempId = `temp-${Date.now()}`;
    setUploadingSponsorship(tempId);
    
    try {
      const bucket = "event-banners"; // Reuse event-banners bucket
      const path = `${userId}/sponsorships/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file);

      if (uploadError) {
        console.error("Sponsorship upload error", uploadError);
        setMessage(uploadError.message);
        setUploadingSponsorship(null);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      const newSponsorship: SponsorshipForm = {
        id: tempId,
        image_url: publicUrlData.publicUrl,
        link_url: "",
        display_order: sponsorships.length,
        isNew: true,
      };

      setSponsorships((prev) => [...prev, newSponsorship]);
    } catch (err: any) {
      console.error("Sponsorship upload error", err);
      setMessage(err.message || "Failed to upload sponsorship image");
    } finally {
      setUploadingSponsorship(null);
    }
  }

  function handleRemoveSponsorship(id: string) {
    setSponsorships((prev) => prev.filter((s) => s.id !== id));
  }

  function handleUpdateSponsorship(id: string, updates: Partial<SponsorshipForm>) {
    setSponsorships((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  }

  async function handleDeleteEvent() {
    if (!event) return;
    
    setDeleting(true);
    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", event.id);

    if (error) {
      console.error("Delete event error", error);
      setMessage("Failed to delete event: " + error.message);
      setDeleting(false);
      setShowDeleteConfirm(false);
    } else {
      router.push("/events");
    }
  }

  async function handleFeatureEvent() {
    if (!event) return;
    
    setFeaturedLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/stripe/create-featured-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: event.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || 'Failed to create checkout session.');
        setFeaturedLoading(false);
        return;
      }

      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        setMessage('Failed to get checkout URL.');
        setFeaturedLoading(false);
      }
    } catch (err: any) {
      console.error('Feature event checkout error:', err);
      setMessage('Failed to start payment process.');
      setFeaturedLoading(false);
    }
  }


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!event) return;
    const eventId = event.id;

    setSaving(true);
    setMessage(null);

    // 0) upload new banner if chosen
    let newBannerUrl = bannerUrl;
    if (bannerFile && userId) {
      const bucket = "event-banners";
      const path = `${userId}/${Date.now()}-${bannerFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, bannerFile);

      if (uploadError) {
        console.error("Banner upload error", uploadError);
        setMessage(uploadError.message);
        setSaving(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      newBannerUrl = publicUrlData.publicUrl;
    }

    // 1) Update event basic info
    const { error: eventError } = await supabase
      .from("events")
      .update({
        name: title || null,
        title: title || null,
        description: description || null,
        event_date: eventDate || null,
        event_time: eventTime || null,
        location: location || null,
        martial_art: martialArt || null,
        banner_url: newBannerUrl,
        will_stream: willStream,
        stream_price: willStream && streamPrice ? Math.round(parseFloat(streamPrice) * 100) : null,
        fighter_percentage: willStream ? (parseInt(fighterPercentage) || 0) : 0,
        // Note: is_featured is only set via payment/webhook, not manually
        updated_at: new Date().toISOString(),
      })
      .eq("id", event.id);

    if (eventError) {
      console.error("Update event error", eventError);
      setMessage(eventError.message);
      setSaving(false);
      return;
    }
    setBannerUrl(newBannerUrl || null);

    // Save sponsorships
    // Get existing sponsorship IDs
    const existingSponsorshipIds = sponsorships
      .filter((s) => s.existingId)
      .map((s) => s.existingId!);

    // Delete removed sponsorships
    if (existingSponsorshipIds.length > 0) {
      const { data: allSponsorshipsData } = await supabase
        .from("event_sponsorships")
        .select("id")
        .eq("event_id", event.id);

      const allExistingIds = (allSponsorshipsData || []).map((s) => s.id);
      const toDelete = allExistingIds.filter((id) => !existingSponsorshipIds.includes(id));

      if (toDelete.length > 0) {
        await supabase.from("event_sponsorships").delete().in("id", toDelete);
      }
    } else {
      // If no existing sponsorships, delete all
      await supabase.from("event_sponsorships").delete().eq("event_id", event.id);
    }

    // Insert new sponsorships and update existing ones
    for (let i = 0; i < sponsorships.length; i++) {
      const sponsor = sponsorships[i];
      if (sponsor.existingId) {
        // Update existing
        await supabase
          .from("event_sponsorships")
          .update({
            image_url: sponsor.image_url,
            link_url: sponsor.link_url || null,
            display_order: i,
            updated_at: new Date().toISOString(),
          })
          .eq("id", sponsor.existingId);
      } else {
        // Insert new
        await supabase.from("event_sponsorships").insert({
          event_id: event.id,
          image_url: sponsor.image_url,
          link_url: sponsor.link_url || null,
          display_order: i,
        });
      }
    }

    // 2) Resolve fighter usernames for any handles
    const allHandles = Array.from(
      new Set(
        bouts
          .flatMap((b) => [b.redHandle, b.blueHandle])
          .map((h) => h.trim())
          .filter(Boolean)
          .map((h) => h.replace(/^@/, ""))
      )
    );

    let fightersByUsername: Record<string, FighterLite> = {};
    if (allHandles.length > 0) {
      // Query with case-insensitive role check (database stores as "FIGHTER")
      const { data: fighters, error: fightersError } = await supabase
        .from("profiles")
        .select("id, username, full_name, role")
        .or("role.eq.FIGHTER,role.eq.fighter")
        .in("username", allHandles);

      if (fightersError) {
        console.error("Edit event fighter lookup error", fightersError);
        // We'll still continue; missing handles just won't link.
      } else if (fighters) {
        (fighters as FighterLite[]).forEach((f) => {
          if (f.username) {
            // Store with lowercase username for case-insensitive lookup
            fightersByUsername[f.username.toLowerCase()] = f;
          }
        });
      }
    }

    const normaliseHandle = (raw: string) =>
      raw.trim().replace(/^@/, "");

    // 3) Build lists of new, existing, and deleted bouts
    const currentIds = bouts.filter((b) => !b.isNew).map((b) => b.id);
    const idsToDelete = originalBoutIds.filter(
      (id) => !currentIds.includes(id)
    );

    const newBouts = bouts.filter((b) => b.isNew);
    const existingBouts = bouts.filter((b) => !b.isNew);

    // 3a) Delete removed bouts
    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("event_bouts")
        .delete()
        .in("id", idsToDelete);

      if (deleteError) {
        console.error("Delete bouts error", deleteError);
        setMessage("Failed to delete removed bouts.");
        setSaving(false);
        return;
      }
    }

    // Ensure only one bout is live at a time (in the current state)
    const liveBoutId = bouts.find((b) => b.isLive)?.id;
    const normalizedBouts = bouts.map((b) => ({
      ...b,
      isLive: liveBoutId ? b.id === liveBoutId : false,
    }));

    // Helper to build row payload from BoutForm
    function buildBoutRow(
      bout: BoutForm,
      orderIndex: number
    ): {
      event_id: string;
      card_type: CardType;
      order_index: number;
      red_name: string | null;
      blue_name: string | null;
      weight: string | null;
      bout_details: string | null;
      red_looking_for_opponent: boolean;
      blue_looking_for_opponent: boolean;
      red_fighter_id: string | null;
      blue_fighter_id: string | null;
      is_live: boolean;
      offer_fee: number | null;
    } {
      const redKey = normaliseHandle(bout.redHandle);
      const blueKey = normaliseHandle(bout.blueHandle);

      // Lookup with case-insensitive username matching
      const redProfile =
        redKey && fightersByUsername[redKey.toLowerCase()]
          ? fightersByUsername[redKey.toLowerCase()]
          : null;
      const blueProfile =
        blueKey && fightersByUsername[blueKey.toLowerCase()]
          ? fightersByUsername[blueKey.toLowerCase()]
          : null;

      const redDisplayHandle = bout.redHandle.trim() || null;
      const blueDisplayHandle = bout.blueHandle.trim() || null;

      // If there's a profile, use profile name. Otherwise, use the entered name.
      // Don't use handle as fallback - if user entered a name, use it.
      const redNameFinal = redProfile
        ? (redProfile.full_name || redProfile.username)
        : (bout.redName.trim() || null);

      const blueNameFinal = blueProfile
        ? (blueProfile.full_name || blueProfile.username)
        : (bout.blueName.trim() || null);

      // If there's a profile match from handle, use its ID.
      // If handle is empty, preserve existing fighter ID (for existing bouts).
      // If handle is entered but doesn't match, clear the fighter_id (user is changing it).
      const redFighterIdFinal = redProfile 
        ? redProfile.id 
        : (redKey === "" && bout.redFighterId ? bout.redFighterId : null);
      const blueFighterIdFinal = blueProfile 
        ? blueProfile.id 
        : (blueKey === "" && bout.blueFighterId ? bout.blueFighterId : null);

      return {
        event_id: eventId,
        card_type: bout.cardType,
        order_index: orderIndex,
        red_name: redNameFinal || null,
        blue_name: blueNameFinal || null,
        weight: bout.weight || null,
        bout_details: bout.boutDetails || null,
        red_looking_for_opponent: bout.redLooking,
        blue_looking_for_opponent: bout.blueLooking,
        red_fighter_id: redFighterIdFinal,
        blue_fighter_id: blueFighterIdFinal,
        is_live: bout.isLive,
        offer_fee: bout.offerFee.trim() 
          ? Math.round(parseFloat(bout.offerFee) * 100)
          : null,
      };
    }

    // 3b) Insert new bouts (separated by card type for proper ordering)
    const normalizedNewBouts = normalizedBouts.filter((b) => b.isNew);
    if (normalizedNewBouts.length > 0) {
      const newMainBouts = normalizedNewBouts.filter((b) => b.cardType === "main");
      const newUndercardBouts = normalizedNewBouts.filter((b) => b.cardType === "undercard");
      const existingMainCount = normalizedBouts.filter((b) => !b.isNew && b.cardType === "main").length;
      const existingUndercardCount = normalizedBouts.filter((b) => !b.isNew && b.cardType === "undercard").length;
      
      const mainRowsToInsert = newMainBouts.map((bout, idx) =>
        buildBoutRow(bout, existingMainCount + idx)
      );
      const undercardRowsToInsert = newUndercardBouts.map((bout, idx) =>
        buildBoutRow(bout, existingUndercardCount + idx)
      );
      const rowsToInsert = [...mainRowsToInsert, ...undercardRowsToInsert];

      const { data: insertedBouts, error: insertError } = await supabase
        .from("event_bouts")
        .insert(rowsToInsert)
        .select("id, card_type, order_index");

      if (insertError) {
        console.error("Insert new bouts error", insertError);
        setMessage(
          "Event updated, but failed to save some new bouts: " +
            insertError.message
        );
        setSaving(false);
        router.push(`/events/${event.id}`);
        return;
      }

      // Notify event followers about new bouts
      if (insertedBouts && insertedBouts.length > 0) {
        try {
          for (const bout of insertedBouts) {
            // Calculate bout number based on card type and order
            const sameCardBouts = insertedBouts.filter(
              (b) => b.card_type === bout.card_type
            );
            const boutNumber = sameCardBouts.findIndex((b) => b.id === bout.id) + 1;
            
            await fetch(`/api/events/${eventId}/notify-bout-added`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                boutId: bout.id,
                boutNumber: boutNumber,
                cardType: bout.card_type,
              }),
            });
          }
        } catch (notifError) {
          console.error("Error notifying followers about new bouts:", notifError);
          // Don't fail the save if notification fails
        }
      }
    }

    // 3c) Update existing bouts (separated by card type for proper ordering)
    const normalizedExistingBouts = normalizedBouts.filter((b) => !b.isNew);
    const existingMainBouts = normalizedExistingBouts.filter((b) => b.cardType === "main");
    const existingUndercardBouts = normalizedExistingBouts.filter((b) => b.cardType === "undercard");
    
    // Update main card bouts with order_index 0, 1, 2...
    for (let i = 0; i < existingMainBouts.length; i++) {
      const bout = existingMainBouts[i];
      const rowPayload = buildBoutRow(bout, i);

      const { error: updateError } = await supabase
        .from("event_bouts")
        .update(rowPayload)
        .eq("id", bout.id);

      if (updateError) {
        console.error("Update bout error", updateError);
        setMessage(
          "Event updated, but failed to update some bouts: " +
            updateError.message
        );
        setSaving(false);
        router.push(`/events/${event.id}`);
        return;
      }
    }
    
    // Update undercard bouts with order_index 0, 1, 2... (separate from main)
    for (let i = 0; i < existingUndercardBouts.length; i++) {
      const bout = existingUndercardBouts[i];
      const rowPayload = buildBoutRow(bout, i);

      const { error: updateError } = await supabase
        .from("event_bouts")
        .update(rowPayload)
        .eq("id", bout.id);

      if (updateError) {
        console.error("Update bout error", updateError);
        setMessage(
          "Event updated, but failed to update some bouts: " +
            updateError.message
        );
        setSaving(false);
        router.push(`/events/${event.id}`);
        return;
      }
    }

    setSaving(false);
    router.push(`/events/${event.id}`);
  }

  // Split main / undercard for display
  const mainBouts = bouts.filter((b) => b.cardType === "main");
  const undercardBouts = bouts.filter((b) => b.cardType === "undercard");

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-sm text-slate-600">Loading event…</p>
      </div>
    );
  }

  if (notAllowed) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-sm text-slate-600">
          You don&apos;t have permission to edit this event.
        </p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-sm text-slate-600">Event not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold mb-2">Edit event</h1>
          <p className="text-sm text-slate-600">
            Update your event details and fight card.
          </p>
        </div>
        {event && (
          <Link
            href={`/events/${event.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors whitespace-nowrap"
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
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* EVENT INFO */}
        <section className="card space-y-3">
          <h2 className="text-sm font-semibold">Event details</h2>

          <div className="grid md:grid-cols-2 gap-3">
            <label className="text-xs text-slate-600 space-y-1 block">
              Event name
              <input
                className="w-full rounded-xl border px-3 py-2 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Muay Thai Jam"
                required
              />
            </label>

            <label className="text-xs text-slate-600 space-y-1 block">
              Martial art / discipline
              <input
                className="w-full rounded-xl border px-3 py-2 text-sm"
                value={martialArt}
                onChange={(e) => setMartialArt(e.target.value)}
                placeholder="e.g. Muay Thai"
              />
            </label>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <label className="text-xs text-slate-600 space-y-1 block">
              Date
              <input
                type="date"
                className="w-full rounded-xl border px-3 py-2 text-sm"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </label>

            <label className="text-xs text-slate-600 space-y-1 block">
              Time
              <input
                type="time"
                className="w-full rounded-xl border px-3 py-2 text-sm"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
              />
            </label>

            <label className="text-xs text-slate-600 space-y-1 block">
              Location
              <input
                className="w-full rounded-xl border px-3 py-2 text-sm"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, country"
              />
            </label>
          </div>

          <label className="text-xs text-slate-600 space-y-1 block">
            Description (optional)
            <textarea
              className="w-full rounded-xl border px-3 py-2 text-sm min-h-[80px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add event info, rules, ticket details…"
            />
          </label>
        </section>

        {/* BANNER EDIT */}
        <section className="card space-y-3">
          <h2 className="text-sm font-semibold">Display picture</h2>
          <p className="text-xs text-slate-600">
            Change the banner image shown at the top of the event page.
          </p>

          <div className="grid md:grid-cols-[2fr,3fr] gap-4 items-center">
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 h-32 flex items-center justify-center overflow-hidden relative">
              {bannerPreview ? (
                <Image
                  src={bannerPreview}
                  alt="Banner preview"
                  fill
                  sizes="(max-width: 768px) 100vw, 300px"
                  className="object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 px-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mb-1"
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
                  <span className="text-xs font-medium mb-0.5">No image selected</span>
                  <span className="text-[10px] text-center">Recommended: 1920×640px (3:1 ratio)</span>
                </div>
              )}
            </div>

            <label className="text-xs text-slate-600 space-y-1 block">
              Choose new image
              <input
                type="file"
                accept="image/*"
                onChange={handleBannerChange}
                className="block w-full text-xs"
              />
              <span className="text-[11px] text-slate-500">
                If you don&apos;t pick a new image, the existing banner will be
                kept.
              </span>
            </label>
          </div>
        </section>

        {/* EVENT SPONSORSHIPS */}
        <section className="card space-y-3">
          <div>
            <h2 className="text-sm font-semibold">Event Sponsorships</h2>
            <p className="text-xs text-slate-600 mt-1">
              Add sponsor logos/banners that will be displayed on your event page in a slideshow format.
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              Recommended image size: 600×400px (3:2 ratio) - Images will fill the promotional box
            </p>
          </div>

          {/* Existing Sponsorships */}
          {sponsorships.length > 0 && (
            <div className="space-y-3">
              {sponsorships.map((sponsor, index) => (
                <div
                  key={sponsor.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-24 h-24 rounded-lg border border-slate-200 bg-white overflow-hidden">
                      <Image
                        src={sponsor.image_url}
                        alt="Sponsor"
                        width={96}
                        height={96}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-700">
                          Sponsor {index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSponsorship(sponsor.id)}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                      <label className="text-xs text-slate-600 space-y-1 block">
                        Link URL (optional)
                        <input
                          type="url"
                          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
                          value={sponsor.link_url}
                          onChange={(e) =>
                            handleUpdateSponsorship(sponsor.id, { link_url: e.target.value })
                          }
                          placeholder="https://..."
                        />
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add New Sponsorship */}
          <div>
            <label className="block text-xs text-slate-600 space-y-1">
              Add sponsorship image
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAddSponsorship(file);
                }}
                className="block w-full text-xs"
                disabled={!!uploadingSponsorship}
              />
              <span className="text-[11px] text-slate-500">
                {uploadingSponsorship
                  ? "Uploading..."
                  : "Upload a sponsor logo or banner image"}
              </span>
            </label>
          </div>
        </section>

        {/* FEATURED EVENT */}
        <section className="card space-y-3 border-purple-200 bg-purple-50/30">
          <h2 className="text-sm font-semibold text-purple-900">Feature Event</h2>
          <p className="text-xs text-slate-600">
            Feature your event to appear at the top of search results and the homepage. This increases visibility and helps attract more attendees.
          </p>
          
          {isFeatured ? (
            <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs text-green-800 font-medium">
                ✓ Your event is currently featured
              </p>
              {event?.featured_until && (
                <FeaturedCountdown featuredUntil={event.featured_until} />
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleFeatureEvent}
              disabled={featuredLoading}
              className="w-full px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {featuredLoading ? 'Processing...' : 'Feature Event - $150 (30 days)'}
            </button>
          )}
        </section>

        {/* STREAM SETTINGS - Temporarily hidden until streaming feature is ready */}
        {false && (
        <section className="card space-y-3">
          <h2 className="text-sm font-semibold">Stream Settings</h2>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={willStream}
              onChange={(e) => setWillStream(e.target.checked)}
              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-xs text-slate-700">Will stream this event</span>
          </label>

          {willStream && (
            <div className="mt-4 space-y-4 pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-600">
                Set a price for watching the stream and optionally allocate a percentage to fighters.
              </p>

              {/* Revenue Split Disclosure */}
              {streamPrice && parseFloat(streamPrice) > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-xs font-semibold text-blue-900 mb-2">Revenue Split</h4>
                  <div className="text-xs text-blue-800 space-y-1">
                    <p>
                      <strong>Total Revenue:</strong> ${parseFloat(streamPrice).toFixed(2)} per viewer
                    </p>
                    <p>
                      <strong>Platform Fee (5%):</strong> ${((parseFloat(streamPrice) * 5) / 100).toFixed(2)}
                    </p>
                    {parseInt(fighterPercentage) > 0 ? (
                      <>
                        <p>
                          <strong>Fighter Share ({fighterPercentage}%):</strong> ${((parseFloat(streamPrice) * parseInt(fighterPercentage)) / 100).toFixed(2)}
                        </p>
                        <p>
                          <strong>Your Share:</strong> ${((parseFloat(streamPrice) * (100 - 5 - parseInt(fighterPercentage))) / 100).toFixed(2)} ({100 - 5 - parseInt(fighterPercentage)}%)
                        </p>
                      </>
                    ) : (
                      <p>
                        <strong>Your Share:</strong> ${((parseFloat(streamPrice) * 95) / 100).toFixed(2)} (95%)
                      </p>
                    )}
                    <p className="mt-2 pt-2 border-t border-blue-200 text-[11px]">
                      <strong>Note:</strong> Apex charges a 5% platform fee on stream revenue. Stripe processing fees (~2.9% + $0.30 per transaction) are also deducted automatically.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-3">
                <label className="text-xs text-slate-600 space-y-1 block">
                  Stream Price (USD)
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    value={streamPrice}
                    onChange={(e) => setStreamPrice(e.target.value)}
                    placeholder="0.00 (leave empty for free stream)"
                  />
                  <span className="text-[11px] text-slate-500">
                    Leave empty for a free stream
                  </span>
                </label>

                <label className="text-xs text-slate-600 space-y-1 block">
                  Fighter Percentage (%)
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="w-full rounded-xl border px-3 py-2 text-sm"
                    value={fighterPercentage}
                    onChange={(e) => setFighterPercentage(e.target.value)}
                    placeholder="0"
                  />
                  <span className="text-[11px] text-slate-500">
                    Percentage of stream price that goes to fighters (0-100)
                  </span>
                </label>
              </div>
              {parseInt(fighterPercentage) > 0 && (
                <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-xs text-purple-900">
                    <strong>Note:</strong> Viewers will be able to choose which fighters receive this percentage when they purchase stream access.
                  </p>
                </div>
              )}
            </div>
          )}
        </section>
        )}

        {/* BOUTS (card builder) */}
        <section className="card space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Create bracket</h2>
              <p className="text-xs text-slate-600">
                Link fighters with their Apex usernames, or type a name if
                they&apos;re not on Apex yet. Use the checkboxes for
                &quot;Looking for opponent&quot;.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => addBout("main")}
                className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs text-purple-700 hover:bg-purple-100"
              >
                + Add main card bout
              </button>
              <button
                type="button"
                onClick={() => addBout("undercard")}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100"
              >
                + Add undercard bout
              </button>
            </div>
          </div>

          <div className="mt-4 text-xs text-slate-500 flex items-center justify-between">
            <span className="font-semibold">Red corner</span>
            <span className="uppercase tracking-wide text-[10px] text-slate-400">
              VS
            </span>
            <span className="font-semibold">Blue corner</span>
          </div>

          {/* MAIN CARD BOUTS */}
          {mainBouts.length > 0 && (
            <div className="mt-3 space-y-3">
              {mainBouts.map((bout, index) => {
                const boutNumber = mainBouts.length - index;
                return (
                  <BoutCard
                    key={bout.id}
                    bout={bout}
                    index={index}
                    label={`Main card • Bout ${boutNumber}`}
                    onChange={updateBout}
                    onRemove={removeBout}
                    onMoveUp={moveBoutUp}
                    onMoveDown={moveBoutDown}
                    canMoveUp={index > 0}
                    canMoveDown={index < mainBouts.length - 1}
                  />
                );
              })}
            </div>
          )}

          {/* UNDERCARD BOUTS */}
          {undercardBouts.length > 0 && (
            <div className="mt-6 space-y-3">
              {undercardBouts.map((bout, index) => {
                const boutNumber = undercardBouts.length - index;
                return (
                  <BoutCard
                    key={bout.id}
                    bout={bout}
                    index={index}
                    label={`Undercard • Bout ${boutNumber}`}
                    onChange={updateBout}
                    onRemove={removeBout}
                    onMoveUp={moveBoutUp}
                    onMoveDown={moveBoutDown}
                    canMoveUp={index > 0}
                    canMoveDown={index < undercardBouts.length - 1}
                  />
                );
              })}
            </div>
          )}

          {bouts.length === 0 && (
            <p className="text-sm text-slate-600 mt-3">
              No bouts added yet. Use the buttons above to add your first fight.
            </p>
          )}
        </section>

        {/* BOUT RESULTS SECTION */}
        <section className="card space-y-3">
          <button
            type="button"
            onClick={() => setBoutResultsExpanded(!boutResultsExpanded)}
            className="flex items-center justify-between w-full text-left"
          >
            <div>
              <h2 className="text-sm font-semibold">Bout results</h2>
              <p className="text-xs text-slate-600">
                Update winners and result details for each bout. These will show on
                the public event page and on fighter profiles.
              </p>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-5 w-5 text-slate-400 transition-transform ${boutResultsExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {boutResultsExpanded && (
            <div className="space-y-4 pt-2">
              {mainBouts.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[11px] font-semibold text-slate-500">
                    Main card
                  </p>
                  {mainBouts.map((bout, idx) => {
                    const fightNumber = mainBouts.length - idx;
                    return (
                      <BoutResultRow
                        key={bout.id}
                        bout={bout}
                        label={`MAIN CARD • FIGHT ${fightNumber}`}
                        onLocalChange={updateBout}
                        eventId={eventId}
                      />
                    );
                  })}
                </div>
              )}

              {undercardBouts.length > 0 && (
                <div className="space-y-3 mt-4">
                  <p className="text-[11px] font-semibold text-slate-500">
                    Undercard
                  </p>
                  {undercardBouts.map((bout, idx) => {
                    const fightNumber = undercardBouts.length - idx;
                    return (
                      <BoutResultRow
                        key={bout.id}
                        bout={bout}
                        label={`UNDERCARD • FIGHT ${fightNumber}`}
                        onLocalChange={updateBout}
                        eventId={eventId}
                      />
                    );
                  })}
                </div>
              )}

              {mainBouts.length === 0 && undercardBouts.length === 0 && (
                <p className="text-xs text-slate-600">
                  Add bouts above first, then you can enter results here.
                </p>
              )}
            </div>
          )}
        </section>


        {message && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 whitespace-pre-line">
            {message}
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>

          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            Delete Event
          </button>
        </div>
      </form>

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-2">Delete Event</h3>
            <p className="text-sm text-slate-600 mb-4">
              Are you sure you want to delete this event? This action cannot be undone and will remove all bouts and related data.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteEvent}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Featured countdown component
function FeaturedCountdown({ featuredUntil }: { featuredUntil: string }) {
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const until = new Date(featuredUntil);
      const diff = until.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining("Expired");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeRemaining(`${days} day${days !== 1 ? 's' : ''} ${hours} hour${hours !== 1 ? 's' : ''} remaining`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''} remaining`);
      } else {
        setTimeRemaining(`${minutes} minute${minutes !== 1 ? 's' : ''} remaining`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [featuredUntil]);

  const untilDate = new Date(featuredUntil);
  const totalDays = Math.ceil((untilDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="space-y-1">
      <p className="text-xs text-green-700">
        Featured until: {untilDate.toLocaleDateString()} at {untilDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </p>
      <p className="text-xs font-semibold text-green-800">
        {timeRemaining || `Expires in ${totalDays} day${totalDays !== 1 ? 's' : ''}`}
      </p>
    </div>
  );
}

function BoutCard({
  bout,
  index,
  label,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  bout: BoutForm;
  index: number;
  label: string;
  onChange: (id: string, patch: Partial<BoutForm>) => void;
  onRemove: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-slate-600">
          {label}
        </span>
        <div className="flex items-center gap-2">
          {/* Reorder buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onMoveUp(bout.id)}
              disabled={!canMoveUp}
              className={`p-1 rounded text-slate-600 hover:bg-slate-200 transition-colors ${
                canMoveUp ? "" : "opacity-30 cursor-not-allowed"
              }`}
              title="Move up"
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
                  d="M5 15l7-7 7 7"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => onMoveDown(bout.id)}
              disabled={!canMoveDown}
              className={`p-1 rounded text-slate-600 hover:bg-slate-200 transition-colors ${
                canMoveDown ? "" : "opacity-30 cursor-not-allowed"
              }`}
              title="Move down"
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
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>
          <button
            type="button"
            onClick={() => onRemove(bout.id)}
            className="text-[11px] text-red-500 hover:underline"
          >
            Remove
          </button>
        </div>
      </div>


      <div className="grid md:grid-cols-[1fr,auto,1fr] gap-3 text-xs">
        {/* RED CORNER */}
        <div className="space-y-2">
          <label className="text-[11px] text-slate-600 space-y-1 block">
            Fighter username (optional)
            <input
              className="w-full rounded-xl border px-3 py-2 text-sm"
              value={bout.redHandle}
              onChange={(e) =>
                onChange(bout.id, { redHandle: e.target.value })
              }
              placeholder="@redcorner"
            />
          </label>
          <label className="text-[11px] text-slate-600 space-y-1 block">
            Fighter name (if not on Apex yet)
            <input
              className="w-full rounded-xl border px-3 py-2 text-sm"
              value={bout.redName}
              onChange={(e) => onChange(bout.id, { redName: e.target.value })}
              placeholder="e.g. Jane Doe"
            />
          </label>

          <label className="inline-flex items-center gap-2 text-[11px] text-slate-600 mt-1">
            <input
              type="checkbox"
              className="h-3 w-3"
              checked={bout.redLooking}
              onChange={(e) =>
                onChange(bout.id, { redLooking: e.target.checked })
              }
            />
            <span>Looking for opponent</span>
          </label>
        </div>

        {/* MIDDLE DETAILS */}
        <div className="flex flex-col justify-center text-[11px] text-slate-600 gap-2">
          <label className="space-y-1 block">
            Weight
            <input
              className="w-full rounded-xl border px-3 py-2 text-sm"
              value={bout.weight}
              onChange={(e) => onChange(bout.id, { weight: e.target.value })}
              placeholder="e.g. 64kg"
            />
          </label>

          <label className="space-y-1 block">
            Bout details
            <input
              className="w-full rounded-xl border px-3 py-2 text-sm"
              value={bout.boutDetails}
              onChange={(e) =>
                onChange(bout.id, { boutDetails: e.target.value })
              }
              placeholder="e.g. 64kg A-class"
            />
          </label>
        </div>

        {/* BLUE CORNER */}
        <div className="space-y-2">
          <label className="text-[11px] text-slate-600 space-y-1 block">
            Fighter username (optional)
            <input
              className="w-full rounded-xl border px-3 py-2 text-sm"
              value={bout.blueHandle}
              onChange={(e) =>
                onChange(bout.id, { blueHandle: e.target.value })
              }
              placeholder="@bluecorner"
            />
          </label>
          <label className="text-[11px] text-slate-600 space-y-1 block">
            Fighter name (if not on Apex yet)
            <input
              className="w-full rounded-xl border px-3 py-2 text-sm"
              value={bout.blueName}
              onChange={(e) => onChange(bout.id, { blueName: e.target.value })}
              placeholder="e.g. John Smith"
            />
          </label>

          <label className="inline-flex items-center gap-2 text-[11px] text-slate-600 mt-1">
            <input
              type="checkbox"
              className="h-3 w-3"
              checked={bout.blueLooking}
              onChange={(e) =>
                onChange(bout.id, { blueLooking: e.target.checked })
              }
            />
            <span>Looking for opponent</span>
          </label>
        </div>
      </div>

      {/* OFFER FEE SETTING */}
      <div className="mt-3 pt-3 border-t border-slate-200">
        <label className="text-[11px] text-slate-600 space-y-1 block">
          Offer Fee (USD) - Refundable deposit required to send offers
          <input
            type="number"
            step="0.01"
            min="0"
            className="w-full rounded-xl border px-3 py-2 text-sm"
            value={bout.offerFee}
            onChange={(e) => onChange(bout.id, { offerFee: e.target.value })}
            placeholder="0.00 (leave empty for no fee)"
          />
          <span className="text-[10px] text-slate-500">
            Fee is refunded if the offer is declined. Helps filter out non-serious offers.
          </span>
        </label>
      </div>
    </div>
  );
}

function BoutResultRow({
  bout,
  label,
  onLocalChange,
  eventId,
}: {
  bout: BoutForm;
  label: string;
  onLocalChange: (id: string, patch: Partial<BoutForm>) => void;
  eventId: string;
}) {
  const supabase = createSupabaseBrowser();
  const [winner, setWinner] = useState<BoutForm["winnerSide"]>(
    bout.winnerSide || "none"
  );
  const [method, setMethod] = useState(bout.resultMethod || "");
  const [round, setRound] = useState(bout.resultRound || "");
  const [time, setTime] = useState(bout.resultTime || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateFighterRecord(
    fighterId: string,
    side: Side,
    oldWinner: Winner,
    newWinner: Winner
  ) {
    if (oldWinner === newWinner) return;

    console.log(`Triggering record recalculation for fighter ${fighterId}`);

    // Use API route to bypass RLS restrictions
    const response = await fetch("/api/fighters/update-record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fighterId,
      }),
    });

    const responseData = await response.json();
    console.log("Record update API response:", responseData);

    if (!response.ok) {
      console.error("Update fighter record error:", responseData);
      throw new Error(responseData.error || "Failed to update fighter record");
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    const oldWinner: Winner =
      bout.winnerSide === "none" ? null : (bout.winnerSide as Winner);
    const newWinner: Winner = winner === "none" ? null : (winner as Winner);

    const roundInt =
      round.trim() === "" ? null : Number.parseInt(round.trim(), 10) || null;

    // 1) update bout row
    const { error: updateError } = await supabase
      .from("event_bouts")
      .update({
        winner_side: newWinner,
        result_method: method.trim() || null,
        result_round: roundInt,
        result_time: time.trim() || null,
      })
      .eq("id", bout.id);

    if (updateError) {
      console.error("Update bout result error", updateError);
      setError(updateError.message);
      setSaving(false);
      return;
    }

    // 2) update fighter records based on winner change
    try {
      if (bout.redFighterId) {
        await updateFighterRecord(bout.redFighterId, "red", oldWinner, newWinner);
      }
      if (bout.blueFighterId) {
        await updateFighterRecord(
          bout.blueFighterId,
          "blue",
          oldWinner,
          newWinner
        );
      }
    } catch (err: any) {
      setError(err.message || "Failed to update fighter records");
      setSaving(false);
      return;
    }

    // 3) Notify followers if a result was saved
    if (newWinner && newWinner !== "draw") {
      try {
        let winnerName = "Winner";
        let cornerText = "";

        if (newWinner === "red") {
          if (bout.redFighterId) {
            const { data: fighter } = await supabase
              .from("profiles")
              .select("full_name, username")
              .eq("id", bout.redFighterId)
              .single();
            winnerName = fighter?.full_name || fighter?.username || "Red corner";
          } else {
            winnerName = bout.redName || "Red corner";
          }
          cornerText = "Red corner";
        } else if (newWinner === "blue") {
          if (bout.blueFighterId) {
            const { data: fighter } = await supabase
              .from("profiles")
              .select("full_name, username")
              .eq("id", bout.blueFighterId)
              .single();
            winnerName = fighter?.full_name || fighter?.username || "Blue corner";
          } else {
            winnerName = bout.blueName || "Blue corner";
          }
          cornerText = "Blue corner";
        }

        const response = await fetch(`/api/events/${eventId}/notify-bout-result`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bout_id: bout.id,
            winner_side: newWinner,
            winner_name: winnerName,
            corner_text: cornerText,
            method: method.trim() || null,
            round: roundInt,
            time: time.trim() || null,
          }),
        });

        if (!response.ok) {
          console.error("Failed to notify followers about bout result");
        }
      } catch (notifError) {
        console.error("Error notifying followers about bout result:", notifError);
        // Don't fail the save if notification fails
      }
    } else if (newWinner === "draw") {
      // Notify about draw
      try {
        const response = await fetch(`/api/events/${eventId}/notify-bout-result`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bout_id: bout.id,
            winner_side: "draw",
            winner_name: "Draw",
            corner_text: "",
            method: method.trim() || null,
            round: roundInt,
            time: time.trim() || null,
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

    // 4) sync local state
    onLocalChange(bout.id, {
      winnerSide: winner,
      resultMethod: method,
      resultRound: round,
      resultTime: time,
    });

    setSaving(false);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-slate-600">
          {label}
        </span>
      </div>

      <div className="grid md:grid-cols-[1.4fr,1.8fr,auto,auto] gap-2 items-center">
        {/* winner select */}
        <div>
          <select
            className="w-full rounded-xl border px-3 py-2 text-xs bg-white"
            value={winner}
            onChange={(e) =>
              setWinner(e.target.value as BoutForm["winnerSide"])
            }
          >
            <option value="none">No winner yet</option>
            <option value="red">Red corner wins</option>
            <option value="blue">Blue corner wins</option>
            <option value="draw">Draw / No contest</option>
          </select>
        </div>

        {/* method */}
        <div>
          <input
            className="w-full rounded-xl border px-3 py-2 text-xs"
            placeholder="Method (e.g. KO, UD)"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          />
        </div>

        {/* round */}
        <div className="flex items-center gap-1">
          <input
            className="w-20 rounded-xl border px-3 py-2 text-xs text-center"
            placeholder="Rnd"
            value={round}
            onChange={(e) => setRound(e.target.value)}
          />
        </div>

        {/* time + save */}
        <div className="flex items-center gap-2 justify-end">
          <input
            className="w-24 rounded-xl border px-3 py-2 text-xs text-center"
            placeholder="Time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-purple-600 px-3 py-1 text-[11px] font-medium text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-1 text-[11px] text-red-500 whitespace-pre-line">
          {error}
        </p>
      )}
    </div>
  );
}
