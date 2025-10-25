import { useEffect, useState } from 'react';
import { get, patch, post, del } from '../api/client';
import type { Player } from '../types';
import { Link } from 'react-router-dom';

export default function PlayersList() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  async function revive(id: number) {
    await post<Player>(`/players/${id}/revive`);
    await load();
  }

  async function remove(id: number) {
    if (!confirm('Delete player?')) return;
    await del(`/players/${id}`);
    await load();
  }

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div style={{ padding: 16 }}>
      <h1>Players</h1>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Char ID</th>
            <th>Name</th>
            <th>Level</th>
            <th>XP</th>
            <th>Playing</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.characterId}</td>
              <td>{p.name}</td>
              <td>{p.lvl}</td>
              <td>{p.xp}</td>
              <td>{String(p.isPlaying)}</td>
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
