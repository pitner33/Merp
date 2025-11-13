import { useNavigate } from 'react-router-dom';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

export default function Crit() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'CRIT';
  }, []);
  
  useLayoutEffect(() => {
    const el = rollBoxRef.current;
    if (!el) return;
    const measureNow = () => {
      const w = el.getBoundingClientRect().width;
      if (typeof w === 'number' && !Number.isNaN(w)) setRollBoxWidth(Math.round(w));
    };
    measureNow();
    // Track future size changes
    const RO = (window as any).ResizeObserver;
    let ro: any = null;
    if (typeof RO === 'function') {
      ro = new RO((entries: any[]) => {
        const entry = entries && entries[0];
        const w = (entry && entry.contentRect && entry.contentRect.width) ? entry.contentRect.width : el.getBoundingClientRect().width;
        if (typeof w === 'number' && !Number.isNaN(w)) setRollBoxWidth(Math.round(w));
      });
      ro.observe(el);
    }
    window.addEventListener('resize', measureNow);
    return () => {
      try { if (ro && typeof ro.disconnect === 'function') ro.disconnect(); } catch {}
      window.removeEventListener('resize', measureNow);
    };
  }, []);

  

  const [players, setPlayers] = useState<any[] | null>(null);
  const [selectedId, setSelectedId] = useState<string>('none');
  const [critLetter, setCritLetter] = useState<string>('none');
  const [critType, setCritType] = useState<string>('none');
  const [critRolling, setCritRolling] = useState(false);
  const [critTensFace, setCritTensFace] = useState<number>(0);
  const [critOnesFace, setCritOnesFace] = useState<number>(0);
  const [critLastRoll, setCritLastRoll] = useState<number | null>(null);
  const [critResult, setCritResult] = useState<any | null>(null);
  const [critError, setCritError] = useState<string | null>(null);

  // Reset roll/dice when any selector is set to None
  useEffect(() => {
    const anyNone = selectedId === 'none' || critLetter === 'none' || critType === 'none';
    if (anyNone) {
      setCritLastRoll(null);
      setCritTensFace(0);
      setCritOnesFace(0);
      setCritResult(null);
      setCritError(null);
    }
  }, [selectedId, critLetter, critType]);
  const rollBoxRef = useRef<HTMLDivElement | null>(null);
  const [rollBoxWidth, setRollBoxWidth] = useState<number | undefined>(undefined);
  const pNone = {
    characterId: '',
    name: '',
    gender: '',
    race: '',
    playerClass: '',
    lvl: '',
    xp: '',
    hpMax: '',
    hpActual: '',
    isAlive: true,
    isActive: false,
    isStunned: false,
    target: '',
    playerActivity: '',
    attackType: '',
    critType: '',
    armorType: '',
    tbOneHanded: '',
    tbTwoHanded: '',
    tbRanged: '',
    tbBaseMagic: '',
    tbTargetMagic: '',
    tb: '',
    tbUsedForDefense: '',
    vb: '',
    shield: false,
    stunnedForRounds: '',
    penaltyOfActions: '',
    hpLossPerRound: '',
    mm: '',
    agilityBonus: '',
    mdLenyeg: '',
    mdKapcsolat: '',
    perception: '',
    tracking: '',
    lockPicking: '',
    disarmTraps: '',
    objectUsage: '',
    runes: '',
    influence: '',
    stealth: '',
  } as const;
  const [p, setP] = useState<any>(pNone);

  // Auto-refresh when the Crit window gains focus, becomes visible again, or receives cross-window updates
  useEffect(() => {
    let alive = true;
    let last = 0;
    const debounced = (fn: () => void) => {
      const now = Date.now();
      if (now - last < 200) return;
      last = now;
      fn();
    };

    async function reloadPlayers() {
      try {
        const res = await fetch('http://localhost:8081/api/players?isPlay=true');
        if (!res.ok) return;
        const list = await res.json();
        if (alive && Array.isArray(list)) setPlayers(list);
      } catch {}
    }

    async function refetchDisplayed() {
      try {
        const pid = (p as any)?.id;
        if (!pid) return;
        const r = await fetch(`http://localhost:8081/api/players/${pid}`);
        if (!r.ok) return;
        const fresh = await r.json();
        if (alive) setP(fresh);
      } catch {}
    }

    const onFocus = () => debounced(() => { reloadPlayers(); refetchDisplayed(); });
    const onVis = () => { if (document.visibilityState === 'visible') onFocus(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);

    function onStorage(e: StorageEvent) {
      if (e.key === 'merp:player-updated' && e.newValue) {
        reloadPlayers();
        refetchDisplayed();
      }
    }
    window.addEventListener('storage', onStorage);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('merp-sync');
      bc.onmessage = () => { reloadPlayers(); refetchDisplayed(); };
    } catch {}

    return () => {
      alive = false;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('storage', onStorage);
      try { if (bc) { (bc as any).onmessage = null; bc.close(); } } catch {}
    };
  }, [p]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('http://localhost:8081/api/players?isPlay=true');
        if (!res.ok) return;
        const list = await res.json();
        if (!mounted || !Array.isArray(list)) return;
        setPlayers(list);
        // default remains 'none' until user selects
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

  // Refresh player row from backend whenever Target of Crit changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (selectedId === 'none') {
          setP(pNone);
          return;
        }
        const found = (players || []).find((pl) => String(pl.characterId) === selectedId);
        const pid = found?.id;
        if (!pid) return;
        const r = await fetch(`http://localhost:8081/api/players/${pid}`);
        if (!r.ok) return;
        const data = await r.json();
        if (!cancelled) setP(data);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [selectedId]);

  function maxLen(arr: string[]): number {
    return arr.reduce((m, s) => Math.max(m, (s || '').length), 0);
  }

  const idWidthCh = (() => {
    const list = players && players.length > 0 ? players : [{ characterId: 'JK1', name: 'JK1', isAlive: true, stunnedForRounds: 0 }];
    const labels = ['None'].concat(
      list.map((pl: any) => {
        const dead = pl.isAlive === false;
        const stunned = (pl.stunnedForRounds ?? 0) > 0;
        const mark = `${dead ? ' \u2620' : ''}${stunned ? ' \u26A1' : ''}`;
        return `${String(pl.characterId)} - ${pl.name || ''}${mark}`;
      })
    );
    return maxLen(labels);
  })();

  return (
    <div style={{ padding: 8 }}>
      <h1 style={{ marginTop: 0, textAlign: 'center' }}>CRIT</h1>
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
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ fontWeight: 700 }}>Crit</div>
          <select
            className="mapped-select"
            value={critLetter}
            onChange={(e) => setCritLetter(e.target.value)}
            aria-label="Crit"
            style={{ fontSize: 18, padding: '8px 12px', minWidth: 180, borderRadius: 8, border: '1px solid #ccc',
              background: (() => {
                const raw = (critLetter || '').toString().toUpperCase();
                if (!raw || raw === 'NONE') return '#ffffff';
                const letter = (raw.match(/[A-ET]/) || [null])[0];
                switch (letter) {
                  case 'T': return '#FFF5EB';
                  case 'A': return '#FFE8D5';
                  case 'B': return '#FFD8B0';
                  case 'C': return '#FFC285';
                  case 'D': return '#FFAA5E';
                  case 'E': return '#FF8A3D';
                  default: return '#e8eef9';
                }
              })(),
              color: '#2f5597'
            }}
          >
            <option value="none">None</option>
            <option value="T">T</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
            <option value="E">E</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ fontWeight: 700 }}>Crit Type</div>
          <select
            className="mapped-select"
            value={critType}
            onChange={(e) => setCritType(e.target.value)}
            aria-label="Crit Type"
            style={{ fontSize: 18, padding: '8px 12px', minWidth: 220, borderRadius: 8, border: '1px solid #ccc',
              background: (() => {
                const raw = (critLetter || '').toString().toUpperCase();
                if (!raw || raw === 'NONE') return '#ffffff';
                const letter = (raw.match(/[A-ET]/) || [null])[0];
                switch (letter) {
                  case 'T': return '#FFF5EB';
                  case 'A': return '#FFE8D5';
                  case 'B': return '#FFD8B0';
                  case 'C': return '#FFC285';
                  case 'D': return '#FFAA5E';
                  case 'E': return '#FF8A3D';
                  default: return '#e8eef9';
                }
              })(),
              color: '#2f5597'
            }}
          >
            <option value="none">None</option>
            <option value="slashing">Slashing</option>
            <option value="blunt">Blunt</option>
            <option value="piercing">Piercing</option>
            <option value="heat">Heat</option>
            <option value="cold">Cold</option>
            <option value="electricity">Electricity</option>
            <option value="balance">Balance</option>
            <option value="crushing">Crushing</option>
            <option value="grab">Grab</option>
            <option value="bigCreaturePhisical">Big Creature Physical</option>
            <option value="bigCreatureMagic">Big Creature Magic</option>
          </select>
        </div>
      </div>
      <style>
        {`
          .table { width: 100%; border-collapse: collapse; }
          .table th, .table td { border: 1px solid #ddd; padding: 6px 8px; text-align: center; vertical-align: middle; }
          .table thead th { position: sticky; top: 0; background: #2f5597; color: #ffffff; z-index: 1; }
          .right { text-align: right; }
          .dice-wrap { display: flex; align-items: center; justify-content: center; gap: 16px; }
          .die { width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 24px; color: #fff; border-radius: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.25); user-select: none; }
          .die.tens { background: #e95f3dff; }
          .die.ones { background: #a8e733ff; }
          .die.rolling { animation: dice-bounce 300ms infinite alternate ease-in-out; }
          @keyframes dice-bounce { from { transform: translateY(0) rotate(0deg); } to { transform: translateY(-4px) rotate(6deg); } }
          .result-label { display: block; width: 120px; text-align: center; font-size: 14px; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: .4px; line-height: 1; align-self: center; white-space: nowrap; }
          .result-value { font-size: 48px; font-weight: 900; color: #111; line-height: 1; }
          .result-col { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; width: 120px; }
          .result-box { display: inline-flex; align-items: center; justify-content: center; width: 120px; height: 120px; border: 1px solid #ddd; border-radius: 8px; background: #f9fafb; padding: 0; }
          .result-box.orange { background: #fed7aa; border-color: #e67e22; }
          .mods-table th, .mods-table td { padding: 4px 6px !important; font-size: 12px; }
          /* Ensure dropdown list stays white even if the closed field is colored */
          .mapped-select option { background: #ffffff; color: #111; }
          .mapped-select optgroup { background: #ffffff; color: #111; }
        `}
      </style>

      <table className="table">
        <thead>
          <tr>
            <th rowSpan={2}>Target of Crit</th>
            <th rowSpan={2}>Name</th>
            <th rowSpan={2}>Gender</th>
            <th rowSpan={2}>Race</th>
            <th rowSpan={2}>Class</th>
            <th rowSpan={2}>lvl</th>
            <th rowSpan={2}>XP</th>
            <th rowSpan={2}>max HP</th>
            <th rowSpan={2}>HP</th>
            <th rowSpan={2}>Alive</th>
            <th rowSpan={2}>Active</th>
            <th rowSpan={2}>Stunned</th>
            <th rowSpan={2}>Target</th>
            <th rowSpan={2}>Activity</th>
            <th rowSpan={2}>Attack</th>
            <th rowSpan={2}>Crit</th>
            <th rowSpan={2}>Armor</th>
            <th rowSpan={2}>TB</th>
            <th rowSpan={2}>TB OH</th>
            <th rowSpan={2}>TB for Defense</th>
            <th rowSpan={2}>VB</th>
            <th rowSpan={2}>Shield</th>
            <th rowSpan={2}>Dual Wield</th>
            <th rowSpan={2}>Stunned Rounds</th>
            <th rowSpan={2}>Penalty</th>
            <th rowSpan={2}>HP Loss/Round</th>
            <th rowSpan={2}>MM</th>
            <th rowSpan={2}>AGI Bonus</th>
            <th colSpan={2} style={{ textAlign: 'center' }}>MD</th>
            <th rowSpan={2}>Perception</th>
            <th rowSpan={2}>Tracking</th>
            <th rowSpan={2}>Lockpicking</th>
            <th rowSpan={2}>Disarm Traps</th>
            <th rowSpan={2}>Object Usage</th>
            <th rowSpan={2}>Runes</th>
            <th rowSpan={2}>Influence</th>
            <th rowSpan={2}>Stealth</th>
          </tr>
          <tr>
            <th>Lenyeg</th>
            <th>Kapcsolat</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <select
                value={selectedId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedId(id);
                  if (id === 'none') {
                    setP(pNone);
                  } else {
                    const found = (players || []).find((pl) => String(pl.characterId) === id);
                    if (found) setP(found);
                  }
                }}
                style={{ width: `${idWidthCh + 2}ch` }}
                aria-label="Character ID"
              >
                <option value="none">None</option>
                {(players && players.length > 0 ? players : [{ characterId: 'JK1', name: 'JK1', isAlive: true, stunnedForRounds: 0 }]).map((pl: any) => {
                  const dead = pl.isAlive === false;
                  const stunned = (pl.stunnedForRounds ?? 0) > 0;
                  const mark = `${dead ? ' \u2620' : ''}${stunned ? ' \u26A1' : ''}`;
                  const label = `${String(pl.characterId)} - ${pl.name || ''}${mark}`;
                  return (
                    <option key={String(pl.characterId)} value={String(pl.characterId)} style={dead ? { color: '#d32f2f' } : undefined}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </td>
            <td>{p.name}</td>
            <td>{p.gender}</td>
            <td>{p.race}</td>
            <td>{p.playerClass}</td>
            <td className="right">{p.lvl}</td>
            <td className="right">{p.xp}</td>
            <td className="right">{p.hpMax}</td>
            <td style={hpStyle(p)} title={hpTitle(p)}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{hpTitle(p)}</div>
              <div>{p.hpActual}</div>
            </td>
            <td>
              {p.isAlive ? (
                <span title="Alive" aria-label="Alive">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#2fa84f" stroke="#2fa84f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 21s-6-4.35-9-8.25C1 10 2.5 6 6.5 6c2.09 0 3.57 1.19 4.5 2.44C11.93 7.19 13.41 6 15.5 6 19.5 6 21 10 21 12.75 18 16.65 12 21 12 21z" />
                  </svg>
                </span>
              ) : (
                <span title="Dead" aria-label="Dead">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d32f2f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <line x1="8" y1="8" x2="16" y2="16" />
                    <line x1="16" y1="8" x2="8" y2="16" />
                  </svg>
                </span>
              )}
            </td>
            <td>
              {p.isActive ? (
                <span title="Active" aria-label="Active">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#2fa84f" stroke="#2fa84f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="6" />
                  </svg>
                </span>
              ) : (
                <span title="Inactive" aria-label="Inactive">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#bbb" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="6" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </span>
              )}
            </td>
            <td>
              {p.isStunned ? (
                <span title="Stunned" aria-label="Stunned">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#e11d48" stroke="#e11d48" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M13 2l-8 11h6l-2 9 8-12h-6z" />
                  </svg>
                </span>
              ) : (
                <span title="Not stunned" aria-label="Not stunned">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2fa84f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="8" />
                  </svg>
                </span>
              )}
            </td>
            <td>{p.target}</td>
            <td>{labelActivity(p.playerActivity as any)}</td>
            <td>{labelAttack(p.attackType as any)}</td>
            <td>{labelCrit(p.critType as any)}</td>
            <td>{labelArmor(p.armorType as any)}</td>
            <td className="right">{computeTb(p)}</td>
            <td className="right">{p.tbOffHand ?? 0}</td>
            <td className="right">{p.tbUsedForDefense}</td>
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
            </td>
            <td className="right">{p.dualWield ?? 0}</td>
            <td className="right">{p.stunnedForRounds}</td>
            <td className="right">{p.penaltyOfActions}</td>
            <td className="right">{p.hpLossPerRound}</td>
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
          </tr>
        </tbody>
      </table>
      
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
        <div ref={rollBoxRef} style={{ display: 'inline-flex', gap: 16, alignItems: 'center', justifyContent: 'center', border: '1px solid #fff', borderRadius: 8, padding: 12 }}>
          <div className="result-col" style={{ alignItems: 'center', width: 'auto' }}>
            <button
              type="button"
              onClick={async () => {
                if (critRolling) return;
                setCritError(null);
                setCritResult(null);
                setCritRolling(true);
                let localInterval: number | null = null;
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
                  setCritTensFace(tens);
                  setCritOnesFace(ones);
                  setCritLastRoll(value);
                  const sel = (players || []).find((pl) => String(pl.characterId) === selectedId);

                  // Apply crit to backend using new endpoint that targets selected defender
                  const letterOnly = (critLetter || '').toString().toUpperCase();
                  const resultParam = `0${letterOnly}`;
                  const modifiedCritResult = (() => {
                    const base = value;
                    switch (letterOnly) {
                      case 'T': return base - 50;
                      case 'A': return base - 20;
                      case 'B': return base - 10;
                      case 'C': return base;
                      case 'D': return base + 10;
                      case 'E': return base + 20;
                      default: return base;
                    }
                  })();
                  let applied: any | null = null;
                  try {
                    const defenderId = sel?.id ?? sel?.characterId;
                    if (defenderId != null) {
                      const url = `http://localhost:8081/api/fight/apply-crit-to-target?defenderId=${encodeURIComponent(defenderId)}&result=${encodeURIComponent(resultParam)}&critResult=${encodeURIComponent(modifiedCritResult)}&critType=${encodeURIComponent(critType)}`;
                      const resp = await fetch(url, { method: 'POST' });
                      if (resp.ok) { applied = await resp.json(); }
                    }
                  } catch {}
                  if (applied) setCritResult(applied);

                  // Refresh selected player from backend if we have an id
                  if (sel?.id || sel?.characterId) {
                    try {
                      const ref = await fetch(`http://localhost:8081/api/players/${encodeURIComponent(sel?.id ?? sel?.characterId)}`);
                      if (ref.ok) {
                        const fresh = await ref.json();
                        setP(fresh);
                      }
                    } catch {}
                  }
                } catch (e: any) {
                  setCritError(e?.message || 'Crit roll failed');
                } finally {
                  if (localInterval != null) window.clearInterval(localInterval);
                  setCritRolling(false);
                }
              }}
              disabled={critRolling || selectedId === 'none' || critLetter === 'none' || critType === 'none'}
              style={{ marginTop: 6, background: (selectedId === 'none' || critLetter === 'none' || critType === 'none') ? '#9ca3af' : '#16a34a', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 8px', cursor: (selectedId === 'none' || critLetter === 'none' || critType === 'none' || critRolling) ? 'not-allowed' : 'pointer', fontWeight: 600 }}
            >
              {critRolling ? 'Rolling…' : 'Roll Critical'}
            </button>
            <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
              {(() => {
                const tensFixed = (critLastRoll != null) ? (critLastRoll === 100 ? 0 : Math.floor(critLastRoll / 10)) : null;
                const onesFixed = (critLastRoll != null) ? (critLastRoll === 100 ? 0 : (critLastRoll % 10)) : null;
                const tensShow = critRolling ? critTensFace : (tensFixed != null ? tensFixed : critTensFace);
                const onesShow = critRolling ? critOnesFace : (onesFixed != null ? onesFixed : critOnesFace);
                return (
                  <>
                    <div className={`die tens${critRolling ? ' rolling' : ''}`} aria-label="crit-tens">{tensShow}</div>
                    <div className={`die ones${critRolling ? ' rolling' : ''}`} aria-label="crit-ones">{onesShow}</div>
                  </>
                );
              })()}
            </div>
            <span className="result-label" style={{ textAlign: 'center' }}>Critical roll</span>
            <div className="result-box" title={(selectedId !== 'none' && critLetter !== 'none' && critType !== 'none') ? 'Critical roll available' : 'Select ID, Crit and Crit Type'}>
              <span className="result-value">{critLastRoll != null ? `${critLastRoll}` : ''}</span>
            </div>
            {critError && <div style={{ color: '#b91c1c', fontWeight: 600 }}>{critError}</div>}
          </div>
          {(() => {
            let modVal: number | null = null;
            if (critLastRoll != null && critLetter !== 'none') {
              const base = critLastRoll;
              switch (critLetter) {
                case 'T': modVal = base - 50; break;
                case 'A': modVal = base - 20; break;
                case 'B': modVal = base - 10; break;
                case 'C': modVal = base; break;
                case 'D': modVal = base + 10; break;
                case 'E': modVal = base + 20; break;
                default: modVal = null;
              }
            }
            return (
              <div className="result-col" style={{ alignItems: 'center', width: 'auto' }}>
                <span className="result-label" style={{ textAlign: 'center' }}>Crit result</span>
                <div className="result-box orange" title="Modified value used for crit table">
                  <span className="result-value">{modVal != null ? `${modVal}` : ''}</span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
      {(() => {
        // Always-visible crit result box. Use backend critResult when present; otherwise a placeholder built from current selections.
        const usePlaceholder = !critResult;
        const letter = usePlaceholder ? (critLetter === 'none' ? '' : critLetter) : String(critResult.crit || '').toUpperCase();
        const dto = usePlaceholder
          ? {
              crit: letter,
              critResultText: '',
              critResultAdditionalDamage: 0,
              critResultHPLossPerRound: 0,
              critResultStunnedForRounds: 0,
              critResultPenaltyOfActions: 0,
              critResultsInstantDeath: false,
              baseDamage: 0,
              fullDamage: 0,
            }
          : critResult;

        if (letter === 'X') {
          return (
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
              <div style={{ display: 'inline-block', border: '1px solid #ddd', borderRadius: 8, padding: 12, background: '#FFF5EB', color: '#7a2e0c', minWidth: rollBoxWidth ? `${rollBoxWidth}px` : undefined }}>
                <div style={{ fontWeight: 800, marginBottom: 6, textAlign: 'center' }}>Base damage</div>
                <table className="table mods-table" style={{ width: '100%', maxWidth: 560 }}>
                  <tbody>
                    <tr>
                      <td style={{ textAlign: 'left' }}>Damage</td>
                      <td><strong style={{ color: '#7a2e0c' }}>{dto.baseDamage ?? 0}</strong></td>
                    </tr>
                    <tr>
                      <td style={{ textAlign: 'left' }}>Bleeding (HP loss/round)</td>
                      <td><strong style={{ color: '#7a2e0c' }}>{dto.critResultHPLossPerRound ?? 0}</strong></td>
                    </tr>
                    <tr>
                      <td style={{ textAlign: 'left' }}>Total</td>
                      <td><strong style={{ color: '#7a2e0c' }}>{dto.fullDamage ?? 0}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        }

        return (
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
            <div style={{ display: 'inline-block', border: '1px solid #ddd', borderRadius: 8, padding: 12, minWidth: rollBoxWidth ? `${rollBoxWidth}px` : undefined }}>
              <div style={{
              fontWeight: 800,
              marginBottom: 8,
              textAlign: 'center',
              fontSize: 18,
              background: (() => {
                const s = (dto.crit || '').toString().toUpperCase();
                const lt = (s.match(/[A-ET]/) || [null])[0];
                switch (lt) {
                  case 'T': return '#FFF5EB';
                  case 'A': return '#FFE8D5';
                  case 'B': return '#FFD8B0';
                  case 'C': return '#FFC285';
                  case 'D': return '#FFAA5E';
                  case 'E': return '#FF8A3D';
                  default: return '#e8eef9';
                }
              })(),
              color: '#2f5597',
              padding: '6px 10px',
              borderRadius: 6
            }}>
              {dto.crit || ''} {labelCrit((critType !== 'none' ? critType : undefined) as any)} Critical
            </div>
            <div style={{ marginBottom: 4, border: '1px solid #ddd', borderRadius: 6, padding: '6px 8px' }}>
              <strong>{dto.critResultText || ''}</strong>
            </div>
            <table className="table mods-table" style={{ width: '100%', maxWidth: 560 }}>
              <tbody>
                <tr>
                  <td style={{ textAlign: 'left' }}>Extra dmg</td>
                  <td><strong>{dto.critResultAdditionalDamage ?? 0}</strong></td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'left' }}>Bleeding (HP loss/round)</td>
                  <td><strong>{dto.critResultHPLossPerRound ?? 0}</strong></td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'left' }}>Stunned rounds</td>
                  <td><strong>{dto.critResultStunnedForRounds ?? 0}</strong></td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'left' }}>Penalty of actions</td>
                  <td><strong>{dto.critResultPenaltyOfActions ?? 0}</strong></td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'left' }}>Instant death</td>
                  <td>
                    {dto.critResultsInstantDeath ? (
                      <span title="Instant death" aria-label="Instant death">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#b91c1c" stroke="#b91c1c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M12 2C7 2 3 6 3 11c0 3.9 2.5 7.2 6 8.4V22h6v-2.6c3.5-1.2 6-4.5 6-8.4 0-5-4-9-9-9z"/>
                          <circle cx="9" cy="11" r="1.5" fill="#fff" />
                          <circle cx="15" cy="11" r="1.5" fill="#fff" />
                          <path d="M9 15c1 .7 2 .7 3 .7s2 0 3-.7" fill="none" stroke="#fff" />
                        </svg>
                      </span>
                    ) : (
                      <span />
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function hpStyle(p: { hpMax: number | string; hpActual: number | string }): CSSProperties {
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

function hpTitle(p: { hpActual: number | string; hpMax: number | string }): string {
  const pct = Math.round(((Number(p.hpActual) || 0) / (Number(p.hpMax) || 1)) * 100);
  return `${pct}%`;
}

function labelActivity(v?: string): string {
  const map: Record<string, string> = {
    _1PerformMagic: 'Perform Magic',
    _2RangedAttack: 'Ranged Attack',
    _3PhisicalAttackOrMovement: 'Attack or Movement',
    _4PrepareMagic: 'Prepare Magic',
    _5DoNothing: 'Do Nothing',
  };
  return v && map[v] ? map[v] : (v || '');
}

function labelAttack(v?: string): string {
  const map: Record<string, string> = {
    slashing: 'Slashing',
    blunt: 'Blunt',
    twoHanded: 'Two-handed',
    ranged: 'Ranged',
    clawsAndFangs: 'Claws and Fangs',
    grabOrBalance: 'Grab or Balance',
    baseMagic: 'Base Magic',
    magicBall: 'Magic Ball',
    magicProjectile: 'Magic Projectile',
  };
  return v && map[v] ? map[v] : (v || '');
}

function labelCrit(v?: string): string {
  const map: Record<string, string> = {
    none: 'None',
    slashing: 'Slashing',
    blunt: 'Blunt',
    piercing: 'Piercing',
    heat: 'Heat',
    cold: 'Cold',
    electricity: 'Electricity',
    balance: 'Balance',
    crushing: 'Crushing',
    grab: 'Grab',
    bigCreaturePhisical: 'Big Creature Physical',
    bigCreatureMagic: 'Big Creature Magic',
  };
  return v && map[v] ? map[v] : (v || '');
}

function labelArmor(v?: string): string {
  const map: Record<string, string> = {
    none: 'None',
    leather: 'Leather',
    heavyLeather: 'Heavy Leather',
    chainmail: 'Chainmail',
    plate: 'Plate',
  };
  return v && map[v] ? map[v] : (v || '');
}

function computeTb(p: any): number | undefined {
  const a = p.attackType ?? 'slashing';
  switch (a) {
    case 'slashing':
    case 'blunt':
    case 'clawsAndFangs':
    case 'grabOrBalance':
      return p.tbOneHanded;
    case 'twoHanded':
      return p.tbTwoHanded;
    case 'ranged':
      return p.tbRanged;
    case 'baseMagic':
      return p.tbBaseMagic;
    case 'magicBall':
      return p.tbBaseMagic;
    case 'magicProjectile':
      return p.tbTargetMagic;
    default:
      return p.tb;
  }
}
