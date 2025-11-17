import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ATTRIBUTE_KEYS = ['STR', 'DEX', 'CON', 'IQ', 'IT', 'CH'] as const;
type AttributeKey = (typeof ATTRIBUTE_KEYS)[number];

type RaceOption = {
  code: string;
  displayName?: string | null;
};

type RolledValue = {
  id: string;
  value: number;
  order: number;
};

const MIN_ACCEPTED_ROLL = 50;
const MAX_ROLL_COUNT = ATTRIBUTE_KEYS.length;

function createEmptyAssignments(): Record<AttributeKey, string | null> {
  return ATTRIBUTE_KEYS.reduce<Record<AttributeKey, string | null>>((acc, key) => {
    acc[key] = null;
    return acc;
  }, {} as Record<AttributeKey, string | null>);
}

function createZeroBonuses(): Record<AttributeKey, number> {
  return ATTRIBUTE_KEYS.reduce<Record<AttributeKey, number>>((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {} as Record<AttributeKey, number>);
}

function createNullOverrides(): Record<AttributeKey, number | null> {
  return ATTRIBUTE_KEYS.reduce<Record<AttributeKey, number | null>>((acc, key) => {
    acc[key] = null;
    return acc;
  }, {} as Record<AttributeKey, number | null>);
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api';
const API_ROOT = API_BASE.replace(/\/$/, '');
const D100_ENDPOINT = `${API_ROOT}/dice/d100`;
const NORMAL_BONUS_BY_VALUE_ENDPOINT = (value: number) => `${API_ROOT}/attributes/normal-bonuses/${value}`;
const RACE_BONUS_ENDPOINT = (raceKey: string) => `${API_ROOT}/attributes/race-bonuses/${encodeURIComponent(raceKey)}`;

const CHARACTER_ID_OPTIONS = [
  { value: '', label: 'Select…' },
  { value: 'JK', label: 'JK' },
  { value: 'NJK', label: 'NJK' }
] as const;

type CharacterDetailsState = {
  characterId: string;
  name: string;
  gender: string;
  race: string;
  playerClass: string;
};

type MetaOptions = {
  genders: string[];
  races: RaceOption[];
  playerClasses: string[];
};

function formatOptionLabel(value: string): string {
  if (!value) return '';
  const spaced = value
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

const COLORS = {
  primary: '#2f5597',
  textPrimary: '#123066',
  accent: '#2fa84f',
  accentLight: '#c7f2cf',
  warning: '#d17c00',
  danger: '#7a1f1f',
  border: '#ddd',
  surface: '#f9fafb'
} as const;

export default function CreateCharacter() {
  const navigate = useNavigate();
  const [rolling, setRolling] = useState(false);
  const [tensFace, setTensFace] = useState(0);
  const [onesFace, setOnesFace] = useState(0);
  const [lastResult, setLastResult] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rolledValues, setRolledValues] = useState<RolledValue[]>([]);
  const [assignments, setAssignments] = useState<Record<AttributeKey, string | null>>(createEmptyAssignments);
  const [attributeBonuses, setAttributeBonuses] = useState<Record<AttributeKey, number>>(createZeroBonuses);
  const [attributeOverrides, setAttributeOverrides] = useState<Record<AttributeKey, number | null>>(createNullOverrides);
  const [raceBonuses, setRaceBonuses] = useState<Record<AttributeKey, number>>(createZeroBonuses);
  const [details, setDetails] = useState<CharacterDetailsState>({
    characterId: '',
    name: '',
    gender: '',
    race: '',
    playerClass: ''
  });
  const [meta, setMeta] = useState<MetaOptions>({
    genders: [],
    races: [],
    playerClasses: []
  });
  const [metaError, setMetaError] = useState<string | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [bonusFetchError, setBonusFetchError] = useState<string | null>(null);
  const [raceBonusError, setRaceBonusError] = useState<string | null>(null);

  const animationIntervalRef = useRef<number | null>(null);
  const normalBonusCacheRef = useRef<Map<number, number>>(new Map());
  const pendingBonusRequestRef = useRef<Map<AttributeKey, string | null>>(new Map());
  const raceBonusCacheRef = useRef<Map<string, Record<AttributeKey, number>>>(new Map());
  const raceBonusRequestRef = useRef<string | null>(null);

  useEffect(() => {
    document.title = 'Character Creation – Base Attributes';
  }, []);

  useEffect(() => {
    let ignore = false;
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
        if (!ignore) {
          setMetaError(error instanceof Error ? error.message : 'Metadata load failed.');
        }
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
  }, []);

  useEffect(() => {
    return () => {
      if (animationIntervalRef.current != null) {
        window.clearInterval(animationIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    const raceKeyRaw = details.race?.trim();
    if (!raceKeyRaw) {
      setRaceBonuses(createZeroBonuses());
      setRaceBonusError(null);
      raceBonusRequestRef.current = null;
      return;
    }

    const cacheKey = raceKeyRaw.toUpperCase();
    if (raceBonusCacheRef.current.has(cacheKey)) {
      setRaceBonuses(raceBonusCacheRef.current.get(cacheKey)!);
      setRaceBonusError(null);
      raceBonusRequestRef.current = cacheKey;
      return;
    }

    raceBonusRequestRef.current = cacheKey;
    setRaceBonusError(null);
    setRaceBonuses(createZeroBonuses());

    async function loadRaceBonuses() {
      try {
        const response = await fetch(RACE_BONUS_ENDPOINT(raceKeyRaw));
        if (ignore || raceBonusRequestRef.current !== cacheKey) {
          return;
        }

        if (response.status === 404) {
          const zeros = createZeroBonuses();
          raceBonusCacheRef.current.set(cacheKey, zeros);
          setRaceBonuses(zeros);
          setRaceBonusError(`Race bonus data not found for ${raceKeyRaw}.`);
          return;
        }

        if (!response.ok) {
          throw new Error(`Failed to load race bonuses for ${raceKeyRaw}`);
        }

        const data = await response.json();
        const normalized = createZeroBonuses();
        if (data && typeof data === 'object') {
          for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
            const upperKey = key.trim().toUpperCase();
            if (ATTRIBUTE_KEYS.includes(upperKey as AttributeKey) && typeof value === 'number' && Number.isFinite(value)) {
              normalized[upperKey as AttributeKey] = value;
            }
          }
        } else {
          throw new Error('Unexpected race bonus response');
        }

        raceBonusCacheRef.current.set(cacheKey, normalized);
        if (!ignore && raceBonusRequestRef.current === cacheKey) {
          setRaceBonuses(normalized);
          setRaceBonusError(null);
        }
      } catch (error) {
        if (ignore || raceBonusRequestRef.current !== cacheKey) {
          return;
        }
        setRaceBonuses(createZeroBonuses());
        setRaceBonusError(error instanceof Error ? error.message : 'Failed to fetch race bonuses.');
      }
    }

    loadRaceBonuses();
    return () => {
      ignore = true;
    };
  }, [details.race]);

  const assignedValueIds = useMemo(() => {
    const ids = new Set<string>();
    for (const value of Object.values(assignments)) {
      if (value) ids.add(value);
    }
    return ids;
  }, [assignments]);

  const unassignedValues = useMemo(() => {
    return rolledValues.filter((entry) => !assignedValueIds.has(entry.id));
  }, [rolledValues, assignedValueIds]);

  const attributeSummaries = useMemo(() => {
    return ATTRIBUTE_KEYS.map((attr) => {
      const assignedId = assignments[attr];
      const assignedEntry = assignedId ? rolledValues.find((entry) => entry.id === assignedId) : null;
      const overrideValue = attributeOverrides[attr];
      const value = overrideValue ?? assignedEntry?.value ?? 0;
      const normalBonus = attributeBonuses[attr] ?? 0;
      const raceBonus = raceBonuses[attr] ?? 0;
      return {
        attribute: attr,
        value,
        normalBonus,
        raceBonus,
        sum: normalBonus + raceBonus
      };
    });
  }, [assignments, rolledValues, attributeBonuses, raceBonuses, attributeOverrides]);

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

  const isComplete = ATTRIBUTE_KEYS.every((key) => assignments[key] != null);
  const rollsRemaining = MAX_ROLL_COUNT - rolledValues.length;

  function handleDetailChange<Key extends keyof CharacterDetailsState>(key: Key, value: CharacterDetailsState[Key]) {
    setDetails((prev) => ({ ...prev, [key]: value }));
  }

  async function fetchD100(): Promise<number> {
    const response = await fetch(D100_ENDPOINT);
    if (!response.ok) {
      throw new Error('Dice roll failed');
    }
    const value = await response.json();
    if (typeof value !== 'number') {
      throw new Error('Unexpected dice response');
    }
    return value;
  }

  async function rollAttribute() {
    if (rolling || rolledValues.length >= MAX_ROLL_COUNT) return;
    setErrorMessage(null);
    setStatusMessage(null);
    setRolling(true);

    if (animationIntervalRef.current != null) {
      window.clearInterval(animationIntervalRef.current);
    }
    animationIntervalRef.current = window.setInterval(() => {
      setTensFace((prev) => (prev + 1) % 10);
      setOnesFace((prev) => (prev + 1) % 10);
    }, 50);

    try {
      let attempt = 0;
      const maxAttempts = 24;
      let finalValue: number | null = null;

      while (attempt < maxAttempts) {
        attempt += 1;
        const value = await fetchD100();
        await new Promise<void>((resolve) => setTimeout(resolve, attempt === 1 ? 900 : 350));
        const tens = value === 100 ? 0 : Math.floor(value / 10);
        const ones = value === 100 ? 0 : value % 10;
        setTensFace(tens);
        setOnesFace(ones);
        setLastResult(value);

        if (value >= MIN_ACCEPTED_ROLL) {
          finalValue = value;
          setStatusMessage(null);
          break;
        }

        setStatusMessage(`Rolled ${value} (< ${MIN_ACCEPTED_ROLL}). Re-rolling…`);
      }

      if (finalValue == null) {
        throw new Error('Failed to obtain a valid roll. Please try again.');
      }

      setRolledValues((prev) => {
        const nextOrder = prev.length + 1;
        const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        return [...prev, { id, value: finalValue!, order: nextOrder }];
      });
      setStatusMessage(`Saved roll ${finalValue}. ${rollsRemaining - 1 >= 0 ? rollsRemaining - 1 : 0} remaining.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Rolling failed.');
    } finally {
      if (animationIntervalRef.current != null) {
        window.clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
      setRolling(false);
    }
  }

  async function loadNormalBonus(attr: AttributeKey, value: number, requestMarker: string) {
    pendingBonusRequestRef.current.set(attr, requestMarker);
    setAttributeBonuses((prev) => ({ ...prev, [attr]: 0 }));

    const cachedBonus = normalBonusCacheRef.current.get(value);
    if (cachedBonus != null) {
      if (pendingBonusRequestRef.current.get(attr) === requestMarker) {
        setAttributeBonuses((prev) => ({ ...prev, [attr]: cachedBonus }));
      }
      return;
    }

    try {
      const response = await fetch(NORMAL_BONUS_BY_VALUE_ENDPOINT(value));
      if (pendingBonusRequestRef.current.get(attr) !== requestMarker) {
        return;
      }

      if (response.status === 404) {
        normalBonusCacheRef.current.set(value, 0);
        setAttributeBonuses((prev) => ({ ...prev, [attr]: 0 }));
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to load normal bonus for value ${value}`);
      }

      const data = await response.json();
      if (typeof data !== 'number' || !Number.isFinite(data)) {
        throw new Error('Unexpected normal bonus response');
      }

      normalBonusCacheRef.current.set(value, data);
      if (pendingBonusRequestRef.current.get(attr) === requestMarker) {
        setAttributeBonuses((prev) => ({ ...prev, [attr]: data }));
      }
    } catch (error) {
      if (pendingBonusRequestRef.current.get(attr) === requestMarker) {
        setAttributeBonuses((prev) => ({ ...prev, [attr]: 0 }));
        setBonusFetchError(error instanceof Error ? error.message : 'Failed to fetch normal bonus.');
      }
    }
  }

  function handleAssignmentChange(attr: AttributeKey, valueId: string) {
    setBonusFetchError(null);

    const nextAssignments: Record<AttributeKey, string | null> = { ...assignments };
    if (valueId) {
      for (const key of ATTRIBUTE_KEYS) {
        if (key !== attr && nextAssignments[key] === valueId) {
          nextAssignments[key] = null;
          pendingBonusRequestRef.current.delete(key);
        }
      }
      nextAssignments[attr] = valueId;
    } else {
      nextAssignments[attr] = null;
    }

    const assignedEntry = valueId ? rolledValues.find((entry) => entry.id === valueId) : null;

    setAssignments(nextAssignments);
    setAttributeBonuses((prev) => {
      const next = { ...prev };
      for (const key of ATTRIBUTE_KEYS) {
        if (nextAssignments[key] == null) {
          next[key] = 0;
        }
      }
      return next;
    });

    setAttributeOverrides((prev) => {
      const next = { ...prev };
      for (const key of ATTRIBUTE_KEYS) {
        if (nextAssignments[key] == null) {
          next[key] = null;
        }
      }
      next[attr] = assignedEntry ? assignedEntry.value : null;
      return next;
    });

    if (!valueId) {
      pendingBonusRequestRef.current.delete(attr);
      setAttributeBonuses((prev) => ({ ...prev, [attr]: 0 }));
      return;
    }

    if (!assignedEntry) {
      pendingBonusRequestRef.current.delete(attr);
      setAttributeBonuses((prev) => ({ ...prev, [attr]: 0 }));
      return;
    }

    const requestMarker = `assign:${valueId}:${Date.now()}`;
    void loadNormalBonus(attr, assignedEntry.value, requestMarker);
  }

  function handleOverrideChange(attr: AttributeKey, rawValue: string) {
    const assignedId = assignments[attr];
    if (!assignedId) {
      return;
    }

    setBonusFetchError(null);
    const trimmed = rawValue.trim();
    if (trimmed === '') {
      setAttributeOverrides((prev) => ({ ...prev, [attr]: null }));
      const assignedEntry = rolledValues.find((entry) => entry.id === assignedId);
      if (assignedEntry) {
        const requestMarker = `assign:${assignedId}:${Date.now()}`;
        void loadNormalBonus(attr, assignedEntry.value, requestMarker);
      } else {
        pendingBonusRequestRef.current.delete(attr);
        setAttributeBonuses((prev) => ({ ...prev, [attr]: 0 }));
      }
      return;
    }

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      return;
    }

    const normalized = Math.max(1, Math.min(102, Math.round(parsed)));
    setAttributeOverrides((prev) => ({ ...prev, [attr]: normalized }));
    const requestMarker = `override:${attr}:${normalized}:${Date.now()}`;
    void loadNormalBonus(attr, normalized, requestMarker);
  }

  function handleBackToInn() {
    const homeUrl = new URL('/home', window.location.origin).toString();
    if (window.opener && !window.opener.closed) {
      try {
        window.opener.location.href = homeUrl;
        window.opener.focus();
        window.close();
        return;
      } catch (error) {
        // fall back to normal navigation
      }
    }
    navigate('/home');
  }

  function handleNext() {
    const attributePayload = attributeSummaries.map((summary) => ({
      attribute: summary.attribute,
      value: summary.value,
      normalBonus: summary.normalBonus,
      raceBonus: summary.raceBonus,
      sum: summary.sum
    }));

    navigate('/create-character-early-years', {
      state: {
        details,
        meta,
        attributes: attributePayload
      }
    });
  }

  function resetAll() {
    if (animationIntervalRef.current != null) {
      window.clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }
    setRolling(false);
    setTensFace(0);
    setOnesFace(0);
    setLastResult(null);
    setStatusMessage(null);
    setErrorMessage(null);
    setRolledValues([]);
    setAssignments(createEmptyAssignments());
    setAttributeBonuses(createZeroBonuses());
    setAttributeOverrides(createNullOverrides());
    setRaceBonuses(createZeroBonuses());
    normalBonusCacheRef.current.clear();
    pendingBonusRequestRef.current.clear();
    raceBonusCacheRef.current.clear();
    raceBonusRequestRef.current = null;
    setBonusFetchError(null);
    setRaceBonusError(null);
  }

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h1 style={{ margin: 0, textAlign: 'center', color: '#ffffff', textShadow: '0 0 6px rgba(0,0,0,0.35)' }}>Character Creation – Base Attributes</h1>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={handleBackToInn}
          style={{
            padding: '6px 12px',
            background: '#d32f2f',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer'
          }}
        >
          Back to the Inn
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!isComplete}
          style={{
            padding: '6px 12px',
            background: isComplete ? '#2f5597' : '#9fb2d9',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: isComplete ? 'pointer' : 'not-allowed',
            opacity: isComplete ? 1 : 0.75
          }}
        >
          Next
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 8, padding: 16, border: `1px solid ${COLORS.border}`, boxShadow: '0 2px 8px rgba(47,85,151,0.1)', maxWidth: 960, margin: '0 auto', width: '100%' }}>
        <h2 style={{ marginTop: 0, marginBottom: 12, color: COLORS.primary }}>Character Details</h2>
        {metaError && (
          <p style={{ margin: '0 0 12px 0', color: COLORS.danger, fontWeight: 600 }}>{metaError}</p>
        )}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ddd', padding: '6px 8px', background: COLORS.primary, color: '#fff', textTransform: 'uppercase', fontSize: 12 }}>Character ID</th>
                <th style={{ border: '1px solid #ddd', padding: '6px 8px', background: COLORS.primary, color: '#fff', textTransform: 'uppercase', fontSize: 12 }}>Name</th>
                <th style={{ border: '1px solid #ddd', padding: '6px 8px', background: COLORS.primary, color: '#fff', textTransform: 'uppercase', fontSize: 12 }}>Gender</th>
                <th style={{ border: '1px solid #ddd', padding: '6px 8px', background: COLORS.primary, color: '#fff', textTransform: 'uppercase', fontSize: 12 }}>Race</th>
                <th style={{ border: '1px solid #ddd', padding: '6px 8px', background: COLORS.primary, color: '#fff', textTransform: 'uppercase', fontSize: 12 }}>Class</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #ddd', padding: '6px 8px' }}>
                  <select
                    value={details.characterId}
                    onChange={(event) => handleDetailChange('characterId', event.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  >
                    {CHARACTER_ID_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ border: '1px solid #ddd', padding: '6px 8px' }}>
                  <input
                    type="text"
                    value={details.name}
                    onChange={(event) => handleDetailChange('name', event.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    placeholder="Character name"
                  />
                </td>
                <td style={{ border: '1px solid #ddd', padding: '6px 8px' }}>
                  <select
                    value={details.gender}
                    onChange={(event) => handleDetailChange('gender', event.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    disabled={metaLoading}
                  >
                    {genderOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ border: '1px solid #ddd', padding: '6px 8px' }}>
                  <select
                    value={details.race}
                    onChange={(event) => handleDetailChange('race', event.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    disabled={metaLoading}
                  >
                    {raceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={{ border: '1px solid #ddd', padding: '6px 8px' }}>
                  <select
                    value={details.playerClass}
                    onChange={(event) => handleDetailChange('playerClass', event.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                    disabled={metaLoading}
                  >
                    {classOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {metaLoading && (
          <p style={{ margin: '12px 0 0 0', color: COLORS.warning, fontWeight: 600 }}>Loading character metadata…</p>
        )}
      </div>

      <style>
        {`
          .dice-stage { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 16px; border: 1px solid ${COLORS.border}; border-radius: 8px; background: ${COLORS.surface}; max-width: 560px; }
          .dice-wrap { display: flex; align-items: center; justify-content: center; gap: 16px; }
          .die { width: 72px; height: 72px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 28px; color: ${COLORS.textPrimary}; border-radius: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); user-select: none; }
          .die.tens { background: #e3eafc; border: 1px solid ${COLORS.primary}; }
          .die.ones { background: #daf6e5; border: 1px solid ${COLORS.accent}; }
          .die.rolling { animation: dice-bounce 300ms infinite alternate ease-in-out; }
          @keyframes dice-bounce { from { transform: translateY(0) rotate(0deg); } to { transform: translateY(-4px) rotate(6deg); } }
          .result-box { display: inline-flex; align-items: center; justify-content: center; width: 128px; height: 128px; border: 2px solid ${COLORS.primary}; border-radius: 12px; background: #fff; box-shadow: 0 3px 12px rgba(47,85,151,0.18); }
          .result-value { font-size: 54px; font-weight: 900; color: ${COLORS.primary}; }
        `}
      </style>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div className="dice-stage">
          <h2 style={{ margin: 0, color: COLORS.primary }}>Attribute Roll</h2>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={rollAttribute}
              disabled={rolling || rolledValues.length >= MAX_ROLL_COUNT}
              style={{
                padding: '8px 16px',
                background: rolling || rolledValues.length >= MAX_ROLL_COUNT ? COLORS.accentLight : COLORS.accent,
                color: '#fff',
                border: `1px solid ${rolling || rolledValues.length >= MAX_ROLL_COUNT ? COLORS.accentLight : COLORS.accent}`,
                borderRadius: 6,
                cursor: rolling || rolledValues.length >= MAX_ROLL_COUNT ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                minWidth: 190
              }}
            >
              {rolledValues.length < MAX_ROLL_COUNT ? `Roll D100 (${rollsRemaining} left)` : 'All rolls complete'}
            </button>
            <button
              type="button"
              onClick={resetAll}
              style={{
                padding: '8px 16px',
                background: COLORS.danger,
                color: '#fff',
                border: '1px solid #651a1a',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 700
              }}
            >
              Reset
            </button>
          </div>
          <p style={{ margin: '4px 0 0 0', color: COLORS.textPrimary, textAlign: 'center', maxWidth: 440 }}>
            Roll six base attribute scores using a D100. Any roll below {MIN_ACCEPTED_ROLL} is automatically rerolled. Once all six values
            are generated, assign them freely to STR, DEX, CON, IQ, IT, and CH.
          </p>
          <div className="dice-wrap">
            <div className={`die tens${rolling ? ' rolling' : ''}`} aria-label="tens-die">{tensFace}</div>
            <div className={`die ones${rolling ? ' rolling' : ''}`} aria-label="ones-die">{onesFace}</div>
          </div>
          <div className="result-box">
            <span className="result-value">{lastResult != null ? lastResult : ''}</span>
          </div>
          {statusMessage && (
            <p style={{ margin: 0, color: COLORS.accent, fontWeight: 600 }}>{statusMessage}</p>
          )}
          {errorMessage && (
            <p style={{ margin: 0, color: COLORS.danger, fontWeight: 600 }}>{errorMessage}</p>
          )}
          <div style={{ width: '100%', borderTop: '1px solid #eee', paddingTop: 12 }}>
            <strong style={{ color: COLORS.primary }}>Stored values ({rolledValues.length}/{MAX_ROLL_COUNT}):</strong>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              {rolledValues.length === 0 && <span style={{ color: '#777' }}>No rolls yet.</span>}
              {rolledValues.map((entry) => (
                <span
                  key={entry.id}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: assignedValueIds.has(entry.id) ? '#e8f5ee' : '#e7ecf8',
                    color: COLORS.textPrimary,
                    border: `1px solid ${assignedValueIds.has(entry.id) ? COLORS.accent : COLORS.primary}`,
                    fontWeight: 600,
                    fontSize: 14
                  }}
                >
                  Roll {entry.order}: {entry.value}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ flex: '1 1 320px', minWidth: 320, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 16, background: '#fff', boxShadow: '0 2px 8px rgba(47,85,151,0.1)' }}>
          <h2 style={{ marginTop: 0, color: COLORS.primary }}>Assign Attributes</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', paddingBottom: 8, borderBottom: `2px solid ${COLORS.primary}`, color: COLORS.primary }}>Attribute</th>
                <th style={{ textAlign: 'left', paddingBottom: 8, borderBottom: `2px solid ${COLORS.primary}`, color: COLORS.primary }}>Value</th>
                <th style={{ textAlign: 'left', paddingBottom: 8, borderBottom: `2px solid ${COLORS.primary}`, color: COLORS.primary }}>Normal Bonus</th>
                <th style={{ textAlign: 'left', paddingBottom: 8, borderBottom: `2px solid ${COLORS.primary}`, color: COLORS.primary }}>Race Bonus</th>
                <th style={{ textAlign: 'left', paddingBottom: 8, borderBottom: `2px solid ${COLORS.primary}`, color: COLORS.primary }}>Sum Bonus</th>
              </tr>
            </thead>
            <tbody>
              {attributeSummaries.map((summary) => {
                const assignedId = assignments[summary.attribute];
                const availableOptions = rolledValues.filter((entry) => entry.id === assignedId || !assignedValueIds.has(entry.id));
                const assignedEntry = assignedId ? rolledValues.find((entry) => entry.id === assignedId) : null;
                const overrideValue = attributeOverrides[summary.attribute];
                const displayValue = overrideValue ?? assignedEntry?.value ?? '';
                const inputValue = displayValue === '' ? '' : String(displayValue);
                return (
                  <tr key={summary.attribute}>
                    <td style={{ padding: '10px 8px', fontWeight: 700, color: COLORS.primary }}>{summary.attribute}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <select
                            value={assignedId ?? ''}
                            onChange={(event) => handleAssignmentChange(summary.attribute, event.target.value)}
                            disabled={rolledValues.length === 0}
                            style={{
                              flex: '1 1 140px',
                              minWidth: 140,
                              padding: '6px 8px',
                              borderRadius: 6,
                              border: `1px solid ${COLORS.primary}`,
                              fontSize: 14,
                              color: COLORS.textPrimary,
                              background: '#fff'
                            }}
                          >
                            <option value="">Unassigned</option>
                            {availableOptions.map((entry) => (
                              <option key={entry.id} value={entry.id}>
                                Roll {entry.order}: {entry.value}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min={1}
                            max={102}
                            value={inputValue}
                            onChange={(event) => handleOverrideChange(summary.attribute, event.target.value)}
                            disabled={!assignedEntry}
                            placeholder={assignedEntry ? 'Adjust value' : 'Assign first'}
                            style={{
                              flex: '0 1 120px',
                              minWidth: 110,
                              padding: '6px 8px',
                              borderRadius: 6,
                              border: `1px solid ${COLORS.border}`,
                              fontSize: 14,
                              color: COLORS.textPrimary,
                              background: assignedEntry ? '#fff' : '#f1f3f6'
                            }}
                          />
                        </div>
                        {assignedEntry && (
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: COLORS.textPrimary }}>
                            <span>Rolled: {assignedEntry.value}</span>
                            <span>Final: {summary.value}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '10px 8px', color: COLORS.textPrimary }}>{summary.normalBonus}</td>
                    <td style={{ padding: '10px 8px', color: COLORS.textPrimary }}>{summary.raceBonus}</td>
                    <td style={{ padding: '10px 8px', fontWeight: 600, color: COLORS.textPrimary }}>{summary.sum}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${COLORS.border}`, color: COLORS.textPrimary }}>
            <p style={{ margin: '0 0 8px 0' }}>
              Unassigned pool: {unassignedValues.length > 0
                ? unassignedValues.map((entry) => `Roll ${entry.order}: ${entry.value}`).join(', ')
                : 'None'}
            </p>
            {isComplete ? (
              <p style={{ margin: 0, color: COLORS.accent, fontWeight: 700 }}>All attributes assigned!</p>
            ) : (
              <p style={{ margin: 0, color: COLORS.warning, fontWeight: 600 }}>
                Assign each attribute once all rolls are completed.
              </p>
            )}
            {bonusFetchError && (
              <p style={{ margin: '8px 0 0 0', color: COLORS.danger, fontWeight: 600 }}>{bonusFetchError}</p>
            )}
            {raceBonusError && (
              <p style={{ margin: '8px 0 0 0', color: COLORS.danger, fontWeight: 600 }}>{raceBonusError}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
