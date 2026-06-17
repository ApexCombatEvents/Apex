// lib/email.ts
// Centralized email sending via Resend for notification emails.
// Gracefully no-ops when RESEND_API_KEY is not set so the app works without it.

import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || "Apex Combat Events <notifications@apexcombatevents.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Maps notification type → preference column name
const TYPE_TO_PREF: Record<string, string> = {
  follow: "notify_follow",
  post_like: "notify_post_like",
  post_comment: "notify_post_comment",
  event_like: "notify_event_like",
  event_comment: "notify_event_comment",
  event_follow: "notify_event_follow",
  event_bout_matched: "notify_event_bout_matched",
  event_live: "notify_event_live",
  bout_offer: "notify_bout_offer",
  bout_assigned: "notify_bout_assigned",
  bout_result: "notify_bout_result",
  message: "notify_new_message",
  payout_processed: "notify_payout_processed",
  payout_rejected: "notify_payout_rejected",
  payout_failed: "notify_payout_failed",
  offer_accepted: "notify_bout_offer",
  offer_declined: "notify_bout_offer",
  bout_request: "notify_bout_offer",
  bout_added: "notify_event_bout_matched",
  bout_started: "notify_event_live",
};

function getSubjectAndBody(
  type: string,
  data: Record<string, any>
): { subject: string; text: string; href: string } | null {
  const actorName = data.actor_name || data.follower_name || data.liker_name || data.commenter_name || "Someone";

  switch (type) {
    case "follow":
      return {
        subject: `${actorName} started following you`,
        text: `${actorName} (@${data.follower_handle || data.actor_handle || ""}) is now following your profile on Apex Combat Events.`,
        href: data.follower_handle ? `${APP_URL}/profile/${data.follower_handle}` : APP_URL,
      };
    case "post_like":
      return {
        subject: `${actorName} liked your post`,
        text: `${actorName} liked your post on Apex Combat Events.`,
        href: data.post_id ? `${APP_URL}/posts/${data.post_id}` : APP_URL,
      };
    case "post_comment":
      return {
        subject: `${actorName} commented on your post`,
        text: `${actorName} commented on your post${data.comment_preview ? `: "${data.comment_preview}"` : ""}.`,
        href: data.post_id ? `${APP_URL}/posts/${data.post_id}` : APP_URL,
      };
    case "event_like":
      return {
        subject: `${actorName} liked your event`,
        text: `${actorName} liked your event${data.event_title ? ` "${data.event_title}"` : ""}.`,
        href: data.event_id ? `${APP_URL}/events/${data.event_id}` : APP_URL,
      };
    case "event_comment":
      return {
        subject: `${actorName} commented on your event`,
        text: `${actorName} commented on your event${data.event_title ? ` "${data.event_title}"` : ""}.`,
        href: data.event_id ? `${APP_URL}/events/${data.event_id}` : APP_URL,
      };
    case "event_follow":
      return {
        subject: `${actorName} is following your event`,
        text: `${actorName} started following your event${data.event_title ? ` "${data.event_title}"` : ""}.`,
        href: data.event_id ? `${APP_URL}/events/${data.event_id}` : APP_URL,
      };
    case "bout_offer":
      return {
        subject: "New bout offer received",
        text: `You received a new bout offer${data.event_title ? ` for "${data.event_title}"` : ""}. Log in to review it.`,
        href: data.event_id ? `${APP_URL}/events/${data.event_id}/offers` : APP_URL,
      };
    case "bout_request":
      return {
        subject: "New bout request",
        text: `${actorName} has requested a bout${data.event_title ? ` at "${data.event_title}"` : ""}. Log in to review.`,
        href: data.event_id ? `${APP_URL}/events/${data.event_id}/offers` : APP_URL,
      };
    case "bout_assigned":
      return {
        subject: "You've been assigned to a bout!",
        text: `You have been assigned to a bout${data.event_title ? ` at "${data.event_title}"` : ""}. Check the event for details.`,
        href: data.event_id ? `${APP_URL}/events/${data.event_id}` : APP_URL,
      };
    case "offer_accepted":
      return {
        subject: "Your offer was accepted",
        text: `Your bout offer${data.event_title ? ` for "${data.event_title}"` : ""} has been accepted.`,
        href: data.event_id ? `${APP_URL}/events/${data.event_id}` : APP_URL,
      };
    case "offer_declined":
      return {
        subject: "Your offer was declined",
        text: `Your bout offer${data.event_title ? ` for "${data.event_title}"` : ""} was declined. Your payment has been refunded.`,
        href: data.event_id ? `${APP_URL}/events/${data.event_id}` : APP_URL,
      };
    case "event_bout_matched":
    case "bout_added":
      return {
        subject: `New bout added${data.event_title ? ` — ${data.event_title}` : ""}`,
        text: `A new bout has been added to${data.event_title ? ` "${data.event_title}"` : " an event you follow"}.`,
        href: data.event_id ? `${APP_URL}/events/${data.event_id}` : APP_URL,
      };
    case "event_live":
    case "bout_started":
      return {
        subject: `Event is LIVE${data.event_title ? ` — ${data.event_title}` : ""}!`,
        text: `${data.event_title || "An event you follow"} is now live! Tune in now.`,
        href: data.event_id ? `${APP_URL}/events/${data.event_id}/live` : APP_URL,
      };
    case "bout_result":
      return {
        subject: `Bout result posted${data.event_title ? ` — ${data.event_title}` : ""}`,
        text: `A bout result has been posted for${data.event_title ? ` "${data.event_title}"` : " an event you follow"}.`,
        href: data.event_id ? `${APP_URL}/events/${data.event_id}` : APP_URL,
      };
    case "message":
      return {
        subject: `New message from ${actorName}`,
        text: `${actorName} sent you a message${data.preview ? `: "${data.preview}"` : ""}. Log in to reply.`,
        href: data.threadId ? `${APP_URL}/messages/${data.threadId}` : `${APP_URL}/messages`,
      };
    case "payout_processed":
      return {
        subject: "Your payout has been processed",
        text: "Your payout request has been approved and processed. The funds are on their way.",
        href: `${APP_URL}/earnings`,
      };
    case "payout_rejected":
      return {
        subject: "Your payout request was rejected",
        text: `Your payout request was rejected${data.reason ? `: ${data.reason}` : ". Please check your account for details."}.`,
        href: `${APP_URL}/earnings`,
      };
    case "payout_failed":
      return {
        subject: "Payout transfer failed",
        text: "Your payout transfer failed. Please check your payment settings and try again.",
        href: `${APP_URL}/settings`,
      };
    default:
      return null;
  }
}

