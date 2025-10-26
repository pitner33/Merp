import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import type { Player } from '../types';

export default function AdventureFightRound() {
  const location = useLocation();
  const navigate = useNavigate();
  const round = (location.state as any)?.round as { nextTwoPlayersToFight?: Player[] } | undefined;
  const pair = round?.nextTwoPlayersToFight || [];
  const attacker: Player | undefined = pair[0];
  const defender: Player | undefined = pair[1];

  const [rolling, setRolling] = useState(false);
  const [tensFace, setTensFace] = useState<number>(0);
  const [onesFace, setOnesFace] = useState<number>(0);
  const [openSign, setOpenSign] = useState<0 | 1 | -1>(0);
  const [openTotal, setOpenTotal] = useState<number | null>(null);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, []);

  function resetRollState() {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRolling(false);
    setTensFace(0);
    setOnesFace(0);
    setOpenSign(0);
    setOpenTotal(null);
    setLastRoll(null);
  }

  useEffect(() => {
    resetRollState();
  }, []);

  

  async function handleRoll() {
    if (rolling) return;
    setRolling(true);
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      setTensFace((p) => (p + 1) % 10);
      setOnesFace((p) => (p + 1) % 10);
    }, 50);

    try {
      const fetchPromise = fetch('http://localhost:8081/api/dice/d100').then((r) => {
        if (!r.ok) throw new Error('Dice roll failed');
        return r.json();
      }) as Promise<number>;
      const waitPromise = new Promise<void>((res) => setTimeout(res, 2000));

      const [rolled] = await Promise.all([fetchPromise, waitPromise]);
      const value = typeof rolled === 'number' ? rolled : 1;
      const tens = value === 100 ? 0 : Math.floor(value / 10);
      const ones = value === 100 ? 0 : value % 10;
      setTensFace(tens);
      setOnesFace(ones);
      setLastRoll(value);

      if (openSign === 0 || openTotal == null) {
        if (value >= 96) {
          setOpenSign(1);
          setOpenTotal(value);
        } else if (value <= 4) {
          setOpenSign(-1);
          setOpenTotal(value);
        } else {
          setOpenSign(0);
          setOpenTotal(value);
        }
      } else {
        setOpenTotal((prev) => {
          const base = prev == null ? 0 : prev;
          if (openSign === 1) return base + value;
          if (openSign === -1) return base - value;
          return base;
        });
      }
    } catch (e) {
    } finally {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setRolling(false);
    }
  }

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
                resetRollState();
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

          .dice-wrap { display: flex; align-items: center; justify-content: center; gap: 16px; margin: 10px 0 18px; }
          .die {
            width: 64px; height: 64px;
            display: flex; align-items: center; justify-content: center;
            font-weight: 800; font-size: 24px; color: #fff; border-radius: 12px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.25);
            user-select: none;
          }
          .die.tens { background: #e95f3dff; }
          .die.ones { background: #a8e733ff; }
          .die.rolling { animation: dice-bounce 300ms infinite alternate ease-in-out; }
          @keyframes dice-bounce { from { transform: translateY(0) rotate(0deg); } to { transform: translateY(-4px) rotate(6deg); } }
          .result { font-weight: 800; font-size: 22px; }
          .gif-die { width: 72px; height: 72px; object-fit: cover; border-radius: 12px; }
          .tint-orange { filter: hue-rotate(330deg) saturate(1.8) brightness(1.05); }
          .tint-green { filter: hue-rotate(80deg) saturate(1.8) brightness(1.0); }
          .result-box { display: inline-flex; align-items: center; justify-content: center; width: 120px; height: 120px; border: 1px solid #ddd; border-radius: 8px; background: #f9fafb; padding: 0; }
          .result-label { display: block; width: 120px; text-align: center; font-size: 14px; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: .4px; line-height: 1; align-self: center; white-space: nowrap; }
          .result-value { font-size: 48px; font-weight: 900; color: #111; line-height: 1; }
          .result-col { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; width: 120px; }
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

      <div style={{ marginTop: 12 }}>
        {(() => {
          const openStarted = openTotal != null && openSign !== 0;
          const firstOpenAwaitingReroll = openStarted && (lastRoll == null || lastRoll === openTotal);
          const canRollNow =
            openTotal == null
              ? true
              : openSign === 0
              ? false
              : firstOpenAwaitingReroll || (lastRoll != null && lastRoll >= 95);
          const disabled = rolling || !canRollNow;
          return (
            <div>
              <button
                type="button"
                onClick={handleRoll}
                disabled={disabled}
                style={{
                  background: disabled ? '#888' : '#0a7d2f',
                  color: '#ffffff',
                  width: 56,
                  height: 56,
                  borderRadius: 10,
                  border: 'none',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: 0.5,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  lineHeight: 1.1,
                }}
              >
                ROLL
              </button>
            </div>
          );
        })()}
        <div className="dice-wrap">
          <div className={`die tens${rolling ? ' rolling' : ''}`} aria-label="tens-die">{tensFace}</div>
          <div className={`die ones${rolling ? ' rolling' : ''}`} aria-label="ones-die">{onesFace}</div>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginTop: 8 }}>
          <div className="result-col">
            <span className="result-label">Open roll</span>
            <div className="result-box">
              <span className="result-value">{openTotal != null ? `${openTotal}` : ''}</span>
            </div>
          </div>
          <div className="result-col">
            <span className="result-label">Modified roll</span>
            <div className="result-box">
              <span className="result-value">{openTotal != null ? `${openTotal}` : ''}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
