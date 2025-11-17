import { useEffect, useMemo, useState } from 'react';
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
  name: string;
  levels: boolean[];
  itemBonus: string;
  specialBonus: string;
  classBonus: number;
  attributeKey: AttributeKey | null;
};

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api';
const API_ROOT = API_BASE.replace(/\/$/, '');
const RACE_BONUS_ENDPOINT = (raceKey: string) => `${API_ROOT}/attributes/race-bonuses/${encodeURIComponent(raceKey)}`;

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
  const [skillRow, setSkillRow] = useState<SkillRowState>(() => ({
    name: 'Skill 1',
    levels: Array.from({ length: SKILL_LEVEL_COUNT }, () => false),
    itemBonus: '0',
    specialBonus: '0',
    classBonus: 0,
    attributeKey: ATTRIBUTE_KEYS[0] ?? null
  }));

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

  const attributeRowForSkill = useMemo(() => {
    if (!skillRow.attributeKey) return attributeRows[0];
    return attributeRows.find((row) => row.attribute === skillRow.attributeKey) ?? attributeRows[0];
  }, [attributeRows, skillRow.attributeKey]);

  const attributeTotalBonus = attributeRowForSkill
    ? attributeRowForSkill.totalBonus ?? attributeRowForSkill.normalBonus ?? 0
    : 0;

  const levelCount = useMemo(() => skillRow.levels.reduce((total, checked) => (checked ? total + 1 : total), 0), [skillRow.levels]);
  const levelBonus = levelCount;
  const itemBonusValue = Number.isFinite(Number(skillRow.itemBonus)) ? Number(skillRow.itemBonus) : 0;
  const specialBonusValue = Number.isFinite(Number(skillRow.specialBonus)) ? Number(skillRow.specialBonus) : 0;
  const classBonusValue = skillRow.classBonus;
  const totalBonus = levelBonus + attributeTotalBonus + classBonusValue + itemBonusValue + specialBonusValue;

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

  function handleSkillLevelToggle(index: number, checked: boolean) {
    setSkillRow((prev) => {
      const nextLevels = [...prev.levels];
      nextLevels[index] = checked;
      return { ...prev, levels: nextLevels };
    });
  }

  function handleSkillBonusChange(key: 'itemBonus' | 'specialBonus', value: string) {
    setSkillRow((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    setSkillRow((prev) => {
      if (!prev.attributeKey || !attributeRows.some((row) => row.attribute === prev.attributeKey)) {
        return { ...prev, attributeKey: attributeRows[0]?.attribute ?? prev.attributeKey };
      }
      return prev;
    });
  }, [attributeRows]);

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
      } catch (error) {
        if (!cancelled) {
          setRaceBonusError(error instanceof Error ? error.message : 'Failed to load race bonuses.');
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
                <tr>
                  <td>{skillRow.name}</td>
                  <td>
                    <div className="skill-levels" aria-label="Skill levels">
                      {skillRow.levels.map((checked, index) => (
                        <label key={index} htmlFor={`skill-level-${index}`}>
                          <input
                            id={`skill-level-${index}`}
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => handleSkillLevelToggle(index, event.target.checked)}
                            aria-label={`Level ${index + 1}`}
                          />
                        </label>
                      ))}
                    </div>
                  </td>
                  <td>{levelBonus}</td>
                  <td>
                    <div className="skill-attribute">
                      <span>{attributeRowForSkill?.attribute ?? '—'}</span>
                      <span>{attributeTotalBonus >= 0 ? `+${attributeTotalBonus}` : attributeTotalBonus}</span>
                    </div>
                  </td>
                  <td>{classBonusValue}</td>
                  <td>
                    <input
                      type="number"
                      className="skill-bonus-input"
                      value={skillRow.itemBonus}
                      onChange={(event) => handleSkillBonusChange('itemBonus', event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="skill-bonus-input"
                      value={skillRow.specialBonus}
                      onChange={(event) => handleSkillBonusChange('specialBonus', event.target.value)}
                    />
                  </td>
                  <td>{totalBonus}</td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>
      </section>
    </div>
  );
}
