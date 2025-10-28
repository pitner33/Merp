import { useEffect, useState } from 'react';
import { get, patch, post, del } from '../api/client';
import type { Player } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { isXpOverCap, formatXp } from '../utils/xp';

export default function PlayersList() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const navigate = useNavigate();

  async function load() {
    try {
      setLoading(true);
      const data = await get<Player[]>('/players');
      setPlayers(data);
      setSelected(new Set());
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

  async function revive(id: number) {
    await post<Player>(`/players/${id}/revive`);
    await load();
  }

  async function remove(id: number) {
    if (!confirm('Delete player?')) return;
    await del(`/players/${id}`);
    await load();
  }

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll(checked: boolean) {
    if (!checked) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(players.map((p) => p.id)));
  }

  async function playSelected() {
    const toEnable = players.filter((p) => selected.has(p.id) && !p.isPlaying);
    if (toEnable.length === 0) return;
    await Promise.all(toEnable.map((p) => patch<Player>(`/players/${p.id}/isplay`)));
    await load();
  }

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div style={{ padding: 16 }}>
      <h1>Players</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button disabled={selected.size === 0} onClick={playSelected}>PLAY</button>
        <button onClick={() => navigate('/create-character')}>CHARACTER CREATION</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                onChange={(e) => toggleSelectAll(e.target.checked)}
                checked={selected.size > 0 && selected.size === players.length}
                aria-label="Select all"
              />
            </th>
            <th>ID</th>
            <th>Char ID</th>
            <th>Name</th>
            <th>Gender</th>
            <th>Race</th>
            <th>Class</th>
            <th>Level</th>
            <th>XP</th>
            <th>Playing</th>
            <th>Active</th>
            <th>Alive</th>
            <th>Activity</th>
            <th>Attack</th>
            <th>Crit</th>
            <th>Target</th>
            <th>HP Max</th>
            <th>HP</th>
            <th>MM</th>
            <th>TB</th>
            <th>TB 1H</th>
            <th>TB 2H</th>
            <th>TB Ranged</th>
            <th>TB BaseMagic</th>
            <th>TB TargetMagic</th>
            <th>TB UsedDef</th>
            <th>Secondary TB</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr key={p.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selected.has(p.id)}
                  onChange={() => toggleSelect(p.id)}
                  aria-label={`Select player ${p.name}`}
                />
              </td>
              <td>{p.id}</td>
              <td>{p.characterId}</td>
              <td>{p.name}</td>
              <td>{p.gender}</td>
              <td>{p.race}</td>
              <td>{p.playerClass}</td>
              <td>{p.lvl}</td>
              <td
                className="right"
                style={
                  isXpOverCap(Number(p.lvl), Number(p.xp))
                    ? { position: 'relative', background: '#ffd700', color: '#111', fontWeight: 800 }
                    : { position: 'relative' }
                }
                title={isXpOverCap(Number(p.lvl), Number(p.xp)) ? 'Level up available' : undefined}
              >
                {formatXp(Number(p.xp))}
                {isXpOverCap(Number(p.lvl), Number(p.xp)) && (
                  <span aria-hidden="true" style={{ position: 'absolute', top: 2, right: 2, lineHeight: 0 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 3l7 7h-4v11H9V10H5l7-7z" />
                    </svg>
                  </span>
                )}
              </td>
              <td>{String(p.isPlaying)}</td>
              <td>{String(p.isActive)}</td>
              <td>{/* @ts-ignore backend has isAlive */ String((p as any).isAlive)}</td>
              <td>{p.playerActivity}</td>
              <td>{p.attackType}</td>
              <td>{p.critType}</td>
              <td>{/* @ts-ignore backend has target */ (p as any).target}</td>
              <td>{p.hpMax}</td>
              <td>{p.hpActual}</td>
              <td>{p.mm}</td>
              <td>{p.tb}</td>
              <td>{p.tbOneHanded}</td>
              <td>{p.tbTwoHanded}</td>
              <td>{p.tbRanged}</td>
              <td>{p.tbBaseMagic}</td>
              <td>{p.tbTargetMagic}</td>
              <td>{p.tbUsedForDefense}</td>
              <td>{p.secondaryTB}</td>
              <td>
                <button onClick={() => togglePlay(p.id)}>Toggle Play</button>{' '}
                <Link to={`/players/${p.id}/edit`}>
                  <button>Edit</button>
                </Link>{' '}
                <button onClick={() => revive(p.id)}>Revive</button>{' '}
                <button onClick={() => remove(p.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
