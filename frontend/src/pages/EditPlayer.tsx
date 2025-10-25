import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { get, put } from '../api/client';
import type { Player } from '../types';

export default function EditPlayer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await get<Player>(`/players/${id}`);
        setPlayer(data);
      } catch (e) {
        setError('Failed to load player');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!player) return;
    await put<Player>(`/players/${player.id}`, player);
    navigate('/players');
  }

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;
  if (!player) return <p>Not found</p>;

  return (
    <div style={{ padding: 16 }}>
      <h2>Edit Player</h2>
      <form onSubmit={save}>
        <div style={{ display: 'grid', gap: 8, maxWidth: 400 }}>
          <label>
            Name
            <input
              value={player.name}
              onChange={(e) => setPlayer({ ...player, name: e.target.value })}
            />
          </label>
          <label>
            Character ID
            <input
              value={player.characterId}
              onChange={(e) => setPlayer({ ...player, characterId: e.target.value })}
            />
          </label>
          <label>
            Level
            <input
              type="number"
              value={player.lvl}
              onChange={(e) => setPlayer({ ...player, lvl: Number(e.target.value) })}
            />
          </label>
          <label>
            XP
            <input
              type="number"
              value={player.xp}
              onChange={(e) => setPlayer({ ...player, xp: Number(e.target.value) })}
            />
          </label>
          <label>
            HP Max
            <input
              type="number"
              value={player.hpMax}
              onChange={(e) => setPlayer({ ...player, hpMax: Number(e.target.value) })}
            />
          </label>
          <label>
            HP Actual
            <input
              type="number"
              value={player.hpActual}
              onChange={(e) => setPlayer({ ...player, hpActual: Number(e.target.value) })}
            />
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit">Save</button>
            <button type="button" onClick={() => navigate('/players')}>Cancel</button>
          </div>
        </div>
      </form>
    </div>
  );
}
