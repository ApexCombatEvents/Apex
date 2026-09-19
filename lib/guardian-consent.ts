// lib/guardian-consent.ts
// Server-only helpers for the parental consent flow.
//
// A consent link is a capability URL: whoever holds it can authorise a child's
// account. It is treated like a password reset token — random, single use,
// time limited, and stored only as a hash so that reading the database does
// not let anyone mint a valid link.

import { createHash, randomBytes, timingSafeEqual } from "crypto";

/**
 * What a guardian is actually agreeing to, in plain language. Shared by the
 * consent email and the consent page so a guardian is never shown two
 * different descriptions of what they are agreeing to.
 *
 * This is the basis on which a parent gives permission, so every line must
 * describe something that genuinely happens. Do not add a restriction here
 * before the code, or the human process, that delivers it exists.
 */
export const YOUNG_PARTICIPANT_RESTRICTIONS = [
  "Private messaging is switched off entirely, both to them and from them.",
  "Until you give permission, their profile is hidden from everyone except themselves.",
  "After that, their profile can only be seen by people signed in to the platform. It stays out of public view and away from search engines.",
  "Their profile shows their country only. It never shows their town or address.",
  "Photos must show appropriate clothing. We check accounts belonging to under-18s against our guidelines, and anything that breaks them is removed.",
  "Purses, sponsorship and any other payment are arranged directly between you and the organiser, away from the platform.",
] as const;

/** Entropy in the emailed token. */
const TOKEN_BYTES = 32;

/** How long a guardian has to respond before the link stops working. */
export const CONSENT_EXPIRY_DAYS = 7;

/**
 * Generate a fresh consent token. Returned in URL-safe form; this is the only
 * point at which the raw value exists, so it must be emailed and discarded.
 */
export function generateConsentToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

/**
 * Hash a consent token for storage and lookup.
 */
export function hashConsentToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Compare two token hashes without leaking timing information.
 */
export function consentTokenHashesMatch(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return timingSafeEqual(bufferA, bufferB);
}

/**
 * Expiry timestamp for a newly issued token.
 */
export function consentExpiryDate(from: Date = new Date()): Date {
  const expiry = new Date(from);
  expiry.setUTCDate(expiry.getUTCDate() + CONSENT_EXPIRY_DAYS);
  return expiry;
}

/**
 * Build the URL emailed to the guardian.
 */
export function buildConsentUrl(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/$/, "")}/guardian-consent/${token}`;
}

/**
 * Generate the standing withdrawal token issued once a guardian consents.
 *
 * Separate from the consent token because that one is spent on use. This one
 * deliberately never expires: the right to withdraw permission for a child
 * does not lapse.
 */
export function generateWithdrawalToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

/**
 * Build the withdrawal URL included in the confirmation email.
 */
export function buildWithdrawUrl(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/$/, "")}/guardian-consent/withdraw/${token}`;
}

/**
 * Site origin for emailed links. Prefer the request so a local test does not
 * point a real inbox at production, and fall back to the configured app URL.
 */
export function requestBaseUrl(req: Request): string {
  const origin = req.headers.get("origin");
  if (origin) return origin.replace(/\/$/, "");

  const host = req.headers.get("x-forwarded-host");
  if (host) {
    const proto = req.headers.get("x-forwarded-proto") || "https";
    return `${proto}://${host}`.replace(/\/$/, "");
  }

  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Print the consent link to the server console in development.
 *
 * Logged on every issue, not just failures: the raw token exists only for the
 * duration of the request that created it, so without this the flow cannot be
 * retested locally whenever mail delivery is unavailable or misconfigured, or
 * the guardian address is a throwaway.
 *
 * Hard-gated to development. This URL authorises a child's account and must
 * never reach a production log.
 */
export function logConsentUrlInDevelopment(consentUrl: string, guardianEmail: string): void {
  if (process.env.NODE_ENV !== "development") return;

  console.info(
    `[guardian-consent] Consent link for ${guardianEmail}:\n${consentUrl}`
  );
}

/**
 * Print the standing withdrawal link in development, for the same reason as
 * the consent link: the raw token exists only for this request.
 */
export function logWithdrawalUrlInDevelopment(withdrawUrl: string, guardianEmail: string): void {
  if (process.env.NODE_ENV !== "development") return;

  console.info(
    `[guardian-consent] Withdrawal link for ${guardianEmail}:\n${withdrawUrl}`
  );
}
