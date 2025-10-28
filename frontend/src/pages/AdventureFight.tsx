import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Player } from '../types';
import { isXpOverCap, formatXp } from '../utils/xp';

export default function AdventureFight() {
  const location = useLocation();
  const navigate = useNavigate();
  const players = (location.state as { players?: Player[] } | undefined)?.players || [];
  const [rows, setRows] = useState<Player[]>(players);
  const [toast, setToast] = useState<{ message: string; x?: number; y?: number } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [roundCount, setRoundCount] = useState<number>(0);

  useEffect(() => {
    document.title = 'Fight';
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function initRoundCounter() {
      try {
        if (players.length > 0) {
          // Coming from AdventureMain: reset counter to 0
          const res = await fetch('http://localhost:8081/api/fight/reset-round-count', { method: 'POST' });
          if (res.ok) {
            const val = await res.json();
            if (isMounted) setRoundCount(typeof val === 'number' ? val : 0);
          } else if (isMounted) setRoundCount(0);
        } else {
          // Reloading Fight page mid-session: read current counter
          const res = await fetch('http://localhost:8081/api/fight/round-count');
          if (res.ok) {
            const val = await res.json();
            if (isMounted) setRoundCount(typeof val === 'number' ? val : 0);
          }
        }
      } catch {}
    }
    async function loadOrdered() {
      try {
        setLoading(true);
        const res = await fetch('http://localhost:8081/api/players/ordered');
        if (!res.ok) throw new Error(`Failed to load ordered players (${res.status})`);
        const data = (await res.json()) as Player[];
        if (isMounted && Array.isArray(data)) {
          setRows(data.map((p) => ({ ...p, tbUsedForDefense: 0 })));
        }
      } catch (e) {
        // Fallback: keep navigation state order if fetch fails
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    initRoundCounter();
    loadOrdered();
    return () => {
      isMounted = false;
    };
  }, []);

  // Reset TB used for defense on landing
  useEffect(() => {
    setRows((prev) => prev.map((p) => ({ ...p, tbUsedForDefense: 0 })));
  }, []);

  function showToast(message: string, x?: number, y?: number) {
    let nx = x;
    let ny = y;
    const margin = 16;
    if (typeof nx === 'number' && typeof ny === 'number') {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      nx = Math.min(Math.max(margin, nx + 8), vw - margin);
      ny = Math.min(Math.max(margin, ny + 8), vh - margin);
    }
    setToast({ message, x: nx, y: ny });
    window.setTimeout(() => setToast(null), 2000);
  }

  const activityOptions = [
    { value: '_1PerformMagic', label: 'Perform Magic' },
    { value: '_2RangedAttack', label: 'Ranged Attack' },
    { value: '_3PhisicalAttackOrMovement', label: 'Attack or Movement' },
    { value: '_4PrepareMagic', label: 'Prepare Magic' },
    { value: '_5DoNothing', label: 'Do Nothing' },
  ];

  const attackOptions = [
    { value: 'none', label: 'None' },
    { value: 'slashing', label: 'Slashing' },
    { value: 'blunt', label: 'Blunt' },
    { value: 'twoHanded', label: 'Two-handed' },
    { value: 'ranged', label: 'Ranged' },
    { value: 'clawsAndFangs', label: 'Claws and Fangs' },
    { value: 'grabOrBalance', label: 'Grab or Balance' },
    { value: 'baseMagic', label: 'Base Magic' },
    { value: 'magicBall', label: 'Magic Ball' },
    { value: 'magicProjectile', label: 'Magic Projectile' },
  ];

  const critOptions = [
    { value: 'none', label: 'None' },
    { value: 'slashing', label: 'Slashing' },
    { value: 'blunt', label: 'Blunt' },
    { value: 'piercing', label: 'Piercing' },
    { value: 'heat', label: 'Heat' },
    { value: 'cold', label: 'Cold' },
    { value: 'electricity', label: 'Electricity' },
    { value: 'balance', label: 'Balance' },
    { value: 'crushing', label: 'Crushing' },
    { value: 'grab', label: 'Grab' },
    { value: 'bigCreaturePhisical', label: 'Big Creature Physical' },
    { value: 'bigCreatureMagic', label: 'Big Creature Magic' },
  ];

  const critByAttack: Record<string, string[]> = {
    none: ['none'],
    slashing: ['none', 'slashing', 'bigCreaturePhisical'],
    blunt: ['none', 'blunt', 'bigCreaturePhisical'],
    twoHanded: ['none', 'slashing', 'blunt', 'piercing', 'bigCreaturePhisical'],
    ranged: ['none', 'piercing', 'balance', 'crushing', 'bigCreaturePhisical'],
    clawsAndFangs: ['none', 'slashing', 'piercing', 'crushing', 'grab', 'bigCreaturePhisical'],
    grabOrBalance: ['none', 'grab', 'balance', 'crushing', 'bigCreaturePhisical'],
    baseMagic: ['none', 'heat', 'cold', 'electricity', 'balance', 'crushing', 'grab', 'bigCreatureMagic'],
    magicBall: ['none', 'heat', 'cold', 'electricity', 'bigCreatureMagic'],
    magicProjectile: ['none', 'heat', 'cold', 'electricity', 'bigCreatureMagic'],
  };

  const armorOptions = [
    { value: 'none', label: 'None' },
    { value: 'leather', label: 'Leather' },
    { value: 'heavyLeather', label: 'Heavy Leather' },
    { value: 'chainmail', label: 'Chainmail' },
    { value: 'plate', label: 'Plate' },
  ];

  const shieldAllowedFor: Record<string, boolean> = {
    none: false,
    slashing: true,
    blunt: true,
    grabOrBalance: true,
    twoHanded: false,
    ranged: false,
    clawsAndFangs: false,
    baseMagic: false,
    magicBall: false,
    magicProjectile: false,
  };

  function canUseShield(attackType?: string): boolean {
    return attackType ? !!shieldAllowedFor[attackType] : false;
  }

  function deriveActive(activity?: string, isAlive?: boolean, stunnedForRounds?: number): boolean {
    const alive = isAlive !== false;
    const stunned = (stunnedForRounds ?? 0) > 0;
    if (!alive) return false;
    if (stunned) return false;
    if (activity === '_5DoNothing' || activity === '_4PrepareMagic') return false;
    return true;
  }

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

  function computeTb(p: Player): number | undefined {
    const a = p.attackType ?? 'slashing';
    switch (a) {
      case 'none':
        return 0;
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
      case 'magicProjectile':
        return p.tbTargetMagic;
      default:
        return p.tb;
    }
  }

  function attacksByActivity(activity?: string): string[] {
    switch (activity) {
      case '_1PerformMagic':
        return ['baseMagic', 'magicBall', 'magicProjectile'];
      case '_2RangedAttack':
        return ['ranged'];
      case '_3PhisicalAttackOrMovement':
        return ['slashing', 'blunt', 'twoHanded', 'clawsAndFangs', 'grabOrBalance'];
      case '_4PrepareMagic':
      case '_5DoNothing':
      default:
        return ['none'];
    }
  }

  function allowedActivitiesByTarget(target?: string): string[] {
    const all = ['_1PerformMagic', '_2RangedAttack', '_3PhisicalAttackOrMovement', '_4PrepareMagic', '_5DoNothing'];
    if (!target) return ['_5DoNothing', '_4PrepareMagic'];
    return all;
  }

  function maxLen(arr: string[]): number {
    return arr.reduce((m, s) => Math.max(m, (s || '').length), 0);
  }

  const activityWidthCh = maxLen(activityOptions.map((o) => o.label));
  const attackWidthCh = maxLen(attackOptions.map((o) => o.label));
  const critWidthCh = maxLen(critOptions.map((o) => o.label));
  const armorWidthCh = maxLen(armorOptions.map((o) => o.label));
  const targetWidthCh = (() => {
    const base = ['none', 'self'];
    const ids = rows.map((r) => r.characterId || '');
    return maxLen(base.concat(ids));
  })();

  function normalizeRows(payloadRows: Player[]): Player[] {
    return payloadRows.map((r) => {
      const candidate = r.target ?? 'none';
      const targetToken = candidate ?? 'none';
      let act = r.playerActivity;
      if ((targetToken === 'none' || targetToken == null) && act !== '_4PrepareMagic') act = '_5DoNothing';
      let atk = r.attackType;
      let crit = r.critType;
      if (act === '_5DoNothing') { atk = 'none'; crit = 'none'; }
      let tbVal = computeTb({ ...r, attackType: atk } as Player) ?? r.tb;
      if (act === '_4PrepareMagic' || act === '_5DoNothing') tbVal = 0;
      const isActive = deriveActive(act, r.isAlive, r.stunnedForRounds);
      const maxDef = Math.floor(Math.max(0, tbVal ?? 0) / 2);
      const nextDef = (tbVal ?? 0) < 0 ? 0 : Math.min(Math.max(0, r.tbUsedForDefense ?? 0), maxDef);
      return { ...r, playerActivity: act, attackType: atk, critType: crit, tb: tbVal, tbUsedForDefense: nextDef, target: targetToken, isActive } as Player;
    });
  }

  useEffect(() => {
    function persistOnUnload() {
      try {
        const payload = normalizeRows(rows);
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        // Best-effort save during navigation/unload
        if ((navigator as any).sendBeacon) {
          (navigator as any).sendBeacon('http://localhost:8081/api/players/bulk-update', blob);
        } else {
          fetch('http://localhost:8081/api/players/bulk-update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true }).catch(() => {});
        }
      } catch {}
    }
    window.addEventListener('beforeunload', persistOnUnload);
    window.addEventListener('pagehide', persistOnUnload);
    return () => {
      persistOnUnload();
      window.removeEventListener('beforeunload', persistOnUnload);
      window.removeEventListener('pagehide', persistOnUnload);
    };
  }, [rows]);

  return (
    <div style={{ padding: 8 }}>
      <h1 style={{ marginTop: 0, textAlign: 'center' }}>Fight</h1>
      <div style={{ marginBottom: 12, display: 'flex', gap: 24, alignItems: 'flex-end', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={async () => {
            try {
              setLoading(true);
              // Normalize payload like in AdventureMain
              const payload = rows.map((r) => {
                const candidate = r.target ?? 'none';
                const targetToken = candidate ?? 'none';
                let act = r.playerActivity;
                if ((targetToken === 'none' || targetToken == null) && act !== '_4PrepareMagic') act = '_5DoNothing';
                let atk = r.attackType;
                let crit = r.critType;
                if (act === '_5DoNothing') { atk = 'none'; crit = 'none'; }
                let tbVal = computeTb({ ...r, attackType: atk } as Player) ?? r.tb;
                if (act === '_4PrepareMagic' || act === '_5DoNothing') tbVal = 0;
                const isActive = deriveActive(act, r.isAlive, r.stunnedForRounds);
                const maxDef = Math.floor(Math.max(0, tbVal ?? 0) / 2);
                const nextDef = (tbVal ?? 0) < 0 ? 0 : Math.min(Math.max(0, r.tbUsedForDefense ?? 0), maxDef);
                return { ...r, playerActivity: act, attackType: atk, critType: crit, tb: tbVal, tbUsedForDefense: nextDef, target: targetToken, isActive } as Player;
              });
              const upd = await fetch('http://localhost:8081/api/players/bulk-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
              if (!upd.ok) throw new Error(`Bulk update failed (${upd.status})`);
              const res = await fetch('http://localhost:8081/api/players/ordered');
              const fetched = res.ok ? await res.json() : rows;
              const sorted = [...fetched].sort((a: Player, b: Player) => (a.characterId || '').localeCompare(b.characterId || ''));
              try {
                localStorage.setItem('merp:selectedPlayers', JSON.stringify(sorted));
                localStorage.setItem('merp:adventureRefresh', String(Date.now()));
              } catch {}
              navigate('/adventure/main', { state: { players: sorted } });
            } catch (e) {
              const sortedFallback = [...rows].sort((a: Player, b: Player) => (a.characterId || '').localeCompare(b.characterId || ''));
              try {
                localStorage.setItem('merp:selectedPlayers', JSON.stringify(sortedFallback));
                localStorage.setItem('merp:adventureRefresh', String(Date.now()));
              } catch {}
              navigate('/adventure/main', { state: { players: sortedFallback } });
            } finally {
              setLoading(false);
            }
          }}
          style={{ padding: '8px 14px', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}
        >
          END FIGHT
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 180 }}>
          <div
            style={{
              marginTop: 4,
              width: '100%',
              boxSizing: 'border-box',
              textAlign: 'center',
              background: '#eef3ff',
              color: '#2f5597',
              border: '2px solid #2f5597',
              borderRadius: 16,
              padding: '10px 16px',
              fontSize: 44,
              fontWeight: 900,
              lineHeight: 1,
              boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
            }}
          >
            {roundCount}
          </div>
          <button
            type="button"
            onClick={async () => {
            try {
              setLoading(true);
              // 1) Persist the current table to backend so it's aware of targets/activities/etc
              const payload = rows.map((r) => {
                const candidate = r.target ?? 'none';
                const targetToken = candidate ?? 'none';
                let act = r.playerActivity;
                if ((targetToken === 'none' || targetToken == null) && act !== '_4PrepareMagic') act = '_5DoNothing';
                let atk = r.attackType;
                let crit = r.critType;
                if (act === '_5DoNothing') { atk = 'none'; crit = 'none'; }
                let tbVal = computeTb({ ...r, attackType: atk } as Player) ?? r.tb;
                if (act === '_4PrepareMagic' || act === '_5DoNothing') tbVal = 0;
                const isActive = deriveActive(act, r.isAlive, r.stunnedForRounds);
                const maxDef = Math.floor(Math.max(0, tbVal ?? 0) / 2);
                const nextDef = (tbVal ?? 0) < 0 ? 0 : Math.min(Math.max(0, r.tbUsedForDefense ?? 0), maxDef);
                return { ...r, playerActivity: act, attackType: atk, critType: crit, tb: tbVal, tbUsedForDefense: nextDef, target: targetToken, isActive } as Player;
              });
              const upd = await fetch('http://localhost:8081/api/players/bulk-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
              if (!upd.ok) throw new Error(`Bulk update failed (${upd.status})`);
              // Ensure server-side derivations are applied before starting the round
              try {
                const resOrdered = await fetch('http://localhost:8081/api/players/ordered');
                if (resOrdered.ok) {
                  const refreshed = (await resOrdered.json()) as Player[];
                  setRows(Array.isArray(refreshed) ? refreshed.map((p) => ({ ...p, tbUsedForDefense: 0 })) : rows);
                }
              } catch {}

              // 2) Start a fresh round
              const res = await fetch('http://localhost:8081/api/fight/start-round', { method: 'POST' });
              if (!res.ok) throw new Error(`Next round failed (${res.status})`);
              const data = await res.json();
              navigate('/adventure/fight/round', { state: { round: data } });
            } catch (err) {
              showToast('Failed to start next round');
            } finally {
              setLoading(false);
            }
            }}
            style={{
              background: '#2f5597',
              color: '#ffffff',
              padding: '8px 14px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            Next Round
          </button>
        </div>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : rows.length === 0 ? (
        <p>No players were provided. Go back to Adventure and press FIGHT.</p>
      ) : (
        <>
          <style>
            {`
              .table { width: 100%; border-collapse: collapse; }
              .table th, .table td { border: 1px solid #ddd; padding: 6px 8px; text-align: center; vertical-align: middle; }
              .table thead th { position: sticky; top: 0; background: #2f5597; color: #ffffff; z-index: 1; }
              .table th button { background: none; border: none; cursor: pointer; padding: 0; font: inherit; color: inherit; }
              .actions-cell { white-space: nowrap; }
              .center { text-align: center; }
              .right { text-align: right; }
              .toast { position: fixed; background: rgba(0,0,0,0.85); color: #fff; padding: 8px 12px; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 1000; font-size: 14px; }
              /* Dropdown widths are set inline based on longest option text */
              .sel-target {}
              .sel-activity {}
              .sel-attack {}
              .sel-crit {}
              .sel-armor {}
            `}
          </style>
          {toast && (
            <div
              className="toast"
              role="status"
              aria-live="polite"
              style={
                typeof toast.x === 'number' && typeof toast.y === 'number'
                  ? { left: toast.x, top: toast.y }
                  : { right: 16, bottom: 16 }
              }
            >
              {toast.message}
            </div>
          )}
          <table className="table">
            <thead>
              <tr>
                <th rowSpan={2} className="center">Play</th>
                <th rowSpan={2}>ID</th>
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
                <th rowSpan={2}>TB for Defense</th>
                <th colSpan={6} style={{ textAlign: 'center' }}>TB</th>
                <th rowSpan={2}>VB</th>
                <th rowSpan={2}>Shield</th>
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
                <th>1H</th>
                <th>OH</th>
                <th>2H</th>
                <th>Ranged</th>
                <th>Base Magic</th>
                <th>Target Magic</th>
                <th>Lenyeg</th>
                <th>Kapcsolat</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="center">
                    <input type="checkbox" checked={!!p.isPlaying} disabled aria-label={`Is playing ${p.name}`} />
                  </td>
                  <td>{p.characterId}</td>
                  <td>{p.name}</td>
                  <td>{p.gender}</td>
                  <td>{p.race}</td>
                  <td>{p.playerClass}</td>
                  <td className="right">{p.lvl}</td>
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
                  <td className="right">{p.hpMax}</td>
                  <td style={hpStyle(p)} title={hpTitle(p)}>
                    <div>{p.hpActual}</div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{hpTitle(p)}</div>
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
                  <td>
                    <select
                      className="sel-target"
                      style={{ width: `${targetWidthCh + 6}ch` }}
                      value={p.target == null ? 'none' : p.target === p.characterId ? 'self' : p.target}
                      onChange={(e) => {
                        const value = e.target.value;
                        setRows((prev) =>
                          prev.map((r) => {
                            if (r.id !== p.id) return r;
                            let nextTarget: string | undefined;
                            if (value === 'none') nextTarget = undefined;
                            else if (value === 'self') nextTarget = r.characterId;
                            else nextTarget = value;

                            const allowedActs = allowedActivitiesByTarget(nextTarget);
                            const enforcedAct = r.playerActivity && allowedActs.includes(r.playerActivity) ? r.playerActivity : allowedActs[0];
                            const allowedAttacks = attacksByActivity(enforcedAct);
                            const nextAttack = allowedAttacks.includes(r.attackType || '') ? (r.attackType as string) : allowedAttacks[0];
                            const allowedCrits = critByAttack[nextAttack] ?? ['none'];
                            const nextCrit = r.critType && allowedCrits.includes(r.critType) ? r.critType : 'none';
                            const nextShield = canUseShield(nextAttack) ? r.shield : false;
                            const nextActive = deriveActive(enforcedAct, r.isAlive, r.stunnedForRounds);
                            const nextTb = (enforcedAct === '_4PrepareMagic' || enforcedAct === '_5DoNothing') ? 0 : r.tb;
                            return { ...r, target: nextTarget, playerActivity: enforcedAct, attackType: nextAttack, critType: nextCrit, shield: nextShield, isActive: nextActive, tb: nextTb, tbUsedForDefense: 0 };
                          })
                        );
                      }}
                    >
                      <option value="none">none</option>
                      <option value="self">self</option>
                      {rows
                        .filter((o) => o.id !== p.id)
                        .slice()
                        .sort((a, b) => (a.characterId || '').localeCompare(b.characterId || ''))
                        .map((o) => {
                          const dead = o.isAlive === false;
                          const stunned = (o.stunnedForRounds ?? 0) > 0;
                          const mark = `${dead ? ' ☠' : ''}${stunned ? ' ⚡' : ''}`;
                          return (
                            <option key={o.id} value={o.characterId} style={dead ? { color: '#d32f2f' } : undefined}>
                              {o.characterId}{mark}
                            </option>
                          );
                        })}
                    </select>
                  </td>
                  <td>
                    {(() => {
                      const allowedActs = allowedActivitiesByTarget(p.target);
                      const curAct = (p.playerActivity && allowedActs.includes(p.playerActivity)) ? p.playerActivity : allowedActs[0];
                      return (
                        <select
                          className="sel-activity"
                          style={{ width: `${activityWidthCh + 2}ch` }}
                          value={curAct}
                          onChange={(e) => {
                            const value = e.target.value;
                            setRows((prev) =>
                              prev.map((r) => {
                                if (r.id !== p.id) return r;
                                const enforcedAct = allowedActivitiesByTarget(r.target).includes(value) ? value : allowedActivitiesByTarget(r.target)[0];
                                const allowedAttacks = attacksByActivity(enforcedAct);
                                const nextAttack = allowedAttacks.includes(r.attackType || '') ? (r.attackType as string) : allowedAttacks[0];
                                const allowedCrits = critByAttack[nextAttack] ?? ['none'];
                                const nextCrit = r.critType && allowedCrits.includes(r.critType) ? r.critType : 'none';
                                const nextShield = canUseShield(nextAttack) ? r.shield : false;
                                const nextActive = deriveActive(enforcedAct, r.isAlive, r.stunnedForRounds);
                                const nextTb = (enforcedAct === '_4PrepareMagic' || enforcedAct === '_5DoNothing') ? 0 : r.tb;
                                return { ...r, playerActivity: enforcedAct, attackType: nextAttack, critType: nextCrit, shield: nextShield, isActive: nextActive, tb: nextTb, tbUsedForDefense: 0 };
                              })
                            );
                          }}
                        >
                          {activityOptions
                            .filter((opt) => allowedActs.includes(opt.value))
                            .map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                        </select>
                      );
                    })()}
                  </td>
                  <td>
                    <select
                      className="sel-attack"
                      style={{ width: `${attackWidthCh + 2}ch` }}
                      value={(attacksByActivity(p.playerActivity).includes(p.attackType || '') ? p.attackType : attacksByActivity(p.playerActivity)[0]) ?? 'none'}
                      onChange={(e) => {
                        const newAttack = e.target.value;
                        setRows((prev) =>
                          prev.map((r) => {
                            if (r.id !== p.id) return r;
                            const allowedCrits = critByAttack[newAttack] ?? ['none'];
                            const nextCrit = r.critType && allowedCrits.includes(r.critType) ? r.critType : 'none';
                            const nextShield = canUseShield(newAttack) ? r.shield : false;
                            return { ...r, attackType: newAttack, critType: nextCrit, shield: nextShield, tbUsedForDefense: 0 };
                          })
                        );
                      }}
                    >
                      {attackOptions
                        .filter((opt) => attacksByActivity(p.playerActivity).includes(opt.value))
                        .map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td>
                    {(() => {
                      const curAttack = (attacksByActivity(p.playerActivity).includes(p.attackType || '') ? p.attackType : attacksByActivity(p.playerActivity)[0]) ?? 'none';
                      const allowed = critByAttack[curAttack ?? 'none'] ?? ['none'];
                      return (
                        <select
                          className="sel-crit"
                          style={{ width: `${critWidthCh + 2}ch` }}
                          value={p.critType && allowed.includes(p.critType) ? p.critType : 'none'}
                          onChange={(e) => {
                            const value = e.target.value;
                            setRows((prev) =>
                              prev.map((r) =>
                                r.id === p.id ? { ...r, critType: value } : r
                              )
                            );
                          }}
                        >
                          {critOptions
                            .filter((opt) => allowed.includes(opt.value))
                            .map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                        </select>
                      );
                    })()}
                  </td>
                  <td>
                    <select
                      className="sel-armor"
                      style={{ width: `${armorWidthCh + 2}ch` }}
                      value={p.armorType ?? 'none'}
                      onChange={(e) => {
                        const value = e.target.value;
                        setRows((prev) =>
                          prev.map((r) =>
                            r.id === p.id ? { ...r, armorType: value } : r
                          )
                        );
                      }}
                    >
                      {armorOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="right">{computeTb(p)}</td>
                  <td>
                    {(() => {
                      const tb = computeTb(p) ?? 0;
                      const neg = tb < 0;
                      const max = Math.floor(Math.max(0, tb) * 0.5);
                      const value = neg ? 0 : Math.min(Math.max(0, p.tbUsedForDefense ?? 0), max);
                      return (
                        <input
                          type="number"
                          min={0}
                          max={max}
                          step={1}
                          disabled={neg}
                          value={value}
                          onChange={(e) => {
                            if (neg) return;
                            const raw = Number(e.target.value);
                            const val = Number.isFinite(raw) ? Math.min(Math.max(0, Math.floor(raw)), max) : 0;
                            setRows((prev) => prev.map((r) => (r.id === p.id ? { ...r, tbUsedForDefense: val } : r)));
                          }}
                          style={{ width: 70, textAlign: 'right' }}
                          aria-label="TB used for defense"
                          title={neg ? 'TB < 0 ➜ Defense TB fixed at 0' : `Max ${max} (50% of TB)`}
                        />
                      );
                    })()}
                  </td>
                  <td className="right">{p.tbOneHanded}</td>
                  <td className="right">{p.secondaryTB}</td>
                  <td className="right">{p.tbTwoHanded}</td>
                  <td className="right">{p.tbRanged}</td>
                  <td className="right">{p.tbBaseMagic}</td>
                  <td className="right">{p.tbTargetMagic}</td>
                  <td className="right">{p.vb}</td>
                  <td>
                    <button
                      type="button"
                      onClick={(e) => {
                        setRows((prev) =>
                          prev.map((r) => {
                            if (r.id !== p.id) return r;
                            if (!canUseShield(r.attackType)) {
                              if (r.shield) {
                                return { ...r, shield: false };
                              }
                              const evt = e as React.MouseEvent;
                              showToast('Can not use shield', evt.clientX, evt.clientY);
                              return r;
                            }
                            return { ...r, shield: !r.shield };
                          })
                        );
                      }}
                      title={p.shield ? 'Shield: Yes' : 'Shield: No'}
                      aria-label={p.shield ? 'Shield: Yes' : 'Shield: No'}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      {p.shield ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#2f5597" stroke="#2f5597" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M12 3l7 3v5c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-3z"/>
                          <path d="M9 12l2 2 4-4" fill="none"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M12 3l7 3v5c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-3z"/>
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      )}
                    </button>
                  </td>
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
              ))}
            </tbody>
            </table>
          </>
        )}
      </div>
    );
}
