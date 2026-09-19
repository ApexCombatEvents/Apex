// lib/waivers.ts
// Single source of truth for waiver versions and review dates.
//
// The version written to waiver_acceptances must match the document the user
// was shown. Do not bump a version or move a review date unless the text of
// that waiver actually changed.

export const PUBLIC_WAIVER_TYPES = ["signup", "event-creation", "bout-acceptance"] as const;
export type PublicWaiverType = (typeof PUBLIC_WAIVER_TYPES)[number];

export const RECORDED_WAIVER_TYPES = [
  ...PUBLIC_WAIVER_TYPES,
  "parental-consent",
] as const;
export type RecordedWaiverType = (typeof RECORDED_WAIVER_TYPES)[number];

type WaiverMeta = {
  /** Display number, without the "v" or "Version" prefix. */
  version: string;
  /** Calendar date the text was last actually reviewed. Never "today". */
  lastReviewed: string;
};

/**
 * Parental consent records the same version as the signup agreement, because
 * that is the document the guardian accepts on the young person's behalf.
 */
export const WAIVER_META: Record<RecordedWaiverType, WaiverMeta> = {
  signup: { version: "2.0", lastReviewed: "19 September 2026" },
  "event-creation": { version: "1.0", lastReviewed: "19 September 2026" },
  "bout-acceptance": { version: "1.0", lastReviewed: "19 September 2026" },
  "parental-consent": { version: "2.0", lastReviewed: "19 September 2026" },
};

/** Stored on waiver_acceptances, e.g. "v2.0". */
export function waiverVersion(type: RecordedWaiverType): string {
  return `v${WAIVER_META[type].version}`;
}

/** Shown on the public waiver page, e.g. "Version 2.0". */
export function waiverDisplayVersion(type: PublicWaiverType): string {
  return `Version ${WAIVER_META[type].version}`;
}

export function waiverLastReviewed(type: PublicWaiverType): string {
  return WAIVER_META[type].lastReviewed;
}
