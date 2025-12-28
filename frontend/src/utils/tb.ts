import type { Player } from '../types';
import { computeDualWieldMainTb, computeDualWieldOffHandTb } from './dualWield';

export type TbPair = { main: number; offhand: number };

/**
 * Canonical TB computation based on a player's TB fields and attack/crit types.
 *
 * This helper contains the single source of truth on the frontend for mapping
 * attackType -> TB fields (including dual wield), and then applies optional
 * main/offhand bonuses (typically from an equipped weapon).
 */
export function computeTbPair(
  p: Player,
  bonusMain: number = 0,
  bonusOff: number = 0,
): TbPair {
  const attackType = (p.attackType ?? 'slashing') as string;

  let main = 0;
  let off = 0;

  switch (attackType) {
    case 'none':
      main = 0;
      off = 0;
      break;
    case 'slashing':
      main = p.tb1HSlashing ?? 0;
      break;
    case 'blunt':
      main = p.tb1HBlunt ?? 0;
      break;
    case 'clawsAndFangs':
    case 'grabOrBalance':
      main = p.tbUnarmed ?? 0;
      break;
    case 'dualWield': {
      const crit = (p.critType as string | undefined) ?? 'none';
      const base1H =
        crit === 'crushing'
          ? (p.tbUnarmed ?? 0)
          : crit === 'blunt'
            ? (p.tb1HBlunt ?? 0)
            : (p.tb1HSlashing ?? 0);
      main = computeDualWieldMainTb(base1H, p.dualWield);
      off = computeDualWieldOffHandTb(base1H, p.dualWield);
      break;
    }
    case 'twoHanded':
      main = p.tbTwoHanded ?? 0;
      break;
    case 'ranged':
      main = p.tbRanged ?? 0;
      break;
    case 'baseMagic':
    case 'magicBall':
      main = p.tbBaseMagic ?? 0;
      break;
    case 'magicProjectile':
      main = p.tbTargetMagic ?? 0;
      break;
    default:
      main = p.tb ?? 0;
      break;
  }

  return { main: main + bonusMain, offhand: off + bonusOff };
}
