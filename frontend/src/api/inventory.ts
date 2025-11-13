import { get, post, del } from './client';
import type { PlayerInventoryItem } from '../types';

export async function fetchInventory(playerId: number): Promise<PlayerInventoryItem[]> {
  return get<PlayerInventoryItem[]>(`/players/${playerId}/inventory`);
}

export async function addWeapons(playerId: number, weaponIds: number[]): Promise<PlayerInventoryItem[]> {
  return post<PlayerInventoryItem[]>(`/players/${playerId}/inventory`, { weaponIds });
}

export async function removeWeapon(playerId: number, weaponId: number): Promise<void> {
  await del(`/players/${playerId}/inventory/${weaponId}`);
}
