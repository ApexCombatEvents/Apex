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

    // 1b) If declined, process refund for offer fee (if payment was made) and notify sender
    if (decision === "declined") {
      try {
        // Find the payment record for this offer
        const { data: paymentRecord, error: paymentError } = await supabase
          .from("offer_payments")
          .select("id, amount_paid, payment_status, refund_status, payer_profile_id")
          .eq("offer_id", offerId)
          .eq("payment_status", "paid")
          .maybeSingle();

        if (paymentError) {
          console.error("payment lookup error", paymentError);
          // Don't fail the decline action if payment lookup fails
        } else if (paymentRecord && paymentRecord.refund_status !== "refunded") {
          // Process refund via API route
          try {
            const refundResponse = await fetch('/api/stripe/refund-offer-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ offerId }),
            });

            const refundData = await refundResponse.json();

            if (refundResponse.ok && refundData.success) {
              console.log(`✅ Refund processed for offer ${offerId}: $${(paymentRecord.amount_paid / 100).toFixed(2)}`);
              
              // Get offer details for notification
              const { data: offerData } = await supabase
                .from("event_bout_offers")
                .select("bout_id, fighter_profile_id")
                .eq("id", offerId)
                .single();

              if (offerData) {
                const { data: bout } = await supabase
                  .from("event_bouts")
                  .select("event_id")
                  .eq("id", offerData.bout_id)
                  .single();

                if (bout) {
                  const { data: event } = await supabase
                    .from("events")
                    .select("id, name, title")
                    .eq("id", bout.event_id)
                    .single();

                  if (event && paymentRecord.payer_profile_id) {
                    // Get fighter name
                    const { data: fighter } = await supabase
                      .from("profiles")
                      .select("full_name, username")
                      .eq("id", offerData.fighter_profile_id)
                      .single();

                    const fighterName = fighter?.full_name || fighter?.username || "A fighter";
                    const eventName = event.title || event.name || "Event";

                    // Get current user (event organizer) for notification
                    const { data: currentUser } = await supabase.auth.getUser();
                    const organizerId = currentUser?.user?.id;

                    // Notify the sender that their offer was declined and refunded
                    if (organizerId) {
                      try {
                        await fetch('/api/notifications/create', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            profile_id: paymentRecord.payer_profile_id,
                            type: "offer_declined",
                            actor_profile_id: organizerId,
                            data: {
                              offer_id: offerId,
                              bout_id: offerData.bout_id,
                              event_id: bout.event_id,
                              event_name: eventName,
                              fighter_profile_id: offerData.fighter_profile_id,
                              fighter_name: fighterName,
                              refund_amount: paymentRecord.amount_paid,
                              refunded: true,
                            },
                          }),
                        });
                      } catch (notifError) {
                        console.error("Failed to create declined notification:", notifError);
                      }
                    }
                  }
                }
              }
            } else {
              console.error("Refund failed:", refundData.error);
            }
          } catch (refundApiError) {
            console.error("Refund API error:", refundApiError);
            // Don't fail the decline action if refund API call fails
          }
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
          
          const { error: updateError } = await supabase
            .from("offer_payments")
            .update({
              platform_fee: platformFee,
              updated_at: new Date().toISOString(),
            })
            .eq("id", paymentRecord.id);

          if (!updateError) {
            console.log(`✅ Platform fee charged for accepted offer ${offerId}: $${(platformFee / 100).toFixed(2)}`);
            
            // Transfer platform fee to platform owner's account
            try {
              const transferResponse = await fetch('/api/stripe/transfer-platform-fee', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  paymentId: paymentRecord.id,
                  offerId: offerId,
                }),
              });

              const transferData = await transferResponse.json();
              if (transferResponse.ok && transferData.success) {
                console.log(`✅ Platform fee transferred to platform account: $${(platformFee / 100).toFixed(2)}`);
              } else {
                console.error("Platform fee transfer failed:", transferData.error);
              }
            } catch (transferError) {
              console.error("Platform fee transfer error:", transferError);
              // Don't fail the acceptance if transfer fails
            }
          }
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
                
                // Get offer sender info
                const { data: offerData } = await supabase
                  .from("event_bout_offers")
                  .select("from_profile_id")
                  .eq("id", offerId)
                  .single();

                // 1. Notify the fighter being assigned
                try {
                  await fetch('/api/notifications/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      profile_id: fighterProfileId,
                      type: "bout_assigned",
                      actor_profile_id: event.owner_profile_id,
                      data: {
                        bout_id: boutId,
                        event_id: bout.event_id,
                        event_name: eventName,
                        side: side,
                      },
                    }),
                  });
                } catch (notifError) {
                  console.error("Failed to create bout_assigned notification:", notifError);
                }

                // 2. Notify the offer sender that their offer was accepted
                if (offerData?.from_profile_id) {
                  try {
                    await fetch('/api/notifications/create', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        profile_id: offerData.from_profile_id,
                        type: "offer_accepted",
                        actor_profile_id: event.owner_profile_id,
                        data: {
                          offer_id: offerId,
                          bout_id: boutId,
                          event_id: bout.event_id,
                          event_name: eventName,
                          fighter_profile_id: fighterProfileId,
                          fighter_name: displayName,
                          side: side,
                        },
                      }),
                    });
                  } catch (notifError) {
                    console.error("Failed to create offer_accepted notification:", notifError);
                  }
                }

                // 3. Notify all event followers that a bout has been matched
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
