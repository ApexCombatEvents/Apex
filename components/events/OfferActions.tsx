// components/events/OfferActions.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type OfferActionsProps = {
  offerId: string;
  boutId: string;
  side: "red" | "blue";
  fighterProfileId: string | null;
  opponentFighterProfileId?: string | null;
  opponentGymUsername?: string | null;
  offeredFighterGymUsername?: string | null;
};

export default function OfferActions({
  offerId,
  boutId,
  side,
  fighterProfileId,
  opponentFighterProfileId = null,
  opponentGymUsername = null,
  offeredFighterGymUsername = null,
}: OfferActionsProps) {
  const [busy, setBusy] = useState<"none" | "accept" | "decline">("none");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const sameGymConflict =
    !!offeredFighterGymUsername &&
    !!opponentGymUsername &&
    offeredFighterGymUsername.trim().toLowerCase() ===
      opponentGymUsername.trim().toLowerCase();

  async function handleDecision(decision: "accepted" | "declined") {
    if (busy !== "none") return;
    setError(null);
    setBusy(decision === "accepted" ? "accept" : "decline");

    const supabase = createSupabaseBrowser();

    // 0) Guard: prevent same-gym matchups (and accidentally matching a fighter to themselves)
    if (decision === "accepted" && fighterProfileId) {
      try {
        const { data: boutRow, error: boutFetchError } = await supabase
          .from("event_bouts")
          .select("id, red_fighter_id, blue_fighter_id")
          .eq("id", boutId)
          .single();

        if (boutFetchError) {
          console.error("bout fetch error", boutFetchError);
          setError("Could not validate this matchup. Please try again.");
          setBusy("none");
          return;
        }

        const opponentId =
          side === "red" ? boutRow?.blue_fighter_id : boutRow?.red_fighter_id;

        if (opponentId && opponentId === fighterProfileId) {
          setError("You can’t match a fighter against themselves.");
          setBusy("none");
          return;
        }

        if (opponentId) {
          const { data: profiles, error: profilesError } = await supabase
            .from("profiles")
            .select("id, social_links")
            .in("id", [fighterProfileId, opponentId]);

          if (profilesError) {
            console.error("profiles fetch error", profilesError);
            setError("Could not validate gyms for this matchup. Please try again.");
            setBusy("none");
            return;
          }

          const byId: Record<string, any> = {};
          (profiles || []).forEach((p: any) => {
            byId[p.id] = p;
          });

          const offeredGym =
            (byId[fighterProfileId]?.social_links?.gym_username as string | undefined) ||
            null;
          const opponentGym =
            (byId[opponentId]?.social_links?.gym_username as string | undefined) ||
            null;

          if (
            offeredGym &&
            opponentGym &&
            offeredGym.trim().toLowerCase() === opponentGym.trim().toLowerCase()
          ) {
            setError(
              `Can't accept: fighters from the same gym (@${offeredGym}) can't fight each other.`
            );
            setBusy("none");
            return;
          }
        }
      } catch (e) {
        console.error("same-gym guard error", e);
        setError("Could not validate this matchup. Please try again.");
        setBusy("none");
        return;
      }
    }

    // 1) Update offer status
    const { error: offerError } = await supabase
      .from("event_bout_offers")
      .update({ status: decision })
      .eq("id", offerId);

    if (offerError) {
      console.error("offer update error", offerError);
      setError(offerError.message);
      setBusy("none");
      return;
    }

    // 1b) If declined, process refund for offer fee (if payment was made)
    if (decision === "declined") {
      try {
        const { data: currentUser } = await supabase.auth.getUser();
        if (!currentUser.user) return;
        
        // Find the payment record for this offer
        const { data: paymentRecord, error: paymentError } = await supabase
          .from("offer_payments")
          .select("id, amount_paid, payment_status, refund_status")
          .eq("offer_id", offerId)
          .eq("payer_profile_id", currentUser.user.id)
          .eq("payment_status", "paid")
          .maybeSingle();

        if (paymentError) {
          console.error("payment lookup error", paymentError);
          // Don't fail the decline action if payment lookup fails
        } else if (paymentRecord && paymentRecord.refund_status !== "refunded") {
          // Update payment record to mark as refunded
          // TODO: In production, initiate actual refund via payment processor
          await supabase
            .from("offer_payments")
            .update({
              refund_status: "refunded",
              updated_at: new Date().toISOString(),
            })
            .eq("id", paymentRecord.id);

          // Note: Actual refund processing would happen here via payment processor API
          console.log(`Refund processed for offer ${offerId}: $${(paymentRecord.amount_paid / 100).toFixed(2)}`);
        }
      } catch (refundError) {
        console.error("refund processing error", refundError);
        // Don't fail the decline action if refund processing fails
      }
    }

    // 2) If accepted, charge platform fee and link fighter to bout
    if (decision === "accepted" && fighterProfileId) {
      // Charge 5% platform fee when offer is accepted
      try {
        const { data: paymentRecord } = await supabase
          .from("offer_payments")
          .select("id, amount_paid, platform_fee")
          .eq("offer_id", offerId)
          .eq("payment_status", "paid")
          .maybeSingle();

        if (paymentRecord && paymentRecord.platform_fee === 0) {
          // Calculate and update platform fee (5% of amount_paid)
          const platformFee = Math.round((paymentRecord.amount_paid * 5) / 100);
          
          await supabase
            .from("offer_payments")
            .update({
              platform_fee: platformFee,
              updated_at: new Date().toISOString(),
            })
            .eq("id", paymentRecord.id);

          console.log(`✅ Platform fee charged for accepted offer ${offerId}: $${(platformFee / 100).toFixed(2)}`);
        }
      } catch (feeError) {
        console.error("Platform fee calculation error:", feeError);
        // Don't fail the acceptance if fee calculation fails
      }
      // Fetch fighter to get display name
      const { data: fighter, error: fighterError } = await supabase
        .from("profiles")
        .select("full_name, username")
        .eq("id", fighterProfileId)
        .single();

      if (fighterError) {
        console.error("fighter fetch error", fighterError);
        setError("Offer accepted, but failed to link fighter details.");
      } else {
        const displayName =
          fighter.full_name || fighter.username || "Fighter";

        const update: Record<string, any> = {};
        if (side === "red") {
          update.red_fighter_id = fighterProfileId;
          update.red_name = displayName;
          update.red_looking_for_opponent = false;
        } else {
          update.blue_fighter_id = fighterProfileId;
          update.blue_name = displayName;
          update.blue_looking_for_opponent = false;
        }

        const { error: boutError } = await supabase
          .from("event_bouts")
          .update(update)
          .eq("id", boutId);

        if (boutError) {
          console.error("bout update error", boutError);
          setError("Offer accepted, but failed to update the bout.");
        } else {
          // Create notifications for the fighter being assigned AND event followers
          try {
            const { data: bout } = await supabase
              .from("event_bouts")
              .select("event_id")
              .eq("id", boutId)
              .single();
            
            if (bout) {
              const { data: event } = await supabase
                .from("events")
                .select("name, title, owner_profile_id, martial_art")
                .eq("id", bout.event_id)
                .single();
              
              if (event) {
                const eventName = event.title || event.name || "Event";
                
                // 1. Notify the fighter being assigned
                await supabase.from("notifications").insert({
                  profile_id: fighterProfileId,
                  type: "bout_assigned",
                  actor_profile_id: event.owner_profile_id,
                  data: {
                    bout_id: boutId,
                    event_id: bout.event_id,
                    event_name: eventName,
                    side: side,
                  },
                });

                // 2. Notify all event followers that a bout has been matched
                // Use API route to bypass RLS restrictions
                try {
                  const { data: fighterProfile } = await supabase
                    .from("profiles")
                    .select("full_name, username")
                    .eq("id", fighterProfileId)
                    .single();

                  const fighterName = fighterProfile?.full_name || fighterProfile?.username || "A fighter";

                  const response = await fetch(`/api/events/${bout.event_id}/notify-followers`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      boutId,
                      fighterName,
                      side,
                      martialArt: event.martial_art,
                    }),
                  });

                  const result = await response.json();
                  
                  if (response.ok) {
                    console.log("✅ Successfully notified", result.notified, "followers");
                  } else {
                    console.error("Error notifying followers:", result.error);
                  }
                } catch (notifError) {
                  console.error("Error calling notify-followers API:", notifError);
                  // Don't throw - the assignment succeeded
                }
              }
            }
          } catch (notifError) {
            console.error("Bout assignment notification error", notifError);
            // Don't throw - the assignment succeeded
          }
        }
      }

      // (Optional) You could also auto-decline other pending offers for the same bout+side.
    }

    setBusy("none");
    router.refresh(); // refresh server data on the event page
  }

  const disabled = busy !== "none";
  const acceptDisabled = disabled || !fighterProfileId || sameGymConflict;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={acceptDisabled}
        onClick={() => handleDecision("accepted")}
        title={
          sameGymConflict
            ? "Can't accept: both fighters are from the same gym."
            : opponentFighterProfileId && !opponentGymUsername
            ? "Opponent gym is unknown; allowing acceptance."
            : undefined
        }
        className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700 hover:bg-green-100 disabled:opacity-60"
      >
        {busy === "accept" ? "Accepting..." : "Accept"}
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => handleDecision("declined")}
        className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-100 disabled:opacity-60"
      >
        {busy === "decline" ? "Declining..." : "Decline"}
      </button>

      {error && (
        <span className="text-[10px] text-red-600 max-w-xs">{error}</span>
      )}

      {!error && sameGymConflict && (
        <span className="text-[10px] text-amber-700 max-w-xs">
          Same gym matchup blocked
        </span>
      )}
    </div>
  );
}
