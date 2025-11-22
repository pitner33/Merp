import { Fragment, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const COLORS = {
  primary: '#2f5597',
  textPrimary: '#123066',
  surface: '#f9fafb',
  border: '#ddd',
  danger: '#7a1f1f'
} as const;

const ATTRIBUTE_KEYS = ['STR', 'DEX', 'CON', 'IQ', 'IT', 'CH'] as const;
type AttributeKey = (typeof ATTRIBUTE_KEYS)[number];
const SKILL_LEVEL_COUNT = 30;
const HP_MAX_SKILL_NAME = 'HP max';

type SkillAttributeKey = AttributeKey | 'XX';
type SkillCategory =
  | 'MM Skills'
  | 'Weapon Skills'
  | 'General Skills'
  | 'Thief Skills'
  | 'Magic Skills'
  | 'Other Skills'
  | 'Secondary skills';

type SkillDefinitionEntry = {
  name: string;
  category: SkillCategory;
  attributeKey: SkillAttributeKey;
};

type SkillDefinitionWithIndex = SkillDefinitionEntry & { stateIndex: number };

const SKILL_CATEGORIES: readonly SkillCategory[] = [
  'MM Skills',
  'Weapon Skills',
  'General Skills',
  'Thief Skills',
  'Magic Skills',
  'Other Skills',
  'Secondary skills'
] as const;

const SKILL_DEFINITIONS: readonly SkillDefinitionEntry[] = [
  { name: 'None', category: 'MM Skills', attributeKey: 'DEX' },
  { name: 'Leather', category: 'MM Skills', attributeKey: 'DEX' },
  { name: 'Heavy Leather', category: 'MM Skills', attributeKey: 'DEX' },
  { name: 'Chainmail', category: 'MM Skills', attributeKey: 'STR' },
  { name: 'Plate', category: 'MM Skills', attributeKey: 'STR' },
  { name: 'Slashing', category: 'Weapon Skills', attributeKey: 'STR' },
  { name: 'Blunt', category: 'Weapon Skills', attributeKey: 'STR' },
  { name: 'Two-handed', category: 'Weapon Skills', attributeKey: 'STR' },
  { name: 'Dual Wield', category: 'Weapon Skills', attributeKey: 'STR' },
  { name: 'Ranged', category: 'Weapon Skills', attributeKey: 'DEX' },
  { name: 'VB', category: 'Weapon Skills', attributeKey: 'DEX' },
  { name: 'Climbing', category: 'General Skills', attributeKey: 'DEX' },
  { name: 'Riding', category: 'General Skills', attributeKey: 'IT' },
  { name: 'Swimming', category: 'General Skills', attributeKey: 'DEX' },
  { name: 'Tracking', category: 'General Skills', attributeKey: 'IQ' },
  { name: 'Backstab', category: 'Thief Skills', attributeKey: 'XX' },
  { name: 'Stealth', category: 'Thief Skills', attributeKey: 'DEX' },
  { name: 'Lockpicking', category: 'Thief Skills', attributeKey: 'IQ' },
  { name: 'Disarm Traps', category: 'Thief Skills', attributeKey: 'DEX' },
  { name: 'Runes', category: 'Magic Skills', attributeKey: 'IQ' },
  { name: 'Object Usage', category: 'Magic Skills', attributeKey: 'IT' },
  { name: 'Target magic', category: 'Magic Skills', attributeKey: 'DEX' },
  { name: 'Base magic', category: 'Other Skills', attributeKey: 'XX' },
  { name: 'Perception', category: 'Other Skills', attributeKey: 'IT' },
  { name: 'Influence', category: 'Other Skills', attributeKey: 'CH' },
  { name: 'HP max', category: 'Other Skills', attributeKey: 'CON' },
  { name: 'Acrobatics', category: 'Secondary skills', attributeKey: 'DEX' },
  { name: 'Ships', category: 'Secondary skills', attributeKey: 'IT' },
  { name: 'Caving', category: 'Secondary skills', attributeKey: 'IQ' },
  { name: 'First Aid', category: 'Secondary skills', attributeKey: 'IQ' },
  { name: 'Cooking', category: 'Secondary skills', attributeKey: 'IT' },
  { name: 'Ropes', category: 'Secondary skills', attributeKey: 'IQ' }
] as const;

const SKILL_DEFINITIONS_WITH_INDEX: readonly SkillDefinitionWithIndex[] = SKILL_DEFINITIONS.map((definition, index) => ({
  ...definition,
  stateIndex: index
}));

const MM_SPECIAL_BONUS_DEFAULTS: Record<string, string> = {
  None: '0',
  Leather: '-15',
  'Heavy Leather': '-30',
  Chainmail: '-45',
  Plate: '-60'
};

function getDefaultSpecialBonus(skillName: string): string {
  return MM_SPECIAL_BONUS_DEFAULTS[skillName] ?? '0';
}

const MM_SKILL_LEVEL_CAPS: Record<string, number> = {
  None: 4,
  Leather: 5,
  'Heavy Leather': 7,
  Chainmail: 9,
  Plate: 11
};

function getSkillLevelArray(levels: boolean[], definition: SkillDefinitionWithIndex): boolean[] {
  if (definition.category !== 'MM Skills') {
    return levels;
  }
  const cap = MM_SKILL_LEVEL_CAPS[definition.name];
  if (cap == null) {
    return levels;
  }
  return levels.slice(0, cap);
}

const ZERO_LEVEL_BONUS_OVERRIDE_SKILLS = new Set<string>([HP_MAX_SKILL_NAME, 'VB']);
const LOCKED_SKILLS = new Set<string>(['Base magic']);

function isSkillLocked(skillName: string): boolean {
  return LOCKED_SKILLS.has(skillName);
}

function getZeroLevelBonus(skillName: string): number {
  return ZERO_LEVEL_BONUS_OVERRIDE_SKILLS.has(skillName) ? 0 : -25;
}

const MD_BONUS_ROWS: readonly { label: string; attribute: AttributeKey }[] = [
  { label: 'Essence MD bonus', attribute: 'IQ' },
  { label: 'Chanelling MD bonus', attribute: 'IT' },
  { label: 'Poison MD bonus', attribute: 'CON' },
  { label: 'Disease MD bonus', attribute: 'CON' }
] as const;

const SKILLS_BY_CATEGORY: readonly { category: SkillCategory; items: SkillDefinitionWithIndex[] }[] = SKILL_CATEGORIES
  .map((category) => ({
    category,
    items: SKILL_DEFINITIONS_WITH_INDEX.filter((definition) => definition.category === category)
  }))
  .filter((group) => group.items.length > 0);

const CHARACTER_ID_OPTIONS = [
  { value: '', label: 'Select…' },
  { value: 'JK', label: 'JK' },
  { value: 'NJK', label: 'NJK' }
] as const;

const MAGIC_SCHOOL_OPTIONS = [
  { value: '', label: 'Select…' },
  { value: 'essence', label: 'Essence' },
  { value: 'channeling', label: 'Channeling' }
] as const;

type RaceOption = {
  code: string;
  displayName?: string | null;
};

type MetaOptions = {
  genders: string[];
  races: RaceOption[];
  playerClasses: string[];
  armorTypes?: string[];
};

type CharacterDetailsState = {
  characterId: string;
  name: string;
  gender: string;
  race: string;
  playerClass: string;
};

type BaseDataState = {
  characterId: string;
  name: string;
  gender: string;
  race: string;
  playerClass: string;
  magicSchool: string;
  age: string;
  height: string;
  weight: string;
  hair: string;
  eyes: string;
  personality: string;
  alignment: string;
  motivation: string;
  specialty: string;
  armorType: string;
};

type SpellListRow = {
  id: number;
  name: string;
  chance: string;
  learnt: boolean;
};

type LanguageRow = {
  id: number;
  name: string;
  level: string;
};

type AttributeSummary = {
  attribute: string;
  value: number;
  normalBonus: number;
  raceBonus: number;
  sum: number;
};

type AttributeRow = {
  attribute: AttributeKey;
  baseValue: number | null;
  normalBonus: number | null;
  raceBonus: number | null;
  totalBonus: number | null;
};

type SkillRowState = {
  levels: boolean[];
  itemBonus: string;
  specialBonus: string;
  classBonus: number;
  levelBonus: number;
  manualLevelInput: string;
};

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api';
const API_ROOT = API_BASE.replace(/\/$/, '');
const RACE_BONUS_ENDPOINT = (raceKey: string) => `${API_ROOT}/attributes/race-bonuses/${encodeURIComponent(raceKey)}`;
const SKILL_LEVEL_BONUS_ENDPOINT = (skillName: string, levelCount: number) => `${API_ROOT}/skills/level-bonus?skillName=${encodeURIComponent(skillName)}&levels=${levelCount}`;
const CHILDHOOD_SKILLS_ENDPOINT = (raceKey: string) => `${API_ROOT}/attributes/childhood-skills/${encodeURIComponent(raceKey)}`;
const CLASS_BONUS_ENDPOINT = (classKey: string) => `${API_ROOT}/attributes/class-bonuses/${encodeURIComponent(classKey)}`;
const MANA_BONUS_ENDPOINT = (value: number) => `${API_ROOT}/attributes/mana-bonuses/${value}`;

function formatOptionLabel(value: string): string {
  if (!value) return '';
  const spaced = value
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function createInitialBaseData(details?: CharacterDetailsState): BaseDataState {
  return {
    characterId: details?.characterId ?? '',
    name: details?.name ?? '',
    gender: details?.gender ?? '',
    race: details?.race ?? '',
    playerClass: details?.playerClass ?? '',
    magicSchool: '',
    age: '',
    height: '',
    weight: '',
    hair: '',
    eyes: '',
    personality: '',
    alignment: '',
    motivation: '',
    specialty: '',
    armorType: 'none'
  };
}

function mapAttributeRowsFromState(source?: AttributeSummary[]): AttributeRow[] {
  if (source && source.length > 0) {
    return ATTRIBUTE_KEYS.map((attribute) => {
      const match = source.find((entry) => entry.attribute === attribute);
      return {
        attribute,
        baseValue: match && typeof match.value === 'number' ? match.value : null,
        normalBonus: match && typeof match.normalBonus === 'number' ? match.normalBonus : null,
        raceBonus: match && typeof match.raceBonus === 'number' ? match.raceBonus : null,
        totalBonus: match && typeof match.sum === 'number'
          ? match.sum
          : match && typeof match.normalBonus === 'number' && typeof match.raceBonus === 'number'
            ? match.normalBonus + match.raceBonus
            : null
      };
    });
  }
  return ATTRIBUTE_KEYS.map((attribute) => ({
    attribute,
    baseValue: null,
    normalBonus: null,
    raceBonus: null,
    totalBonus: null
  }));
}

function formatSigned(value: number): string {
  if (value > 0) return `+${value}`;
  if (value < 0) return `${value}`;
  return '0';
}

function parseBonusInput(value: string): number {
  if (typeof value !== 'string') return 0;
  const trimmed = value.trim();
  if (trimmed.length === 0) return 0;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function CreateCharacterEarlyYears() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { details?: CharacterDetailsState; meta?: MetaOptions; attributes?: AttributeSummary[] } | undefined;
  const [meta, setMeta] = useState<MetaOptions>(() => locationState?.meta ?? { genders: [], races: [], playerClasses: [], armorTypes: [] });
  const [metaLoading, setMetaLoading] = useState<boolean>(!locationState?.meta);
  const [metaError, setMetaError] = useState<string | null>(null);
  const detailsFromState = locationState?.details;
  const [baseData, setBaseData] = useState<BaseDataState>(() => createInitialBaseData(detailsFromState));
  const [spellLists, setSpellLists] = useState<SpellListRow[]>(() => Array.from({ length: 15 }, (_, index) => ({
    id: index,
    name: '',
    chance: '',
    learnt: false
  })));
  const [languages, setLanguages] = useState<LanguageRow[]>(() => Array.from({ length: 10 }, (_, index) => ({
    id: index,
    name: '',
    level: ''
  })));
  const [attributeRows, setAttributeRows] = useState<AttributeRow[]>(() => mapAttributeRowsFromState(locationState?.attributes));
  const [manaBonusAdjustment, setManaBonusAdjustment] = useState({ itemBonus: '0', specialBonus: '0' });
  const [manaAttributeBonus, setManaAttributeBonus] = useState<number | null>(null);
  const [mdBonusAdjustments, setMdBonusAdjustments] = useState(() => MD_BONUS_ROWS.map(() => ({ itemBonus: '0', specialBonus: '0' })));
  const [raceBonusError, setRaceBonusError] = useState<string | null>(null);
  const [raceBonusLoading, setRaceBonusLoading] = useState(false);
  const [skillRows, setSkillRows] = useState<SkillRowState[]>(() =>
    SKILL_DEFINITIONS.map((definition) => {
      const isHpMax = definition.name === HP_MAX_SKILL_NAME;
      const zeroLevelBonus = getZeroLevelBonus(definition.name);
      return {
        levels: Array.from({ length: SKILL_LEVEL_COUNT }, () => false),
        itemBonus: '0',
        specialBonus: getDefaultSpecialBonus(definition.name),
        classBonus: 0,
        levelBonus: zeroLevelBonus,
        manualLevelInput: isHpMax ? '0' : String(zeroLevelBonus)
      };
    })
  );
  const characterLevel = 1;

  const attributeRowMap = useMemo(() => {
    const map = new Map<AttributeKey, AttributeRow>();
    attributeRows.forEach((row) => {
      map.set(row.attribute, row);
    });
    return map;
  }, [attributeRows]);

  useEffect(() => {
    document.title = 'Character Creation – Early Years';
  }, []);

  useEffect(() => {
    let ignore = false;

    if (locationState?.meta) {
      setMeta({
        genders: locationState.meta.genders,
        races: locationState.meta.races,
        playerClasses: locationState.meta.playerClasses,
        armorTypes: locationState.meta.armorTypes ?? []
      });
      setMetaLoading(false);
      setMetaError(null);
      if (locationState.meta.armorTypes && locationState.meta.armorTypes.length > 0) {
        return;
      }
    }

    async function loadMeta() {
      try {
        setMetaLoading(true);
        setMetaError(null);
        const [genders, races, playerClasses, armorTypes] = await Promise.all([
          fetch(`${API_ROOT}/meta/genders`).then(async (res) => {
            if (!res.ok) throw new Error('Failed to load genders');
            return res.json() as Promise<string[]>;
          }),
          fetch(`${API_ROOT}/meta/races`).then(async (res) => {
            if (!res.ok) throw new Error('Failed to load races');
            return res.json() as Promise<RaceOption[]>;
          }),
          fetch(`${API_ROOT}/meta/player-classes`).then(async (res) => {
            if (!res.ok) throw new Error('Failed to load classes');
            return res.json() as Promise<string[]>;
          }),
          fetch(`${API_ROOT}/meta/armor-types`).then(async (res) => {
            if (!res.ok) throw new Error('Failed to load armor types');
            return res.json() as Promise<string[]>;
          })
        ]);
        if (ignore) return;
        setMeta({ genders, races, playerClasses, armorTypes });
      } catch (error) {
        if (ignore) return;
        setMetaError(error instanceof Error ? error.message : 'Failed to load metadata.');
      } finally {
        if (!ignore) {
          setMetaLoading(false);
        }
      }
    }

    loadMeta();
    return () => {
      ignore = true;
    };
  }, [locationState]);

  useEffect(() => {
    const magicSchool = baseData.magicSchool?.trim();
    if (!magicSchool) {
      setManaAttributeBonus(null);
      return;
    }

    const manaAttributeKey: AttributeKey | null = magicSchool === 'essence'
      ? 'IQ'
      : magicSchool === 'channeling'
        ? 'IT'
        : null;

    if (!manaAttributeKey) {
      setManaAttributeBonus(null);
      return;
    }

    const attributeRow = attributeRowMap.get(manaAttributeKey);
    const baseValue = attributeRow?.baseValue;
    if (baseValue == null || !Number.isFinite(baseValue) || baseValue <= 0) {
      setManaAttributeBonus(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(MANA_BONUS_ENDPOINT(baseValue));
        if (!response.ok) {
          if (response.status !== 404) {
            console.warn('Failed to load normal bonus for mana attribute', baseValue, response.status);
          }
          if (!cancelled) {
            setManaAttributeBonus(null);
          }
          return;
        }
        const data = await response.json();
        const rawNumber = typeof data === 'number' ? data : Number.parseInt(String(data), 10);
        const normalBonus = Number.isFinite(rawNumber) ? rawNumber : 0;
        const computed = normalBonus * characterLevel * 2;
        if (!cancelled) {
          setManaAttributeBonus(computed);
        }
      } catch (error) {
        console.warn('Failed to fetch normal bonus for mana attribute', error);
        if (!cancelled) {
          setManaAttributeBonus(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [baseData.magicSchool, attributeRowMap, characterLevel]);

  useEffect(() => {
    if (meta.armorTypes && meta.armorTypes.length > 0) {
      return;
    }
    let ignore = false;
    (async () => {
      try {
        const response = await fetch(`${API_ROOT}/meta/armor-types`);
        if (!response.ok) {
          throw new Error('Failed to load armor types');
        }
        const data = await response.json() as string[];
        if (ignore) return;
        setMeta((prev) => ({
          genders: prev.genders,
          races: prev.races,
          playerClasses: prev.playerClasses,
          armorTypes: data
        }));
      } catch (error) {
        console.warn('Failed to fetch armor types', error);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [meta.armorTypes]);

  useEffect(() => {
    if (!detailsFromState) return;
    setBaseData((prev) => ({
      ...prev,
      characterId: detailsFromState.characterId ?? prev.characterId,
      name: detailsFromState.name ?? prev.name,
      gender: detailsFromState.gender ?? prev.gender,
      race: detailsFromState.race ?? prev.race,
      playerClass: detailsFromState.playerClass ?? prev.playerClass,
      armorType: prev.armorType || 'none'
    }));
  }, [detailsFromState]);

  const genderOptions = useMemo(() => [
    { value: '', label: 'Select…' },
    ...meta.genders.map((value) => ({ value, label: formatOptionLabel(value) }))
  ], [meta.genders]);

  const raceOptions = useMemo(() => [
    { value: '', label: 'Select…' },
    ...meta.races.map((option) => ({
      value: option.code,
      label: option.displayName && option.displayName.trim().length > 0
        ? option.displayName
        : formatOptionLabel(option.code)
    }))
  ], [meta.races]);

  const classOptions = useMemo(() => [
    { value: '', label: 'Select…' },
    ...meta.playerClasses.map((value) => ({ value, label: formatOptionLabel(value) }))
  ], [meta.playerClasses]);

  const armorOptions = useMemo(() => [
    { value: '', label: 'Select…' },
    ...([...(meta.armorTypes ?? [])].reverse().map((value) => ({ value, label: formatOptionLabel(value) })))
  ], [meta.armorTypes]);

  const skillDisplayRows = useMemo(() => {
    return SKILL_DEFINITIONS_WITH_INDEX.map((definition) => {
      const isHpMaxSkill = definition.name === HP_MAX_SKILL_NAME;
      const zeroLevelBonus = getZeroLevelBonus(definition.name);
      const baseState = skillRows[definition.stateIndex] ?? {
        levels: Array.from({ length: SKILL_LEVEL_COUNT }, () => false),
        itemBonus: '0',
        specialBonus: '0',
        classBonus: 0,
        levelBonus: zeroLevelBonus,
        manualLevelInput: isHpMaxSkill ? '0' : String(zeroLevelBonus)
      };
      const locked = isSkillLocked(definition.name);
      const cappedLevels = getSkillLevelArray(baseState.levels, definition);
      const levels = locked ? Array.from({ length: SKILL_LEVEL_COUNT }, () => false) : cappedLevels;
      const state = {
        ...baseState,
        levels
      };

      const attributeRow = definition.attributeKey === 'XX'
        ? undefined
        : attributeRowMap.get(definition.attributeKey as AttributeKey);

      const attributeBonus = attributeRow
        ? attributeRow.totalBonus ?? attributeRow.normalBonus ?? 0
        : 0;

      const storedLevelBonus = Number.isFinite(state.levelBonus)
        ? state.levelBonus
        : zeroLevelBonus;
      const levelCount = levels.reduce<number>((total, checked) => (checked ? total + 1 : total), 0);
      const levelBonusValue = locked
        ? 0
        : isHpMaxSkill
          ? storedLevelBonus
          : levelCount === 0
            ? zeroLevelBonus
            : storedLevelBonus;
      const levelBonusDisplay = locked ? '' : levelBonusValue;
      const itemBonus = parseBonusInput(state.itemBonus);
      const specialBonus = parseBonusInput(state.specialBonus);
      const classBonusRaw = state.classBonus;
      const classBonus = classBonusRaw * characterLevel;
      const totalBonus = levelBonusValue + attributeBonus + classBonus + itemBonus + specialBonus;

      return {
        definition,
        state,
        attributeBonus,
        attributeRow,
        levelCount,
        levelBonus: levelBonusValue,
        levelBonusDisplay,
        itemBonus,
        specialBonus,
        classBonus,
        totalBonus
      };
    });
  }, [attributeRowMap, skillRows]);

  const manaBonusRow = useMemo(() => {
    const magicSchool = baseData.magicSchool?.trim();
    const manaAttributeKey: AttributeKey | null = magicSchool === 'channeling'
      ? 'IT'
      : magicSchool === 'essence'
        ? 'IQ'
        : null;
    const attribute = manaAttributeKey ? attributeRowMap.get(manaAttributeKey) : undefined;
    const fallbackAttributeBonus = attribute
      ? attribute.totalBonus ?? attribute.normalBonus ?? 0
      : 0;
    const attributeBonus = manaAttributeKey
      ? manaAttributeBonus != null
        ? manaAttributeBonus
        : fallbackAttributeBonus
      : 0;
    const itemBonus = parseBonusInput(manaBonusAdjustment.itemBonus);
    const specialBonus = parseBonusInput(manaBonusAdjustment.specialBonus);
    const totalBonus = attributeBonus + itemBonus + specialBonus;
    return {
      label: 'Mana',
      attributeLabel: manaAttributeKey ?? '',
      attributeBonus,
      itemBonus,
      specialBonus,
      totalBonus,
      itemBonusInput: manaBonusAdjustment.itemBonus,
      specialBonusInput: manaBonusAdjustment.specialBonus
    };
  }, [attributeRowMap, baseData.magicSchool, manaAttributeBonus, manaBonusAdjustment]);

  const mdBonusRows = useMemo(() => {
    return MD_BONUS_ROWS.map((row, index) => {
      const attribute = attributeRowMap.get(row.attribute);
      const attributeBonus = attribute
        ? attribute.totalBonus ?? attribute.normalBonus ?? 0
        : 0;
      const adjustment = mdBonusAdjustments[index] ?? { itemBonus: '0', specialBonus: '0' };
      const itemBonus = parseBonusInput(adjustment.itemBonus);
      const specialBonus = parseBonusInput(adjustment.specialBonus);
      const totalBonus = attributeBonus + itemBonus + specialBonus;
      return {
        label: row.label,
        attributeKey: row.attribute,
        attributeBonus,
        itemBonus,
        specialBonus,
        totalBonus,
        itemBonusInput: adjustment.itemBonus,
        specialBonusInput: adjustment.specialBonus
      };
    });
  }, [attributeRowMap, mdBonusAdjustments]);

  function handleManaBonusChange(key: 'itemBonus' | 'specialBonus', value: string) {
    setManaBonusAdjustment((prev) => ({ ...prev, [key]: value }));
  }

  function handleBaseDataChange<Key extends keyof BaseDataState>(key: Key, value: BaseDataState[Key]) {
    setBaseData((prev) => ({ ...prev, [key]: value }));
  }

  function handleSpellListChange(index: number, changes: Partial<SpellListRow>) {
    setSpellLists((prev) => prev.map((row, rowIndex) => {
      if (rowIndex !== index) return row;
      const next: SpellListRow = { ...row, ...changes };
      if (changes.learnt === true) {
        next.chance = '100';
      }
      if (changes.chance !== undefined) {
        const numeric = Number(changes.chance);
        if (!Number.isFinite(numeric) || Number.isNaN(numeric)) {
          next.chance = '';
        } else {
          const clamped = Math.min(100, Math.max(0, Math.floor(numeric)));
          next.chance = String(clamped);
          if (clamped === 100) {
            next.learnt = true;
          }
        }
      }
      if (changes.learnt === false) {
        next.learnt = false;
      }
      return next;
    }));
  }

  function handleMdBonusChange(index: number, key: 'itemBonus' | 'specialBonus', value: string) {
    setMdBonusAdjustments((prev) => prev.map((row, rowIndex) => {
      if (rowIndex !== index) return row;
      return { ...row, [key]: value };
    }));
  }

  function handleLanguageChange(index: number, changes: Partial<LanguageRow>) {
    setLanguages((prev) => prev.map((row, rowIndex) => {
      if (rowIndex !== index) return row;
      const next: LanguageRow = { ...row, ...changes };
      if (changes.level !== undefined) {
        const numeric = Number(changes.level);
        if (!Number.isFinite(numeric)) {
          next.level = '';
        } else {
          const clamped = Math.min(5, Math.max(0, Math.floor(numeric)));
          next.level = String(clamped);
        }
      }
      return next;
    }));
  }

  function applyChildhoodSkillPreset(rawData: Record<string, unknown>) {
    const normalized = new Map<string, number>();
    Object.entries(rawData).forEach(([key, value]) => {
      const normalizedKey = key.trim().toUpperCase();
      if (!normalizedKey) return;
      let numeric: number;
      if (typeof value === 'number') {
        numeric = value;
      } else if (typeof value === 'string') {
        const parsed = Number.parseInt(value, 10);
        numeric = Number.isFinite(parsed) ? parsed : 0;
      } else {
        const parsed = Number.parseInt(String(value), 10);
        numeric = Number.isFinite(parsed) ? parsed : 0;
      }
      const clamped = Math.max(0, Math.min(SKILL_LEVEL_COUNT, Math.round(numeric)));
      normalized.set(normalizedKey, clamped);
    });

    const assignments = SKILL_DEFINITIONS_WITH_INDEX.map((definition) => {
      const lookupKey = definition.name.trim().toUpperCase();
      const count = normalized.get(lookupKey) ?? 0;
      return { definition, count };
    });

    setSkillRows((prev) => prev.map((row, index) => {
      const assignment = assignments[index];
      const count = assignment?.count ?? 0;
      const levels = Array.from({ length: SKILL_LEVEL_COUNT }, (_, levelIndex) => levelIndex < count);
      const isHpMax = assignment?.definition.name === HP_MAX_SKILL_NAME;
      const locked = assignment ? isSkillLocked(assignment.definition.name) : false;
      const zeroLevelBonus = assignment ? getZeroLevelBonus(assignment.definition.name) : -25;
      if (isHpMax) {
        return {
          ...row,
          levels
        };
      }

      const resolvedBonus = count === 0 ? zeroLevelBonus : 0;
      return {
        ...row,
        levels: locked ? Array.from({ length: SKILL_LEVEL_COUNT }, () => false) : levels,
        levelBonus: resolvedBonus
      };
    }));

    assignments.forEach(({ definition, count }) => {
      if (definition.name === HP_MAX_SKILL_NAME) {
        return;
      }
      if (isSkillLocked(definition.name)) {
        return;
      }
      if (count > 0) {
        void fetchSkillLevelBonus(definition.stateIndex, definition.name, count);
      }
    });
  }

  async function fetchSkillLevelBonus(skillIndex: number, skillName: string, levelCount: number) {
    if (skillName === HP_MAX_SKILL_NAME) {
      return;
    }
    if (isSkillLocked(skillName)) {
      return;
    }
    const endpoint = SKILL_LEVEL_BONUS_ENDPOINT(skillName, levelCount);
    try {
      const response = await fetch(endpoint);
      let bonus = 0;
      if (response.ok) {
        const data = await response.json();
        const parsed = typeof data === 'number' ? data : Number.parseInt(String(data), 10);
        bonus = Number.isFinite(parsed) ? parsed : 0;
      } else if (response.status !== 404) {
        throw new Error(`Failed to load skill level bonus for ${skillName}`);
      }

      setSkillRows((prev) => {
        const currentRow = prev[skillIndex];
        if (!currentRow) {
          return prev;
        }
        const currentCount = currentRow.levels.reduce((total, selected) => (selected ? total + 1 : total), 0);
        if (currentCount !== levelCount) {
          return prev;
        }
        const resolvedBonus = levelCount === 0 ? getZeroLevelBonus(skillName) : bonus;
        return prev.map((row, index) => (index === skillIndex ? { ...row, levelBonus: resolvedBonus } : row));
      });
    } catch (error) {
      console.warn('Failed to fetch skill level bonus', error);
      setSkillRows((prev) => {
        const currentRow = prev[skillIndex];
        if (!currentRow) {
          return prev;
        }
        const currentCount = currentRow.levels.reduce((total, selected) => (selected ? total + 1 : total), 0);
        if (currentCount !== levelCount) {
          return prev;
        }
        const fallbackBonus = levelCount === 0 ? getZeroLevelBonus(skillName) : 0;
        return prev.map((row, index) => (index === skillIndex ? { ...row, levelBonus: fallbackBonus } : row));
      });
    }
  }

  function handleSkillLevelBonusChange(skillIndex: number, value: string) {
    const definition = SKILL_DEFINITIONS_WITH_INDEX[skillIndex];
    if (!definition || definition.name !== HP_MAX_SKILL_NAME) {
      return;
    }
    const trimmed = value.trim();
    const sanitized = trimmed.length === 0 ? '0' : trimmed;
    const parsed = Number.parseInt(sanitized, 10);
    const resolvedBonus = Number.isFinite(parsed) ? parsed : 0;
    setSkillRows((prev) => prev.map((row, index) => {
      if (index !== skillIndex) return row;
      return {
        ...row,
        manualLevelInput: sanitized,
        levelBonus: resolvedBonus
      };
    }));
  }

  function handleSkillLevelToggle(skillIndex: number, levelIndex: number, checked: boolean) {
    const definition = SKILL_DEFINITIONS_WITH_INDEX[skillIndex];
    const currentRow = skillRows[skillIndex];
    if (!definition || !currentRow) {
      return;
    }

    if (isSkillLocked(definition.name)) {
      return;
    }

    const nextLevels = [...currentRow.levels];
    nextLevels[levelIndex] = checked;
    const levelCount = nextLevels.reduce((total, selected) => (selected ? total + 1 : total), 0);

    setSkillRows((prev) => prev.map((row, index) => {
      if (index !== skillIndex) return row;
      const isHpMax = definition.name === HP_MAX_SKILL_NAME;
      const zeroLevelBonus = getZeroLevelBonus(definition.name);
      const nextLevelBonus = levelCount === 0
        ? zeroLevelBonus
        : row.levelBonus;
      return {
        ...row,
        levels: nextLevels,
        levelBonus: nextLevelBonus,
        manualLevelInput: isHpMax ? String(nextLevelBonus) : row.manualLevelInput
      };
    }));

    if (definition.name !== HP_MAX_SKILL_NAME) {
      void fetchSkillLevelBonus(skillIndex, definition.name, levelCount);
    }
  }

  function handleSkillBonusChange(skillIndex: number, key: 'itemBonus' | 'specialBonus', value: string) {
    setSkillRows((prev) => prev.map((row, index) => {
      if (index !== skillIndex) return row;
      return { ...row, [key]: value };
    }));
  }

  useEffect(() => {
    setAttributeRows(mapAttributeRowsFromState(locationState?.attributes));
  }, [locationState?.attributes]);

  useEffect(() => {
    const raceKey = baseData.race?.trim();
    if (!raceKey) {
      setRaceBonusError(null);
      setAttributeRows((prev) => prev.map((row) => {
        if (row.normalBonus == null && row.totalBonus == null && row.raceBonus == null) {
          return row;
        }
        const normal = row.normalBonus ?? 0;
        return {
          ...row,
          raceBonus: row.normalBonus == null && row.raceBonus == null ? null : 0,
          totalBonus: row.normalBonus != null ? normal : row.totalBonus
        };
      }));
      setSkillRows((prev) => prev.map((row, index) => {
        const definition = SKILL_DEFINITIONS_WITH_INDEX[index];
        const isHpMax = definition?.name === HP_MAX_SKILL_NAME;
        const zeroLevelBonus = definition ? getZeroLevelBonus(definition.name) : -25;
        return {
          ...row,
          levels: Array.from({ length: SKILL_LEVEL_COUNT }, () => false),
          levelBonus: zeroLevelBonus,
          classBonus: 0,
          manualLevelInput: isHpMax ? '0' : row.manualLevelInput
        };
      }));
      return;
    }

    let cancelled = false;
    setRaceBonusLoading(true);
    setRaceBonusError(null);

    (async () => {
      try {
        const response = await fetch(RACE_BONUS_ENDPOINT(raceKey));
        if (cancelled) return;

        if (response.status === 404) {
          setRaceBonusError(`Race bonus data not found for ${raceKey}.`);
          setAttributeRows((prev) => prev.map((row) => {
            const normal = row.normalBonus ?? 0;
            return {
              ...row,
              raceBonus: 0,
              totalBonus: row.normalBonus != null ? normal : row.totalBonus
            };
          }));
          return;
        }

        if (!response.ok) {
          throw new Error(`Failed to load race bonuses for ${raceKey}`);
        }

        const data = await response.json() as Record<string, unknown>;
        setAttributeRows((prev) => prev.map((row) => {
          const raw = data[row.attribute] ?? data[row.attribute.toUpperCase()] ?? data[row.attribute.toLowerCase()];
          const bonus = typeof raw === 'number' && Number.isFinite(raw) ? Math.round(raw) : 0;
          const normal = row.normalBonus ?? 0;
          return {
            ...row,
            raceBonus: bonus,
            totalBonus: normal + bonus
          };
        }));

        const childhoodResponse = await fetch(CHILDHOOD_SKILLS_ENDPOINT(raceKey));
        if (cancelled) return;

        if (childhoodResponse.status === 404) {
          setSkillRows((prev) => prev.map((row, index) => {
            const definition = SKILL_DEFINITIONS_WITH_INDEX[index];
            const isHpMax = definition?.name === HP_MAX_SKILL_NAME;
            const zeroLevelBonus = definition ? getZeroLevelBonus(definition.name) : -25;
            return {
              ...row,
              levels: Array.from({ length: SKILL_LEVEL_COUNT }, () => false),
              levelBonus: zeroLevelBonus,
              classBonus: row.classBonus,
              manualLevelInput: isHpMax ? '0' : row.manualLevelInput
            };
          }));
        } else if (!childhoodResponse.ok) {
          throw new Error(`Failed to load childhood skills for ${raceKey}`);
        } else {
          const childhoodData = await childhoodResponse.json() as Record<string, unknown>;
          applyChildhoodSkillPreset(childhoodData);
        }
      } catch (error) {
        if (!cancelled) {
          setRaceBonusError(error instanceof Error ? error.message : 'Failed to load race bonuses.');
        }
        if (!cancelled) {
          setSkillRows((prev) => prev.map((row, index) => {
            const definition = SKILL_DEFINITIONS_WITH_INDEX[index];
            const isHpMax = definition?.name === HP_MAX_SKILL_NAME;
            const zeroLevelBonus = definition ? getZeroLevelBonus(definition.name) : -25;
            const locked = definition ? isSkillLocked(definition.name) : false;
            return {
              ...row,
              levels: locked ? Array.from({ length: SKILL_LEVEL_COUNT }, () => false) : Array.from({ length: SKILL_LEVEL_COUNT }, () => false),
              levelBonus: zeroLevelBonus,
              classBonus: row.classBonus,
              manualLevelInput: isHpMax ? '0' : row.manualLevelInput
            };
          }));
        }
      } finally {
        if (!cancelled) {
          setRaceBonusLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [baseData.race, meta.races]);

  useEffect(() => {
    const classKey = baseData.playerClass?.trim();
    if (!classKey) {
      setSkillRows((prev) => prev.map((row) => ({
        ...row,
        classBonus: 0
      })));
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(CLASS_BONUS_ENDPOINT(classKey));
        if (cancelled) return;

        if (response.status === 404) {
          setSkillRows((prev) => prev.map((row) => ({
            ...row,
            classBonus: 0
          })));
          return;
        }

        if (!response.ok) {
          throw new Error(`Failed to load class bonuses for ${classKey}`);
        }

        const data = await response.json() as Record<string, unknown>;
        const normalized = new Map<string, number>();
        Object.entries(data).forEach(([key, value]) => {
          const normalizedKey = key.trim().toUpperCase();
          if (!normalizedKey) return;
          let numeric: number;
          if (typeof value === 'number') {
            numeric = value;
          } else if (typeof value === 'string') {
            const parsed = Number.parseInt(value, 10);
            numeric = Number.isFinite(parsed) ? parsed : 0;
          } else {
            const parsed = Number.parseInt(String(value), 10);
            numeric = Number.isFinite(parsed) ? parsed : 0;
          }
          normalized.set(normalizedKey, Math.round(numeric));
        });

        setSkillRows((prev) => prev.map((row, index) => {
          const definition = SKILL_DEFINITIONS_WITH_INDEX[index];
          const lookupKey = definition.name.trim().toUpperCase();
          const bonus = normalized.get(lookupKey) ?? 0;
          return {
            ...row,
            classBonus: bonus
          };
        }));
      } catch (error) {
        console.warn('Failed to fetch class bonuses', error);
        if (!cancelled) {
          setSkillRows((prev) => prev.map((row) => ({
            ...row,
            classBonus: 0
          })));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [baseData.playerClass]);

  function handleBack() {
    navigate('/create-character');
  }

  function handleNext() {
    navigate('/create-character-levelup', {
      state: {
        fromEarlyYears: {
          baseData,
          attributeRows,
          skillRows,
          mdBonusAdjustments
        }
      }
    });
  }

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h1 style={{ margin: 0, textAlign: 'center', color: '#ffffff', textShadow: '0 0 6px rgba(0,0,0,0.35)' }}>
          Character Creation – Early Years
        </h1>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={handleBack}
          style={{
            padding: '6px 12px',
            background: '#d32f2f',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer'
          }}
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          style={{
            padding: '6px 12px',
            background: COLORS.primary,
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer'
          }}
        >
          Next
        </button>
      </div>
      <style>
        {`
          .early-years-section {
            background: #fff;
            border-radius: 8px;
            border: 1px solid ${COLORS.border};
            box-shadow: 0 2px 8px rgba(47,85,151,0.1);
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .early-years-title {
            margin: 0;
            color: ${COLORS.primary};
            font-size: 20px;
          }
          .panel-grid {
            display: grid;
            gap: 16px;
            grid-template-columns: 1fr;
          }
          .panel-grid.cols-3 {
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          }
          .panel-grid.cols-2 {
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          }
          .panel {
            border: 1px solid ${COLORS.border};
            border-radius: 8px;
            background: ${COLORS.surface};
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .panel h3 {
            margin: 0;
            color: ${COLORS.primary};
            font-size: 16px;
          }
          .panel table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
          }
          .panel table thead th {
            background: ${COLORS.primary};
            color: #fff;
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 0.03em;
          }
          .panel th,
          .panel td {
            border: 1px solid ${COLORS.border};
            padding: 6px 8px;
            text-align: left;
            color: ${COLORS.textPrimary ?? '#123066'};
          }
          .panel td.center,
          .panel th.center {
            text-align: center;
          }
          .panel-table .panel-bonus-input {
            width: 72px;
            box-sizing: border-box;
            padding: 4px 6px;
            border-radius: 6px;
            border: 1px solid ${COLORS.border};
            font-size: 14px;
            color: ${COLORS.textPrimary};
            background: #fff;
            text-align: center;
          }
          .panel-table.level-summary-table th,
          .panel-table.level-summary-table td {
            padding: 3px 6px;
          }
          .panel-table.level-summary-table .panel-bonus-input {
            width: 60px;
            padding: 2px 4px;
          }
          .panel-table .panel-bonus-input::-webkit-outer-spin-button,
          .panel-table .panel-bonus-input::-webkit-inner-spin-button {
            margin: 0;
            -webkit-appearance: none;
          }
          .panel-table .panel-bonus-input {
            -moz-appearance: textfield;
          }
          .panel tbody th {
            background: rgba(47,85,151,0.08);
            width: 40%;
          }
          .meta-state {
            margin: 0;
            font-size: 13px;
            color: ${COLORS.textPrimary};
          }
          .meta-state.error {
            color: ${COLORS.danger};
            font-weight: 600;
          }
          .base-data-form {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .base-data-row {
            display: flex;
            flex-direction: row;
            align-items: flex-start;
            gap: 12px;
          }
          .base-data-row-single {
            flex-wrap: nowrap;
          }
          .base-data-row-single .field {
            flex: 1 1 0;
          }
          .base-data-row:not(.base-data-row-single) {
            flex-wrap: nowrap;
          }
          .base-data-row:not(.base-data-row-single) .field {
            flex: 1 1 0;
            min-width: 0;
          }
          .field {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .field.field-inline {
            flex-direction: row;
            align-items: center;
            gap: 4px;
          }
          .field.field-inline label {
            min-width: 60px;
          }
          .field.field-inline input,
          .field.field-inline select {
            width: 200px;
            flex: 0 0 200px;
            box-sizing: border-box;
          }
          .field label {
            font-size: 13px;
            font-weight: 600;
            color: ${COLORS.textPrimary};
          }
          .field input,
          .field select {
            padding: 6px 8px;
            border-radius: 6px;
            border: 1px solid ${COLORS.border};
            font-size: 14px;
            color: ${COLORS.textPrimary};
            background: #fff;
            transition: border-color 120ms ease, box-shadow 120ms ease;
          }
          .field input:focus,
          .field select:focus {
            outline: 2px solid rgba(47,85,151,0.3);
            border-color: ${COLORS.primary};
          }
          .field.span-2 {
            grid-column: span 2;
          }
          @media (max-width: 600px) {
            .field.span-2 {
              grid-column: span 1;
            }
          }
          .spell-table {
            width: 100%;
            border-collapse: collapse;
          }
          .spell-table th,
          .spell-table td {
            border: 1px solid ${COLORS.border};
            padding: 4px 6px;
            background: #fff;
            color: ${COLORS.textPrimary};
          }
          .spell-table thead th {
            background: ${COLORS.primary};
            color: #fff;
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 0.03em;
          }
          .spell-table input[type="text"],
          .spell-table input[type="number"] {
            width: 100%;
            box-sizing: border-box;
            padding: 4px 6px;
            border-radius: 6px;
            border: 1px solid ${COLORS.border};
            font-size: 14px;
            color: ${COLORS.textPrimary};
            background: ${COLORS.surface};
          }
          .spell-table input[type="number"]::-webkit-outer-spin-button,
          .spell-table input[type="number"]::-webkit-inner-spin-button {
            margin: 0;
            -webkit-appearance: none;
          }
          .spell-table input[type="number"] {
            -moz-appearance: textfield;
          }
          .spell-table .center {
            text-align: center;
          }
          .languages-table {
            width: 100%;
            border-collapse: collapse;
          }
          .languages-table th,
          .languages-table td {
            border: 1px solid ${COLORS.border};
            padding: 8px;
            background: #fff;
            color: ${COLORS.textPrimary};
          }
          .languages-table thead th {
            background: ${COLORS.primary};
            color: #fff;
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 0.03em;
          }
          .languages-table input[type="text"],
          .languages-table input[type="number"] {
            width: 100%;
            box-sizing: border-box;
            padding: 6px 8px;
            border-radius: 6px;
            border: 1px solid ${COLORS.border};
            font-size: 14px;
            color: ${COLORS.textPrimary};
            background: ${COLORS.surface};
          }
          .languages-table input[type="number"]::-webkit-outer-spin-button,
          .languages-table input[type="number"]::-webkit-inner-spin-button {
            margin: 0;
            -webkit-appearance: none;
          }
          .languages-table input[type="number"] {
            -moz-appearance: textfield;
          }
          .skill-table {
            width: 100%;
            border-collapse: collapse;
          }
          .skill-table th,
          .skill-table td {
            border: 1px solid ${COLORS.border};
            padding: 4px 6px;
            background: #fff;
            color: ${COLORS.textPrimary};
            vertical-align: top;
          }
          .skill-table td.middle {
            vertical-align: middle;
          }
          .skill-table td.center {
            text-align: center;
          }
          .skill-table td.center .skill-bonus-input {
            text-align: center;
          }
          .skill-table thead th {
            background: ${COLORS.primary};
            color: #fff;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.04em;
          }
          .skill-category-header td {
            background: rgba(47,85,151,0.12);
            color: ${COLORS.primary};
            font-weight: 700;
            letter-spacing: 0.04em;
            text-transform: uppercase;
          }
          .skill-group-divider td {
            padding: 0;
            border: none;
            height: 6px;
          }
          .skill-group-divider td::after {
            content: '';
            display: block;
            height: 1px;
            margin: 3px 0;
            background: ${COLORS.border};
          }
          .skill-levels {
            display: flex;
            flex-wrap: wrap;
            gap: 3px;
          }
          .skill-levels label {
            width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .skill-levels input[type="checkbox"] {
            appearance: none;
            -webkit-appearance: none;
            width: 100%;
            height: 100%;
            margin: 0;
            border: 1px solid ${COLORS.border};
            border-radius: 4px;
            background: ${COLORS.surface};
            cursor: pointer;
            transition: background 0.2s ease, border-color 0.2s ease;
          }
          .skill-levels input[type="checkbox"]:checked {
            background: #2f9f55;
            border-color: #1f6f3a;
          }
          .skill-levels input[type="checkbox"]:focus-visible {
            outline: 2px solid ${COLORS.primary};
            outline-offset: 1px;
          }
          .skill-bonus-input {
            width: 100%;
            box-sizing: border-box;
            padding: 4px 6px;
            border-radius: 6px;
            border: 1px solid ${COLORS.border};
            font-size: 14px;
            color: ${COLORS.textPrimary};
            background: ${COLORS.surface};
          }
          .skill-attribute {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 8px;
            font-weight: 600;
          }
          .skill-attribute span:last-child {
            color: ${COLORS.primary};
          }
        `}
      </style>

      <section className="early-years-section">
        <h2 className="early-years-title">Foundational Information</h2>
        <div className="panel-grid cols-3">
          <section className="panel">
            <h3>Character Base Data</h3>
            {metaLoading && <p className="meta-state">Loading metadata…</p>}
            {metaError && <p className="meta-state error">{metaError}</p>}
            <div className="base-data-form">
              <div className="base-data-row base-data-row-single base-data-row-id">
                <div className="field">
                  <label htmlFor="base-character-id">Character ID</label>
                  <select
                    id="base-character-id"
                    value={baseData.characterId}
                    onChange={(event) => handleBaseDataChange('characterId', event.target.value)}
                  >
                    {CHARACTER_ID_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="base-data-row">
                <div className="field">
                  <label htmlFor="base-name">Name</label>
                  <input
                    id="base-name"
                    type="text"
                    value={baseData.name}
                    onChange={(event) => handleBaseDataChange('name', event.target.value)}
                    placeholder="Character name"
                  />
                </div>
                <div className="field">
                  <label htmlFor="base-gender">Gender</label>
                  <select
                    id="base-gender"
                    value={baseData.gender}
                    onChange={(event) => handleBaseDataChange('gender', event.target.value)}
                  >
                    {genderOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="base-data-row">
                <div className="field">
                  <label htmlFor="base-race">Race</label>
                  <select
                    id="base-race"
                    value={baseData.race}
                    onChange={(event) => handleBaseDataChange('race', event.target.value)}
                  >
                    {raceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="base-class">Class</label>
                  <select
                    id="base-class"
                    value={baseData.playerClass}
                    onChange={(event) => handleBaseDataChange('playerClass', event.target.value)}
                  >
                    {classOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="base-data-row">
                <div className="field">
                  <label htmlFor="base-magic-school">Magic School</label>
                  <select
                    id="base-magic-school"
                    value={baseData.magicSchool}
                    onChange={(event) => handleBaseDataChange('magicSchool', event.target.value)}
                  >
                    {MAGIC_SCHOOL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="base-age">Age</label>
                  <input
                    id="base-age"
                    type="number"
                    min={0}
                    value={baseData.age}
                    onChange={(event) => handleBaseDataChange('age', event.target.value)}
                    placeholder="Years"
                  />
                </div>
              </div>
              <div className="base-data-row">
                <div className="field">
                  <label htmlFor="base-height">Height</label>
                  <input
                    id="base-height"
                    type="number"
                    min={0}
                    value={baseData.height}
                    onChange={(event) => handleBaseDataChange('height', event.target.value)}
                    placeholder="cm"
                  />
                </div>
                <div className="field">
                  <label htmlFor="base-weight">Weight</label>
                  <input
                    id="base-weight"
                    type="number"
                    min={0}
                    value={baseData.weight}
                    onChange={(event) => handleBaseDataChange('weight', event.target.value)}
                    placeholder="kg"
                  />
                </div>
              </div>
              <div className="base-data-row">
                <div className="field">
                  <label htmlFor="base-hair">Hair</label>
                  <input
                    id="base-hair"
                    type="text"
                    value={baseData.hair}
                    onChange={(event) => handleBaseDataChange('hair', event.target.value)}
                    placeholder="Colour / style"
                  />
                </div>
                <div className="field">
                  <label htmlFor="base-eyes">Eyes</label>
                  <input
                    id="base-eyes"
                    type="text"
                    value={baseData.eyes}
                    onChange={(event) => handleBaseDataChange('eyes', event.target.value)}
                    placeholder="Colour"
                  />
                </div>
              </div>
              <div className="base-data-row base-data-row-single">
                <div className="field">
                  <label htmlFor="base-personality">Personality</label>
                  <input
                    id="base-personality"
                    type="text"
                    value={baseData.personality}
                    onChange={(event) => handleBaseDataChange('personality', event.target.value)}
                    placeholder="Key personality traits"
                  />
                </div>
              </div>
              <div className="base-data-row base-data-row-single">
                <div className="field">
                  <label htmlFor="base-alignment">Alignment</label>
                  <input
                    id="base-alignment"
                    type="text"
                    value={baseData.alignment}
                    onChange={(event) => handleBaseDataChange('alignment', event.target.value)}
                    placeholder="Alignment"
                  />
                </div>
              </div>
              <div className="base-data-row base-data-row-single">
                <div className="field">
                  <label htmlFor="base-motivation">Motivation</label>
                  <input
                    id="base-motivation"
                    type="text"
                    value={baseData.motivation}
                    onChange={(event) => handleBaseDataChange('motivation', event.target.value)}
                    placeholder="Primary motivation"
                  />
                </div>
              </div>
              <div className="base-data-row base-data-row-single">
                <div className="field">
                  <label htmlFor="base-specialty">Specialty</label>
                  <input
                    id="base-specialty"
                    type="text"
                    value={baseData.specialty}
                    onChange={(event) => handleBaseDataChange('specialty', event.target.value)}
                    placeholder="Notable specialty"
                  />
                </div>
              </div>
            </div>
          </section>
          <section className="panel">
            <h3>Spell Lists</h3>
            <table className="spell-table">
              <thead>
                <tr>
                  <th style={{ width: '60%' }}>Spell List</th>
                  <th style={{ width: '20%' }}>Chance (%)</th>
                  <th style={{ width: '20%', textAlign: 'center' }}>Learnt</th>
                </tr>
              </thead>
              <tbody>
                {spellLists.map((row, index) => (
                  <tr key={row.id}>
                    <td>
                      <input
                        type="text"
                        value={row.name}
                        onChange={(event) => handleSpellListChange(index, { name: event.target.value })}
                        placeholder={`Spell list ${index + 1}`}
                        aria-label={`Spell list ${index + 1} name`}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={row.chance}
                        onChange={(event) => handleSpellListChange(index, { chance: event.target.value })}
                        placeholder="0-100"
                        aria-label={`Spell list ${index + 1} chance`}
                      />
                    </td>
                    <td className="center">
                      <input
                        type="checkbox"
                        checked={row.learnt}
                        onChange={(event) => handleSpellListChange(index, { learnt: event.target.checked })}
                        aria-label={`Spell list ${index + 1} learnt`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="panel">
            <h3>Languages</h3>
            <table className="languages-table">
              <thead>
                <tr>
                  <th style={{ width: '70%' }}>Language</th>
                  <th style={{ width: '30%' }}>Level (0-5)</th>
                </tr>
              </thead>
              <tbody>
                {languages.map((row, index) => (
                  <tr key={row.id}>
                    <td>
                      <input
                        type="text"
                        value={row.name}
                        onChange={(event) => handleLanguageChange(index, { name: event.target.value })}
                        placeholder={`Language ${index + 1}`}
                        aria-label={`Language ${index + 1} name`}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        max={5}
                        value={row.level}
                        onChange={(event) => handleLanguageChange(index, { level: event.target.value })}
                        placeholder="0-5"
                        aria-label={`Language ${index + 1} level`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </section>

      <section className="early-years-section">
        <h2 className="early-years-title">Progression Metrics</h2>
        <div className="panel-grid cols-2">
          <section className="panel">
            <h3>Attributes &amp; Bonuses</h3>
            <table>
              <thead>
                <tr>
                  <th>Attribute</th>
                  <th className="center">Base</th>
                  <th className="center">Normal Bonus</th>
                  <th className="center">Race Bonus</th>
                  <th className="center">Total</th>
                </tr>
              </thead>
              <tbody>
                {attributeRows.map((row) => (
                  <tr key={row.attribute}>
                    <td><strong>{row.attribute}</strong></td>
                    <td className="center">{row.baseValue ?? '—'}</td>
                    <td className="center">{row.normalBonus ?? '—'}</td>
                    <td className="center">{row.raceBonus ?? (row.normalBonus == null && row.totalBonus == null ? '—' : 0)}</td>
                    <td className="center"><strong>{row.totalBonus ?? (row.normalBonus ?? '—')}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {raceBonusLoading && <p className="meta-state">Updating race bonuses…</p>}
            {raceBonusError && <p className="meta-state error">{raceBonusError}</p>}
          </section>
          <section className="panel">
            <h3>Level, XP &amp; Bonuses</h3>
            <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
              <div className="field field-inline" style={{ gap: 8 }}>
                <label htmlFor="summary-level" style={{ minWidth: 72 }}>Level</label>
                <input id="summary-level" type="number" value={characterLevel} readOnly style={{ background: '#f0f3f8' }} />
              </div>
              <div className="field field-inline">
                <label htmlFor="summary-xp" style={{ minWidth: 32 }}>XP</label>
                <input id="summary-xp" type="number" value={0} readOnly style={{ background: '#f0f3f8' }} />
              </div>
            </div>
            <div className="field field-inline" style={{ gap: 8 }}>
              <label htmlFor="summary-armor" style={{ minWidth: 72 }}>Armor</label>
              <select
                id="summary-armor"
                value={baseData.armorType}
                onChange={(event) => handleBaseDataChange('armorType', event.target.value)}
              >
                {armorOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <table className="panel-table level-summary-table">
              <thead>
                <tr>
                  <th>Bonus</th>
                  <th className="center">Attribute bonus</th>
                  <th className="center">Item bonus</th>
                  <th className="center">Special bonus</th>
                  <th className="center">Total bonus</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">{manaBonusRow.label}</th>
                  <td className="center">
                    <div className="skill-attribute">
                      <span>{manaBonusRow.attributeLabel}</span>
                      <span>{formatSigned(manaBonusRow.attributeBonus)}</span>
                    </div>
                  </td>
                  <td className="center">
                    <input
                      type="number"
                      className="panel-bonus-input"
                      value={manaBonusRow.itemBonusInput}
                      onChange={(event) => handleManaBonusChange('itemBonus', event.target.value)}
                    />
                  </td>
                  <td className="center">
                    <input
                      type="number"
                      className="panel-bonus-input"
                      value={manaBonusRow.specialBonusInput}
                      onChange={(event) => handleManaBonusChange('specialBonus', event.target.value)}
                    />
                  </td>
                  <td className="center"><strong>{formatSigned(manaBonusRow.totalBonus)}</strong></td>
                </tr>
                {mdBonusRows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    <td className="center">
                      <div className="skill-attribute">
                        <span>{row.attributeKey}</span>
                        <span>{formatSigned(row.attributeBonus)}</span>
                      </div>
                    </td>
                    <td className="center">
                      <input
                        type="number"
                        className="panel-bonus-input"
                        value={row.itemBonusInput}
                        onChange={(event) => handleMdBonusChange(mdBonusRows.findIndex((entry) => entry.label === row.label), 'itemBonus', event.target.value)}
                      />
                    </td>
                    <td className="center">
                      <input
                        type="number"
                        className="panel-bonus-input"
                        value={row.specialBonusInput}
                        onChange={(event) => handleMdBonusChange(mdBonusRows.findIndex((entry) => entry.label === row.label), 'specialBonus', event.target.value)}
                      />
                    </td>
                    <td className="center"><strong>{formatSigned(row.totalBonus)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </section>

      <section className="early-years-section">
        <h2 className="early-years-title">Skills &amp; Specialties</h2>
        <div className="panel-grid">
          <section className="panel">
            <h3>Skill Overview</h3>
            <table className="skill-table">
              <thead>
                <tr>
                  <th style={{ width: '12%' }}>Skill</th>
                  <th style={{ width: '28%' }}>Levels</th>
                  <th style={{ width: '5%' }} className="center">Level Bonus</th>
                  <th style={{ width: '5%' }} className="center">Attribute Bonus</th>
                  <th style={{ width: '5%' }} className="center">Class Bonus</th>
                  <th style={{ width: '5%' }} className="center">Item Bonus</th>
                  <th style={{ width: '5%' }} className="center">Special Bonus</th>
                  <th style={{ width: '5%' }} className="center">Total Bonus</th>
                </tr>
              </thead>
              <tbody>
                {SKILLS_BY_CATEGORY.map((group, groupIndex) => {
                  const rowsForGroup = skillDisplayRows.filter((row) => row.definition.category === group.category);
                  if (rowsForGroup.length === 0) return null;
                  return (
                    <Fragment key={group.category}>
                      <tr className="skill-category-header">
                        <td colSpan={8}>{group.category}</td>
                      </tr>
                      {rowsForGroup.map((row) => (
                        <tr key={row.definition.name}>
                          <td>{row.definition.name}</td>
                          <td>
                            {isSkillLocked(row.definition.name) ? (
                              <span aria-hidden="true">—</span>
                            ) : (
                              <div className="skill-levels" aria-label={`${row.definition.name} levels`}>
                                {row.state.levels.map((checked, levelIndex) => (
                                  <label key={levelIndex} htmlFor={`skill-${row.definition.stateIndex}-level-${levelIndex}`}>
                                    <input
                                      id={`skill-${row.definition.stateIndex}-level-${levelIndex}`}
                                      type="checkbox"
                                      checked={checked}
                                      disabled={row.definition.name === HP_MAX_SKILL_NAME}
                                      onChange={(event) => handleSkillLevelToggle(row.definition.stateIndex, levelIndex, event.target.checked)}
                                      aria-label={`Level ${levelIndex + 1}`}
                                    />
                                  </label>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="center">
                            {row.definition.name === HP_MAX_SKILL_NAME ? (
                              <input
                                type="number"
                                className="skill-bonus-input"
                                value={row.state.manualLevelInput}
                                onChange={(event) => handleSkillLevelBonusChange(row.definition.stateIndex, event.target.value)}
                                aria-label={`${row.definition.name} level bonus`}
                              />
                            ) : isSkillLocked(row.definition.name) ? (
                              ''
                            ) : (
                              row.levelBonus
                            )}
                          </td>
                          <td>
                            <div className="skill-attribute">
                              <span>{row.definition.attributeKey}</span>
                              <span>{formatSigned(row.attributeBonus)}</span>
                            </div>
                          </td>
                          <td className="center">{row.classBonus}</td>
                          <td className="center">
                            <input
                              type="number"
                              className="skill-bonus-input"
                              value={row.state.itemBonus}
                              onChange={(event) => handleSkillBonusChange(row.definition.stateIndex, 'itemBonus', event.target.value)}
                            />
                          </td>
                          <td className="center">
                            <input
                              type="number"
                              className="skill-bonus-input"
                              value={row.state.specialBonus}
                              onChange={(event) => handleSkillBonusChange(row.definition.stateIndex, 'specialBonus', event.target.value)}
                            />
                          </td>
                          <td className="center middle"><strong>{row.totalBonus}</strong></td>
                        </tr>
                      ))}
                      {groupIndex < SKILLS_BY_CATEGORY.length - 1 && (
                        <tr className="skill-group-divider" aria-hidden="true">
                          <td colSpan={8} />
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </section>
        </div>
      </section>
    </div>
  );
}
