// app/create-event/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { getGoogleMapsUrl } from "@/lib/location";

type CardType = "main" | "undercard";

type BoutForm = {
  id: string;
  cardType: CardType;
  redHandle: string; // fighter username for red corner (optional)
  redName: string;   // manual name if not on Apex
  blueHandle: string;
  blueName: string;
  weight: string;
  boutDetails: string;
  notes: string; // kept in type but we won't show an input any more
  redLooking: boolean;
  blueLooking: boolean;
};

function createEmptyBout(cardType: CardType): BoutForm {
  return {
    id: crypto.randomUUID(),
    cardType,
    redHandle: "",
    redName: "",
    blueHandle: "",
    blueName: "",
    weight: "",
    boutDetails: "",
    notes: "",
    redLooking: false,
    blueLooking: false,
  };
}

export default function CreateEventPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowser();

  // Event basics
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [location, setLocation] = useState("");
  const [martialArt, setMartialArt] = useState("");

  // Banner upload
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  // Event sponsorships
  type SponsorshipForm = {
    id: string; // temporary ID for new items
    image_url: string;
    link_url: string;
    display_order: number;
  };
  const [sponsorships, setSponsorships] = useState<SponsorshipForm[]>([]);
  const [uploadingSponsorship, setUploadingSponsorship] = useState<string | null>(null);

  // Stream settings
  const [willStream, setWillStream] = useState(false);
  const [streamPrice, setStreamPrice] = useState<string>("");
  const [fighterPercentage, setFighterPercentage] = useState<string>("0");

  // Bouts
  const [bouts, setBouts] = useState<BoutForm[]>([
    createEmptyBout("main"),
  ]);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  }

  function updateBout(id: string, patch: Partial<BoutForm>) {
    setBouts((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...patch } : b))
    );
  }

  function addBout(type: CardType) {
    setBouts((prev) => [...prev, createEmptyBout(type)]);
  }

  function removeBout(id: string) {
    setBouts((prev) => prev.filter((b) => b.id !== id));
  }

  async function handleAddSponsorship(file: File) {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setMessage("You must be signed in to add sponsorships.");
      return;
    }

    const tempId = `temp-${Date.now()}`;
    setUploadingSponsorship(tempId);

    try {
      const bucket = "event-banners"; // Reuse event-banners bucket
      const path = `${user.id}/sponsorships/${Date.now()}-${file.name}`;
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    // 1) Make sure user is logged in
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setMessage("You must be signed in to create an event.");
      setSaving(false);
      return;
    }

    const user = userData.user;

    // 2) Upload banner if present
    let bannerUrl: string | null = null;
    if (bannerFile) {
      const bucket = "event-banners";
      const path = `${user.id}/${Date.now()}-${bannerFile.name}`;
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

      bannerUrl = publicUrlData.publicUrl;
    }

    // 3) Insert event row first
    const { data: eventInsert, error: eventError } = await supabase
      .from("events")
      .insert({
        profile_id: user.id,
        owner_profile_id: user.id,
        name: title || null,
        title: title || null,
        description: description || null,
        event_date: eventDate || null,
        event_time: eventTime || null,
        location: location || null,
        martial_art: martialArt || null,
        banner_url: bannerUrl,
        will_stream: false,
        stream_price: null,
        fighter_percentage: 0,
      })
      .select("id")
      .single();

    if (eventError || !eventInsert) {
      console.error("Event insert error", eventError);
      setMessage(eventError?.message || "Failed to create event.");
      setSaving(false);
      return;
    }

    const eventId = eventInsert.id as string;

    // 4) Resolve fighter usernames → profile ids / names
    // Collect all non-empty handles (strip @, trim)
    const allHandles = Array.from(
      new Set(
        bouts
          .flatMap((b) => [b.redHandle, b.blueHandle])
          .map((h) => h.trim())
          .filter(Boolean)
          .map((h) => h.replace(/^@/, ""))
      )
    );

    let fightersByUsername: Record<
      string,
      { id: string; full_name?: string | null; username?: string | null }
    > = {};

    if (allHandles.length > 0) {
      // Query with case-insensitive role check (database stores as "FIGHTER")
      const { data: fightersData, error: fightersError } = await supabase
        .from("profiles")
        .select("id, username, full_name, role")
        .or("role.eq.FIGHTER,role.eq.fighter")
        .in("username", allHandles);

      if (fightersError) {
        console.error("fighters lookup error", fightersError);
        // We still continue; we just won't link fighters.
      } else {
        fightersByUsername = Object.fromEntries(
          (fightersData || []).map((f) => [
            // Store with lowercase username for case-insensitive lookup
            ((f.username as string) || "").toLowerCase(),
            {
              id: f.id as string,
              full_name: f.full_name,
              username: f.username,
            },
          ])
        );
      }
    }

    const normaliseHandle = (raw: string) =>
      raw.trim().replace(/^@/, "");

    // 5) Build bout rows for insert (always, even if usernames don't match)
    const boutRows = bouts.map((bout, index) => {
      const redKey = normaliseHandle(bout.redHandle);
      const blueKey = normaliseHandle(bout.blueHandle);

      // Lookup with case-insensitive username matching
      const redProfile = redKey ? fightersByUsername[redKey.toLowerCase()] : undefined;
      const blueProfile = blueKey ? fightersByUsername[blueKey.toLowerCase()] : undefined;

      // What the user actually typed in the handle boxes (without @)
      const redHandleClean =
        bout.redHandle.trim().replace(/^@/, "") || "";
      const blueHandleClean =
        bout.blueHandle.trim().replace(/^@/, "") || "";

      // Names coming from linked profiles, if any
      const redNameFromProfile =
        (redProfile?.full_name || redProfile?.username || "").trim();
      const blueNameFromProfile =
        (blueProfile?.full_name || blueProfile?.username || "").trim();

      // Final names we store in event_bouts.red_name / blue_name
      const redNameFinal =
        redNameFromProfile ||
        bout.redName.trim() ||
        redHandleClean ||
        null;

      const blueNameFinal =
        blueNameFromProfile ||
        bout.blueName.trim() ||
        blueHandleClean ||
        null;

      return {
        event_id: eventId,
        card_type: bout.cardType,
        order_index: index,

        red_name: redNameFinal,
        blue_name: blueNameFinal,

        weight: bout.weight.trim() || null,
        bout_details: bout.boutDetails.trim() || null,

        red_looking_for_opponent: bout.redLooking,
        blue_looking_for_opponent: bout.blueLooking,

        red_fighter_id: redProfile?.id || null,
        blue_fighter_id: blueProfile?.id || null,
      };
    });

    // 6) Insert sponsorships if any
    if (sponsorships.length > 0) {
      const sponsorshipRows = sponsorships.map((sponsor, index) => ({
        event_id: eventId,
        image_url: sponsor.image_url,
        link_url: sponsor.link_url || null,
        display_order: index,
      }));

      const { error: sponsorshipsError } = await supabase
        .from("event_sponsorships")
        .insert(sponsorshipRows);

      if (sponsorshipsError) {
        console.error("Sponsorships insert error", sponsorshipsError);
        setMessage(
          "Event created, but failed to save sponsorships: " +
            sponsorshipsError.message
        );
        setSaving(false);
        return;
      }
    }

    if (boutRows.length > 0) {
      const { data: insertedBouts, error: boutsError } = await supabase
        .from("event_bouts")
        .insert(boutRows)
        .select("id, event_id, red_fighter_id, blue_fighter_id");

      if (boutsError) {
        console.error("Bouts insert error", boutsError);

        // ❗ Stay on the page and show the full error (no redirect)
        setMessage(
          "Event created, but failed to save bouts:\n\n" +
            (boutsError.message || "") +
            (boutsError.details ? "\nDetails: " + boutsError.details : "") +
            (boutsError.hint ? "\nHint: " + boutsError.hint : "")
        );

        setSaving(false);
        return; // IMPORTANT: don't push to /events/[id] here
      } else if (insertedBouts) {
        // Create notifications for fighters assigned to bouts
        try {
          const { data: event } = await supabase
            .from("events")
            .select("name, owner_profile_id")
            .eq("id", eventId)
            .single();
          
          if (event) {
            const notifications = [];
            for (const bout of insertedBouts) {
              if (bout.red_fighter_id) {
                notifications.push({
                  profile_id: bout.red_fighter_id,
                  type: "bout_assigned",
                  actor_profile_id: event.owner_profile_id,
                  data: {
                    bout_id: bout.id,
                    event_id: bout.event_id,
                    event_name: event.name,
                    side: "red",
                  },
                });
              }
              if (bout.blue_fighter_id) {
                notifications.push({
                  profile_id: bout.blue_fighter_id,
                  type: "bout_assigned",
                  actor_profile_id: event.owner_profile_id,
                  data: {
                    bout_id: bout.id,
                    event_id: bout.event_id,
                    event_name: event.name,
                    side: "blue",
                  },
                });
              }
            }
            
            if (notifications.length > 0) {
              await supabase.from("notifications").insert(notifications);
            }

            // Notify event followers about new bouts
            try {
              for (const bout of insertedBouts) {
                // Get bout details for notification
                const { data: boutDetails } = await supabase
                  .from("event_bouts")
                  .select("id, red_name, blue_name, card_type, order_index")
                  .eq("id", bout.id)
                  .single();

                if (boutDetails) {
                  await fetch(`/api/events/${eventId}/notify-bout-added`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      boutId: bout.id,
                      boutNumber: (boutDetails.order_index || 0) + 1,
                      cardType: boutDetails.card_type,
                    }),
                  });
                }
              }
            } catch (notifError) {
              console.error("Error notifying followers about new bouts:", notifError);
              // Don't fail the event creation if notification fails
            }
          }
        } catch (notifError) {
          console.error("Bout assignment notification error", notifError);
          // Don't throw - the event creation succeeded
        }
      }
    }

    setSaving(false);
    router.push(`/events/${eventId}`);
  }

  // Split main / undercard for display so main always above undercard
  const mainBouts = bouts.filter((b) => b.cardType === "main");
  const undercardBouts = bouts.filter((b) => b.cardType === "undercard");

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold mb-2">Create event</h1>
          <p className="text-sm text-slate-600">
            Set your event details, upload a display picture, and build your fight
            card.
          </p>
        </div>
        <Link
          href="/events"
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
          <span>Back to events</span>
        </Link>
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
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 rounded-xl border px-3 py-2 text-sm"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City, country or full address"
                />
                {location && getGoogleMapsUrl(location) && (
                  <Link
                    href={getGoogleMapsUrl(location)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-xl border border-purple-300 bg-purple-50 text-purple-700 text-xs font-medium hover:bg-purple-100 transition-colors inline-flex items-center gap-1"
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
                        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                      />
                    </svg>
                    View Map
                  </Link>
                )}
              </div>
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

        {/* BANNER */}
        <section className="card space-y-3">
          <h2 className="text-sm font-semibold">Display picture</h2>
          <p className="text-xs text-slate-600">
            Upload a banner image for your event page. This will be shown at
            the top of the event.
          </p>

          <div className="grid md:grid-cols-[2fr,3fr] gap-4 items-center">
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 h-32 flex items-center justify-center overflow-hidden relative">
              {bannerPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={bannerPreview}
                  alt="Banner preview"
                  className="w-full h-full object-cover"
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
              Choose image
              <input
                type="file"
                accept="image/*"
                onChange={handleBannerChange}
                className="block w-full text-xs"
              />
            </label>
          </div>
        </section>

        {/* EVENT SPONSORSHIPS */}
        <section className="card space-y-3">
          <h2 className="text-sm font-semibold">Event Sponsorships</h2>
          <p className="text-xs text-slate-600">
            Add sponsor logos/banners that will be displayed on your event page
            in a slideshow format.
          </p>
          <p className="text-[10px] text-slate-500">
            Recommended image size: 600×400px (3:2 ratio) - Images will fill the promotional box
          </p>

          {sponsorships.length > 0 && (
            <div className="space-y-3">
              {sponsorships.map((sponsor) => (
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
                        <span className="text-xs text-slate-600">Sponsor</span>
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
                            handleUpdateSponsorship(sponsor.id, {
                              link_url: e.target.value,
                            })
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

        {/* BOUTS */}
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
              {mainBouts.map((bout, index) => (
                <BoutCard
                  key={bout.id}
                  bout={bout}
                  index={index}
                  label={`Main card • Bout ${index + 1}`}
                  onChange={updateBout}
                  onRemove={removeBout}
                />
              ))}
            </div>
          )}

          {/* UNDERCARD BOUTS */}
          {undercardBouts.length > 0 && (
            <div className="mt-6 space-y-3">
              {undercardBouts.map((bout, index) => (
                <BoutCard
                  key={bout.id}
                  bout={bout}
                  index={index}
                  label={`Undercard • Bout ${index + 1}`}
                  onChange={updateBout}
                  onRemove={removeBout}
                />
              ))}
            </div>
          )}

          {bouts.length === 0 && (
            <p className="text-sm text-slate-600 mt-3">
              No bouts added yet. Use the buttons above to add your first fight.
            </p>
          )}
        </section>

        {message && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? "Creating event…" : "Create event"}
        </button>
      </form>
    </div>
  );
}

function BoutCard({
  bout,
  index,
  label,
  onChange,
  onRemove,
}: {
  bout: BoutForm;
  index: number;
  label: string;
  onChange: (id: string, patch: Partial<BoutForm>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-slate-600">
          {label}
        </span>
        <button
          type="button"
          onClick={() => onRemove(bout.id)}
          className="text-[11px] text-red-500 hover:underline"
        >
          Remove
        </button>
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
              onChange={(e) =>
                onChange(bout.id, { blueName: e.target.value })
              }
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
    </div>
  );
}

