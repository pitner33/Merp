export const LEVEL_CAPS: number[] = [
  0,
  0,
  300,
  900,
  2700,
  6500,
  14000,
  23000,
  34000,
  48000,
  64000,
  85000,
  100000,
  120000,
  140000,
  165000,
  195000,
  225000,
  265000,
  305000,
  355000,
];

export function getLevelCap(level: number): number {
  if (!Number.isFinite(level) || level < 1) return 0;
  const idx = Math.min(Math.floor(level), LEVEL_CAPS.length - 1);
  return LEVEL_CAPS[idx] ?? 0;
}

export function isXpOverCap(level: number, xp: number): boolean {
  return Number.isFinite(xp) && xp > getLevelCap(level);
}

export function formatXp(xp: number): number {
  if (!Number.isFinite(xp)) return 0;
  return Math.trunc(xp);
}
