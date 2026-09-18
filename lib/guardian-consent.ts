// lib/guardian-consent.ts
// Server-only helpers for the parental consent flow.
//
// A consent link is a capability URL: whoever holds it can authorise a child's
// account. It is treated like a password reset token — random, single use,
// time limited, and stored only as a hash so that reading the database does
// not let anyone mint a valid link.

import { createHash, randomBytes, timingSafeEqual } from "crypto";

/**
 * Restrictions applied to an under-18 account, in plain language.
 * Shared by the consent email and the consent page so a guardian is never
 * shown two different descriptions of what they are agreeing to.
 */
/**
 * What a guardian is actually agreeing to. This is the basis on which a
 * parent gives permission, so every line here must describe something the
 * platform genuinely enforces. Do not add a restriction to this list before
 * the code that enforces it exists.
 */
export const YOUNG_PARTICIPANT_RESTRICTIONS = [
  "Private messaging is switched off entirely, both to them and from them.",
  "Until you give permission, their profile is hidden from everyone except themselves.",
  "After that, their profile can only be seen by people signed in to the platform. It stays out of public view and away from search engines.",
  "Photos must show appropriate clothing. Anything that breaks that rule can be reported and will be taken down.",
  "They cannot receive payments, purses or sponsorship through the platform.",
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
