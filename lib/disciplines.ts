export const DISCIPLINES = [
  "MMA",
  "Muay Thai",
  "Boxing",
  "Bare Knuckle",
  "Kickboxing",
  "K-1",
  "BJJ",
] as const;

export type Discipline = (typeof DISCIPLINES)[number];
