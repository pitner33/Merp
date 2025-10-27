import { useEffect, useState, type CSSProperties } from 'react';
import { get, patch, del, put } from '../api/client';
import type { Player } from '../types';
import { Link, useNavigate } from 'react-router-dom';

export default function Landing() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<keyof Player | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [confirmReviveFor, setConfirmReviveFor] = useState<Player | null>(null);
  const [closing, setClosing] = useState(false);
  const [reviving, setReviving] = useState(false);
  const [reviveError, setReviveError] = useState<string | null>(null);
  const [confirmDeleteFor, setConfirmDeleteFor] = useState<Player | null>(null);
  const [closingDelete, setClosingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function hpStyle(p: Player): CSSProperties {
    const max = Number(p.hpMax) || 0;
    const cur = Number(p.hpActual) || 0;
    const ratio = max > 0 ? cur / max : 0;
    const pct = ratio * 100;
    let bg = '#2fa84f';
    let fg = '#ffffff';
    if (pct === 100) { bg = '#2fa84f'; fg = '#ffffff'; }
    else if (pct < 100 && pct >= 75) { bg = '#a8e6a1'; fg = '#000000'; }
    else if (pct < 75 && pct >= 50) { bg = '#ffd966'; fg = '#000000'; }
    else if (pct < 50 && pct >= 20) { bg = '#f4a261'; fg = '#000000'; }
    else { bg = '#e76f51'; fg = '#ffffff'; }
    return { background: bg, color: fg, fontWeight: 600, textAlign: 'center' };
  }

  function hpTitle(p: Player): string {
    const pct = Math.round(((Number(p.hpActual) || 0) / (Number(p.hpMax) || 1)) * 100);
    return `${pct}%`;
  }

  function isRevived(p: Player): boolean {
    return (
      Number(p.hpActual) === Number(p.hpMax) &&
      (p.stunnedForRounds ?? 0) === 0 &&
      (p.penaltyOfActions ?? 0) === 0 &&
      (p.hpLossPerRound ?? 0) === 0
    );
  }

  async function load() {
    try {
      setLoading(true);
      const data = await get<Player[]>('/players');
      setPlayers(data);
    } catch (e) {
      setError('Failed to load players');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function togglePlay(id: number) {
    await patch<Player>(`/players/${id}/isplay`);
    await load();
  }

  async function remove(id: number) {
    await del(`/players/${id}`);
    await load();
  }

  async function revive(p: Player) {
    const body: Player = {
      ...p,
      hpActual: p.hpMax,
      isAlive: true,
      stunnedForRounds: 0,
      penaltyOfActions: 0,
      hpLossPerRound: 0,
    };
    await put<Player>(`/players/${p.id}`, body);
    await load();
  }

  function playAll() {
    const selected = players.filter((p) => p.isPlaying);
    if (selected.length === 0) return;
    navigate('/adventure/main', { state: { players: selected } });
  }

  function toggleSort(key: keyof Player) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sorted = (() => {
    if (!sortKey) return players;
    const arr = [...players];
    arr.sort((a, b) => {
      const va = (a as any)[sortKey];
      const vb = (b as any)[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') {
        return va - vb;
      }
      const sa = String(va);
      const sb = String(vb);
      return sa.localeCompare(sb);
    });
    if (sortDir === 'desc') arr.reverse();
    return arr;
  })();

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div style={{ padding: 16 }}>
      <h1>Home</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={playAll} disabled={!players.some((p) => p.isPlaying)}>PLAY</button>
        <Link to="/create-character">
          <button>CHARACTER CREATION</button>
        </Link>
      </div>
      <style>
        {`
          .table { width: 100%; border-collapse: collapse; }
          .table th, .table td { border: 1px solid #ddd; padding: 6px 8px; text-align: center; vertical-align: middle; }
          .table thead th { position: sticky; top: 0; background: #2f5597; color: #ffffff; z-index: 1; }
          .table th button { background: none; border: none; cursor: pointer; padding: 0; font: inherit; color: inherit; }
          .actions-cell { white-space: nowrap; }
          .center { text-align: center; }
          .right { text-align: right; }
          @keyframes overlayFadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes dialogPopIn { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
          @keyframes overlayFadeOut { from { opacity: 1; } to { opacity: 0; } }
          @keyframes dialogPopOut { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(8px) scale(0.98); } }
        `}
      </style>
      <table className="table">
        <thead>
          <tr>
            <th rowSpan={2} className="center">Play</th>
            <th rowSpan={2}><button onClick={() => toggleSort('characterId')}>ID {sortKey==='characterId' ? (sortDir==='asc'?'▲':'▼') : ''}</button></th>
            <th rowSpan={2}><button onClick={() => toggleSort('name')}>Name {sortKey==='name' ? (sortDir==='asc'?'▲':'▼') : ''}</button></th>
            <th rowSpan={2}><button onClick={() => toggleSort('gender' as keyof Player)}>Gender {sortKey==='gender' ? (sortDir==='asc'?'▲':'▼') : ''}</button></th>
            <th rowSpan={2}><button onClick={() => toggleSort('race' as keyof Player)}>Race {sortKey==='race' ? (sortDir==='asc'?'▲':'▼') : ''}</button></th>
            <th rowSpan={2}><button onClick={() => toggleSort('playerClass' as keyof Player)}>Class {sortKey==='playerClass' ? (sortDir==='asc'?'▲':'▼') : ''}</button></th>
            <th rowSpan={2}><button onClick={() => toggleSort('lvl')}>lvl {sortKey==='lvl' ? (sortDir==='asc'?'▲':'▼') : ''}</button></th>
            <th rowSpan={2}><button onClick={() => toggleSort('xp')}>XP {sortKey==='xp' ? (sortDir==='asc'?'▲':'▼') : ''}</button></th>
            <th rowSpan={2}><button onClick={() => toggleSort('hpMax' as keyof Player)}>max HP {sortKey==='hpMax' ? (sortDir==='asc'?'▲':'▼') : ''}</button></th>
            <th rowSpan={2}>HP</th>
            <th rowSpan={2}><button onClick={() => toggleSort('attackType' as keyof Player)}>Attack {sortKey==='attackType' ? (sortDir==='asc'?'▲':'▼') : ''}</button></th>
            <th rowSpan={2}><button onClick={() => toggleSort('critType' as keyof Player)}>Crit {sortKey==='critType' ? (sortDir==='asc'?'▲':'▼') : ''}</button></th>
            <th rowSpan={2}><button onClick={() => toggleSort('armorType' as keyof Player)}>Armor {sortKey==='armorType' ? (sortDir==='asc'?'▲':'▼') : ''}</button></th>
            <th rowSpan={2}><button onClick={() => toggleSort('tb' as keyof Player)}>TB {sortKey==='tb' ? (sortDir==='asc'?'▲':'▼') : ''}</button></th>
            <th colSpan={6} style={{ textAlign: 'center' }}>TB</th>
            <th rowSpan={2}><button onClick={() => toggleSort('vb' as keyof Player)}>VB {sortKey==='vb' ? (sortDir==='asc'?'▲':'▼') : ''}</button></th>
            <th rowSpan={2}><button onClick={() => toggleSort('shield' as keyof Player)}>Shield {sortKey==='shield' ? (sortDir==='asc'?'▲':'▼') : ''}</button></th>
            <th rowSpan={2}><button onClick={() => toggleSort('mm' as keyof Player)}>MM {sortKey==='mm' ? (sortDir==='asc'?'▲':'▼') : ''}</button></th>
            <th rowSpan={2}><button onClick={() => toggleSort('agilityBonus' as keyof Player)}>AGI Bonus {sortKey==='agilityBonus' ? (sortDir==='asc'?'▲':'▼') : ''}</button></th>
            <th colSpan={2} style={{ textAlign: 'center' }}>MD</th>
            <th rowSpan={2}><button onClick={() => toggleSort('perception' as keyof Player)}>Perception {sortKey==='perception' ? (sortDir==='asc'?'▲':'▼') : ''}</button></th>
            <th rowSpan={2}><button onClick={() => toggleSort('tracking' as keyof Player)}>Tracking {sortKey==='tracking' ? (sortDir==='asc'?'▲':'▼') : ''}</button></th>
            <th rowSpan={2}><button onClick={() => toggleSort('lockPicking' as keyof Player)}>Lockpicking {sortKey==='lockPicking' ? (sortDir==='asc'?'▲':'▼') : ''}</button></th>
            <th rowSpan={2}><button onClick={() => toggleSort('disarmTraps' as keyof Player)}>Disarm Traps {sortKey==='disarmTraps' ? (sortDir==='asc'?'▲':'▼') : ''}</button></th>
            <th rowSpan={2}><button onClick={() => toggleSort('objectUsage' as keyof Player)}>Object usage {sortKey==='objectUsage' ? (sortDir==='asc'?'▲':'▼') : ''}</button></th>
            <th rowSpan={2}><button onClick={() => toggleSort('runes' as keyof Player)}>Runes usage {sortKey==='runes' ? (sortDir==='asc'?'▲':'▼') : ''}</button></th>
            <th rowSpan={2}><button onClick={() => toggleSort('influence' as keyof Player)}>Influence {sortKey==='influence' ? (sortDir==='asc'?'▲':'▼') : ''}</button></th>
            <th rowSpan={2}><button onClick={() => toggleSort('stealth' as keyof Player)}>Stealth {sortKey==='stealth' ? (sortDir==='asc'?'▲':'▼') : ''}</button></th>
            <th rowSpan={2}>Actions</th>
          </tr>
          <tr>
            <th><button onClick={() => toggleSort('tbOneHanded' as keyof Player)}>1H {sortKey==='tbOneHanded' ? (sortDir==='asc'?'▲':'▼') : ''}</button></th>
            <th><button onClick={() => toggleSort('secondaryTB' as keyof Player)}>OH {sortKey==='secondaryTB' ? (sortDir==='asc'?'▲':'▼') : ''}</button></th>
            <th><button onClick={() => toggleSort('tbTwoHanded' as keyof Player)}>2H {sortKey==='tbTwoHanded' ? (sortDir==='asc'?'▲':'▼') : ''}</button></th>
            <th><button onClick={() => toggleSort('tbRanged' as keyof Player)}>Ranged {sortKey==='tbRanged' ? (sortDir==='asc'?'▲':'▼') : ''}</button></th>
            <th><button onClick={() => toggleSort('tbBaseMagic' as keyof Player)}>Base Magic {sortKey==='tbBaseMagic' ? (sortDir==='asc'?'▲':'▼') : ''}</button></th>
            <th><button onClick={() => toggleSort('tbTargetMagic' as keyof Player)}>Target Magic {sortKey==='tbTargetMagic' ? (sortDir==='asc'?'▲':'▼') : ''}</button></th>
            <th><button onClick={() => toggleSort('mdLenyeg' as keyof Player)}>Lenyeg {sortKey==='mdLenyeg' ? (sortDir==='asc'?'▲':'▼') : ''}</button></th>
            <th><button onClick={() => toggleSort('mdKapcsolat' as keyof Player)}>Kapcsolat {sortKey==='mdKapcsolat' ? (sortDir==='asc'?'▲':'▼') : ''}</button></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr key={p.id}>
              <td className="center">
                <input
                  type="checkbox"
                  checked={!!p.isPlaying}
                  onChange={() => togglePlay(p.id)}
                  aria-label={`Toggle isPlaying for ${p.name}`}
                />
              </td>
              <td>{p.characterId}</td>
              <td>{p.name}</td>
              <td>{p.gender}</td>
              <td>{p.race}</td>
              <td>{p.playerClass}</td>
              <td className="right">{p.lvl}</td>
              <td className="right">{p.xp}</td>
              <td className="right">{p.hpMax}</td>
              <td style={hpStyle(p)} title={hpTitle(p)}>
                <div>{p.hpActual}</div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{hpTitle(p)}</div>
              </td>
              <td>{p.attackType}</td>
              <td>{p.critType}</td>
              <td>{p.armorType}</td>
              <td className="right">{p.tb}</td>
              <td className="right">{p.tbOneHanded}</td>
              <td className="right">{p.secondaryTB}</td>
              <td className="right">{p.tbTwoHanded}</td>
              <td className="right">{p.tbRanged}</td>
              <td className="right">{p.tbBaseMagic}</td>
              <td className="right">{p.tbTargetMagic}</td>
              <td className="right">{p.vb}</td>
              <td>
                {p.shield ? (
                  <span title="Shield: Yes" aria-label="Shield: Yes">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#2f5597" stroke="#2f5597" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 3l7 3v5c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-3z"/>
                      <path d="M9 12l2 2 4-4" fill="none"/>
                    </svg>
                  </span>
                ) : (
                  <span title="Shield: No" aria-label="Shield: No">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 3l7 3v5c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-3z"/>
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </span>
                )}
      {confirmDeleteFor && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
            zIndex: 50,
            animation: (closingDelete ? 'overlayFadeOut 140ms ease-in forwards' : 'overlayFadeIn 160ms ease-out'),
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 8,
              width: 'min(420px, 92vw)',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              overflow: 'hidden',
              animation: (closingDelete ? 'dialogPopOut 140ms ease-in forwards' : 'dialogPopIn 180ms cubic-bezier(0.2, 0.8, 0.2, 1)'),
            }}
          >
            <div style={{ padding: '16px 16px 8px 16px', borderBottom: '1px solid #e6e6e6', background: '#7a1f1f', color: '#fff' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Delete player</h3>
            </div>
            <div style={{ padding: 16, color: '#111' }}>
              <p style={{ margin: 0, lineHeight: 1.6 }}>Delete character <strong>{confirmDeleteFor.characterId}</strong>?</p>
              <p style={{ margin: '8px 0 0 0', lineHeight: 1.6 }}>This action cannot be undone.</p>
              {deleteError && (
                <p style={{ margin: '12px 0 0 0', color: '#b00020' }}>{deleteError}</p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: 16, background: '#f5f5f5', borderTop: '1px solid #e6e6e6' }}>
              <button
                onClick={() => {
                  setClosingDelete(true);
                  setTimeout(() => { setConfirmDeleteFor(null); setClosingDelete(false); }, 160);
                }}
                disabled={deleting}
                style={{ padding: '8px 12px', background: '#ffffff', color: '#111', border: '1px solid #444', borderRadius: 4, fontWeight: 600, opacity: deleting ? 0.7 : 1 }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!confirmDeleteFor) return;
                  try {
                    setDeleting(true);
                    setDeleteError(null);
                    await remove(confirmDeleteFor.id);
                    setClosingDelete(true);
                    setTimeout(() => { setConfirmDeleteFor(null); setClosingDelete(false); setDeleting(false); }, 180);
                  } catch (e) {
                    setDeleteError('Failed to delete player. Please try again.');
                    setDeleting(false);
                  }
                }}
                disabled={deleting}
                style={{ padding: '8px 12px', background: '#7a1f1f', color: '#fff', border: '1px solid #651a1a', borderRadius: 4, fontWeight: 700, opacity: deleting ? 0.8 : 1 }}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
              </td>
              <td className="right">{p.mm}</td>
              <td className="right">{p.agilityBonus}</td>
              <td className="right">{p.mdLenyeg}</td>
              <td className="right">{p.mdKapcsolat}</td>
              <td className="right">{p.perception}</td>
              <td className="right">{p.tracking}</td>
              <td className="right">{p.lockPicking}</td>
              <td className="right">{p.disarmTraps}</td>
              <td className="right">{p.objectUsage}</td>
              <td className="right">{p.runes}</td>
              <td className="right">{p.influence}</td>
              <td className="right">{p.stealth}</td>
              <td className="actions-cell">
                <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                  <Link to={`/players/${p.id}/edit`}>
                    <button
                      aria-label="Edit"
                      title="Edit"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                      </svg>
                    </button>
                  </Link>
                  <button
                    aria-label="Revive"
                    title="Revive"
                    onClick={() => {
                      if (isRevived(p)) return;
                      setClosing(false);
                      setReviveError(null);
                      setReviving(false);
                      setConfirmReviveFor(p);
                    }}
                    disabled={isRevived(p)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-.96-.96a5.5 5.5 0 0 0-7.78 7.78l.96.96L12 21.23l7.78-7.78.96-.96a5.5 5.5 0 0 0 0-7.78z" />
                      <path d="M9 12h6" />
                    </svg>
                  </button>
                  <button
                    aria-label="Delete"
                    title="Delete"
                    onClick={() => { setDeleting(false); setClosingDelete(false); setDeleteError(null); setConfirmDeleteFor(p); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {confirmReviveFor && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
            zIndex: 50,
            animation: (closing ? 'overlayFadeOut 140ms ease-in forwards' : 'overlayFadeIn 160ms ease-out'),
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 8,
              width: 'min(420px, 92vw)',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              overflow: 'hidden',
              animation: (closing ? 'dialogPopOut 140ms ease-in forwards' : 'dialogPopIn 180ms cubic-bezier(0.2, 0.8, 0.2, 1)'),
            }}
          >
            <div style={{ padding: '16px 16px 8px 16px', borderBottom: '1px solid #e6e6e6', background: '#1f3b6e', color: '#fff' }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Revive player</h3>
            </div>
            <div style={{ padding: 16, color: '#111' }}>
              <p style={{ margin: 0, lineHeight: 1.6 }}>Revive character <strong>{confirmReviveFor.characterId}</strong>?</p>
              <p style={{ margin: '8px 0 0 0', lineHeight: 1.6 }}>
                This will set HP to max and clear stunned rounds, penalty, and HP loss per round.
              </p>
              {reviveError && (
                <p style={{ margin: '12px 0 0 0', color: '#b00020' }}>{reviveError}</p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: 16, background: '#f5f5f5', borderTop: '1px solid #e6e6e6' }}>
              <button
                onClick={() => {
                  setClosing(true);
                  setTimeout(() => { setConfirmReviveFor(null); setClosing(false); }, 160);
                }}
                disabled={reviving}
                style={{ padding: '8px 12px', background: '#ffffff', color: '#111', border: '1px solid #444', borderRadius: 4, fontWeight: 600, opacity: reviving ? 0.7 : 1 }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!confirmReviveFor) return;
                  try {
                    setReviveError(null);
                    setReviving(true);
                    await revive(confirmReviveFor);
                    setClosing(true);
                    setTimeout(() => { setConfirmReviveFor(null); setClosing(false); setReviving(false); }, 180);
                  } catch (e) {
                    setReviveError('Failed to revive player. Please try again.');
                    setReviving(false);
                  }
                }}
                disabled={reviving}
                style={{ padding: '8px 12px', background: '#1f3b6e', color: '#fff', border: '1px solid #1a305a', borderRadius: 4, fontWeight: 700, opacity: reviving ? 0.8 : 1 }}
              >
                {reviving ? 'Reviving…' : 'Revive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
