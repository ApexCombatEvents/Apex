import { NextResponse } from "next/server";
import { createSupabaseServerForRoute } from "@/lib/supabaseServerForRoute";
import { stripe } from "@/lib/stripe";

// Process a payout request (approve and transfer funds via Stripe)
export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServerForRoute();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let payoutRequestId: string;
    let action: string;
    try {
      const json = await req.json();
      payoutRequestId = json.payoutRequestId;
      action = json.action;
    } catch (jsonError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    if (!payoutRequestId || !action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "payoutRequestId and action (approve/reject) are required" },
        { status: 400 }
      );
    }

    // Get payout request
    const { data: payoutRequest, error: requestError } = await supabase
      .from("payout_requests")
      .select(`
        *,
        events:event_id (
          id,
          owner_profile_id,
          profile_id,
          title,
          name
        ),
        fighters:fighter_id (
          id,
          stripe_account_id,
          stripe_account_status,
          full_name,
          username
        ),
        recipient:recipient_profile_id (
          id,
          stripe_account_id,
          stripe_account_status,
          stripe_onboarding_completed,
          full_name,
          username,
          role
        )
      `)
      .eq("id", payoutRequestId)
      .single();

    if (requestError || !payoutRequest) {
      return NextResponse.json({ error: "Payout request not found" }, { status: 404 });
    }

    const event = (payoutRequest as any).events;
    const fighter = (payoutRequest as any).fighters;
    const recipient = (payoutRequest as any).recipient;

    // Validate required data exists
    if (!event) {
      return NextResponse.json({ error: "Event not found for this payout request" }, { status: 404 });
    }

    // Authorization:
    // - For fighter payouts: processor must be event organizer
    // - For organizer payouts: processor must be platform admin
    const { data: processorProfile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    const isAdmin = processorProfile?.role === "ADMIN";
    const ownerId = event?.owner_profile_id || event?.profile_id;
    
    if (!ownerId) {
      return NextResponse.json({ error: "Event owner not found" }, { status: 404 });
    }

    if (payoutRequest.recipient_type === "fighter") {
      if (user.id !== ownerId && !isAdmin) {
        return NextResponse.json(
          { error: "Only event organizers (or platform admins) can process fighter payout requests" },
          { status: 403 }
        );
      }
    } else if (payoutRequest.recipient_type === "organizer") {
      if (!isAdmin) {
        return NextResponse.json(
          { error: "Only platform admins can process organizer payout requests" },
          { status: 403 }
        );
      }
    }

    // Verify payout request is pending (or approved if you later add manual approval step)
    if (payoutRequest.status !== "pending" && payoutRequest.status !== "approved") {
      return NextResponse.json(
        { error: `Payout request is already ${payoutRequest.status}` },
        { status: 400 }
      );
    }

    if (action === "reject") {
      // Reject the payout request
      const { error: updateError } = await supabase
        .from("payout_requests")
        .update({
          status: "rejected",
          processed_by: user.id,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", payoutRequestId);

      if (updateError) {
        console.error("Reject payout error", updateError);
        return NextResponse.json(
          { error: "Failed to reject payout request" },
          { status: 500 }
        );
      }

      // Notify recipient about rejection
      const notifyId =
        (payoutRequest as any).recipient_profile_id || (payoutRequest as any).fighter_id;
      if (notifyId) {
        try {
          await supabase.from("notifications").insert({
            profile_id: notifyId,
            type: "payout_rejected",
            actor_profile_id: user.id,
            data: {
              payout_request_id: payoutRequestId,
              amount: payoutRequest.amount_requested,
              event_id: event?.id || null,
              event_name: event?.title || event?.name || "Event",
              recipient_type: payoutRequest.recipient_type,
            },
          });
        } catch (notifError) {
          console.error("Notification error", notifError);
        }
      }

      return NextResponse.json({ success: true, status: "rejected" });
    }

    // Approve and process payout
    // Determine destination (fighter vs organizer)
    let destinationAccountId: string | null = null;
    let recipientName = "Recipient";

    if (payoutRequest.recipient_type === "fighter") {
      if (!fighter?.stripe_account_id) {
        return NextResponse.json(
          { error: "Fighter has not connected their Stripe account. They need to complete Stripe Connect onboarding first." },
          { status: 400 }
        );
      }
      destinationAccountId = fighter.stripe_account_id as string;
      recipientName = fighter.full_name || fighter.username || "Fighter";
    } else {
      // organizer
      if (!recipient?.stripe_account_id) {
        return NextResponse.json(
          { error: "Organizer has not connected their Stripe account. They need to complete Stripe Connect onboarding first." },
          { status: 400 }
        );
      }
      if (recipient.stripe_account_status !== "active" || !recipient.stripe_onboarding_completed) {
        return NextResponse.json(
          { error: "Organizer's Stripe account is not fully set up. They need to complete onboarding." },
          { status: 400 }
        );
      }
      destinationAccountId = recipient.stripe_account_id as string;
      recipientName = recipient.full_name || recipient.username || "Organizer";
    }

    // Create Stripe transfer to fighter's connected account
    try {
      const transfer = await stripe.transfers.create({
        amount: payoutRequest.amount_requested,
        currency: "usd",
        destination: destinationAccountId as string,
        metadata: {
          payout_request_id: payoutRequestId,
          event_id: event?.id || "",
          event_name: event?.title || event?.name || "Event",
          recipient_profile_id: recipient?.id || fighter?.id || "",
          recipient_type: payoutRequest.recipient_type,
        },
      });

      // Update payout request as processed
      const { error: updateError } = await supabase
        .from("payout_requests")
        .update({
          status: "processed",
          stripe_transfer_id: transfer.id,
          processed_by: user.id,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", payoutRequestId);

      if (updateError) {
        console.error("Update payout error", updateError);
        // Transfer was created but we failed to update the record
        // This is a problem - we should log this for manual reconciliation
        return NextResponse.json(
          { 
            error: "Transfer created but failed to update record. Please contact support.",
            transferId: transfer.id 
          },
          { status: 500 }
        );
      }

      // Create notification for recipient (fighter or organizer)
      try {
        const notifyId =
          (payoutRequest as any).recipient_profile_id || (payoutRequest as any).fighter_id;
        await supabase.from("notifications").insert({
          profile_id: notifyId,
          type: "payout_processed",
          actor_profile_id: user.id,
            data: {
              payout_request_id: payoutRequestId,
              amount: payoutRequest.amount_requested,
              event_id: event?.id || null,
              event_name: event?.title || event?.name || "Event",
              transfer_id: transfer.id,
              recipient_type: payoutRequest.recipient_type,
              recipient_name: recipientName,
            },
        });
      } catch (notifError) {
        console.error("Notification error", notifError);
        // Don't fail the payout if notification fails
      }

      return NextResponse.json({
        success: true,
        status: "processed",
        transferId: transfer.id,
        payoutRequest: {
          ...payoutRequest,
          status: "processed",
          stripe_transfer_id: transfer.id,
        },
      });
    } catch (stripeError: any) {
      console.error("Stripe transfer error", stripeError);

      // Mark request as failed so it doesn't stay stuck in pending forever
      try {
        await supabase
          .from("payout_requests")
          .update({
            status: "failed",
            rejection_reason: stripeError?.message || "Stripe transfer failed",
            processed_by: user.id,
            processed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", payoutRequestId);

        const notifyId =
          (payoutRequest as any).recipient_profile_id || (payoutRequest as any).fighter_id;
        if (notifyId) {
          await supabase.from("notifications").insert({
            profile_id: notifyId,
            type: "payout_failed",
            actor_profile_id: user.id,
            data: {
              payout_request_id: payoutRequestId,
              amount: payoutRequest.amount_requested,
              event_id: event?.id || null,
              event_name: event?.title || event?.name || "Event",
              recipient_type: payoutRequest.recipient_type,
              error: stripeError?.message || "Stripe transfer failed",
            },
          });
        }
      } catch (updateFailErr) {
        console.error("Failed to mark payout request as failed", updateFailErr);
      }

      return NextResponse.json(
        { 
          error: `Stripe transfer failed: ${stripeError.message}`,
          details: stripeError.type 
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Process payout error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process payout" },
      { status: 500 }
    );
  }
}

