import type { Player, PlayerInventoryItem } from '../types';

export type WeaponOption = {
  id: number;
  name: string;
  activityType: string | null;
  attackType: string | null;
  critType: string | null;
};

export type WeaponSelectOption = {
  value: string;
  label: string;
};

export const WEAPON_NONE_VALUE = '__none';

export function toWeaponOptions(inventory: PlayerInventoryItem[]): WeaponOption[] {
  return inventory
    .map((item) => item.weapon)
    .filter(
      (weapon): weapon is PlayerInventoryItem['weapon'] & { id: number } =>
        Boolean(weapon) && typeof weapon.id === 'number'
    )
    .map((weapon) => ({
      id: weapon.id,
      name: weapon.name ?? `Weapon #${weapon.id}`,
      activityType: weapon.activityType ?? null,
      attackType: weapon.attackType ?? null,
      critType: weapon.critType ?? null,
    }));
}

export function createWeaponSelectOptionsMap(
  inventoryByPlayerId: Record<number, WeaponOption[]>
): Record<number, WeaponSelectOption[]> {
  const next: Record<number, WeaponSelectOption[]> = {};
  Object.entries(inventoryByPlayerId).forEach(([key, weaponList]) => {
    const playerId = Number(key);
    if (!Number.isFinite(playerId)) return;
    next[playerId] = [
      { value: WEAPON_NONE_VALUE, label: 'None' },
      ...weaponList.map((w) => ({ value: String(w.id), label: w.name ?? `Weapon #${w.id}` })),
    ];
  });
  return next;
}

export function weaponOptionsForPlayer(
  weaponOptionsByPlayer: Record<number, WeaponSelectOption[]>,
  playerId?: number | null
): WeaponSelectOption[] {
  if (playerId == null || !Number.isFinite(playerId)) {
    return [{ value: WEAPON_NONE_VALUE, label: 'None' }];
  }
  const options = weaponOptionsByPlayer[playerId];
  return options && options.length > 0 ? options : [{ value: WEAPON_NONE_VALUE, label: 'None' }];
}

export function createWeaponByIdMap(
  inventoryByPlayerId: Record<number, WeaponOption[]>
): Map<number, WeaponOption> {
  const map = new Map<number, WeaponOption>();
  Object.values(inventoryByPlayerId).forEach((weapons) => {
    weapons.forEach((w) => {
      if (typeof w.id === 'number' && !map.has(w.id)) {
        map.set(w.id, w);
      }
    });
  });
  return map;
}

export function computeWeaponDropdownWidth(
  weaponOptionsByPlayer: Record<number, WeaponSelectOption[]>,
  minWidth = 16
): number {
  const labels: string[] = ['None'];
  Object.values(weaponOptionsByPlayer).forEach((options) => {
    options.forEach((opt) => labels.push(opt.label));
  });
  const longest = labels.reduce((max, label) => Math.max(max, (label ?? '').length), 0);
  return Math.max(minWidth, longest + 2);
}

export function pruneWeaponSelections(
  selections: Record<number, string>,
  inventoryByPlayerId: Record<number, WeaponOption[]>
): Record<number, string> {
  let changed = false;
  const next: Record<number, string> = { ...selections };
  Object.entries(next).forEach(([key, value]) => {
    const playerId = Number(key);
    if (!Number.isFinite(playerId)) return;
    if (value === WEAPON_NONE_VALUE) return;
    const weaponId = Number(value);
    const weapons = inventoryByPlayerId[playerId] ?? [];
    if (!Number.isFinite(weaponId) || !weapons.some((w) => w.id === weaponId)) {
      delete next[playerId];
      changed = true;
    }
  });
  return changed ? next : selections;
}

export function inventoryWeaponsForPlayer(
  inventoryByPlayerId: Record<number, WeaponOption[]>,
  playerId?: number | null
): WeaponOption[] {
  if (playerId == null || !Number.isFinite(playerId)) return [];
  return inventoryByPlayerId[playerId] ?? [];
}

export function weaponValueFromSelections(
  player: Player,
  weaponSelections: Record<number, string>,
  inventoryByPlayerId: Record<number, WeaponOption[]>,
  weaponById: Map<number, WeaponOption>
): string {
  const playerId = typeof player.id === 'number' ? player.id : undefined;
  if (playerId != null) {
    const stored = weaponSelections[playerId];
    if (stored !== undefined) {
      if (stored === WEAPON_NONE_VALUE) return stored;
      const weaponId = Number(stored);
      const weapon = Number.isFinite(weaponId) ? weaponById.get(weaponId) : undefined;
      if (weapon) {
        const activity = player.playerActivity ?? null;
        const attack = player.attackType ?? null;
        const crit = player.critType ?? null;
        if (
          (weapon.activityType ?? null) === activity &&
          (weapon.attackType ?? null) === attack &&
          (weapon.critType ?? null) === crit
        ) {
          return stored;
        }
      }
    }
  }
  const inventoryWeapons = inventoryWeaponsForPlayer(inventoryByPlayerId, playerId);
  if (inventoryWeapons.length === 0) return WEAPON_NONE_VALUE;
  const activity = player.playerActivity ?? null;
  const attack = player.attackType ?? null;
  const crit = player.critType ?? null;
  const match = inventoryWeapons.find(
    (w) =>
      (w.activityType ?? null) === activity &&
      (w.attackType ?? null) === attack &&
      (w.critType ?? null) === crit
  );
  return match ? String(match.id) : WEAPON_NONE_VALUE;
}
