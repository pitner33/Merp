import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { Player } from '../types';
import { isXpOverCap, formatXp } from '../utils/xp';
import { sortPlayersByCharacterId } from '../utils/characterId';
import { computeDualWieldMainTb, computeDualWieldOffHandTb } from '../utils/dualWield';

type WeaponOption = {
  id: number;
  name: string;
  activityType: string | null;
  attackType: string | null;
  critType: string | null;
};

const WEAPON_NONE_VALUE = '__none';

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
  const [weapons, setWeapons] = useState<WeaponOption[]>([]);
  const [weaponSelections, setWeaponSelections] = useState<Record<number, string>>({});

  function activityLabel(value?: string): string {
    if (!value) return '—';
    const opt = activityOptions.find((o) => o.value === value);
    return opt?.label ?? value;
  }

  function attackLabel(value?: string): string {
    if (!value) return '—';
    const opt = attackOptions.find((o) => o.value === value);
    return opt?.label ?? value;
  }

  function critLabel(value?: string): string {
    if (!value) return '—';
    const opt = critOptions.find((o) => o.value === value);
    return opt?.label ?? value;
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('http://localhost:8081/api/weapons');
        if (!res.ok) return;
        const data = (await res.json()) as WeaponOption[];
        if (!cancelled && Array.isArray(data)) {
          setWeapons(data);
        }
      } catch {
        if (!cancelled) setWeapons([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const weaponById = useMemo(() => {
    const map = new Map<number, WeaponOption>();
    weapons.forEach((w) => {
      if (typeof w.id === 'number') {
        map.set(w.id, w);
      }
    });
    return map;
  }, [weapons]);

  useEffect(() => {
    setWeaponSelections((prev) => {
      const ids = new Set(rows.map((r) => r.id));
      let changed = false;
      const next: Record<number, string> = { ...prev };
      Object.keys(next).forEach((key) => {
        const id = Number(key);
        if (!ids.has(id)) {
          delete next[id];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [rows]);

  const weaponSelectOptions = useMemo(
    () => [
      { value: WEAPON_NONE_VALUE, label: 'None' },
      ...weapons
        .slice()
        .sort((a, b) => {
          const aid = typeof a.id === 'number' ? a.id : Number(a.id ?? 0);
          const bid = typeof b.id === 'number' ? b.id : Number(b.id ?? 0);
          return aid - bid;
        })
        .map((w) => ({ value: String(w.id), label: w.name ?? `Weapon #${w.id}` })),
    ],
    [weapons]
  );

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

  function normalizePlayerTargetToken(value?: string | null, selfId?: string | null): string {
    if (!value) return 'none';
    if (value === 'none') return 'none';
    if (value === 'self') {
      if (!selfId) return 'none';
      return normalizePlayerTargetToken(selfId, selfId);
    }
    const source = value.toUpperCase();
    const match = source.match(/^(JK|NJK)(\d{1,2})$/);
    if (!match) return 'none';
    const num = Number(match[2]);
    if (!Number.isFinite(num) || num < 1 || num > 15) return 'none';
    return `${match[1]}${num.toString().padStart(2, '0')}`;
  }

  function displayTargetToken(target?: string | null, selfId?: string | null): string {
    const enumToken = normalizePlayerTargetToken(target, selfId);
    if (enumToken === 'none') return 'none';
    const selfToken = selfId ? normalizePlayerTargetToken(selfId, selfId) : null;
    if (selfToken && enumToken === selfToken) return 'self';
    const match = rows.find((r) => normalizePlayerTargetToken(r.characterId, null) === enumToken);
    return match?.characterId ?? enumToken;
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
    { value: 'dualWield', label: 'Dual Wield' },
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
    slashing: ['none', 'slashing', 'piercing', 'bigCreaturePhisical'],
    blunt: ['none', 'blunt', 'bigCreaturePhisical'],
    twoHanded: ['none', 'slashing', 'blunt', 'piercing', 'bigCreaturePhisical'],
    dualWield: ['none', 'slashing', 'blunt', 'piercing', 'bigCreaturePhisical'],
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

  function computeTbPair(p: Player): { main: number; offhand: number } {
    const attackType = p.attackType ?? 'slashing';
    switch (attackType) {
      case 'none':
        return { main: 0, offhand: 0 };
      case 'slashing':
      case 'blunt':
      case 'clawsAndFangs':
      case 'grabOrBalance': {
        const base = p.tbOneHanded ?? 0;
        return { main: base, offhand: 0 };
      }
      case 'dualWield': {
        const main = computeDualWieldMainTb(p.tbOneHanded, p.dualWield);
        const offhand = computeDualWieldOffHandTb(p.tbOneHanded, p.dualWield);
        return { main, offhand };
      }
      case 'twoHanded':
        return { main: p.tbTwoHanded ?? 0, offhand: 0 };
      case 'ranged':
        return { main: p.tbRanged ?? 0, offhand: 0 };
      case 'baseMagic':
        return { main: p.tbBaseMagic ?? 0, offhand: 0 };
      case 'magicBall':
      case 'magicProjectile':
        return { main: p.tbTargetMagic ?? 0, offhand: 0 };
      default:
        return { main: p.tb ?? 0, offhand: 0 };
    }
  }

  function attacksByActivity(activity?: string, player?: Player): string[] {
    switch (activity) {
      case '_1PerformMagic':
        return ['baseMagic', 'magicBall', 'magicProjectile'];
      case '_2RangedAttack':
        return ['ranged'];
      case '_3PhisicalAttackOrMovement': {
        const base = ['slashing', 'blunt', 'twoHanded', 'clawsAndFangs', 'grabOrBalance'];
        const canDual = Boolean(player?.dualWield && player.dualWield > 0);
        return canDual ? [...base.slice(0, 3), 'dualWield', ...base.slice(3)] : base;
      }
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

  function weaponValueForPlayer(p: Player): string {
    if (p.id != null) {
      const stored = weaponSelections[p.id];
      if (stored !== undefined) {
        if (stored === WEAPON_NONE_VALUE) return stored;
        const weaponId = Number(stored);
        const weapon = Number.isFinite(weaponId) ? weaponById.get(weaponId) : undefined;
        if (weapon) {
          const activity = p.playerActivity ?? null;
          const attack = p.attackType ?? null;
          const crit = p.critType ?? null;
          if (
            (weapon.activityType ?? null) === activity &&
            (weapon.attackType ?? null) === attack &&
            (weapon.critType ?? null) === crit
          ) {
            return stored;
          }
        }
      }
    }
    if (!weapons || weapons.length === 0) return WEAPON_NONE_VALUE;
    const activity = p.playerActivity ?? null;
    const attack = p.attackType ?? null;
    const crit = p.critType ?? null;
    const match = weapons.find(
      (w) =>
        (w.activityType ?? null) === activity &&
        (w.attackType ?? null) === attack &&
        (w.critType ?? null) === crit
    );
    return match ? String(match.id) : WEAPON_NONE_VALUE;
  }

  function maxLen(arr: string[]): number {
    return arr.reduce((m, s) => Math.max(m, (s || '').length), 0);
  }

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
                const targetToken = normalizePlayerTargetToken(candidate, r.characterId);
                let act = r.playerActivity;
                if (targetToken === 'none' && act !== '_4PrepareMagic') act = '_5DoNothing';
                let atk = r.attackType;
                let crit = r.critType;
                if (act === '_5DoNothing') { atk = 'none'; crit = 'none'; }
                const pair = computeTbPair({ ...r, attackType: atk } as Player);
                const tbVal = (act === '_4PrepareMagic' || act === '_5DoNothing') ? 0 : pair.main;
                const tbOff = (act === '_4PrepareMagic' || act === '_5DoNothing') ? 0 : pair.offhand;
                const isActive = deriveActive(act, r.isAlive, r.stunnedForRounds);
                const maxDef = Math.floor(Math.max(0, tbVal) / 2);
                const nextDef = tbVal < 0 ? 0 : Math.min(Math.max(0, r.tbUsedForDefense ?? 0), maxDef);
                return {
                  ...r,
                  playerActivity: act,
                  attackType: atk,
                  critType: crit,
                  tb: tbVal,
                  tbOffHand: tbOff,
                  tbUsedForDefense: nextDef,
                  target: targetToken,
                  isActive,
                } as Player;
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
              try {
                const orderedRes = await fetch('http://localhost:8081/api/players/ordered');
                if (orderedRes.ok) {
                  const ordered = (await orderedRes.json()) as Player[];
                  const sorted = sortPlayersByCharacterId(Array.isArray(ordered) ? ordered : rows);
                  setRows(sorted);
                  try {
                    localStorage.setItem('merp:selectedPlayers', JSON.stringify(sorted));
                    localStorage.setItem('merp:adventureRefresh', String(Date.now()));
                  } catch {}
                }
              } catch {}
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
                const targetToken = normalizePlayerTargetToken(candidate, r.characterId);
                let act = r.playerActivity;
                if (targetToken === 'none' && act !== '_4PrepareMagic') act = '_5DoNothing';
                let atk = r.attackType;
                let crit = r.critType;
                if (act === '_5DoNothing') { atk = 'none'; crit = 'none'; }
                const pair = computeTbPair({ ...r, attackType: atk } as Player);
                const tbVal = (act === '_4PrepareMagic' || act === '_5DoNothing') ? 0 : pair.main;
                const tbOff = (act === '_4PrepareMagic' || act === '_5DoNothing') ? 0 : pair.offhand;
                const isActive = deriveActive(act, r.isAlive, r.stunnedForRounds);
                const maxDef = Math.floor(Math.max(0, tbVal) / 2);
                const nextDef = tbVal < 0 ? 0 : Math.min(Math.max(0, r.tbUsedForDefense ?? 0), maxDef);
                return {
                  ...r,
                  playerActivity: act,
                  attackType: atk,
                  critType: crit,
                  tb: tbVal,
                  tbOffHand: tbOff,
                  tbUsedForDefense: nextDef,
                  target: targetToken,
                  isActive,
                } as Player;
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
              let nextRows = rows;
              try {
                const orderedRes = await fetch('http://localhost:8081/api/players/ordered');
                if (orderedRes.ok) {
                  const ordered = (await orderedRes.json()) as Player[];
                  const sorted = sortPlayersByCharacterId(Array.isArray(ordered) ? ordered : rows);
                  nextRows = sorted;
                  try {
                    localStorage.setItem('merp:selectedPlayers', JSON.stringify(sorted));
                    localStorage.setItem('merp:adventureRefresh', String(Date.now()));
                  } catch {}
                }
              } catch {}
              navigate('/adventure/fight', { state: { players: nextRows } });
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
                <th rowSpan={2}>Weapon/Activity</th>
                <th rowSpan={2}>Activity</th>
                <th rowSpan={2}>Attack</th>
                <th rowSpan={2}>Crit</th>
                <th rowSpan={2}>Armor</th>
                <th rowSpan={2}>TB</th>
                <th rowSpan={2}>TB OH</th>
                <th rowSpan={2}>TB for Defense</th>
                <th colSpan={5} style={{ textAlign: 'center' }}>TB</th>
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
                <th>1H</th>
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
                          valueToken={displayTargetToken(p.target as string | undefined, p.characterId)}
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
                                const allowedAttacks = attacksByActivity(enforcedAct, r);
                                const nextAttack = allowedAttacks.includes(r.attackType || '') ? (r.attackType as string) : allowedAttacks[0];
                                const allowedCrits = critByAttack[nextAttack] ?? ['none'];
                                const nextCrit = r.critType && allowedCrits.includes(r.critType) ? r.critType : 'none';
                                const nextShield = canUseShield(nextAttack) ? r.shield : false;
                                const nextActive = deriveActive(enforcedAct, r.isAlive, r.stunnedForRounds);
                                const pair = computeTbPair({ ...r, attackType: nextAttack } as Player);
                                const nextTb = (enforcedAct === '_4PrepareMagic' || enforcedAct === '_5DoNothing') ? 0 : pair.main;
                                const nextTbOff = (enforcedAct === '_4PrepareMagic' || enforcedAct === '_5DoNothing') ? 0 : pair.offhand;
                                return {
                                  ...r,
                                  target: nextTarget,
                                  playerActivity: enforcedAct,
                                  attackType: nextAttack,
                                  critType: nextCrit,
                                  shield: nextShield,
                                  isActive: nextActive,
                                  tb: nextTb,
                                  tbOffHand: nextTbOff,
                                  tbUsedForDefense: 0,
                                };
                              })
                            );
                            setWeaponSelections((prev) => {
                              const next = { ...prev } as Record<number, string>;
                              if (value === 'none') next[p.id] = WEAPON_NONE_VALUE;
                              else delete next[p.id];
                              return next;
                            });
                            setOpenTargetRowId(null);
                          }}
                        />
                      );
                    })()}
                  </td>
                  <td>
                    <select
                      style={{ width: `${Math.max(16, maxLen(weaponSelectOptions.map((o) => o.label)) + 2)}ch` }}
                      value={weaponValueForPlayer(p)}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === WEAPON_NONE_VALUE) {
                          setRows((prev) =>
                            prev.map((r) => {
                              if (r.id !== p.id) return r;
                              const allowedActs = allowedActivitiesByTarget(r.target);
                              const fallbackAct = allowedActs.includes('_5DoNothing') ? '_5DoNothing' : allowedActs[0];
                              const allowedAttacks = attacksByActivity(fallbackAct, r);
                              const fallbackAttack = allowedAttacks.includes('none') ? 'none' : allowedAttacks[0];
                              const allowedCrits = critByAttack[fallbackAttack] ?? ['none'];
                              const fallbackCrit = allowedCrits.includes('none') ? 'none' : allowedCrits[0];
                              const pair = computeTbPair({ ...r, attackType: fallbackAttack } as Player);
                              const inactive = fallbackAct === '_4PrepareMagic' || fallbackAct === '_5DoNothing';
                              const nextTb = inactive ? 0 : pair.main;
                              const nextTbOff = inactive ? 0 : pair.offhand;
                              const nextActive = deriveActive(fallbackAct, r.isAlive, r.stunnedForRounds);
                              return {
                                ...r,
                                playerActivity: fallbackAct,
                                attackType: fallbackAttack,
                                critType: fallbackCrit,
                                shield: false,
                                isActive: nextActive,
                                tb: nextTb,
                                tbOffHand: nextTbOff,
                                tbUsedForDefense: 0,
                              };
                            })
                          );
                          setWeaponSelections((prev) => ({ ...prev, [p.id]: WEAPON_NONE_VALUE }));
                          return;
                        }

                        const weaponId = Number(value);
                        const weapon = Number.isFinite(weaponId) ? weaponById.get(weaponId) : undefined;
                        if (!weapon) {
                          setWeaponSelections((prev) => {
                            const next = { ...prev } as Record<number, string>;
                            delete next[p.id];
                            return next;
                          });
                          return;
                        }

                        setRows((prev) =>
                          prev.map((r) => {
                            if (r.id !== p.id) return r;
                            const allowedActs = allowedActivitiesByTarget(r.target);
                            const desiredAct = weapon.activityType ?? allowedActs[0];
                            const enforcedAct = desiredAct && allowedActs.includes(desiredAct) ? desiredAct : allowedActs[0];
                            const allowedAttacks = attacksByActivity(enforcedAct, r);
                            const desiredAttack = weapon.attackType ?? allowedAttacks[0];
                            const enforcedAttack = desiredAttack && allowedAttacks.includes(desiredAttack) ? desiredAttack : allowedAttacks[0];
                            const allowedCrits = critByAttack[enforcedAttack] ?? ['none'];
                            const desiredCrit = weapon.critType ?? allowedCrits[0];
                            const enforcedCrit = desiredCrit && allowedCrits.includes(desiredCrit) ? desiredCrit : allowedCrits[0];
                            const nextShield = canUseShield(enforcedAttack) ? r.shield : false;
                            const nextActive = deriveActive(enforcedAct, r.isAlive, r.stunnedForRounds);
                            const pair = computeTbPair({ ...r, attackType: enforcedAttack } as Player);
                            const inactive = enforcedAct === '_4PrepareMagic' || enforcedAct === '_5DoNothing';
                            const nextTb = inactive ? 0 : pair.main;
                            const nextTbOff = inactive ? 0 : pair.offhand;
                            return {
                              ...r,
                              playerActivity: enforcedAct,
                              attackType: enforcedAttack,
                              critType: enforcedCrit,
                              shield: nextShield,
                              isActive: nextActive,
                              tb: nextTb,
                              tbOffHand: nextTbOff,
                              tbUsedForDefense: 0,
                            };
                          })
                        );
                        setWeaponSelections((prev) => ({ ...prev, [p.id]: String(weapon.id) }));
                      }}
                    >
                      {weaponSelectOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {(() => {
                      const allowedActs = allowedActivitiesByTarget(p.target);
                      const curAct = (p.playerActivity && allowedActs.includes(p.playerActivity)) ? p.playerActivity : allowedActs[0];
                      return <span>{activityLabel(curAct)}</span>;
                    })()}
                  </td>
                  <td>
                    {(() => {
                      const allowed = attacksByActivity(p.playerActivity, p);
                      const curAttack = allowed.includes(p.attackType || '') ? (p.attackType as string) : allowed[0];
                      return <span>{attackLabel(curAttack)}</span>;
                    })()}
                  </td>
                  <td>
                    {(() => {
                      const allowedAttacks = attacksByActivity(p.playerActivity, p);
                      const curAttack = allowedAttacks.includes(p.attackType || '') ? (p.attackType as string) : allowedAttacks[0];
                      const allowedCrits = critByAttack[curAttack ?? 'none'] ?? ['none'];
                      const curCrit = p.critType && allowedCrits.includes(p.critType) ? p.critType : 'none';
                      return <span>{critLabel(curCrit)}</span>;
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
                          prev.map((r) => (r.id === p.id ? { ...r, armorType: value } : r))
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
                  <td className="right">{(() => computeTbPair(p).main)()}</td>
                  <td className="right">{(() => computeTbPair(p).offhand)()}</td>
                  <td>
                    {(() => {
                      const tb = computeTbPair(p).main;
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
                            setRows((prev) =>
                              prev.map((r) => (r.id === p.id ? { ...r, tbUsedForDefense: val } : r))
                            );
                          }}
                          style={{ width: 70, textAlign: 'right' }}
                          aria-label="TB used for defense"
                          title={neg ? 'TB < 0 ➜ Defense TB fixed at 0' : `Max ${max} (50% of TB)`}
                        />
                      );
                    })()}
                  </td>
                  <td className="right">{p.tbOneHanded}</td>
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
              );
            })}
          </tbody>
        </table>
      </>
    )}
  </div>
);
}
