import { useEffect, useMemo, useRef, useState } from 'react';

const ATTRIBUTE_KEYS = ['STR', 'DEX', 'CON', 'IQ', 'IT', 'CH'] as const;
type AttributeKey = (typeof ATTRIBUTE_KEYS)[number];

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

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api';
const D100_ENDPOINT = `${API_BASE.replace(/\/$/, '')}/dice/d100`;

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
  const [rolling, setRolling] = useState(false);
  const [tensFace, setTensFace] = useState(0);
  const [onesFace, setOnesFace] = useState(0);
  const [lastResult, setLastResult] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rolledValues, setRolledValues] = useState<RolledValue[]>([]);
  const [assignments, setAssignments] = useState<Record<AttributeKey, string | null>>(createEmptyAssignments);

  const animationIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    document.title = 'Character Creation – Base Attributes';
  }, []);

  useEffect(() => {
    return () => {
      if (animationIntervalRef.current != null) {
        window.clearInterval(animationIntervalRef.current);
      }
    };
  }, []);

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

  const isComplete = ATTRIBUTE_KEYS.every((key) => assignments[key] != null);
  const rollsRemaining = MAX_ROLL_COUNT - rolledValues.length;

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

  function handleAssignmentChange(attr: AttributeKey, valueId: string) {
    setAssignments((prev) => {
      const next: Record<AttributeKey, string | null> = { ...prev };
      if (valueId) {
        for (const key of ATTRIBUTE_KEYS) {
          if (key !== attr && next[key] === valueId) {
            next[key] = null;
          }
        }
        next[attr] = valueId;
      } else {
        next[attr] = null;
      }
      return next;
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
  }

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <h1 style={{ margin: 0, textAlign: 'center', color: '#ffffff', textShadow: '0 0 6px rgba(0,0,0,0.35)' }}>Character Creation – Base Attributes</h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
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
      </div>

      <p style={{ margin: 0, color: '#ffffff', textShadow: '0 0 4px rgba(0,0,0,0.3)', maxWidth: 800, textAlign: 'center' }}>
        Roll six base attribute scores using a D100. Any roll below {MIN_ACCEPTED_ROLL} is automatically rerolled. Once all six values
        are generated, assign them freely to STR, DEX, CON, IQ, IT, and CH.
      </p>

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
              </tr>
            </thead>
            <tbody>
              {ATTRIBUTE_KEYS.map((attr) => {
                const assignedId = assignments[attr];
                const assignedEntry = assignedId ? rolledValues.find((entry) => entry.id === assignedId) : null;
                const availableOptions = rolledValues.filter((entry) => entry.id === assignedId || !assignedValueIds.has(entry.id));
                return (
                  <tr key={attr}>
                    <td style={{ padding: '10px 8px', fontWeight: 700, color: COLORS.primary }}>{attr}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <select
                        value={assignedId ?? ''}
                        onChange={(event) => handleAssignmentChange(attr, event.target.value)}
                        disabled={rolledValues.length === 0}
                        style={{
                          width: '100%',
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
                      {assignedEntry && (
                        <small style={{ display: 'block', color: COLORS.primary, marginTop: 4 }}>
                          Assigned value: {assignedEntry.value}
                        </small>
                      )}
                    </td>
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
          </div>
        </div>
      </div>
    </div>
  );
}
