import type { Player } from '../types';

const API_BASE = (import.meta as any)?.env?.VITE_API_BASE || '';

export async function fetchPlayers(): Promise<Player[]> {
  const res = await fetch(`${API_BASE}/api/players`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Failed to load players: ${res.status}`);
  }
  return res.json();
}
