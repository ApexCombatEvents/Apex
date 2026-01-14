import { clsx, type ClassValue } from "clsx";

/**
 * Tailwind-friendly className merger.
 * We keep it simple (clsx only) since tailwind-merge isn't installed.
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}


