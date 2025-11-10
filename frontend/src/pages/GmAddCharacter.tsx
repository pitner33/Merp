import { useEffect, useMemo, useState } from 'react';
import { get, post } from '../api/client';
import type { Player } from '../types';

type MetaKey = 'genders' | 'races' | 'playerClasses' | 'armorTypes';

type MetaOptions = Record<MetaKey, string[]>;

type NumberKind = 'int' | 'float';

type FieldOption = { value: string; label: string };

type FieldDefBase = {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  metaKey?: MetaKey;
  numberKind?: NumberKind;
  options?: readonly FieldOption[];
};

const CHARACTER_ID_OPTIONS: readonly FieldOption[] = [
  { value: '', label: 'Select…' },
  { value: 'JK', label: 'JK' },
  { value: 'NJK', label: 'NJK' }
];

const FIELD_DEFS: readonly FieldDefBase[] = [
  { key: 'characterId', label: 'Character ID', type: 'select', options: CHARACTER_ID_OPTIONS },
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'gender', label: 'Gender', type: 'select', metaKey: 'genders' },
  { key: 'race', label: 'Race', type: 'select', metaKey: 'races' },
  { key: 'playerClass', label: 'Class', type: 'select', metaKey: 'playerClasses' },
  { key: 'lvl', label: 'Level', type: 'number', numberKind: 'int' },
  { key: 'hpMax', label: 'HP Max', type: 'number', numberKind: 'float' },
  { key: 'tbOneHanded', label: 'TB One-handed', type: 'number', numberKind: 'int' },
  { key: 'tbTwoHanded', label: 'TB Two-handed', type: 'number', numberKind: 'int' },
  { key: 'tbRanged', label: 'TB Ranged', type: 'number', numberKind: 'int' },
  { key: 'tbBaseMagic', label: 'TB Base Magic', type: 'number', numberKind: 'int' },
  { key: 'tbTargetMagic', label: 'TB Target Magic', type: 'number', numberKind: 'int' },
  { key: 'tbOffHand', label: 'TB Offhand', type: 'number', numberKind: 'int' },
  { key: 'vb', label: 'VB', type: 'number', numberKind: 'int' },
  { key: 'armorType', label: 'Armor', type: 'select', metaKey: 'armorTypes' },
  { key: 'shield', label: 'Shield', type: 'boolean' },
  { key: 'mdLenyeg', label: 'MD Lényeg', type: 'number', numberKind: 'int' },
  { key: 'mdKapcsolat', label: 'MD Kapcsolat', type: 'number', numberKind: 'int' },
  { key: 'mm', label: 'MM', type: 'number', numberKind: 'int' },
  { key: 'agilityBonus', label: 'Agility Bonus', type: 'number', numberKind: 'int' },
  { key: 'stealth', label: 'Stealth', type: 'number', numberKind: 'int' },
  { key: 'perception', label: 'Perception', type: 'number', numberKind: 'int' },
  { key: 'tracking', label: 'Tracking', type: 'number', numberKind: 'int' },
  { key: 'lockPicking', label: 'Lockpicking', type: 'number', numberKind: 'int' },
  { key: 'disarmTraps', label: 'Disarm Traps', type: 'number', numberKind: 'int' },
  { key: 'objectUsage', label: 'Object Usage', type: 'number', numberKind: 'int' },
  { key: 'runes', label: 'Runes', type: 'number', numberKind: 'int' },
  { key: 'influence', label: 'Influence', type: 'number', numberKind: 'int' }
];

type FieldDef = (typeof FIELD_DEFS)[number];
type FormKey = FieldDef['key'];
type FormValues = Record<FormKey, string>;

const BOOLEAN_OPTIONS = [
  { value: '', label: 'Select…' },
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' }
];

function createInitialValues(): FormValues {
  return FIELD_DEFS.reduce<FormValues>((acc, field) => {
    acc[field.key] = '';
    return acc;
  }, {} as FormValues);
}

