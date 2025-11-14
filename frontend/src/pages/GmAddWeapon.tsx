import { useEffect, useMemo, useState } from 'react';
import { get, post } from '../api/client';
import type { Weapon } from '../types';

type MetaKey =
  | 'playerActivities'
  | 'attackTypes'
  | 'critTypes'
  | 'weaponTypes'
  | 'weaponSpecTypes';

type MetaOptions = Record<MetaKey, string[]>;

type NumberKind = 'int' | 'float';

type FieldOption = { value: string; label: string };

type FieldDefBase = {
  key: keyof FormValues;
  label: string;
  type: 'text' | 'number' | 'select';
  metaKey?: MetaKey;
  numberKind?: NumberKind;
  options?: readonly FieldOption[];
};

type FieldDef = FieldDefBase;

type FormValues = {
  name: string;
  activityType: string;
  attackType: string;
  critType: string;
  secondaryCritType: string;
  weaponType: string;
  weaponSpecType: string;
  extraTBMH: string;
  extraTBOH: string;
  rollCapMH: string;
  rollCapOH: string;
  critCapMH: string;
  critCapOH: string;
  specialModofierTB: string;
  weight: string;
};

const FIELD_DEFS: readonly FieldDef[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'activityType', label: 'Activity Type', type: 'select', metaKey: 'playerActivities' },
  { key: 'attackType', label: 'Attack Type', type: 'select', metaKey: 'attackTypes' },
  { key: 'critType', label: 'Crit Type', type: 'select', metaKey: 'critTypes' },
  { key: 'secondaryCritType', label: 'Secondary Crit Type', type: 'select', metaKey: 'critTypes' },
  { key: 'weaponType', label: 'Weapon Type', type: 'select', metaKey: 'weaponTypes' },
  { key: 'weaponSpecType', label: 'Weapon Spec Type', type: 'select', metaKey: 'weaponSpecTypes' },
  { key: 'extraTBMH', label: 'Extra TB MH', type: 'number', numberKind: 'int' },
  { key: 'extraTBOH', label: 'Extra TB OH', type: 'number', numberKind: 'int' },
  { key: 'rollCapMH', label: 'Roll Cap MH', type: 'number', numberKind: 'int' },
  { key: 'rollCapOH', label: 'Roll Cap OH', type: 'number', numberKind: 'int' },
  { key: 'critCapMH', label: 'Crit Cap MH', type: 'text' },
  { key: 'critCapOH', label: 'Crit Cap OH', type: 'text' },
  { key: 'specialModofierTB', label: 'Special Modifier TB', type: 'number', numberKind: 'int' },
  { key: 'weight', label: 'Weight', type: 'number', numberKind: 'float' }
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

export default function GmAddWeapon() {
  const [meta, setMeta] = useState<MetaOptions>({
    playerActivities: [],
    attackTypes: [],
    critTypes: [],
    weaponTypes: [],
    weaponSpecTypes: []
  });
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [form, setForm] = useState<FormValues>(() => createInitialValues());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'GM Add Weapon';
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadMeta() {
      try {
        setLoadingMeta(true);
        setMetaError(null);
        const [playerActivities, attackTypes, critTypes, weaponTypes, weaponSpecTypes] = await Promise.all([
          get<string[]>('/meta/player-activities'),
          get<string[]>('/meta/attack-types'),
          get<string[]>('/meta/crit-types'),
          get<string[]>('/meta/weapon-types'),
          get<string[]>('/meta/weapon-spec-types')
        ]);
        if (ignore) return;
        setMeta({
          playerActivities,
          attackTypes,
          critTypes,
          weaponTypes,
          weaponSpecTypes
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

  const columnStyles = useMemo(() => {
    const styles: Partial<Record<keyof FormValues, { width?: string; minWidth?: string }>> = {};
    FIELD_DEFS.forEach((field) => {
      if (field.key === 'name') {
        styles[field.key] = { minWidth: '20ch', width: '20ch' };
        return;
      }
      if (field.type === 'select') {
        const metaKey = field.metaKey;
        const metaOptions = metaKey ? meta[metaKey] ?? [] : [];
        const labels = [...metaOptions, 'Select…'].map(formatOptionLabel);
        const longest = labels.reduce((max, label) => Math.max(max, label.length), 0);
        const widthCh = longest + 2;
        styles[field.key] = { minWidth: `calc(${widthCh}ch + 2.5ch)` };
        return;
      }
      if (field.type === 'number') {
        styles[field.key] = { minWidth: 'calc(6ch + 2.5ch)' };
        return;
      }
      styles[field.key] = { minWidth: '12ch' };
    });
    return styles;
  }, [meta]);

  const hasEmptyRequired = useMemo(() => {
    return FIELD_DEFS.some((field) => {
      const value = form[field.key];
      return value.trim() === '';
    });
  }, [form]);

  function updateField(key: keyof FormValues, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleAddWeapon() {
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const payload = FIELD_DEFS.reduce<Record<string, unknown>>((acc, field) => {
        const raw = form[field.key];
        if (field.type === 'number') {
          if (raw === '') {
            acc[field.key] = null;
          } else if (field.numberKind === 'int') {
            const parsed = Number.parseInt(raw, 10);
            acc[field.key] = Number.isFinite(parsed) ? parsed : null;
          } else {
            const parsed = Number.parseFloat(raw);
            acc[field.key] = Number.isFinite(parsed) ? parsed : null;
          }
        } else {
          acc[field.key] = raw;
        }
        return acc;
      }, {} as Record<string, unknown>);

      const created = await post<Weapon>('/weapons', payload);
      setSuccess(`Weapon ${created?.name ?? ''} created successfully.`);
    } catch (e) {
      setError('Failed to create weapon. Please review the inputs and try again.');
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
      <h1 style={{ marginTop: 0, textAlign: 'center' }}>GM: Add Weapon</h1>

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
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
          <thead>
            <tr>
              {FIELD_DEFS.map((field) => (
                <th
                  key={field.key}
                  style={{
                    border: '1px solid #ddd',
                    padding: '6px 8px',
                    background: '#2f5597',
                    color: '#fff',
                    fontSize: 12,
                    textTransform: 'uppercase',
                    ...(columnStyles[field.key] ?? {})
                  }}
                >
                  {field.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {FIELD_DEFS.map((field) => {
                const value = form[field.key];
                const columnSizing = columnStyles[field.key] ?? {};
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
          onClick={handleAddWeapon}
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
          {saving ? 'Saving…' : 'ADD WEAPON'}
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
