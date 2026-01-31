// components/events/BoutOfferButton.tsx
"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type BoutOfferButtonProps = {
  boutId: string;
  side: "red" | "blue";
};

type FighterOption = {
  id: string;
  full_name?: string | null;
  username?: string | null;
};

export default function BoutOfferButton({ boutId, side }: BoutOfferButtonProps) {
  const [step, setStep] = useState<
    "idle" | "choosing" | "sending" | "sent" | "error" | "payment_required"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  const [fighters, setFighters] = useState<FighterOption[]>([]);
  const [fightersLoading, setFightersLoading] = useState(false);
  const [selectedFighterId, setSelectedFighterId] = useState<string | "">("");
  const [offerFee, setOfferFee] = useState<number | null>(null); // in cents

  const [sentForName, setSentForName] = useState<string | null>(null);

  async function handleInitialClick() {
    if (step === "sending" || step === "sent") return;

    const supabase = createSupabaseBrowser();
    setError(null);

    // 1) Check auth
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setStep("idle");
      setError("You need to sign in to send an offer.");
      return;
    }

    const userId = userData.user.id;

    // 2) Only coaches + gyms can send offers
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, username, social_links")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      setStep("idle");
      setError("Could not load your profile.");
      return;
    }

    // Convert role to lowercase for comparison (database stores in uppercase)
    const roleLower = (profile.role || "").toLowerCase();

    if (roleLower !== "coach" && roleLower !== "gym") {
      setStep("idle");
      setError("Only coach and gym accounts can send offers.");
      return;
    }

    // 3) Work out the gym username
    // - If this is a gym account, use its own username
    // - If this is a coach, use social_links.gym_username
    let gymUsername: string | null = null;

    if (roleLower === "gym") {
      gymUsername = profile.username ?? null;
    } else if (roleLower === "coach") {
      const social = (profile as any).social_links || {};
      gymUsername = social.gym_username || null;
    }

    if (!gymUsername) {
      setStep("idle");
      setError(
        "Set your gym username in profile settings before sending offers."
      );
      return;
    }

    // 4) Load fighters linked to this gym
    setFightersLoading(true);
    const { data: fightersData, error: fightersError } = await supabase
      .from("profiles")
      .select("id, full_name, username, social_links")
      .or("role.eq.fighter,role.eq.FIGHTER")
      .contains("social_links", { gym_username: gymUsername });

    setFightersLoading(false);

    if (fightersError) {
      console.error("fighters error", fightersError);
      setStep("idle");
      setError("Could not load fighters for this gym.");
      return;
    }

    const options: FighterOption[] = (fightersData as FighterOption[]) || [];

    if (options.length === 0) {
      setStep("idle");
      setError(
        "No fighters are linked to this gym yet. Ask fighters to set your gym username in their settings."
      );
      return;
    }

    // 5) Check if this bout requires an offer fee
    const { data: boutData, error: boutError } = await supabase
      .from("event_bouts")
      .select("offer_fee")
      .eq("id", boutId)
      .single();

    if (boutError) {
      console.error("bout fee check error", boutError);
    } else if (boutData?.offer_fee) {
      setOfferFee(boutData.offer_fee);
      // Fee required - we'll handle payment before allowing offer
    } else {
      setOfferFee(null);
    }

    setFighters(options);
    setSelectedFighterId(options[0]?.id ?? "");
    setStep("choosing");
  }

  async function handleSendOffer() {
    if (!selectedFighterId) {
      setError("Select a fighter first.");
      return;
    }

    const supabase = createSupabaseBrowser();
    setError(null);
    setStep("sending");

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setStep("idle");
      setError("You need to sign in to send an offer.");
      return;
    }

    const userId = userData.user.id;

    // If payment is required, redirect to Stripe checkout
    if (offerFee && offerFee > 0) {
      try {
        const response = await fetch('/api/stripe/create-offer-checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            boutId,
            fighterId: selectedFighterId,
            side,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setStep("error");
          setError(data.error || "Failed to create checkout session.");
          return;
        }

        // Redirect to Stripe checkout
        if (data.url) {
          window.location.href = data.url;
        } else {
          setStep("error");
          setError("Failed to get checkout URL.");
        }
        return;
      } catch (err: any) {
        console.error("Checkout creation error:", err);
        setStep("error");
        setError("Failed to start payment process.");
        return;
      }
    }

    const fighter = fighters.find((f) => f.id === selectedFighterId) || null;
    const fighterName =
      fighter?.full_name || fighter?.username || "selected fighter";

    // Check if an offer already exists for this bout/side/fighter combination
    const { data: existingOffer, error: existingError } = await supabase
      .from("event_bout_offers")
      .select("id")
      .eq("bout_id", boutId)
      .eq("side", side)
      .eq("fighter_profile_id", selectedFighterId)
      .maybeSingle();

    if (existingError) {
      console.error("offer check error", existingError);
      setStep("error");
      setError("Failed to check for existing offers.");
      return;
    }

    if (existingOffer) {
      setStep("error");
      setError("An offer for this fighter on this bout has already been sent.");
      return;
    }

    // Insert the offer
    const { data: insertedOffer, error: insertError } = await supabase
      .from("event_bout_offers")
      .insert({
        bout_id: boutId,
        side,
        from_profile_id: userId,
        fighter_profile_id: selectedFighterId,
      })
      .select("id")
      .single();

    if (insertError || !insertedOffer) {
      console.error("offer insert error", insertError);
      // Check for unique constraint violation
      if (insertError?.message?.includes('duplicate') || insertError?.code === '23505') {
        setStep("error");
        setError("An offer for this fighter on this bout has already been sent.");
        return;
      }
      setStep("error");
      setError(insertError?.message || "Failed to send offer.");
      return;
    }

    // If there was a fee, create payment record (for tracking refunds later)
    if (offerFee && offerFee > 0 && insertedOffer.id) {
      // Note: In production, this would only be created after payment is confirmed
      await supabase.from("offer_payments").insert({
        offer_id: insertedOffer.id,
        bout_id: boutId,
        payer_profile_id: userId,
        amount_paid: offerFee,
        payment_status: "paid", // In production, this would be set after payment confirmation
      });
    }

    // Create notification for event owner
    try {
      // Get bout and event details
      const { data: bout } = await supabase
        .from("event_bouts")
        .select("event_id")
        .eq("id", boutId)
        .single();

      if (bout) {
        const { data: event } = await supabase
          .from("events")
          .select("id, name, title, owner_profile_id, profile_id")
          .eq("id", bout.event_id)
          .single();

        if (event) {
          const ownerId = event.owner_profile_id || event.profile_id;
          
          // Get sender profile info
          const { data: senderProfile } = await supabase
            .from("profiles")
            .select("full_name, username")
            .eq("id", userId)
            .single();

          const senderName =
            senderProfile?.full_name || senderProfile?.username || "A coach/gym";

          await supabase.from("notifications").insert({
            profile_id: ownerId,
            type: "bout_offer",
            actor_profile_id: userId,
            data: {
              bout_id: boutId,
              event_id: event.id,
              event_name: event.title || event.name,
              fighter_profile_id: selectedFighterId,
              fighter_name: fighterName,
              from_profile_id: userId,
              from_name: senderName,
              side: side,
            },
          });
        }
      }
    } catch (notifError) {
      console.error("BoutOfferButton notification error", notifError);
      // Don't throw - the offer was sent successfully
    }

    setSentForName(fighterName);
    setStep("sent");
  }

  const mainButtonLabel =
    step === "sent"
      ? "Offer sent"
      : step === "choosing"
      ? "Choose fighter"
      : "Looking for opponent";

  const mainButtonDisabled = step === "sending" || step === "sent";

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Main pill-style button */}
      <button
        type="button"
        onClick={handleInitialClick}
        disabled={mainButtonDisabled}
        className={`rounded-full border px-3 py-1 text-xs font-medium ${
          step === "sent"
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-60"
        }`}
      >
        {mainButtonLabel}
      </button>

      {/* Confirmation message after successful send (no fee) */}
      {step === "sent" && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-3 mt-2 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-start gap-2">
            <svg
              className="h-4 w-4 text-green-600 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-[11px] font-semibold text-green-800">
                Offer Sent Successfully!
              </p>
              <p className="text-[10px] text-green-700 mt-0.5">
                Your offer for <span className="font-bold">{sentForName}</span> has been sent to the organizer.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Fighter selection UI */}
      {step === "choosing" && (
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 space-y-2">
          {fightersLoading ? (
            <p className="text-[11px] text-slate-500">Loading fighters…</p>
          ) : (
            <>
              <p className="text-[11px] text-slate-600">
                Choose which fighter from your gym this offer is for:
              </p>

              <select
                className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
                value={selectedFighterId}
                onChange={(e) => setSelectedFighterId(e.target.value)}
              >
                {fighters.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.full_name || f.username || "Fighter"}
                  </option>
                ))}
              </select>

              {offerFee && offerFee > 0 && (
                <div className="p-2 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-[11px] text-purple-800 font-medium">
                    ⚠️ Offer Fee Required: ${(offerFee / 100).toFixed(2)}
                  </p>
                  <p className="text-[10px] text-purple-700 mt-1">
                    This refundable deposit is required to send an offer. It will be refunded if your offer is declined.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSendOffer}
                  className="rounded-lg px-3 py-1 text-xs font-medium bg-purple-600 text-white hover:bg-purple-700"
                >
                  Send offer
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("idle");
                    setError(null);
                  }}
                  className="text-[11px] text-slate-500 hover:underline"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Status / helper text */}
      {error && (
        <span className="text-[11px] text-red-600 max-w-xs text-center">{error}</span>
      )}

      {!error && step === "idle" && (
        <span className="text-[10px] text-slate-500 text-center">
          Only coach and gym accounts can send offers.
        </span>
      )}
    </div>
  );
}
