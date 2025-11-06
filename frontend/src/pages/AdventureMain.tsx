import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { Player } from '../types';
import { isXpOverCap, formatXp } from '../utils/xp';
import { sortPlayersByCharacterId } from '../utils/characterId';

export default function AdventureMain() {
  const location = useLocation();
  const navigate = useNavigate();
  const statePlayers = (location.state as { players?: Player[] } | undefined)?.players || [];
  const storageKey = 'merp:selectedPlayers';
  const storagePlayers: Player[] = (() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as Player[]) : [];
    } catch {
      return [];
    }
  })();
  const players: Player[] = sortPlayersByCharacterId(statePlayers.length > 0 ? statePlayers : storagePlayers);
  const [rows, setRows] = useState<Player[]>(players);
  const [hoverTargetId, setHoverTargetId] = useState<string | null>(null);
  const [openTargetRowId, setOpenTargetRowId] = useState<string | number | null>(null);
  const [toast, setToast] = useState<{ message: string; x?: number; y?: number } | null>(null);

  useEffect(() => {
    document.title = 'Adventure';
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const raw = localStorage.getItem(storageKey);
        const saved = raw ? (JSON.parse(raw) as Player[]) : [];
        if (!Array.isArray(saved) || saved.length === 0) return;
        const ids = saved.map((p) => p.characterId);
        const res = await fetch('http://localhost:8081/api/players/ordered');
        if (!res.ok) { setRows(sortPlayersByCharacterId(saved)); return; }
        const data = (await res.json()) as Player[];
        const byId = new Map(data.map((p) => [p.characterId, p] as const));
        const selected = ids.map((id) => byId.get(id)).filter(Boolean) as Player[];
        if (selected.length > 0) setRows(sortPlayersByCharacterId(selected));
      } catch {}
    })();
  }, [location.key]);

  useEffect(() => {
    async function onFocus() {
      try {
        const raw = localStorage.getItem(storageKey);
        const saved = raw ? (JSON.parse(raw) as Player[]) : [];
        if (!Array.isArray(saved) || saved.length === 0) return;
        const ids = saved.map((p) => p.characterId);
        const res = await fetch('http://localhost:8081/api/players/ordered');
        if (!res.ok) { setRows(sortPlayersByCharacterId(saved)); return; }
        const data = (await res.json()) as Player[];
        const byId = new Map(data.map((p) => [p.characterId, p] as const));
        const selected = ids.map((id) => byId.get(id)).filter(Boolean) as Player[];
        if (selected.length > 0) setRows(sortPlayersByCharacterId(selected));
      } catch {}
    }
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  useEffect(() => {
    function loadFromStorage(): Player[] {
      try {
        const raw = localStorage.getItem(storageKey);
        return raw ? (JSON.parse(raw) as Player[]) : [];
      } catch {
        return [];
      }
    }
    async function onStorage(e: StorageEvent) {
      if (!e.key) return;
      if (e.key === storageKey || e.key === 'merp:adventureRefresh') {
        try {
          const saved = loadFromStorage();
          if (!Array.isArray(saved) || saved.length === 0) return;
          const ids = saved.map((p) => p.characterId);
          const res = await fetch('http://localhost:8081/api/players/ordered');
          if (!res.ok) { setRows(sortPlayersByCharacterId(saved)); return; }
          const data = (await res.json()) as Player[];
          const byId = new Map(data.map((p) => [p.characterId, p] as const));
          const selected = ids.map((id) => byId.get(id)).filter(Boolean) as Player[];
          if (selected.length > 0) setRows(sortPlayersByCharacterId(selected));
        } catch {}
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
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

  function isValidPlayerTarget(token: string): boolean {
    // Valid values: none, JK1..JK15, NJK1..NJK15
    if (token === 'none') return true;
    const re = /^(?:JK|NJK)(?:[1-9]|1[0-5])$/;
    return re.test(token);
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

  const shieldAllowedFor: Record<string, boolean> = {
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

  function maxLen(arr: string[]): number {
    return arr.reduce((m, s) => Math.max(m, (s || '').length), 0);
  }

  const activityWidthCh = maxLen(activityOptions.map((o) => o.label));
  const attackWidthCh = maxLen(attackOptions.map((o) => o.label));
  const critWidthCh = maxLen(critOptions.map((o) => o.label));
  const armorWidthCh = maxLen(armorOptions.map((o) => o.label));
  const targetWidthCh = (() => {
    const base = ['none', 'self'];
    const ids = rows.map((r) => {
      const dead = r.isAlive === false;
      const stunned = (r.stunnedForRounds ?? 0) > 0;
      const mark = `${dead ? ' \u2620' : ''}${stunned ? ' \u26A1' : ''}`;
      return `${r.characterId || ''}${mark}`;
    });
    return maxLen(base.concat(ids));
  })();

  function TargetDropdown({
    valueToken,
    selfId,
    widthCh,
    options,
    isOpen,
    onToggle,
    onOption,
  }: {
    valueToken: string;
    selfId?: string;
    widthCh: number;
    options: { value: string; label: string; dead?: boolean; stunned?: boolean }[];
    isOpen: boolean;
    onToggle: () => void;
    onOption: (val: string) => void;
  }) {
    const btnRef = useRef<HTMLButtonElement | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const [pos, setPos] = useState<{ left: number; top: number; width: number }>({ left: 0, top: 0, width: 0 });

    function currentLabel() {
      const o = options.find((x) => x.value === valueToken);
      if (!o) return 'none';
      const mark = `${o.dead ? ' \u2620' : ''}${o.stunned ? ' \u26A1' : ''}`;
      return `${o.label}${mark}`;
    }

    useEffect(() => {
      // Place the menu once on open
      if (isOpen && btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        setPos({ left: r.left, top: r.bottom + 2, width: r.width });
      }
      // Outside click to close (bubble phase so menu stopPropagation works)
      function onDocClick(e: MouseEvent) {
        const t = e.target as Node | null;
        if (!t) return;
        if (btnRef.current?.contains(t)) return;
        if (menuRef.current?.contains(t)) return;
        if (isOpen) onToggle();
      }
      if (isOpen) document.addEventListener('click', onDocClick);
      return () => {
        if (isOpen) document.removeEventListener('click', onDocClick);
      };
    }, [isOpen, onToggle]);

    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button
          ref={btnRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const b = btnRef.current;
            if (b) {
              const r = b.getBoundingClientRect();
              setPos({ left: r.left, top: r.bottom + 2, width: r.width });
            }
            onToggle();
          }}
          style={{
            width: `${widthCh}ch`,
            textAlign: 'left',
            padding: '2px 6px',
            border: '1px solid #555',
            background: '#2b2b2b',
            color: '#fff',
            borderRadius: 4,
            lineHeight: 1.6,
            fontFamily: 'inherit',
            fontSize: '14px',
            fontWeight: 400,
            cursor: 'pointer',
            position: 'relative',
          }}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span>{currentLabel()}</span>
          <span aria-hidden="true" style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#ccc" aria-hidden="true">
              <path d="M7 10l5 5 5-5z" />
            </svg>
          </span>
        </button>
        {isOpen && (
          <div
            ref={menuRef}
            role="listbox"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onMouseLeave={() => setHoverTargetId(null)}
            style={{
              position: 'fixed',
              left: pos.left,
              top: pos.top,
              width: pos.width,
              zIndex: 10000,
              maxHeight: 'none',
              overflowY: 'visible',
              background: '#2b2b2b',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: 4,
              boxShadow: '0 6px 16px rgba(0,0,0,0.3)'
            }}
          >
            {options.map((opt) => (
              <div
                key={opt.value}
                role="option"
                aria-selected={valueToken === opt.value}
                onMouseEnter={() => {
                  if (opt.value === 'none') setHoverTargetId(null);
                  else if (opt.value === 'self') setHoverTargetId(selfId || null);
                  else setHoverTargetId(opt.value);
                }}
                onClick={() => {
                  onOption(opt.value);
                  setHoverTargetId(null);
                }}
                style={{
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                  background:
                    valueToken === opt.value
                      ? '#3a4a6a'
                      : (
                          opt.value !== 'none' && (
                            (opt.value === 'self' && hoverTargetId === (selfId || null)) ||
                            (opt.value !== 'self' && hoverTargetId === opt.value)
                          )
                        )
                      ? 'rgba(47,85,151,0.25)'
                      : 'transparent',
                  color: opt.dead ? '#ef5350' : '#fff',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  fontWeight: 400,
                  cursor: 'pointer',
                }}
              >
                <span>{opt.label}{opt.dead ? ' \u2620' : ''}{opt.stunned ? ' \u26A1' : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: 8 }}>
      <h1 style={{ marginTop: 0, textAlign: 'center' }}>Adventure</h1>
      <div style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={async () => {
            try {
              const payload = rows.map((r) => {
                const candidate = r.target ?? 'none';
                const targetToken = isValidPlayerTarget(candidate) ? candidate : 'none';
                let act = r.playerActivity;
                if (targetToken === 'none' && act !== '_4PrepareMagic') act = '_5DoNothing';
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
              const res = await fetch('http://localhost:8081/api/players/bulk-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
              if (!res.ok) {
                throw new Error(`Save failed (${res.status})`);
              }
              const data = await res.json().catch(() => null);
              const savedCount = Array.isArray(data?.saved) ? data.saved.length : 0;
              const missing = Array.isArray(data?.notFound) ? data.notFound.length : 0;
              if (missing > 0 || savedCount !== payload.length) {
                showToast(`Saved ${savedCount}/${payload.length}. ${missing} failed.`);
                return;
              }
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
            } catch (e) {
              showToast('Failed to save to server.');
            }
          }}
          style={{ padding: '6px 12px', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        >
          Back to the Inn
        </button>
        <button
          type="button"
          onClick={async () => {
            try {
              const payload = rows.map((r) => {
                const candidate = r.target ?? 'none';
                const targetToken = isValidPlayerTarget(candidate) ? candidate : 'none';
                let act = r.playerActivity;
                if (targetToken === 'none' && act !== '_4PrepareMagic') act = '_5DoNothing';
                let atk = r.attackType;
                let crit = r.critType;
                if (act === '_5DoNothing') { atk = 'none'; crit = 'none'; }
                const tbVal = computeTb({ ...r, attackType: atk } as Player) ?? r.tb;
                const isActive = deriveActive(act, r.isAlive, r.stunnedForRounds);
                const maxDef = Math.floor(Math.max(0, tbVal ?? 0) / 2);
                const nextDef = (tbVal ?? 0) < 0 ? 0 : Math.min(Math.max(0, r.tbUsedForDefense ?? 0), maxDef);
                return { ...r, playerActivity: act, attackType: atk, critType: crit, tb: tbVal, tbUsedForDefense: nextDef, target: targetToken, isActive } as Player;
              });
              const res = await fetch('http://localhost:8081/api/players/bulk-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
              if (!res.ok) {
                throw new Error(`Save failed (${res.status})`);
              }
              const data = await res.json();
              const savedCount = Array.isArray(data?.saved) ? data.saved.length : 0;
              const missing = Array.isArray(data?.notFound) ? data.notFound.length : 0;
              showToast(`Saved ${savedCount} player(s)` + (missing ? `, ${missing} not found` : ''));
              navigate('/adventure/fight', { state: { players: rows } });
            } catch (e) {
              showToast('Failed to save to server.');
            }
          }}
          style={{ padding: '6px 12px', background: '#2f5597', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        >
          FIGHT
        </button>
      </div>
      {players.length === 0 ? (
        <p>No players were selected for play.</p>
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
              {rows.map((p) => {
                const isHovered = hoverTargetId != null && p.characterId === hoverTargetId;
                return (
                <tr key={p.id} style={isHovered ? { background: 'rgba(47,85,151,0.35)' } : undefined}>
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
                  <td>
                    {(() => {
                      const opts = [
                        { value: 'none', label: 'none' },
                        { value: 'self', label: 'self' },
                        ...rows
                          .filter((o) => o.id !== p.id)
                          .slice()
                          .sort((a, b) => (a.characterId || '').localeCompare(b.characterId || ''))
                          .map((o) => ({ value: o.characterId || '', label: o.characterId || '', dead: o.isAlive === false, stunned: (o.stunnedForRounds ?? 0) > 0 })),
                      ];
                      return (
                        <TargetDropdown
                          valueToken={p.target == null ? 'none' : p.target === p.characterId ? 'self' : (p.target as string)}
                          selfId={p.characterId}
                          widthCh={targetWidthCh + 6}
                          options={opts}
                          isOpen={openTargetRowId === p.id}
                          onToggle={() => setOpenTargetRowId(openTargetRowId === p.id ? null : p.id)}
                          onOption={(value) => {
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
                                return { ...r, target: nextTarget, playerActivity: enforcedAct, attackType: nextAttack, critType: nextCrit, shield: nextShield, isActive: nextActive, tb: nextTb };
                              })
                            );
                            setOpenTargetRowId(null);
                          }}
                        />
                      );
                    })()}
                  </td>
                  <td>
                    {(() => {
                      const allowedActs = allowedActivitiesByTarget(p.target);
                      const curAct = (p.playerActivity && allowedActs.includes(p.playerActivity)) ? p.playerActivity : allowedActs[0];
                      return (
                        <select
                          style={{ width: `${activityWidthCh + 2}ch` }}
                          className="sel-activity"
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
                                return { ...r, playerActivity: enforcedAct, attackType: nextAttack, critType: nextCrit, shield: nextShield, isActive: nextActive, tb: nextTb };
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
                      style={{ width: `${attackWidthCh + 2}ch` }}
                      className="sel-attack"
                      value={(attacksByActivity(p.playerActivity).includes(p.attackType || '') ? p.attackType : attacksByActivity(p.playerActivity)[0]) ?? 'none'}
                      onChange={(e) => {
                        const newAttack = e.target.value;
                        setRows((prev) =>
                          prev.map((r) => {
                            if (r.id !== p.id) return r;
                            const allowedCrits = critByAttack[newAttack] ?? ['none'];
                            const nextCrit = r.critType && allowedCrits.includes(r.critType) ? r.critType : 'none';
                            const nextShield = canUseShield(newAttack) ? r.shield : false;
                            return { ...r, attackType: newAttack, critType: nextCrit, shield: nextShield };
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
                          style={{ width: `${critWidthCh + 2}ch` }}
                          className="sel-crit"
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
                      style={{ width: `${armorWidthCh + 2}ch` }}
                      className="sel-armor"
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
                  <td className="right">{p.tbUsedForDefense}</td>
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
              );
            })}
          </tbody>
        </table>
      </>
    )}
  </div>
);
}
