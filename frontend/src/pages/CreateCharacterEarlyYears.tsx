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
};

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api';
const API_ROOT = API_BASE.replace(/\/$/, '');
const RACE_BONUS_ENDPOINT = (raceKey: string) => `${API_ROOT}/attributes/race-bonuses/${encodeURIComponent(raceKey)}`;
const SKILL_LEVEL_BONUS_ENDPOINT = (skillName: string, levelCount: number) => `${API_ROOT}/skills/level-bonus?skillName=${encodeURIComponent(skillName)}&levels=${levelCount}`;
const CHILDHOOD_SKILLS_ENDPOINT = (raceKey: string) => `${API_ROOT}/attributes/childhood-skills/${encodeURIComponent(raceKey)}`;

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
    specialty: ''
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

export default function CreateCharacterEarlyYears() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { details?: CharacterDetailsState; meta?: MetaOptions; attributes?: AttributeSummary[] } | undefined;
  const [meta, setMeta] = useState<MetaOptions>(() => locationState?.meta ?? { genders: [], races: [], playerClasses: [] });
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
  const [raceBonusError, setRaceBonusError] = useState<string | null>(null);
  const [raceBonusLoading, setRaceBonusLoading] = useState(false);
  const [skillRows, setSkillRows] = useState<SkillRowState[]>(() =>
    SKILL_DEFINITIONS.map(() => ({
      levels: Array.from({ length: SKILL_LEVEL_COUNT }, () => false),
      itemBonus: '0',
      specialBonus: '0',
      classBonus: 0,
      levelBonus: 0
    }))
  );

  useEffect(() => {
    document.title = 'Character Creation – Early Years';
  }, []);

  useEffect(() => {
    let ignore = false;

    if (locationState?.meta) {
      setMeta(locationState.meta);
      setMetaLoading(false);
      setMetaError(null);
      return;
    }

    async function loadMeta() {
      try {
        setMetaLoading(true);
        setMetaError(null);
        const [genders, races, playerClasses] = await Promise.all([
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
          })
        ]);
        if (ignore) return;
        setMeta({ genders, races, playerClasses });
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
    if (!detailsFromState) return;
    setBaseData((prev) => ({
      ...prev,
      characterId: detailsFromState.characterId ?? prev.characterId,
      name: detailsFromState.name ?? prev.name,
      gender: detailsFromState.gender ?? prev.gender,
      race: detailsFromState.race ?? prev.race,
      playerClass: detailsFromState.playerClass ?? prev.playerClass
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

  const attributeRowMap = useMemo(() => {
    const map = new Map<AttributeKey, AttributeRow>();
    attributeRows.forEach((row) => {
      map.set(row.attribute, row);
    });
    return map;
  }, [attributeRows]);

  const skillDisplayRows = useMemo(() => {
    const parseBonusValue = (input: string): number => {
      if (typeof input !== 'string' || input.trim().length === 0) {
        return 0;
      }
      const parsed = Number.parseInt(input, 10);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    return SKILL_DEFINITIONS_WITH_INDEX.map((definition) => {
      const state = skillRows[definition.stateIndex] ?? {
        levels: Array.from({ length: SKILL_LEVEL_COUNT }, () => false),
        itemBonus: '0',
        specialBonus: '0',
        classBonus: 0,
        levelBonus: 0
      };

      const attributeRow = definition.attributeKey === 'XX'
        ? undefined
        : attributeRowMap.get(definition.attributeKey as AttributeKey);

      const attributeBonus = attributeRow
        ? attributeRow.totalBonus ?? attributeRow.normalBonus ?? 0
        : 0;

      const levelBonus = Number.isFinite(state.levelBonus) ? state.levelBonus : 0;
      const levelCount = state.levels.reduce<number>((total, checked) => (checked ? total + 1 : total), 0);
      const itemBonus = parseBonusValue(state.itemBonus);
      const specialBonus = parseBonusValue(state.specialBonus);
      const classBonus = state.classBonus;
      const totalBonus = levelBonus + attributeBonus + classBonus + itemBonus + specialBonus;

      return {
        definition,
        state,
        attributeBonus,
        attributeRow,
        levelCount,
        levelBonus,
        itemBonus,
        specialBonus,
        classBonus,
        totalBonus
      };
    });
  }, [attributeRowMap, skillRows]);

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
      return {
        ...row,
        levels,
        levelBonus: 0
      };
    }));

    assignments.forEach(({ definition, count }) => {
      if (count > 0) {
        void fetchSkillLevelBonus(definition.stateIndex, definition.name, count);
      }
    });
  }

  async function fetchSkillLevelBonus(skillIndex: number, skillName: string, levelCount: number) {
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
        const row = prev[skillIndex];
        if (!row) return prev;
        const currentCount = row.levels.reduce((total, selected) => (selected ? total + 1 : total), 0);
        if (currentCount !== levelCount) {
          return prev;
        }
        return prev.map((item, index) => (index === skillIndex ? { ...item, levelBonus: bonus } : item));
      });
    } catch (error) {
      console.warn('Failed to fetch skill level bonus', error);
      setSkillRows((prev) => {
        const row = prev[skillIndex];
        if (!row) return prev;
        const currentCount = row.levels.reduce((total, selected) => (selected ? total + 1 : total), 0);
        if (currentCount !== levelCount) {
          return prev;
        }
        return prev.map((item, index) => (index === skillIndex ? { ...item, levelBonus: 0 } : item));
      });
    }
  }

  function handleSkillLevelToggle(skillIndex: number, levelIndex: number, checked: boolean) {
    const definition = SKILL_DEFINITIONS_WITH_INDEX[skillIndex];
    const currentRow = skillRows[skillIndex];
    if (!definition || !currentRow) {
      return;
    }

    const nextLevels = [...currentRow.levels];
    nextLevels[levelIndex] = checked;
    const levelCount = nextLevels.reduce((total, selected) => (selected ? total + 1 : total), 0);

    setSkillRows((prev) => prev.map((row, index) => {
      if (index !== skillIndex) return row;
      return {
        ...row,
        levels: nextLevels,
        levelBonus: levelCount === 0 ? 0 : row.levelBonus
      };
    }));

    if (levelCount === 0) {
      return;
    }

    void fetchSkillLevelBonus(skillIndex, definition.name, levelCount);
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
      setSkillRows((prev) => prev.map((row) => ({
        ...row,
        levels: Array.from({ length: SKILL_LEVEL_COUNT }, () => false),
        levelBonus: 0
      })));
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
          setSkillRows((prev) => prev.map((row) => ({
            ...row,
            levels: Array.from({ length: SKILL_LEVEL_COUNT }, () => false),
            levelBonus: 0
          })));
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
          setSkillRows((prev) => prev.map((row) => ({
            ...row,
            levels: Array.from({ length: SKILL_LEVEL_COUNT }, () => false),
            levelBonus: 0
          })));
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
  }, [baseData.race]);

  function handleBack() {
    navigate('/create-character');
  }

  function handleNext() {
    // TODO: wire up next phase when available
    console.info('Proceed to next creation phase – coming soon.');
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
            display: grid;
            gap: 12px;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          }
          .field {
            display: flex;
            flex-direction: column;
            gap: 4px;
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
            padding: 6px 8px;
            background: #fff;
            color: ${COLORS.textPrimary};
            vertical-align: top;
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
            gap: 4px;
          }
          .skill-levels label {
            width: 18px;
            height: 18px;
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
              <div className="field span-2">
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
              <div className="field span-2">
                <label htmlFor="base-personality">Personality</label>
                <input
                  id="base-personality"
                  type="text"
                  value={baseData.personality}
                  onChange={(event) => handleBaseDataChange('personality', event.target.value)}
                  placeholder="Key personality traits"
                />
              </div>
              <div className="field span-2">
                <label htmlFor="base-alignment">Alignment</label>
                <input
                  id="base-alignment"
                  type="text"
                  value={baseData.alignment}
                  onChange={(event) => handleBaseDataChange('alignment', event.target.value)}
                  placeholder="Alignment"
                />
              </div>
              <div className="field span-2">
                <label htmlFor="base-motivation">Motivation</label>
                <input
                  id="base-motivation"
                  type="text"
                  value={baseData.motivation}
                  onChange={(event) => handleBaseDataChange('motivation', event.target.value)}
                  placeholder="Primary motivation"
                />
              </div>
              <div className="field span-2">
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
                  <th>Base</th>
                  <th>Normal Bonus</th>
                  <th>Race Bonus</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {attributeRows.map((row) => (
                  <tr key={row.attribute}>
                    <td>{row.attribute}</td>
                    <td>{row.baseValue ?? '—'}</td>
                    <td>{row.normalBonus ?? '—'}</td>
                    <td>{row.raceBonus ?? (row.normalBonus == null && row.totalBonus == null ? '—' : 0)}</td>
                    <td>{row.totalBonus ?? (row.normalBonus ?? '—')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {raceBonusLoading && <p className="meta-state">Updating race bonuses…</p>}
            {raceBonusError && <p className="meta-state error">{raceBonusError}</p>}
          </section>
          <section className="panel">
            <h3>Level, XP &amp; Bonuses</h3>
            <table>
              <tbody>
                <tr>
                  <th scope="row">Current Level</th>
                  <td>—</td>
                </tr>
                <tr>
                  <th scope="row">Total XP</th>
                  <td>—</td>
                </tr>
                <tr>
                  <th scope="row">XP to Next Level</th>
                  <td>—</td>
                </tr>
                <tr>
                  <th scope="row">Training Points</th>
                  <td>—</td>
                </tr>
                <tr>
                  <th scope="row">Armor Bonus</th>
                  <td>—</td>
                </tr>
                <tr>
                  <th scope="row">Shield Bonus</th>
                  <td>—</td>
                </tr>
                <tr>
                  <th scope="row">Misc Bonuses</th>
                  <td>—</td>
                </tr>
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
                  <th style={{ width: '5%' }}>Level Bonus</th>
                  <th style={{ width: '5%' }}>Attribute Bonus</th>
                  <th style={{ width: '5%' }}>Class Bonus</th>
                  <th style={{ width: '5%' }}>Item Bonus</th>
                  <th style={{ width: '5%' }}>Special Bonus</th>
                  <th style={{ width: '5%' }}>Total Bonus</th>
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
                            <div className="skill-levels" aria-label={`${row.definition.name} levels`}>
                              {row.state.levels.map((checked, levelIndex) => (
                                <label key={levelIndex} htmlFor={`skill-${row.definition.stateIndex}-level-${levelIndex}`}>
                                  <input
                                    id={`skill-${row.definition.stateIndex}-level-${levelIndex}`}
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(event) => handleSkillLevelToggle(row.definition.stateIndex, levelIndex, event.target.checked)}
                                    aria-label={`Level ${levelIndex + 1}`}
                                  />
                                </label>
                              ))}
                            </div>
                          </td>
                          <td>{row.levelBonus}</td>
                          <td>
                            <div className="skill-attribute">
                              <span>{row.definition.attributeKey}</span>
                              <span>{formatSigned(row.attributeBonus)}</span>
                            </div>
                          </td>
                          <td>{row.classBonus}</td>
                          <td>
                            <input
                              type="number"
                              className="skill-bonus-input"
                              value={row.state.itemBonus}
                              onChange={(event) => handleSkillBonusChange(row.definition.stateIndex, 'itemBonus', event.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="skill-bonus-input"
                              value={row.state.specialBonus}
                              onChange={(event) => handleSkillBonusChange(row.definition.stateIndex, 'specialBonus', event.target.value)}
                            />
                          </td>
                          <td>{row.totalBonus}</td>
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
