import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { get } from '../api/client';
import { addWeapons, fetchInventory, removeWeapon } from '../api/inventory';
import type { Player, PlayerInventoryItem, Weapon } from '../types';

const DEFAULT_WEAPON_NAMES = new Set(['Do Nothing', 'Prepare Magic']);
const STORAGE_REFRESH_KEY = 'merp:player-updated';

function formatNumber(value: number | undefined | null): string {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return String(value);
}

export default function PlayerInventory() {
  const { id } = useParams();
  const playerId = Number(id);
  const navigate = useNavigate();

  const [player, setPlayer] = useState<Player | null>(null);
  const [inventory, setInventory] = useState<PlayerInventoryItem[]>([]);
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!Number.isFinite(playerId)) {
        setError('Invalid player');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [playerData, inventoryData, weaponList] = await Promise.all([
          get<Player>(`/players/${playerId}`),
          fetchInventory(playerId),
          get<Weapon[]>('/weapons')
        ]);
        if (!cancelled) {
          setPlayer(playerData);
          setInventory(inventoryData);
          setWeapons(weaponList ?? []);
        }
      } catch (e) {
        if (!cancelled) setError('Failed to load inventory');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [playerId]);

  useEffect(() => {
    document.title = 'Inventory';
  }, []);

  const inventoryWeaponIds = useMemo(() => new Set(inventory.map((item) => item.weapon.id)), [inventory]);

  const selectableWeapons = useMemo(() => {
    return weapons.filter((w) => !inventoryWeaponIds.has(w.id));
  }, [weapons, inventoryWeaponIds]);

  const selectedWeaponObjects = useMemo(() => {
    return selectableWeapons.filter((w) => selectedIds.has(w.id));
  }, [selectableWeapons, selectedIds]);

  function toggleSelection(weaponId: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(weaponId)) next.delete(weaponId);
      else next.add(weaponId);
      return next;
    });
  }

  async function handleAddWeapons(e: React.FormEvent) {
    e.preventDefault();
    if (!player) return;
    if (selectedIds.size === 0) {
      setModalOpen(false);
      return;
    }
    try {
      setSaving(true);
      const list = await addWeapons(player.id, Array.from(selectedIds));
      setInventory(list);
      setSelectedIds(new Set());
      setModalOpen(false);
      signalPlayerUpdated();
    } catch (err) {
      console.error(err);
      setError('Failed to add weapons');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(weaponId: number) {
    if (!player) return;
    try {
      await removeWeapon(player.id, weaponId);
      setInventory((prev) => prev.filter((item) => item.weapon.id !== weaponId));
      signalPlayerUpdated();
    } catch (err) {
      console.error(err);
      setError('Failed to delete weapon');
    }
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
      navigate('/home');
    } catch {
      navigate('/home');
    }
  }

  function signalPlayerUpdated() {
    try {
      localStorage.setItem(STORAGE_REFRESH_KEY, String(Date.now()));
    } catch {}
  }

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;
  if (!player) return <p>Player not found</p>;

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h1 style={{ margin: 0, marginTop: 0, textAlign: 'center' }}>Inventory</h1>
      <div style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={handleBackToInn}
          style={{ padding: '6px 12px', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        >
          Back to the Inn
        </button>
      </div>

      <section style={{ border: '1px solid #d4d4d4', borderRadius: 8, padding: 16, background: '#ffffff', boxShadow: '0 6px 14px rgba(0,0,0,0.08)' }}>
        <h2 style={{ margin: '0 0 12px 0', fontSize: 20, color: '#1f3b6e' }}>Player</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 12 }}>
          <InfoField label="Char ID" value={player.characterId} />
          <InfoField label="Name" value={player.name} />
          <InfoField label="Race" value={player.race} />
          <InfoField label="Class" value={player.playerClass} />
          <InfoField label="Level" value={formatNumber(player.lvl)} />
          <InfoField label="XP" value={formatNumber(player.xp)} />
          <InfoField label="Max HP" value={formatNumber(player.hpMax)} />
          <InfoField label="HP" value={formatNumber(player.hpActual)} />
        </div>
      </section>

      <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0 }}>Weapons</h2>
        <button
          type="button"
          onClick={() => { setModalOpen(true); setSelectedIds(new Set()); }}
          style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #2f5597', background: '#2f5597', color: '#fff', fontWeight: 600 }}
        >
          Add Weapon / Ability
        </button>
      </section>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 920 }}>
          <thead>
            <tr style={{ background: '#2f5597', color: '#fff' }}>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Activity</th>
              <th style={thStyle}>Attack</th>
              <th style={thStyle}>Crit</th>
              <th style={thStyle}>Secondary Crit</th>
              <th style={thStyle}>Weapon Type</th>
              <th style={thStyle}>Spec Type</th>
              <th style={thStyle}>Extra TB MH</th>
              <th style={thStyle}>Extra TB OH</th>
              <th style={thStyle}>Roll Cap MH</th>
              <th style={thStyle}>Roll Cap OH</th>
              <th style={thStyle}>Crit Cap MH</th>
              <th style={thStyle}>Crit Cap OH</th>
              <th style={thStyle}>Special Modifier TB</th>
              <th style={thStyle}>Weight</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {inventory.length === 0 && (
              <tr>
                <td style={emptyCellStyle} colSpan={16}>No weapons assigned yet.</td>
              </tr>
            )}
            {inventory.map((item) => {
              const { weapon } = item;
              const deleteDisabled = item.defaultWeapon || DEFAULT_WEAPON_NAMES.has(weapon.name ?? '');
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={tdStyle}>{weapon.name}</td>
                  <td style={tdStyle}>{weapon.activityType}</td>
                  <td style={tdStyle}>{weapon.attackType}</td>
                  <td style={tdStyle}>{weapon.critType}</td>
                  <td style={tdStyle}>{weapon.secondaryCritType ?? '—'}</td>
                  <td style={tdStyle}>{weapon.weaponType}</td>
                  <td style={tdStyle}>{weapon.weaponSpecType}</td>
                  <td style={tdStyle}>{formatNumber(weapon.extraTBMH)}</td>
                  <td style={tdStyle}>{formatNumber(weapon.extraTBOH)}</td>
                  <td style={tdStyle}>{formatNumber(weapon.rollCapMH)}</td>
                  <td style={tdStyle}>{formatNumber(weapon.rollCapOH)}</td>
                  <td style={tdStyle}>{weapon.critCapMH ?? '—'}</td>
                  <td style={tdStyle}>{weapon.critCapOH ?? '—'}</td>
                  <td style={tdStyle}>{formatNumber(weapon.specialModofierTB)}</td>
                  <td style={tdStyle}>{weapon.weight != null ? `${weapon.weight}` : '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleDelete(weapon.id)}
                      disabled={deleteDisabled}
                      style={{
                        border: 'none',
                        background: deleteDisabled ? '#ccc' : '#b00020',
                        color: '#fff',
                        padding: '6px 10px',
                        borderRadius: 4,
                        cursor: deleteDisabled ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div style={overlayStyle}>
          <div style={modalStyle} role="dialog" aria-modal="true">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid #d4d4d4', paddingBottom: 8 }}>
              <h3 style={{ margin: 0, color: '#1f3b6e' }}>Add Weapons</h3>
              <button
                type="button"
                onClick={() => { setModalOpen(false); setSelectedIds(new Set()); }}
                style={{ border: 'none', background: 'transparent', color: '#1f3b6e', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleAddWeapons} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ maxHeight: '60vh', overflowY: 'auto', border: '1px solid #d4d4d4', borderRadius: 6, background: '#f5f8ff' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#1f3b6e', color: '#fff' }}>
                      <th style={{ ...thStyle, color: '#fff' }}>Select</th>
                      <th style={{ ...thStyle, color: '#fff' }}>Name</th>
                      <th style={{ ...thStyle, color: '#fff' }}>Activity</th>
                      <th style={{ ...thStyle, color: '#fff' }}>Attack</th>
                      <th style={{ ...thStyle, color: '#fff' }}>Crit</th>
                      <th style={{ ...thStyle, color: '#fff' }}>Spec</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectableWeapons.length === 0 && (
                      <tr>
                        <td style={emptyCellStyle} colSpan={6}>No additional weapons available.</td>
                      </tr>
                    )}
                    {selectableWeapons.map((weapon) => (
                      <tr key={weapon.id} style={{ borderBottom: '1px solid #d4d4d4', background: '#fff', color: '#123066' }}>
                        <td style={{ ...tdStyle, textAlign: 'center', color: '#123066' }}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(weapon.id)}
                            onChange={() => toggleSelection(weapon.id)}
                            aria-label={`Select ${weapon.name}`}
                          />
                        </td>
                        <td style={{ ...tdStyle, color: '#123066' }}>{weapon.name}</td>
                        <td style={{ ...tdStyle, color: '#123066' }}>{weapon.activityType}</td>
                        <td style={{ ...tdStyle, color: '#123066' }}>{weapon.attackType}</td>
                        <td style={{ ...tdStyle, color: '#123066' }}>{weapon.critType}</td>
                        <td style={{ ...tdStyle, color: '#123066' }}>{weapon.weaponSpecType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontSize: 14, color: '#1f3b6e', fontWeight: 600 }}>
                  Selected: {selectedWeaponObjects.length}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => { setModalOpen(false); setSelectedIds(new Set()); }}
                    style={{ padding: '6px 12px', borderRadius: 4, border: '1px solid #b0b8c5', background: '#fff', color: '#1f3b6e', fontWeight: 600 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || selectedIds.size === 0}
                    style={{ padding: '6px 12px', borderRadius: 4, border: '1px solid #2f5597', background: saving || selectedIds.size === 0 ? '#8fa3cf' : '#2f5597', color: '#fff', fontWeight: 600, cursor: saving || selectedIds.size === 0 ? 'not-allowed' : 'pointer' }}
                  >
                    {saving ? 'Saving…' : 'Add Selected'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle: CSSProperties = {
  padding: '8px 10px',
  textAlign: 'left',
  borderBottom: '1px solid #ddd',
  fontWeight: 600,
  fontSize: 13
};

const tdStyle: CSSProperties = {
  padding: '8px 10px',
  textAlign: 'left',
  fontSize: 13,
  verticalAlign: 'middle'
};

const emptyCellStyle: CSSProperties = {
  padding: '16px 10px',
  textAlign: 'center',
  color: '#666'
};

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100
};

const modalStyle: CSSProperties = {
  background: '#fff',
  borderRadius: 8,
  padding: 16,
  width: 'min(860px, 94vw)',
  maxHeight: '90vh',
  boxShadow: '0 16px 40px rgba(0,0,0,0.3)',
  display: 'flex',
  flexDirection: 'column',
  gap: 12
};

function InfoField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', textAlign: 'center' }}>
      <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, color: '#1f3b6e', fontWeight: 600 }}>{label}</span>
      <strong style={{ fontSize: 16, color: '#123066', fontWeight: 700 }}>{value ?? '—'}</strong>
    </div>
  );
}