function buildEmailHtml(text: string, href: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:24px 32px;">
            <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">Apex</span>
            <span style="color:#e9d5ff;font-size:11px;font-weight:600;margin-left:6px;text-transform:uppercase;letter-spacing:1px;">Combat Events</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#1e293b;">${text}</p>
            <a href="${href}" style="display:inline-block;padding:12px 28px;background:#7c3aed;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">View on Apex</a>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f1f5f9;">
            <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.5;">
              You're receiving this because you have email notifications enabled. 
              <a href="${APP_URL}/settings/notifications" style="color:#7c3aed;text-decoration:underline;">Manage preferences</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

/**
 * Send a notification email. Looks up the recipient's email and preferences,
 * then sends via Resend. No-ops gracefully if Resend is not configured,
 * or if the user has disabled email for this notification type.
 */
export async function sendNotificationEmail(opts: {
  supabaseAdmin: any;
  recipientProfileId: string;
  type: string;
  data: Record<string, any>;
}): Promise<void> {
  if (!resend) return;

  const { supabaseAdmin, recipientProfileId, type, data } = opts;

  try {
    // Check user preference for this notification type
    const prefColumn = TYPE_TO_PREF[type];
    if (prefColumn) {
      const { data: prefs } = await supabaseAdmin
        .from("notification_preferences")
        .select(prefColumn)
        .eq("profile_id", recipientProfileId)
        .maybeSingle();

      if (prefs && prefs[prefColumn] === false) {
        return; // User disabled this notification type
      }
    }

    // Get recipient email from Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(recipientProfileId);

    if (authError || !authData?.user?.email) {
      return;
    }

    const email = authData.user.email;
    const content = getSubjectAndBody(type, data);
    if (!content) return;

    const html = buildEmailHtml(content.text, content.href);

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: content.subject,
      html,
      text: `${content.text}\n\nView on Apex: ${content.href}`,
    });
  } catch (error) {
    console.error(`Email send failed for type=${type}:`, error);
  }
}
