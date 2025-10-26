import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { Player } from '../types';

export default function AdventureFightRound() {
  const location = useLocation();
  const navigate = useNavigate();
  const round = (location.state as any)?.round as { nextTwoPlayersToFight?: Player[] } | undefined;
  const pair = round?.nextTwoPlayersToFight || [];
  const attacker: Player | undefined = pair[0];
  const defender: Player | undefined = pair[1];

  return (
    <div style={{ padding: 16 }}>
      <h1>Fight Round</h1>
      <div style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
        <Link to="/adventure/fight">&larr; Back to Fight</Link>
        <button
          type="button"
          onClick={async () => {
            try {
              const res = await fetch('http://localhost:8081/api/fight/next-round', { method: 'POST' });
              if (!res.ok) throw new Error('Next pair fetch failed');
              const data = await res.json();
              const nextPair: Player[] = data?.nextTwoPlayersToFight || [];
              if (nextPair.length >= 2) {
                navigate('/adventure/fight/round', { replace: true, state: { round: data } });
              } else {
                navigate('/adventure/fight', { replace: true });
              }
            } catch (e) {
              navigate('/adventure/fight', { replace: true });
            }
          }}
          style={{
            marginLeft: 'auto',
            background: '#2f5597',
            color: '#ffffff',
            padding: '6px 10px',
            borderRadius: 6,
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          NEXT
        </button>
      </div>

      <style>
        {`
          .table { width: 100%; border-collapse: collapse; }
          .table th, .table td { border: 1px solid #ddd; padding: 6px 8px; text-align: center; vertical-align: middle; }
          .table thead th { position: sticky; top: 0; background: #2f5597; color: #ffffff; z-index: 1; }
        `}
      </style>

      {pair.length < 2 ? (
        <p>No round data. Go back and press Next Round.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Role</th>
              <th>ID</th>
              <th>Name</th>
              <th>Target</th>
              <th>HP</th>
              <th>TB</th>
              <th>Attack</th>
              <th>Crit</th>
              <th>Armor</th>
              <th>Shield</th>
            </tr>
          </thead>
          <tbody>
            {[{ role: 'Attacker', p: attacker }, { role: 'Defender', p: defender }].map(({ role, p }) => (
              <tr key={role}>
                <td>{role}</td>
                <td>{p?.characterId}</td>
                <td>{p?.name}</td>
                <td>{p?.target}</td>
                <td>{p?.hpActual} / {p?.hpMax}</td>
                <td>{p?.tb}</td>
                <td>{p?.attackType}</td>
                <td>{p?.critType}</td>
                <td>{p?.armorType}</td>
                <td>{p?.shield ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