function formatOptionLabel(value: string): string {
  if (!value) return '';
  const spaced = value
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function isIntField(field: FieldDef): boolean {
  return field.type === 'number' && field.numberKind === 'int';
}

export default function GmAddCharacter() {
  const [meta, setMeta] = useState<MetaOptions>({
    genders: [],
    races: [],
    playerClasses: [],
    armorTypes: []
  });
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [form, setForm] = useState<FormValues>(() => createInitialValues());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'GM Add Character';
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadMeta() {
      try {
        setLoadingMeta(true);
        setMetaError(null);
        const [genders, races, playerClasses, armorTypes] = await Promise.all([
          get<string[]>('/meta/genders'),
          get<string[]>('/meta/races'),
          get<string[]>('/meta/player-classes'),
          get<string[]>('/meta/armor-types')
        ]);
        if (ignore) return;
        setMeta({
          genders,
          races,
          playerClasses,
          armorTypes
        });
      } catch (e) {
        if (!ignore) setMetaError('Failed to load metadata. Refresh to retry.');
      } finally {
        if (!ignore) setLoadingMeta(false);
      }
    }
    loadMeta();
    return () => {
      ignore = true;
    };
  }, []);

  const columnStyles = useMemo<Partial<Record<FormKey, { width?: string; minWidth?: string }>>>(() => {
    const styles: Partial<Record<FormKey, { width?: string; minWidth?: string }>> = {};
    FIELD_DEFS.forEach((field) => {
      if (field.key === 'shield') {
        styles[field.key as FormKey] = { width: '3.5rem', minWidth: '3.5rem' };
        return;
      }
      if (field.key === 'name') {
        styles[field.key as FormKey] = { width: '20ch', minWidth: '20ch' };
        return;
      }
      if (field.type === 'select') {
        const staticLabels = field.options?.map((option) => option.label) ?? [];
        const metaLabels = field.metaKey
          ? (meta[field.metaKey]?.map((option) => formatOptionLabel(option)) ?? [])
          : [];
        const labels = [...staticLabels, ...metaLabels, 'Select…'];
        const longest = labels.reduce((max, label) => Math.max(max, label.length), 0);
        const widthCh = longest + 2;
        styles[field.key as FormKey] = { minWidth: `calc(${widthCh}ch + 2.5ch)` };
        return;
      }
      if (field.type === 'number') {
        styles[field.key as FormKey] = { minWidth: 'calc(4ch + 2.5ch)' };
      }
    });
    return styles;
  }, [meta]);

  const hasEmptyRequired = useMemo(() => {
    return FIELD_DEFS.some((field) => {
      const value = form[field.key];
      if (field.type === 'boolean') {
        return value !== 'true' && value !== 'false';
      }
      return value.trim() === '';
    });
  }, [form]);

  function updateField(key: FormKey, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleAddCharacter() {
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const payload = FIELD_DEFS.reduce<Record<string, unknown>>((acc, field) => {
        const raw = form[field.key];
        if (field.type === 'number') {
          if (raw === '') {
            acc[field.key] = null;
          } else {
            const parsed = field.numberKind === 'int' ? Number.parseInt(raw, 10) : Number.parseFloat(raw);
            acc[field.key] = Number.isFinite(parsed) ? parsed : null;
          }
        } else if (field.type === 'boolean') {
          acc[field.key] = raw === 'true';
        } else {
          acc[field.key] = raw;
        }
        return acc;
      }, {} as Record<string, unknown>);

      const created = await post<Player>('/players', payload);
      setSuccess(`Character ${created?.characterId ?? ''} created successfully.`);
    } catch (e) {
      setError('Failed to create character. Please review the inputs and try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleClearFields() {
    setForm(createInitialValues());
    setError(null);
    setSuccess(null);
  }

  function handleBackToInn() {
    try {
      const homeUrl = new URL('/home', window.location.origin).toString();
      if (window.opener && !window.opener.closed) {
        try {
          window.opener.location.href = homeUrl;
          window.opener.focus();
          window.close();
          return;
        } catch {}
      }
      window.location.href = homeUrl;
    } catch {}
  }

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ marginTop: 0, textAlign: 'center' }}>GM: Add Character</h1>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <button
          type="button"
          onClick={handleBackToInn}
          style={{ padding: '6px 12px', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', minWidth: 160, fontWeight: 600 }}
        >
          Back to the Inn
        </button>
      </div>

      <div style={{ marginBottom: 12, textAlign: 'center' }}>
        {metaError && (
          <p style={{ color: '#d32f2f', fontWeight: 600 }}>{metaError}</p>
        )}
        {error && (
          <p style={{ color: '#d32f2f', fontWeight: 600 }}>{error}</p>
        )}
        {success && (
          <p style={{ color: '#2fa84f', fontWeight: 600 }}>{success}</p>
        )}
      </div>

      <div style={{ overflowX: 'auto', marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1200 }}>
          <thead>
            <tr>
              {FIELD_DEFS.map((field) => {
                const isTbColumn = field.key === 'tbOneHanded'
                  || field.key === 'tbTwoHanded'
                  || field.key === 'tbRanged'
                  || field.key === 'tbBaseMagic'
                  || field.key === 'tbTargetMagic'
                  || field.key === 'tbOffHand';
                if (field.key === 'tbOneHanded') {
                  return (
                    <th
                      key="tbGroup"
                      colSpan={6}
                      style={{
                        border: '1px solid #ddd',
                        padding: '6px 8px',
                        background: '#2f5597',
                        color: '#fff',
                        fontSize: 12,
                        textTransform: 'uppercase',
                        textAlign: 'center'
                      }}
                    >
                      TB
                    </th>
                  );
                }
                if (isTbColumn) {
                  return null;
                }
                return (
                  <th
                    key={field.key}
                    rowSpan={2}
                    style={{
                      border: '1px solid #ddd',
                      padding: '6px 8px',
                      background: '#2f5597',
                      color: '#fff',
                      fontSize: 12,
                      textTransform: 'uppercase',
                      verticalAlign: 'middle',
                      ...(columnStyles[field.key as FormKey] ?? {})
                    }}
                  >
                    {field.label}
                  </th>
                );
              })}
            </tr>
            <tr>
              {FIELD_DEFS.filter((field) =>
                field.key === 'tbOneHanded'
                || field.key === 'tbTwoHanded'
                || field.key === 'tbRanged'
                || field.key === 'tbBaseMagic'
                || field.key === 'tbTargetMagic'
                || field.key === 'tbOffHand'
              ).map((field) => (
                <th
                  key={field.key}
                  style={{
                    border: '1px solid #ddd',
                    padding: '6px 8px',
                    background: '#2f5597',
                    color: '#fff',
                    fontSize: 12,
                    textTransform: 'uppercase',
                    ...(columnStyles[field.key as FormKey] ?? {})
                  }}
                >
                  {field.label.startsWith('TB ')
                    ? field.label.replace(/^TB\s+/i, '')
                    : field.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {FIELD_DEFS.map((field) => {
                const value = form[field.key];
                const columnSizing = columnStyles[field.key as FormKey] ?? {};
                return (
                  <td
                    key={field.key}
                    style={{
                      border: '1px solid #ddd',
                      padding: '4px 6px',
                      verticalAlign: 'middle',
                      ...columnSizing
                    }}
                  >
                    {field.type === 'text' && (
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    )}
                    {field.type === 'number' && (
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        step={isIntField(field) ? 1 : 'any'}
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      />
                    )}
                    {field.type === 'select' && field.options && (
                      <select
                        value={value}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      >
                        {field.options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )}
                    {field.type === 'select' && !field.options && field.metaKey && (() => {
                      const metaKey = field.metaKey;
                      const metaOptions = meta[metaKey];
                      return (
                        <select
                          value={value}
                          onChange={(e) => updateField(field.key, e.target.value)}
                          style={{ width: '100%', boxSizing: 'border-box' }}
                          disabled={loadingMeta}
                        >
                          <option value="">Select…</option>
                          {metaOptions.map((option) => (
                            <option key={option} value={option}>
                              {formatOptionLabel(option)}
                            </option>
                          ))}
                        </select>
                      );
                    })()}
                    {field.key === 'shield' && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = value === 'true' ? 'false' : 'true';
                          updateField(field.key as FormKey, next);
                        }}
                        title={value === 'true' ? 'Shield: Yes' : 'Shield: No'}
                        aria-label={value === 'true' ? 'Shield: Yes' : 'Shield: No'}
                        aria-pressed={value === 'true'}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '100%'
                        }}
                      >
                        {value === 'true' ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="#2f5597" stroke="#2f5597" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M12 3l7 3v5c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-3z" />
                            <path d="M9 12l2 2 4-4" fill="none" />
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M12 3l7 3v5c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-3z" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        )}
                      </button>
                    )}
                    {field.type === 'boolean' && field.key !== 'shield' && (
                      <select
                        value={value}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box' }}
                      >
                        {BOOLEAN_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
        <button
          type="button"
          onClick={handleAddCharacter}
          disabled={loadingMeta || saving || hasEmptyRequired || !!metaError}
          style={{
            padding: '6px 12px',
            background: loadingMeta || saving || hasEmptyRequired || !!metaError ? '#a8a8a8' : '#2fa84f',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: loadingMeta || saving || hasEmptyRequired || !!metaError ? 'not-allowed' : 'pointer',
            fontWeight: 600
          }}
        >
          {saving ? 'Saving…' : 'ADD CHARACTER'}
        </button>
        <button
          type="button"
          onClick={handleClearFields}
          disabled={saving}
          style={{
            padding: '6px 12px',
            background: saving ? '#a8a8a8' : '#2f5597',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: saving ? 'not-allowed' : 'pointer',
            fontWeight: 600
          }}
        >
          CLEAR FIELDS
        </button>
      </div>
    </div>
  );
}
