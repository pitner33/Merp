import { Fragment, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchEarlyYearsProfile, type EarlyYearsProfileDto } from '../api/earlyYears';

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
  { name: 'Unarmed Combat', category: 'Weapon Skills', attributeKey: 'DEX' },
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

function mapAttributeRowsFromProfile(source?: EarlyYearsProfileDto['attributes']): AttributeRow[] {
  if (source && source.length > 0) {
    return ATTRIBUTE_KEYS.map((attribute) => {
      const match = source.find((entry) => entry.attributeKey === attribute);
      return {
        attribute,
        baseValue: match && typeof match.baseValue === 'number' ? match.baseValue : null,
        normalBonus: match && typeof match.normalBonus === 'number' ? match.normalBonus : null,
        raceBonus: match && typeof match.raceBonus === 'number' ? match.raceBonus : null,
        totalBonus: match && typeof match.totalBonus === 'number'
          ? match.totalBonus
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

export default function CreateCharacterLevelUp() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { playerId?: number } | undefined;
  const playerId = locationState?.playerId;

  const [profile, setProfile] = useState<EarlyYearsProfileDto | null>(null);
  const [loading, setLoading] = useState<boolean>(!!playerId);
  const [error, setError] = useState<string | null>(null);

  const [meta] = useState<MetaOptions>({ genders: [], races: [], playerClasses: [], armorTypes: [] });
  const [baseData, setBaseData] = useState<BaseDataState>(() => ({
    characterId: '',
    name: '',
    gender: '',
    race: '',
    playerClass: '',
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
  }));
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
  const [attributeRows, setAttributeRows] = useState<AttributeRow[]>(() => mapAttributeRowsFromProfile());
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

  useEffect(() => {
    document.title = 'Character Creation – Level Up';
  }, []);

  useEffect(() => {
    let ignore = false;
    if (!playerId) {
      setLoading(false);
      setError('Missing playerId. Please return to Early Years and try again.');
      return;
    }
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchEarlyYearsProfile(playerId);
        if (!ignore) {
          setProfile(data ?? null);
        }
      } catch (e) {
        if (!ignore) {
          setError('Failed to load Early Years profile.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    })();
    return () => {
      ignore = true;
    };
  }, [playerId]);

  useEffect(() => {
    if (!profile) return;

    const b = profile.baseData ?? {};
    setBaseData({
      characterId: b.characterId ?? '',
      name: b.name ?? '',
      gender: b.gender ?? '',
      race: b.race ?? '',
      playerClass: b.playerClass ?? '',
      magicSchool: b.magicSchool ?? '',
      age: b.age ?? '',
      height: b.height ?? '',
      weight: b.weight ?? '',
      hair: b.hair ?? '',
      eyes: b.eyes ?? '',
      personality: b.personality ?? '',
      alignment: b.alignment ?? '',
      motivation: b.motivation ?? '',
      specialty: b.specialty ?? '',
      armorType: b.armorType ?? 'none'
    });

    setAttributeRows(mapAttributeRowsFromProfile(profile.attributes));

    setSpellLists((prev) => {
      const rows = [...prev];
      const source = profile.spellLists ?? [];
      for (let i = 0; i < rows.length; i += 1) {
        const from = source[i];
        rows[i] = {
          id: rows[i].id,
          name: from?.name ?? '',
          chance: from?.chance != null ? String(from.chance) : '',
          learnt: !!from?.learnt
        };
      }
      return rows;
    });

    setLanguages((prev) => {
      const rows = [...prev];
      const source = profile.languages ?? [];
      for (let i = 0; i < rows.length; i += 1) {
        const from = source[i];
        rows[i] = {
          id: rows[i].id,
          name: from?.name ?? '',
          level: from?.level != null ? String(from.level) : ''
        };
      }
      return rows;
    });

    const bonusAdjustments = profile.bonusAdjustments ?? [];
    const mana = bonusAdjustments.find((b) => b.bonusKey === 'mana');
    if (mana) {
      setManaBonusAdjustment({
        itemBonus: mana.itemBonus != null ? String(mana.itemBonus) : '0',
        specialBonus: mana.specialBonus != null ? String(mana.specialBonus) : '0'
      });
      setManaAttributeBonus(mana.attributeBonus ?? null);
    }

    setMdBonusAdjustments((prev) => {
      return MD_BONUS_ROWS.map((row, index) => {
        const found = bonusAdjustments.find((b) => b.label === row.label);
        if (!found) {
          return prev[index] ?? { itemBonus: '0', specialBonus: '0' };
        }
        return {
          itemBonus: found.itemBonus != null ? String(found.itemBonus) : '0',
          specialBonus: found.specialBonus != null ? String(found.specialBonus) : '0'
        };
      });
    });

    setSkillRows((prev) => {
      const source = profile.skills ?? [];
      return prev.map((row, index) => {
        const def = SKILL_DEFINITIONS_WITH_INDEX[index];
        const match = source.find((s) => s.skillName === def.name);
        if (!match) {
          return row;
        }
        const mask = match.levelsMask ?? '';
        const levels = Array.from({ length: SKILL_LEVEL_COUNT }, (_, i) => mask.charAt(i) === '1');
        const isHpMax = def.name === HP_MAX_SKILL_NAME;
        const zeroLevelBonus = getZeroLevelBonus(def.name);
        const levelBonus = match.levelBonus != null ? match.levelBonus : zeroLevelBonus;
        return {
          levels,
          itemBonus: match.itemBonus != null ? String(match.itemBonus) : row.itemBonus,
          specialBonus: match.specialBonus != null ? String(match.specialBonus) : row.specialBonus,
          classBonus: match.classBonus != null ? match.classBonus : row.classBonus,
          levelBonus,
          manualLevelInput: isHpMax
            ? String(match.manualLevelInput != null ? match.manualLevelInput : levelBonus)
            : row.manualLevelInput
        };
      });
    });
  }, [profile]);

  function handleBack() {
    navigate('/create-character-early-years', { state: locationState });
  }

  function handleNext() {
    console.info('Proceed to next creation phase – coming soon.');
  }

  const genderOptions = useMemo(() => [
    { value: '', label: 'Select…' },
    ...meta.genders.map((value) => ({ value, label: value }))
  ], [meta.genders]);

  const raceOptions = useMemo(() => [
    { value: '', label: 'Select…' },
    ...meta.races.map((option) => ({ value: option.code, label: option.displayName ?? option.code }))
  ], [meta.races]);

  const classOptions = useMemo(() => [
    { value: '', label: 'Select…' },
    ...meta.playerClasses.map((value) => ({ value, label: value }))
  ], [meta.playerClasses]);

  const armorOptions = useMemo(() => [
    { value: '', label: 'Select…' },
    ...([...(meta.armorTypes ?? [])].reverse().map((value) => ({ value, label: value })))
  ], [meta.armorTypes]);

  const attributeRowMap = useMemo(() => {
    const map = new Map<AttributeKey, AttributeRow>();
    attributeRows.forEach((row) => {
      map.set(row.attribute, row);
    });
    return map;
  }, [attributeRows]);

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
  }

  function handleSkillBonusChange(skillIndex: number, key: 'itemBonus' | 'specialBonus', value: string) {
    setSkillRows((prev) => prev.map((row, index) => {
      if (index !== skillIndex) return row;
      return { ...row, [key]: value };
    }));
  }

  function handleManaBonusChange(key: 'itemBonus' | 'specialBonus', value: string) {
    setManaBonusAdjustment((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h1 style={{ margin: 0, textAlign: 'center', color: '#ffffff', textShadow: '0 0 6px rgba(0,0,0,0.35)' }}>
          Character Creation – Level Up
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
      {loading && (
        <p style={{ textAlign: 'center', color: COLORS.textPrimary }}>Loading Early Years profile...</p>
      )}
      {error && !loading && (
        <p style={{ textAlign: 'center', color: COLORS.danger, fontWeight: 600 }}>{error}</p>
      )}
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

      {profile && (
        <>
          <section className="early-years-section">
            <h2 className="early-years-title">Foundational Information</h2>
            <div className="panel-grid cols-3">
              <section className="panel">
                <h3>Character Base Data</h3>
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
            <h2 className="early-years-title">Skill Progression</h2>
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
        </>
      )}
    </div>
  );
}
