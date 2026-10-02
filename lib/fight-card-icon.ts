// lib/fight-card-icon.ts
//
// Fighters and coaches may upload a "fight picture" used wherever they appear
// on a fight card. Everything else on the site keeps using avatar_url, so this
// resolver is the only place the fallback is expressed.

export type FightCardIconSource = {
  avatar_url?: string | null;
  fight_card_icon_url?: string | null;
};

/** The photo to show for someone on a fight card, or null if they have none. */
export function fightCardIcon(
  profile: FightCardIconSource | null | undefined
): string | null {
  if (!profile) return null;
  return profile.fight_card_icon_url || profile.avatar_url || null;
}

/**
 * Matching height for a 3:4 portrait at the given requested width. Callers
 * request roughly three times the rendered width: below about 2x the image
 * visibly softens, and the point of the separate upload is that it reads
 * clearly at fight-card size.
 */
export function fightCardIconHeight(requestedWidth: number): number {
  return Math.round((requestedWidth * 4) / 3);
}

/**
 * Above about 90 the extra bytes buy almost nothing visible, and a fight card
 * can show twenty of these on one page.
 */
export const FIGHT_CARD_ICON_QUALITY = 90;
