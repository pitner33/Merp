export function computeDualWieldMainTb(tbOneHanded?: number | null, dualWield?: number | null): number {
  const base = tbOneHanded ?? 0;
  const skill = dualWield ?? 0;
  if (skill <= 0) return base;

  let factor: number;
  if (skill <= 1) {
    factor = 0.75;
  } else if (skill >= 65) {
    factor = 1.0;
  } else {
    const ratio = (skill - 1) / (65 - 1);
    factor = 0.75 + ratio * (1.0 - 0.75);
  }
  return Math.round(base * factor);
}

export function computeDualWieldOffHandTb(tbOneHanded?: number | null, dualWield?: number | null): number {
  const base = tbOneHanded ?? 0;
  const skill = dualWield ?? 0;
  if (skill <= 0 || base === 0) return 0;

  let factor: number;
  if (skill <= 1) {
    factor = 0.25;
  } else if (skill <= 65) {
    const ratio = (skill - 1) / (65 - 1);
    factor = 0.25 + ratio * (0.5 - 0.25);
  } else if (skill <= 110) {
    const ratio = (skill - 65) / (110 - 65);
    factor = 0.5 + ratio * (1.0 - 0.5);
  } else {
    factor = 1.0;
  }
  return Math.round(base * factor);
}
