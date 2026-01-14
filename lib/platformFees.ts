// Platform fee configuration
// This can be moved to environment variables or database settings later

export const PLATFORM_FEE_PERCENTAGE = 5; // 5% platform fee

/**
 * Calculate platform fee from an amount (in cents)
 * @param amountCents - Amount in cents
 * @returns Platform fee in cents (rounded)
 */
export function calculatePlatformFee(amountCents: number): number {
  return Math.round((amountCents * PLATFORM_FEE_PERCENTAGE) / 100);
}

/**
 * Calculate amount after platform fee deduction
 * @param amountCents - Original amount in cents
 * @returns Amount after platform fee deduction (in cents)
 */
export function amountAfterPlatformFee(amountCents: number): number {
  return amountCents - calculatePlatformFee(amountCents);
}

/**
 * Format cents to dollars for display
 */
export function formatCentsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}
