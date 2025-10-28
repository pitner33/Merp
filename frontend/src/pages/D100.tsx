import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';

export default function D100() {
  const navigate = useNavigate();

  // Simple D100 state
  const [simpleRolling, setSimpleRolling] = useState(false);
  const [simpleTens, setSimpleTens] = useState(0);
  const [simpleOnes, setSimpleOnes] = useState(0);
  const [simpleValue, setSimpleValue] = useState<number | null>(null);
  const simpleIntervalRef = useRef<number | null>(null);

  // Open D100 state (mirrors Fail roll open-ended behavior)
  const [rolling, setRolling] = useState(false);
  const [tensFace, setTensFace] = useState(0);
  const [onesFace, setOnesFace] = useState(0);
  const [openSign, setOpenSign] = useState<0 | 1 | -1>(0); // 1=up, -1=down, 0=closed
  const [openTotal, setOpenTotal] = useState<number | null>(null);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (simpleIntervalRef.current) window.clearInterval(simpleIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    document.title = 'D100';
  }, []);

  async function rollSimple() {
    if (simpleRolling) return;
    setSimpleRolling(true);
    if (simpleIntervalRef.current) window.clearInterval(simpleIntervalRef.current);
    simpleIntervalRef.current = window.setInterval(() => {
      setSimpleTens((p) => (p + 1) % 10);
      setSimpleOnes((p) => (p + 1) % 10);
    }, 50);
    try {
      const fetchPromise = fetch('http://localhost:8081/api/dice/d100').then((r) => {
        if (!r.ok) throw new Error('Dice roll failed');
        return r.json();
      }) as Promise<number>;
      const waitPromise = new Promise<void>((res) => setTimeout(res, 1200));
      const [rolled] = await Promise.all([fetchPromise, waitPromise]);
      const value = typeof rolled === 'number' ? rolled : 1;
      const tens = value === 100 ? 0 : Math.floor(value / 10);
      const ones = value === 100 ? 0 : value % 10;
      setSimpleTens(tens);
      setSimpleOnes(ones);
      setSimpleValue(value);
    } catch {
      // ignore
    } finally {
      if (simpleIntervalRef.current) {
        window.clearInterval(simpleIntervalRef.current);
        simpleIntervalRef.current = null;
      }
      setSimpleRolling(false);
    }
  }

  async function rollOpen() {
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
      const waitPromise = new Promise<void>((res) => setTimeout(res, 1200));
      const [rolled] = await Promise.all([fetchPromise, waitPromise]);
      const value = typeof rolled === 'number' ? rolled : 1;
      const tens = value === 100 ? 0 : Math.floor(value / 10);
      const ones = value === 100 ? 0 : value % 10;
      setTensFace(tens);
      setOnesFace(ones);
      setLastRoll(value);

      // Open-ended rules (same as AdventureFightRound)
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
        if (openSign === 1 && value < 96) setOpenSign(0);
        if (openSign === -1 && value > 4) setOpenSign(0);
      }
    } catch {
      // ignore
    } finally {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setRolling(false);
    }
  }

  const canRollOpenNow = (() => {
    const openStarted = openTotal != null && openSign !== 0;
    const firstOpenAwaitingReroll = openStarted && (lastRoll == null || lastRoll === openTotal);
    if (openTotal == null) return true;
    if (openSign === 0) return false;
    return firstOpenAwaitingReroll || (lastRoll != null && lastRoll >= 96);
  })();
  const openDisabled = rolling || !canRollOpenNow;

  function resetAll() {
    try {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (simpleIntervalRef.current) {
        window.clearInterval(simpleIntervalRef.current);
        simpleIntervalRef.current = null;
      }
    } catch {}
    setSimpleRolling(false);
    setSimpleTens(0);
    setSimpleOnes(0);
    setSimpleValue(null);
    setRolling(false);
    setTensFace(0);
    setOnesFace(0);
    setOpenSign(0);
    setOpenTotal(null);
    setLastRoll(null);
  }

  return (
    <div style={{ padding: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h1 style={{ marginTop: 0, textAlign: 'center' }}>D100</h1>
      <div style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={async () => {
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
            } catch {}
          }}
          style={{ padding: '6px 12px', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        >
          Back to the Inn
        </button>
        <button
          type="button"
          onClick={resetAll}
          style={{ padding: '6px 12px', background: '#000', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        >
          Reset
        </button>
      </div>

      <style>
        {`
          .dice-wrap { display: flex; align-items: center; justify-content: center; gap: 16px; margin: 10px 0 18px; }
          .die { width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 24px; color: #fff; border-radius: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.25); user-select: none; }
          .die.tens { background: #e95f3dff; }
          .die.ones { background: #a8e733ff; }
          .die.rolling { animation: dice-bounce 300ms infinite alternate ease-in-out; }
          @keyframes dice-bounce { from { transform: translateY(0) rotate(0deg); } to { transform: translateY(-4px) rotate(6deg); } }
          .result { font-weight: 800; font-size: 22px; }
          .result-box { display: inline-flex; align-items: center; justify-content: center; width: 120px; height: 120px; border: 1px solid #ddd; border-radius: 8px; background: #f9fafb; padding: 0; }
          .result-label { display: block; width: 120px; text-align: center; font-size: 14px; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: .4px; line-height: 1; align-self: center; white-space: nowrap; }
          .result-value { font-size: 48px; font-weight: 900; color: #111; line-height: 1; }
        `}
      </style>

      <div style={{ display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', textAlign: 'center' }}>
        {/* Simple D100 */}
        <div style={{ flex: '0 0 480px', width: 480, minWidth: 320, border: '1px solid #ddd', borderRadius: 8, padding: 12, textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 6px 0', fontSize: 16 }}>Simple D100</h2>
          <div>
            <button
              type="button"
              onClick={rollSimple}
              disabled={simpleRolling}
              style={{
                background: simpleRolling ? '#888' : '#0a7d2f',
                color: '#ffffff',
                width: 75,
                height: 75,
                borderRadius: 10,
                border: 'none',
                cursor: simpleRolling ? 'not-allowed' : 'pointer',
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
          <div className="dice-wrap">
            <div className={`die tens${simpleRolling ? ' rolling' : ''}`} aria-label="tens-die">{simpleTens}</div>
            <div className={`die ones${simpleRolling ? ' rolling' : ''}`} aria-label="ones-die">{simpleOnes}</div>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'center' }}>
            <div className="result-box">
              <span className="result-value">{simpleValue != null ? `${simpleValue}` : ''}</span>
            </div>
          </div>
        </div>

        {/* Open-ended D100 */}
        <div style={{ flex: '0 0 480px', width: 480, minWidth: 320, border: '1px solid #ddd', borderRadius: 8, padding: 12, textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 6px 0', fontSize: 16 }}>Open D100</h2>
          <div>
            <button
              type="button"
              onClick={rollOpen}
              disabled={openDisabled}
              style={{
                background: openDisabled ? '#888' : '#0a7d2f',
                color: '#ffffff',
                width: 75,
                height: 75,
                borderRadius: 10,
                border: 'none',
                cursor: openDisabled ? 'not-allowed' : 'pointer',
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
          <div className="dice-wrap">
            <div className={`die tens${rolling ? ' rolling' : ''}`} aria-label="tens-die">{tensFace}</div>
            <div className={`die ones${rolling ? ' rolling' : ''}`} aria-label="ones-die">{onesFace}</div>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', justifyContent: 'center', marginTop: 8 }}>
            <div>
              <span className="result-label">Open roll</span>
              <div className="result-box">
                <span className="result-value">{openTotal != null ? `${openTotal}` : ''}</span>
              </div>
            </div>
            <div>
              <span className="result-label">Last roll</span>
              <div className="result-box">
                <span className="result-value">{lastRoll != null ? `${lastRoll}` : ''}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
