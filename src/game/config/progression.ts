// Display-side copy of public.level_thresholds. The server is authoritative; a unit test keeps
// the two in sync with the migration's formula.

export type CareerRank = "intern" | "junior" | "mid" | "senior" | "techlead";

const BASE = [0, 150, 350, 600, 900, 1250, 1650, 2100, 2600, 3150, 3750, 4400]; // L1..L12

/** Cumulative XP needed to reach each level, index 0 = level 1. */
export const LEVEL_THRESHOLDS: readonly number[] = [
  ...BASE,
  ...Array.from({ length: 9 }, (_, i) => 5100 + i * 800), // L13..L21
  ...Array.from({ length: 10 }, (_, i) => 11500 + (i + 1) * 1000), // L22..L31
  ...Array.from({ length: 9 }, (_, i) => 21500 + (i + 1) * 1200), // L32..L40
];

export const MAX_LEVEL = LEVEL_THRESHOLDS.length;

export function levelForXp(xp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]!) level = i + 1;
  }
  return level;
}

/** Progress within the current level, for the HUD XP bar. */
export function levelProgress(xp: number) {
  const level = levelForXp(xp);
  const floor = LEVEL_THRESHOLDS[level - 1]!;
  const next = LEVEL_THRESHOLDS[level];
  return { level, current: xp - floor, needed: next === undefined ? null : next - floor };
}

/** Rank a level is eligible for. The actual title changes only after the promotion boss. */
export function eligibleRank(level: number): CareerRank {
  if (level >= 31) return "techlead";
  if (level >= 21) return "senior";
  if (level >= 13) return "mid";
  if (level >= 6) return "junior";
  return "intern";
}
