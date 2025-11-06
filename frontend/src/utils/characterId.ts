import type { Player } from '../types';

export type ParsedCharacterId = {
  prefix: string;
  number: number | null;
  raw: string;
};

export function parseCharacterId(token?: string): ParsedCharacterId {
  if (!token) return { prefix: '', number: null, raw: '' };
  const trimmed = token.trim();
  const match = /^([A-Za-z]+)(\d+)?$/.exec(trimmed);
  if (!match) {
    const upper = trimmed.toUpperCase();
    return { prefix: upper, number: null, raw: upper };
  }
  const prefix = match[1].toUpperCase();
  const number = match[2] != null ? Number(match[2]) : null;
  return { prefix, number, raw: `${prefix}${match[2] ?? ''}` };
}

export function compareCharacterIds(a?: string, b?: string): number {
  const pa = parseCharacterId(a);
  const pb = parseCharacterId(b);
  const prefixCmp = pa.prefix.localeCompare(pb.prefix);
  if (prefixCmp !== 0) return prefixCmp;
  if (pa.number != null && pb.number != null && pa.number !== pb.number) {
    return pa.number - pb.number;
  }
  if (pa.number != null && pb.number == null) return -1;
  if (pa.number == null && pb.number != null) return 1;
  return pa.raw.localeCompare(pb.raw);
}

export function sortPlayersByCharacterId(list: readonly Player[]): Player[] {
  return [...list].sort((a, b) => compareCharacterIds(a.characterId, b.characterId));
}
