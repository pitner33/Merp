export const LEVEL_CAPS: number[] = [
  0,
  0,
  10000,
  20000,
  30000,
  40000,
  50000,
  70000,
  90000,
  110000,
  130000,
  150000,
  180000,
  210000,
  240000,
  270000,
  300000,
  340000,
  380000,
  420000,
  450000,
];

export function getLevelCap(level: number): number {
  if (!Number.isFinite(level) || level < 1) return 0;
  const idx = Math.min(Math.floor(level), LEVEL_CAPS.length - 1);
  return LEVEL_CAPS[idx] ?? 0;
}

function getNextLevelCap(level: number): number {
  if (!Number.isFinite(level) || level < 1) return LEVEL_CAPS[1] ?? 0;
  const nextIdx = Math.min(Math.floor(level) + 1, LEVEL_CAPS.length - 1);
  // If already at or above the last defined level, treat next cap as Infinity so we don't mark.
  if (nextIdx <= 1) return LEVEL_CAPS[1] ?? 0;
  if (nextIdx === LEVEL_CAPS.length - 1 && Math.floor(level) + 1 >= LEVEL_CAPS.length) return Number.POSITIVE_INFINITY;
  return LEVEL_CAPS[nextIdx] ?? Number.POSITIVE_INFINITY;
}

export function isXpOverCap(level: number, xp: number): boolean {
  if (!Number.isFinite(xp)) return false;
  const nextCap = getNextLevelCap(level);
  return xp >= nextCap;
}

export function formatXp(xp: number): number {
  if (!Number.isFinite(xp)) return 0;
  return Math.trunc(xp);
}
