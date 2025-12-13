import { get, put } from './client';

export type EarlyYearsProfileDto = {
  baseData?: BaseDataDto | null;
  attributes?: AttributeTotalDto[];
  spellLists?: SpellListDto[];
  languages?: LanguageDto[];
  bonusAdjustments?: BonusAdjustmentDto[];
  skills?: SkillRowDto[];
};

export type BaseDataDto = {
  characterId?: string | null;
  name?: string | null;
  gender?: string | null;
  race?: string | null;
  playerClass?: string | null;
  lvl?: number | null;
  xp?: number | null;
  magicSchool?: string | null;
  age?: string | null;
  height?: string | null;
  weight?: string | null;
  hair?: string | null;
  eyes?: string | null;
  personality?: string | null;
  alignment?: string | null;
  motivation?: string | null;
  specialty?: string | null;
  armorType?: string | null;
};

export type AttributeTotalDto = {
  attributeKey?: string | null;
  baseValue?: number | null;
  normalBonus?: number | null;
  raceBonus?: number | null;
  totalBonus?: number | null;
};

export type SpellListDto = {
  id?: number | null;
  name?: string | null;
  chance?: number | null;
  learnt?: boolean | null;
  displayOrder?: number | null;
};

export type LanguageDto = {
  id?: number | null;
  name?: string | null;
  level?: number | null;
  displayOrder?: number | null;
};

export type BonusAdjustmentDto = {
  id?: number | null;
  bonusKey?: string | null;
  label?: string | null;
  attributeKey?: string | null;
  attributeBonus?: number | null;
  itemBonus?: number | null;
  specialBonus?: number | null;
  totalBonus?: number | null;
  displayOrder?: number | null;
};

export type SkillRowDto = {
  skillDefinitionId?: number | null;
  skillName?: string | null;
  levelBonus?: number | null;
  levelCount?: number | null;
  levelsMask?: string | null;
  attributeBonus?: number | null;
  classBonus?: number | null;
  itemBonus?: number | null;
  specialBonus?: number | null;
  totalBonus?: number | null;
  manualLevelInput?: number | null;
};

export async function fetchEarlyYearsProfile(playerId: number) {
  return get<EarlyYearsProfileDto>(`/players/${playerId}/early-years`);
}

export async function saveEarlyYearsProfile(playerId: number, payload: EarlyYearsProfileDto) {
  return put<EarlyYearsProfileDto>(`/players/${playerId}/early-years`, payload);
}
