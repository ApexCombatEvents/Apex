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
  const [showWaiverModal, setShowWaiverModal] = useState(false);
  const [waiverChecked, setWaiverChecked] = useState(false);
  const router = useRouter();

  const sameGymConflict =
    !!offeredFighterGymUsername &&
    !!opponentGymUsername &&
    offeredFighterGymUsername.trim().toLowerCase() ===
      opponentGymUsername.trim().toLowerCase();

  async function processAcceptance() {
    setBusy("accept");
    setShowWaiverModal(false);
    setError(null);

    const supabase = createSupabaseBrowser();

    // Guard: prevent same-gym matchups
    if (fighterProfileId) {
      try {
        const { data: boutRow, error: boutFetchError } = await supabase
          .from("event_bouts")
          .select("id, red_fighter_id, blue_fighter_id")
          .eq("id", boutId)
          .single();

        if (boutFetchError) {
          setError("Could not validate this matchup. Please try again.");
          setBusy("none");
          return;
        }

        const opponentId =
          side === "red" ? boutRow?.blue_fighter_id : boutRow?.red_fighter_id;

        if (opponentId && opponentId === fighterProfileId) {
          setError("You can't match a fighter against themselves.");
          setBusy("none");
          return;
        }

        if (opponentId) {
          const { data: profiles, error: profilesError } = await supabase
            .from("profiles")
            .select("id, social_links")
            .in("id", [fighterProfileId, opponentId]);

          if (profilesError) {
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
        setError("Could not validate this matchup. Please try again.");
        setBusy("none");
        return;
      }
    }

    // Record waiver acceptance
    try {
      await fetch("/api/waivers/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waiver_type: "bout-acceptance",
          metadata: { offer_id: offerId, bout_id: boutId, side },
        }),
      });
    } catch {
      // Non-blocking
    }

    // Update offer status to accepted
    const { error: offerError } = await supabase
      .from("event_bout_offers")
      .update({ status: "accepted" })
      .eq("id", offerId);

    if (offerError) {
      setError(offerError.message);
      setBusy("none");
      return;
    }

    // Charge platform fee and link fighter to bout
    if (fighterProfileId) {
      try {
        const { data: paymentRecord } = await supabase
          .from("offer_payments")
          .select("id, amount_paid, platform_fee")
          .eq("offer_id", offerId)
          .eq("payment_status", "paid")
          .maybeSingle();

        if (paymentRecord && paymentRecord.platform_fee === 0) {
          const platformFee = Math.round((paymentRecord.amount_paid * 5) / 100);
          const { error: updateError } = await supabase
            .from("offer_payments")
            .update({ platform_fee: platformFee, updated_at: new Date().toISOString() })
            .eq("id", paymentRecord.id);

          if (!updateError) {
            try {
              await fetch("/api/stripe/transfer-platform-fee", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ paymentId: paymentRecord.id, offerId }),
              });
            } catch {
              // Non-blocking
            }
          }
        }
      } catch {
        // Non-blocking
      }

      const { data: fighter, error: fighterError } = await supabase
        .from("profiles")
        .select("full_name, username")
        .eq("id", fighterProfileId)
        .single();

      if (fighterError) {
        setError("Offer accepted, but failed to link fighter details.");
      } else {
        const displayName = fighter.full_name || fighter.username || "Fighter";
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
          setError("Offer accepted, but failed to update the bout.");
        } else {
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
                const { data: offerData } = await supabase
                  .from("event_bout_offers")
                  .select("from_profile_id")
                  .eq("id", offerId)
                  .single();

                try {
                  await fetch("/api/notifications/create", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      profile_id: fighterProfileId,
                      type: "bout_assigned",
                      actor_profile_id: event.owner_profile_id,
                      data: { bout_id: boutId, event_id: bout.event_id, event_name: eventName, side },
                    }),
                  });
                } catch {
                  // Non-blocking
                }

                if (offerData?.from_profile_id) {
                  try {
                    await fetch("/api/notifications/create", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
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
                          side,
                        },
                      }),
                    });
                  } catch {
                    // Non-blocking
                  }
                }

                try {
                  const { data: fighterProfile } = await supabase
                    .from("profiles")
                    .select("full_name, username")
                    .eq("id", fighterProfileId)
                    .single();

                  const fighterName =
                    fighterProfile?.full_name || fighterProfile?.username || "A fighter";

                  await fetch(`/api/events/${bout.event_id}/notify-followers`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ boutId, fighterName, side, martialArt: event.martial_art }),
                  });
                } catch {
                  // Non-blocking
                }
              }
            }
          } catch {
            // Non-blocking
          }
        }
      }
    }

    setBusy("none");
    router.refresh();
  }

  async function handleDecline() {
    if (busy !== "none") return;
    setError(null);
    setBusy("decline");

    const supabase = createSupabaseBrowser();

    const { error: offerError } = await supabase
      .from("event_bout_offers")
      .update({ status: "declined" })
      .eq("id", offerId);

    if (offerError) {
      setError(offerError.message);
      setBusy("none");
      return;
    }

    // Process refund if applicable
    try {
      const { data: paymentRecord, error: paymentError } = await supabase
        .from("offer_payments")
        .select("id, amount_paid, payment_status, refund_status, payer_profile_id")
        .eq("offer_id", offerId)
        .eq("payment_status", "paid")
        .maybeSingle();

      if (!paymentError && paymentRecord && paymentRecord.refund_status !== "refunded") {
        try {
          const refundResponse = await fetch("/api/stripe/refund-offer-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ offerId }),
          });

          const refundData = await refundResponse.json();

          if (refundResponse.ok && refundData.success) {
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
                  const { data: fighter } = await supabase
                    .from("profiles")
                    .select("full_name, username")
                    .eq("id", offerData.fighter_profile_id)
                    .single();

                  const { data: currentUser } = await supabase.auth.getUser();
                  const organizerId = currentUser?.user?.id;

                  if (organizerId) {
                    try {
                      await fetch("/api/notifications/create", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          profile_id: paymentRecord.payer_profile_id,
                          type: "offer_declined",
                          actor_profile_id: organizerId,
                          data: {
                            offer_id: offerId,
                            bout_id: offerData.bout_id,
                            event_id: bout.event_id,
                            event_name: event.title || event.name || "Event",
                            fighter_profile_id: offerData.fighter_profile_id,
                            fighter_name: fighter?.full_name || fighter?.username || "A fighter",
                            refund_amount: paymentRecord.amount_paid,
                            refunded: true,
                          },
                        }),
                      });
                    } catch {
                      // Non-blocking
                    }
                  }
                }
              }
            }
          }
        } catch {
          // Non-blocking
        }
      }
    } catch {
      // Non-blocking
    }

    setBusy("none");
    router.refresh();
  }

  function handleAcceptClick() {
    if (busy !== "none" || !fighterProfileId || sameGymConflict) return;
    setWaiverChecked(false);
    setShowWaiverModal(true);
  }

  const disabled = busy !== "none";
  const acceptDisabled = disabled || !fighterProfileId || sameGymConflict;

  return (
    <>
      {/* Waiver confirmation modal */}
      {showWaiverModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowWaiverModal(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                Confirm bout acceptance
              </h2>
              <button
                onClick={() => setShowWaiverModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                ⚠ Liability Waiver
              </p>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={waiverChecked}
                  onChange={(e) => setWaiverChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 flex-shrink-0 accent-purple-600"
                />
                <span className="text-xs text-slate-700 leading-relaxed">
                  I acknowledge that by accepting this bout I confirm this is a valid match-up to the best of my knowledge. The platform is not liable for any injury, harm, or dispute arising from this bout. I have read and agree to the Bout Acceptance Agreement.
                </span>
              </label>
              <a
                href="/waiver/bout-acceptance"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-purple-600 hover:underline ml-7 inline-block"
              >
                Read the full waiver →
              </a>
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowWaiverModal(false)}
                className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!waiverChecked}
                onClick={processAcceptance}
                className="rounded-full bg-green-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm acceptance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline accept / decline buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={acceptDisabled}
          onClick={handleAcceptClick}
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
          onClick={handleDecline}
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
    </>
  );
}
