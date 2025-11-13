import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState, useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { Player, PlayerInventoryItem } from '../types';
import { fetchInventory } from '../api/inventory';
import {
  computeWeaponDropdownWidth,
  createWeaponByIdMap,
  createWeaponSelectOptionsMap,
  inventoryWeaponsForPlayer,
  toWeaponOptions,
  weaponOptionsForPlayer,
  WEAPON_NONE_VALUE,
  type WeaponOption,
} from '../utils/weapons';
import { isXpOverCap, formatXp } from '../utils/xp';
import { computeDualWieldMainTb, computeDualWieldOffHandTb } from '../utils/dualWield';

export default function SingleAttack() {
  const navigate = useNavigate();

  // Title
  useEffect(() => {
    document.title = 'SINGLE ATTACK';
  }, []);

  // Players and selections
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [playersVersion, setPlayersVersion] = useState(0);

  const [attackerToken, setAttackerToken] = useState<string>('none'); // characterId token like Crit
  const [attacker, setAttacker] = useState<Player | null>(null);
  const [defenderToken, setDefenderToken] = useState<string>('none'); // selected in Target column
  const [defender, setDefender] = useState<Player | null>(null);

  // Dropdown controlled values for attacker (Activity/Attack/Crit/Armor) and defender (Armor)
  const [attackerActivity, setAttackerActivity] = useState<string | undefined>(undefined);
  const [attackerAttack, setAttackerAttack] = useState<string | undefined>(undefined);
  const [attackerCrit, setAttackerCrit] = useState<string | undefined>(undefined);
  const [attackerArmor, setAttackerArmor] = useState<string | undefined>(undefined);
  const [defenderArmor, setDefenderArmor] = useState<string | undefined>(undefined);
  const [inventoryByPlayerId, setInventoryByPlayerId] = useState<Record<number, WeaponOption[]>>({});
  const [attackerWeaponSelection, setAttackerWeaponSelection] = useState<string | undefined>(undefined);

  // Rolling state (copied from AdventureFightRound semantics)
  const [rolling, setRolling] = useState(false);
  const [tensFace, setTensFace] = useState<number>(0);
  const [onesFace, setOnesFace] = useState<number>(0);
  const [openSign, setOpenSign] = useState<0 | 1 | -1>(0);
  const [openTotal, setOpenTotal] = useState<number | null>(null);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [readyToRoll, setReadyToRoll] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolveAttempted, setResolveAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [beRoll, setBeRoll] = useState<null | {
    open: number;
    attackerTb: number;
    attackerTbForDefense: number;
    attackerPenalty: number;
    defenderVb: number;
    defenderTbForDefense: number;
    defenderShield: number;
    defenderPenalty: number;
    modifiers: number;
    total: number;
  }>(null);
  const [attackRes, setAttackRes] = useState<null | { result: string; row: string[]; total: number }>(null);
  const [critEnabled, setCritEnabled] = useState(false);
  const [critRolling, setCritRolling] = useState(false);
  const [critTensFace, setCritTensFace] = useState<number>(0);
  const [critOnesFace, setCritOnesFace] = useState<number>(0);
  const [critLastRoll, setCritLastRoll] = useState<number | null>(null);
  const [critDto, setCritDto] = useState<any>(null);
  const [failEnabled, setFailEnabled] = useState(false);
  const [failRolling, setFailRolling] = useState(false);
  const [failTensFace, setFailTensFace] = useState<number>(0);
  const [failOnesFace, setFailOnesFace] = useState<number>(0);
  const [failLastRoll, setFailLastRoll] = useState<number | null>(null);
  const [failOpenSign, setFailOpenSign] = useState<0 | 1 | -1>(0);
  const [failOpenTotal, setFailOpenTotal] = useState<number | null>(null);
  const [failDto, setFailDto] = useState<any>(null);
  const [offHandReady, setOffHandReady] = useState(false);
  const [isOffHandSequence, setIsOffHandSequence] = useState(false);
  const [offHandDone, setOffHandDone] = useState(false);
  const [usingOffHandView, setUsingOffHandView] = useState(false);
  const [offHandAwaitingRoll, setOffHandAwaitingRoll] = useState(false);
  const intervalRef = useRef<number | null>(null);

  // Modifiers (from AdventureFightRound)
  function initialMod() {
    return {
      attackFromWeakSide: false,
      attackFromBehind: false,
      defenderSurprised: false,
      defenderStunned: false,
      attackerWeaponChange: false,
      attackerTargetChange: false,
      attackerHPBelow50Percent: false,
      attackerMoreThan3MetersMovement: false,
      modifierByGameMaster: 0,
    };
  }
  const [mod, setMod] = useState({
    attackFromWeakSide: false,
    attackFromBehind: false,
    defenderSurprised: false,
    defenderStunned: false,
    attackerWeaponChange: false,
    attackerTargetChange: false,
    attackerHPBelow50Percent: false,
    attackerMoreThan3MetersMovement: false,
    modifierByGameMaster: 0,
  });

  function initialRm() {
    return {
      distanceOfAttack: '_3_15m' as '_0_3m' | '_3_15m' | '_15_30m' | '_30_60m' | '_60_90m' | '_90m_plus',
      prepareRounds: 0 as 0 | 1 | 2 | 3 | 4,
      coverPenalty: 0 as number,
      shieldInLoS: true,
      inMiddleOfMagicBall: false,
      targetAware: false,
      targetNotMoving: false,
      baseMageType: 'lenyeg' as 'lenyeg' | 'kapcsolat',
      mdBonus: false,
      agreeingTarget: false,
      gmModifier: 0 as number,
    };
  }
  const [rm, setRm] = useState({
    distanceOfAttack: '_3_15m' as '_0_3m' | '_3_15m' | '_15_30m' | '_30_60m' | '_60_90m' | '_90m_plus',
    prepareRounds: 0 as 0 | 1 | 2 | 3 | 4,
    coverPenalty: 0 as number,
    shieldInLoS: true,
    inMiddleOfMagicBall: false,
    targetAware: false,
    targetNotMoving: false,
    baseMageType: 'lenyeg' as 'lenyeg' | 'kapcsolat',
    mdBonus: false,
    agreeingTarget: false,
    gmModifier: 0 as number,
  });

  // Effects based on selected players
  const autoDefenderStunned = !!defender?.isStunned;
  const autoAttackerHPBelow50 = !!attacker && Number(attacker.hpActual) < Number(attacker.hpMax) * 0.5;

  useEffect(() => {
    setMod((m) => ({ ...m, defenderStunned: autoDefenderStunned, attackerHPBelow50Percent: autoAttackerHPBelow50 }));
  }, [autoDefenderStunned, autoAttackerHPBelow50]);

  // Load players
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('http://localhost:8081/api/players?isPlay=true');
        if (!res.ok) return;
        const list = (await res.json()) as Player[];
        if (alive) { setPlayers(list); setPlayersVersion((v) => v + 1); }
      } catch {}
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!players || players.length === 0) return;
    let cancelled = false;
    const playerIds = players
      .map((p) => (typeof p.id === 'number' ? p.id : null))
      .filter((id): id is number => id != null && Number.isFinite(id));
    const missingIds = playerIds.filter((id) => inventoryByPlayerId[id] === undefined);
    if (missingIds.length === 0) return;

    (async () => {
      const entries = await Promise.all(
        missingIds.map(async (playerId) => {
          try {
            const inventory = await fetchInventory(playerId);
            return { playerId, inventory };
          } catch {
            return { playerId, inventory: [] as PlayerInventoryItem[] };
          }
        })
      );
      if (cancelled) return;
      setInventoryByPlayerId((prev) => {
        const next: Record<number, WeaponOption[]> = { ...prev };
        entries.forEach(({ playerId, inventory }) => {
          next[playerId] = toWeaponOptions(inventory);
        });
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [players, inventoryByPlayerId]);

  const weaponOptionsByPlayer = useMemo(
    () => createWeaponSelectOptionsMap(inventoryByPlayerId),
    [inventoryByPlayerId]
  );

  const weaponById = useMemo(
    () => createWeaponByIdMap(inventoryByPlayerId),
    [inventoryByPlayerId]
  );

  const weaponSelectWidthCh = useMemo(
    () => computeWeaponDropdownWidth(weaponOptionsByPlayer),
    [weaponOptionsByPlayer]
  );

  const attackerWeaponValue = useMemo(() => {
    const activity = (attackerActivity ?? attacker?.playerActivity ?? null) as string | null;
    const attack = (attackerAttack ?? attacker?.attackType ?? null) as string | null;
    const crit = (attackerCrit ?? attacker?.critType ?? null) as string | null;

    if (attackerWeaponSelection !== undefined) {
      if (attackerWeaponSelection === WEAPON_NONE_VALUE) return WEAPON_NONE_VALUE;
      const weaponId = Number(attackerWeaponSelection);
      const weapon = Number.isFinite(weaponId) ? weaponById.get(weaponId) : undefined;
      if (
        weapon &&
        (weapon.activityType ?? null) === activity &&
        (weapon.attackType ?? null) === attack &&
        (weapon.critType ?? null) === crit
      ) {
        return attackerWeaponSelection;
      }
    }

    const playerId = attacker?.id;
    const inventoryWeapons = Number.isFinite(playerId)
      ? inventoryWeaponsForPlayer(inventoryByPlayerId, playerId)
      : [];
    const match = inventoryWeapons.find(
      (w) =>
        (w.activityType ?? null) === activity &&
        (w.attackType ?? null) === attack &&
        (w.critType ?? null) === crit
    );
    return match ? String(match.id) : WEAPON_NONE_VALUE;
  }, [attackerActivity, attackerAttack, attackerCrit, attacker?.playerActivity, attacker?.attackType, attacker?.critType, attackerWeaponSelection, attacker?.id, inventoryByPlayerId, weaponById]);

  // Helper to refresh the whole players list (used on focus/storage)
  async function refreshPlayersFromServer() {
    try {
      const res = await fetch('http://localhost:8081/api/players?isPlay=true');
      if (!res.ok) return;
      const list = (await res.json()) as Player[];
      setPlayers(list);
      setPlayersVersion((v) => v + 1);
    } catch {}
  }

  // Resolve tokens to full players
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        if (attackerToken === 'none') { setAttacker(null); return; }
        const found = (players || []).find((pl) => String(pl.characterId) === attackerToken);
        const id = found?.id;
        if (!id) { setAttacker(found || null); return; }
        const r = await fetch(`http://localhost:8081/api/players/${id}`);
        if (!r.ok) { setAttacker(found || null); return; }
        const fresh = await r.json();
        if (!cancel) setAttacker(fresh);
      } catch {}
    })();
    return () => { cancel = true; };
  }, [attackerToken, players]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        if (defenderToken === 'none') { setDefender(null); return; }
        const found = (players || []).find((pl) => String(pl.characterId) === defenderToken);
        const id = found?.id;
        if (!id) { setDefender(found || null); return; }
        const r = await fetch(`http://localhost:8081/api/players/${id}`);
        if (!r.ok) { setDefender(found || null); return; }
        const fresh = await r.json();
        if (!cancel) setDefender(fresh);
      } catch {}
    })();
    return () => { cancel = true; };
  }, [defenderToken, players]);

  // Keep dropdowns synced with selected players
  useEffect(() => {
    if (!attacker) {
      setAttackerActivity(undefined);
      setAttackerAttack(undefined);
      setAttackerCrit(undefined);
      setAttackerArmor(undefined);
      setReadyToRoll(false);
      return;
    }
    setAttackerActivity(attacker.playerActivity as any);
    setAttackerAttack(attacker.attackType as any);
    setAttackerCrit(attacker.critType as any);
    setAttackerArmor(attacker.armorType as any);
  }, [attacker?.id]);

  useEffect(() => {
    if (!defender) { setDefenderArmor(undefined); return; }
    setDefenderArmor(defender.armorType as any);
  }, [defender?.id]);

  // Enforce dependencies between target -> activity -> attack -> crit (same as AdventureMain)
  useEffect(() => {
    const allowedActs = allowedActivitiesByTarget(defenderToken);
    const curAct = attackerActivity as string | undefined;
    const enforcedAct = curAct && allowedActs.includes(curAct) ? curAct : allowedActs[0];
    if (enforcedAct !== curAct) setAttackerActivity(enforcedAct);

    const allowedAtks = attacksByActivity(enforcedAct, attacker ?? undefined);
    const nextAttack = allowedAtks.includes(attackerAttack || '') ? (attackerAttack as string) : allowedAtks[0];
    if (nextAttack !== attackerAttack) setAttackerAttack(nextAttack);

    const allowedCrits = (critByAttack as any)[nextAttack] ?? ['none'];
    const nextCrit = attackerCrit && allowedCrits.includes(attackerCrit) ? attackerCrit : 'none';
    if (nextCrit !== attackerCrit) setAttackerCrit(nextCrit);

    // Update attacker state with derived activity and recalculated TB pair
    setAttacker((prev) => {
      if (!prev) return prev;
      const pair = computeTbPair({ ...prev, attackType: nextAttack } as Player);
      const inactive = enforcedAct === '_4PrepareMagic' || enforcedAct === '_5DoNothing';
      return {
        ...prev,
        isActive: deriveActive(enforcedAct, prev.isAlive, prev.stunnedForRounds),
        tb: inactive ? 0 : pair.main,
        tbOffHand: inactive ? 0 : pair.offHand,
        tbUsedForDefense: 0,
      } as Player;
    });

    // Reset modifiers when target changes
    setMod(initialMod());
    setRm(initialRm());
  }, [defenderToken]);

  useEffect(() => {
    const activity = (attackerActivity ?? attacker?.playerActivity ?? null) as string | null;
    const attack = (attackerAttack ?? attacker?.attackType ?? null) as string | null;
    const crit = (attackerCrit ?? attacker?.critType ?? null) as string | null;

    if (attackerWeaponSelection && attackerWeaponSelection !== WEAPON_NONE_VALUE) {
      const weaponId = Number(attackerWeaponSelection);
      const weapon = Number.isFinite(weaponId) ? weaponById.get(weaponId) : undefined;
      if (
        weapon &&
        (weapon.activityType ?? null) === activity &&
        (weapon.attackType ?? null) === attack &&
        (weapon.critType ?? null) === crit
      ) {
        return;
      }
    }

    const playerId = attacker?.id;
    const inventoryWeapons = inventoryWeaponsForPlayer(inventoryByPlayerId, playerId);
    const match = inventoryWeapons.find(
      (w) =>
        (w.activityType ?? null) === activity &&
        (w.attackType ?? null) === attack &&
        (w.critType ?? null) === crit
    );
    const next = match ? String(match.id) : WEAPON_NONE_VALUE;
    setAttackerWeaponSelection((prev) => (prev === next ? prev : next));
  }, [attackerActivity, attackerAttack, attackerCrit, attacker?.playerActivity, attacker?.attackType, attacker?.critType, attackerWeaponSelection, attacker?.id, inventoryByPlayerId, weaponById]);

  // Reset rolling on key changes
  function resetRollSequence() {
    if (intervalRef.current) { window.clearInterval(intervalRef.current); intervalRef.current = null; }
    setRolling(false);
    setTensFace(0);
    setOnesFace(0);
    setOpenSign(0);
    setOpenTotal(null);
    setLastRoll(null);
    setBeRoll(null);
    setAttackRes(null);
    setResolveAttempted(false);
    setError(null);
    setCritEnabled(false);
    setCritRolling(false);
    setCritTensFace(0);
    setCritOnesFace(0);
    setCritLastRoll(null);
    setCritDto(null);
    setFailEnabled(false);
    setFailRolling(false);
    setFailTensFace(0);
    setFailOnesFace(0);
    setFailLastRoll(null);
    setFailOpenSign(0);
    setFailOpenTotal(null);
    setFailDto(null);
  }

  function resetRollState() {
    resetRollSequence();
    setOffHandReady(false);
    setIsOffHandSequence(false);
    setOffHandDone(false);
    setUsingOffHandView(false);
    setOffHandAwaitingRoll(false);
  }

  useEffect(() => { resetRollState(); }, []);
  useEffect(() => { setResolveAttempted(false); }, [openTotal]);

  function markOffHandReadyAfterPrimary() {
    if (attackerAttack !== 'dualWield' || offHandDone) return;
    setIsOffHandSequence(false);
    setOffHandDone(false);
    setOffHandReady(true);
    setUsingOffHandView(true);
    setOffHandAwaitingRoll(true);
  }

  function markOffHandComplete() {
    setIsOffHandSequence(false);
    setOffHandReady(false);
    setOffHandDone(true);
    setReadyToRoll(false);
    setOffHandAwaitingRoll(false);
  }

  // Helpers copied from pages
  function hpStyle(p: Player): CSSProperties {
    const max = Number(p.hpMax) || 0;
    const cur = Number(p.hpActual) || 0;
    const ratio = max > 0 ? cur / max : 0;
    const pct = ratio * 100;
    let bg = '#2fa84f'; let fg = '#ffffff';
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
  function computeTbPair(p?: Player | null): { main: number; offHand: number } {
    if (!p) return { main: 0, offHand: 0 };
    const attackType = (p.attackType ?? 'slashing') as string;
    switch (attackType) {
      case 'none':
        return { main: 0, offHand: 0 };
      case 'slashing':
      case 'blunt':
      case 'clawsAndFangs':
      case 'grabOrBalance': {
        const base = p.tbOneHanded ?? 0;
        return { main: base, offHand: 0 };
      }
      case 'dualWield': {
        const main = computeDualWieldMainTb(p.tbOneHanded, p.dualWield);
        const offhand = computeDualWieldOffHandTb(p.tbOneHanded, p.dualWield);
        return { main, offHand: offhand };
      }
      case 'twoHanded':
        return { main: p.tbTwoHanded ?? 0, offHand: 0 };
      case 'ranged':
        return { main: p.tbRanged ?? 0, offHand: 0 };
      case 'baseMagic':
        return { main: p.tbBaseMagic ?? 0, offHand: 0 };
      case 'magicBall':
      case 'magicProjectile':
        return { main: p.tbTargetMagic ?? 0, offHand: 0 };
      default:
        return { main: p.tb ?? 0, offHand: 0 };
    }
  }
  function labelActivity(v?: string): string {
    const map: Record<string, string> = { _1PerformMagic: 'Perform Magic', _2RangedAttack: 'Ranged Attack', _3PhisicalAttackOrMovement: 'Attack or Movement', _4PrepareMagic: 'Prepare Magic', _5DoNothing: 'Do Nothing' };
    return v && map[v] ? map[v] : (v || '');
  }
  function labelAttack(v?: string): string {
    const map: Record<string, string> = { none: 'None', slashing: 'Slashing', blunt: 'Blunt', twoHanded: 'Two-handed', ranged: 'Ranged', clawsAndFangs: 'Claws and Fangs', grabOrBalance: 'Grab or Balance', baseMagic: 'Base Magic', magicBall: 'Magic Ball', magicProjectile: 'Magic Projectile' };
    return v && map[v] ? map[v] : (v || '');
  }
  function labelCrit(v?: string): string {
    const map: Record<string, string> = { none: 'None', slashing: 'Slashing', blunt: 'Blunt', piercing: 'Piercing', heat: 'Heat', cold: 'Cold', electricity: 'Electricity', balance: 'Balance', crushing: 'Crushing', grab: 'Grab', bigCreaturePhisical: 'Big Creature Physical', bigCreatureMagic: 'Big Creature Magic' };
    return v && map[v] ? map[v] : (v || '');
  }
  function deriveActive(activity?: string, isAlive?: boolean, stunnedForRounds?: number): boolean {
    const alive = isAlive !== false;
    const stunned = (stunnedForRounds ?? 0) > 0;
    if (!alive) return false;
    if (stunned) return false;
    if (activity === '_5DoNothing' || activity === '_4PrepareMagic') return false;
    return true;
  }

  function applyActivityAttackCrit(enforcedAct: string, enforcedAttack: string, enforcedCrit: string) {
    setAttackerActivity(enforcedAct);
    setAttackerAttack(enforcedAttack);
    setAttackerCrit(enforcedCrit);
    setAttacker((prev) => {
      if (!prev) return prev;
      const pair = computeTbPair({ ...prev, attackType: enforcedAttack } as Player);
      const inactive = enforcedAct === '_4PrepareMagic' || enforcedAct === '_5DoNothing';
      return {
        ...prev,
        playerActivity: enforcedAct,
        attackType: enforcedAttack,
        critType: enforcedCrit,
        isActive: deriveActive(enforcedAct, prev.isAlive, prev.stunnedForRounds),
        tb: inactive ? 0 : pair.main,
        tbOffHand: inactive ? 0 : pair.offHand,
        tbUsedForDefense: 0,
      } as Player;
    });
    setMod(initialMod());
    setRm(initialRm());
  }

  function handleWeaponChange(value: string) {
    const allowedActs = allowedActivitiesByTarget(defenderToken);
    const basePlayer = attacker ?? undefined;
    if (value === WEAPON_NONE_VALUE) {
      const fallbackAct = allowedActs.includes(attackerActivity || '')
        ? (attackerActivity as string)
        : allowedActs[0];
      const allowedAtks = attacksByActivity(fallbackAct, basePlayer);
      const fallbackAttack = allowedAtks.includes(attackerAttack || '')
        ? (attackerAttack as string)
        : allowedAtks[0];
      const allowedCrits = (critByAttack as any)[fallbackAttack] ?? ['none'];
      const fallbackCrit = attackerCrit && allowedCrits.includes(attackerCrit) ? attackerCrit : 'none';
      applyActivityAttackCrit(fallbackAct, fallbackAttack, fallbackCrit);
      setAttackerWeaponSelection(WEAPON_NONE_VALUE);
      return;
    }

    const weaponId = Number(value);
    const weapon = Number.isFinite(weaponId) ? weaponById.get(weaponId) : undefined;
    if (!weapon) return;

    const desiredAct = weapon.activityType ?? allowedActs[0];
    const enforcedAct = desiredAct && allowedActs.includes(desiredAct) ? desiredAct : allowedActs[0];
    const allowedAtks = attacksByActivity(enforcedAct, basePlayer);
    const desiredAttack = weapon.attackType ?? allowedAtks[0];
    const enforcedAttack = desiredAttack && allowedAtks.includes(desiredAttack) ? desiredAttack : allowedAtks[0];
    const allowedCrits = (critByAttack as any)[enforcedAttack] ?? ['none'];
    const desiredCrit = weapon.critType ?? allowedCrits[0];
    const enforcedCrit = desiredCrit && allowedCrits.includes(desiredCrit) ? desiredCrit : allowedCrits[0];
    applyActivityAttackCrit(enforcedAct, enforcedAttack, enforcedCrit);
    setAttackerWeaponSelection(String(weapon.id));
  }

  // Helpers to refresh players from backend so UI reflects applied results immediately
  async function fetchPlayerById(pid?: number | string | null): Promise<Player | null> {
    try {
      if (pid == null) return null;
      const url = `http://localhost:8081/api/players/${pid}`;
      const r = await fetch(url);
      if (!r.ok) return null;
      return (await r.json()) as Player;
    } catch { return null; }
  }
  async function refreshAttackerFromServer() {
    const id = attacker?.id ?? (players || []).find((pl) => String(pl.characterId) === attackerToken)?.id;
    const fresh = await fetchPlayerById(id as any);
    if (fresh) setAttacker(fresh);
  }
  async function refreshDefenderFromServer() {
    const id = defender?.id ?? (players || []).find((pl) => String(pl.characterId) === defenderToken)?.id;
    const fresh = await fetchPlayerById(id as any);
    if (fresh) setDefender(fresh);
  }

  function broadcastAdventureRefresh() {
    try { localStorage.setItem('merp:adventureRefresh', String(Date.now())); } catch {}
  }

  // Refresh current attacker/defender from DB when tab gains focus
  useEffect(() => {
    function onFocus() {
      Promise.allSettled([refreshPlayersFromServer(), refreshAttackerFromServer(), refreshDefenderFromServer()]);
    }
    window.addEventListener('focus', onFocus);
    function onStorage(e: StorageEvent) {
      if (!e.key) return;
      if (e.key === 'merp:adventureRefresh') {
        Promise.allSettled([refreshPlayersFromServer(), refreshAttackerFromServer(), refreshDefenderFromServer()]);
      }
    }
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
    };
  }, [attackerToken, defenderToken]);

  // Option helpers from AdventureMain
  const activityOptions = ['_1PerformMagic', '_2RangedAttack', '_3PhisicalAttackOrMovement', '_4PrepareMagic', '_5DoNothing'] as const;
  const armorOptions = [
    { value: 'none', label: 'None' },
    { value: 'leather', label: 'Leather' },
    { value: 'heavyLeather', label: 'Heavy Leather' },
    { value: 'chainmail', label: 'Chainmail' },
    { value: 'plate', label: 'Plate' },
  ];
  function attacksByActivity(activity?: string, player?: Player | null): string[] {
    switch (activity) {
      case '_1PerformMagic': return ['baseMagic', 'magicBall', 'magicProjectile'];
      case '_2RangedAttack': return ['ranged'];
      case '_3PhisicalAttackOrMovement': {
        const base = ['slashing', 'blunt', 'twoHanded', 'clawsAndFangs', 'grabOrBalance'];
        const canDual = Boolean(player?.dualWield && player.dualWield > 0);
        return canDual ? [...base.slice(0, 3), 'dualWield', ...base.slice(3)] : base;
      }
      case '_4PrepareMagic':
      case '_5DoNothing':
      default: return ['none'];
    }
  }
  function allowedActivitiesByTarget(target?: string): string[] {
    const all = Array.from(activityOptions);
    if (!target || target === 'none') return ['_5DoNothing', '_4PrepareMagic'];
    return all;
  }
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
  } as any;

  // Gate button controls readiness explicitly; do not auto-enable based on selections

  // Compute local modified total (same formula as AdventureFightRound)
  function computeLocalModifiedTotal(): number | undefined {
    if (openTotal == null) return undefined;
    const activity = attackerActivity as string | undefined;
    const attackType = attackerAttack as string | undefined;
    const usingMelee = activity === '_3PhisicalAttackOrMovement';
    const usingRanged = activity === '_2RangedAttack' || activity === '_1PerformMagic';
    const isPerformMagic = activity === '_1PerformMagic';

    let modSum = 0;
    if (usingMelee) {
      if (mod.attackFromWeakSide) modSum += 15;
      if (mod.attackFromBehind) modSum += 20;
      if (mod.defenderSurprised) modSum += 20;
      if (autoDefenderStunned) modSum += 20;
      if (mod.attackerWeaponChange) modSum -= 30;
      if (autoAttackerHPBelow50) modSum -= 20;
      if (mod.attackerMoreThan3MetersMovement) modSum -= 10;
      modSum += Number(mod.modifierByGameMaster) || 0;
    } else if (usingRanged) {
      switch (rm.distanceOfAttack) {
        case '_0_3m': modSum += 35; break;
        case '_3_15m': modSum += 0; break;
        case '_15_30m': modSum -= 20; break;
        case '_30_60m': modSum -= 40; break;
        case '_60_90m': modSum -= 55; break;
        case '_90m_plus': modSum -= 75; break;
      }
      if (isPerformMagic) {
        const r = Math.max(0, Math.min(4, Math.floor(Number(rm.prepareRounds) || 0)));
        if (r === 0) modSum -= 20; else if (r === 1) modSum -= 10; else if (r === 2) modSum += 0; else if (r === 3) modSum += 10; else if (r === 4) modSum += 20;
      }
      modSum += Math.floor(Number(rm.coverPenalty) || 0);
      const defenderHasShield = !!defender?.shield;
      if (!rm.shieldInLoS && defenderHasShield) modSum += 25;
      if (attackType === 'magicBall') {
        if (rm.inMiddleOfMagicBall) modSum += 20;
        if (rm.targetAware) modSum -= 10;
      }
      if (rm.targetNotMoving) modSum += 10;
      if (attackType === 'baseMagic') {
        if (rm.baseMageType === 'kapcsolat') modSum -= 10;
        if (rm.mdBonus) modSum += 50;
        if (rm.agreeingTarget) modSum -= 50;
      }
      modSum += Number(rm.gmModifier) || 0;
    }

    const usingOffHand = usingOffHandView;
    const atk = attacker ? ({ ...attacker, attackType: attackerAttack } as Player) : undefined;
    const tbPair = atk ? computeTbPair(atk) : { main: 0, offHand: 0 };
    const attackerTb = usingOffHand ? (tbPair.offHand ?? 0) : (tbPair.main ?? 0);
    const cAttackerTBForDefense = usingOffHand ? 0 : -Math.abs(Number(attacker?.tbUsedForDefense) || 0);
    const cAttackerPenalty = -Math.abs(Number(attacker?.penaltyOfActions) || 0);
    const cDefenderVB = -Math.abs(Number(defender?.vb) || 0);
    const cDefenderTBForDefense = -Math.abs(Number(defender?.tbUsedForDefense) || 0);
    const cDefenderShield = defender?.shield ? -25 : 0;
    const cDefenderPenalty = Math.abs(Number(defender?.penaltyOfActions) || 0);

    const open = openTotal;
    const modifiersTotal = attackerTb + cAttackerTBForDefense + cAttackerPenalty + cDefenderVB + cDefenderTBForDefense + cDefenderShield + cDefenderPenalty + modSum;
    const total = (open || 0) + modifiersTotal;
    return total;
  }

  // Dice roll (same behavior)
  async function executeRoll({ useOffHand = false }: { useOffHand?: boolean } = {}) {
    if (rolling) return;
    if (useOffHand) {
      setIsOffHandSequence(true);
    } else if (isOffHandSequence) {
      return;
    }

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
      setTensFace(tens); setOnesFace(ones); setLastRoll(value);

      if (openSign === 0 || openTotal == null) {
        if (value >= 96) { setOpenSign(1); setOpenTotal(value); }
        else if (value <= 4) { setOpenSign(-1); setOpenTotal(value); }
        else { setOpenSign(0); setOpenTotal(value); }
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
    } finally {
      if (intervalRef.current) { window.clearInterval(intervalRef.current); intervalRef.current = null; }
      setRolling(false);
    }
  }

  async function handleRoll() {
    setUsingOffHandView(false);
    setOffHandAwaitingRoll(false);
    await executeRoll();
  }

  async function handleOffHandRoll() {
    if (attackerAttack !== 'dualWield') return;
    if (rolling || resolving || !offHandReady) return;
    setOffHandReady(false);
    resetRollSequence();
    setResolveAttempted(false);
    setError(null);
    setAttackRes(null);
    setBeRoll(null);
    setIsOffHandSequence(true);
    setOffHandDone(false);
    setReadyToRoll(true);
    setUsingOffHandView(true);
    setOffHandAwaitingRoll(false);
    await executeRoll({ useOffHand: true });
  }

  // Auto resolve trigger
  useEffect(() => {
    const openStarted = openTotal != null && openSign !== 0;
    const firstOpenAwaitingReroll = openStarted && (lastRoll == null || lastRoll === openTotal);
    const canResolve = openTotal != null && (openSign === 0) && !rolling && !firstOpenAwaitingReroll && readyToRoll && !resolveAttempted;
    if (canResolve && !resolving && !attackRes) resolveBackend();
  }, [openTotal, openSign, rolling, lastRoll, resolving, attackRes, readyToRoll, resolveAttempted]);

  // Resolve using overrides independent of global pair, then decide flow (X, A-E, Fail)
  async function resolveBackend() {
    if (openTotal == null || !attacker || !defender || !attackerActivity || !attackerAttack || !attackerCrit || !defenderArmor) return;
    try {
      setResolveAttempted(true);
      setResolving(true);
      setError(null);
      setAttackRes(null);
      setBeRoll(null);

      // Compose local breakdown and echo via compute-modified-roll (overrides)
      const atk = { ...attacker, attackType: attackerAttack } as Player;
      const tbPair = computeTbPair(atk);
      const usingOffHand = usingOffHandView;
      const attackerTb = usingOffHand ? tbPair.offHand : tbPair.main;
      const cAttackerTBForDefense = usingOffHand ? 0 : -Math.abs(Number(attacker.tbUsedForDefense) || 0);
      const cAttackerPenalty = -Math.abs(Number(attacker.penaltyOfActions) || 0);
      const cDefenderVB = -Math.abs(Number(defender.vb) || 0);
      const cDefenderTBForDefense = -Math.abs(Number(defender.tbUsedForDefense) || 0);
      const cDefenderShield = defender.shield ? -25 : 0;
      const cDefenderPenalty = Math.abs(Number(defender.penaltyOfActions) || 0);

      const usedTotalLocal = computeLocalModifiedTotal();
      const modifiersOut = (usedTotalLocal != null)
        ? (usedTotalLocal - ((openTotal || 0) + attackerTb + cAttackerTBForDefense + cAttackerPenalty + cDefenderVB + cDefenderTBForDefense + cDefenderShield + cDefenderPenalty))
        : 0;

      const r1 = await fetch(
        `http://localhost:8081/api/fight/compute-modified-roll?open=${openTotal}` +
        `&attackerTb=${attackerTb}` +
        `&attackerTbForDefense=${cAttackerTBForDefense}` +
        `&attackerPenalty=${cAttackerPenalty}` +
        `&defenderVb=${cDefenderVB}` +
        `&defenderTbForDefense=${cDefenderTBForDefense}` +
        `&defenderShield=${cDefenderShield}` +
        `&defenderPenalty=${cDefenderPenalty}` +
        `&modifiers=${modifiersOut}` +
        `&total=${usedTotalLocal ?? 0}`
      );
      if (r1.ok) setBeRoll(await r1.json());

      // Resolve attack row using overrides (attackType, defenderArmor)
      const r2 = await fetch(
        `http://localhost:8081/api/fight/resolve-attack?total=${usedTotalLocal ?? 0}` +
        `&attackType=${encodeURIComponent(attackerAttack)}` +
        `&defenderArmor=${encodeURIComponent(defenderArmor)}`
      );
      if (!r2.ok) throw new Error('resolve-attack failed');
      const ar = await r2.json();
      const resStr = (ar?.result || '').toString().trim();
      const usedTotal = usedTotalLocal ?? ar.total;
      setAttackRes({ ...ar, total: usedTotal });

      // Enable crit if letter A-E, fail flow if Fail
      const upper = resStr.toUpperCase();
      if (upper && upper !== 'FAIL') {
        const letter = upper.slice(-1);
        setCritEnabled(letter !== 'X');
      } else {
        setCritEnabled(false);
      }

      if (resStr && resStr !== 'Fail') {
        const letter = resStr.slice(-1);
        if (letter === 'X') {
          const defenderId = defender.id ?? (players || []).find((pl) => String(pl.characterId) === defenderToken)?.id;
          if (defenderId != null) {
            const url = `http://localhost:8081/api/fight/apply-crit-to-target?defenderId=${encodeURIComponent(defenderId)}&result=${encodeURIComponent(resStr)}&critResult=${encodeURIComponent(0)}&critType=${encodeURIComponent('none')}`;
            const applyResp = await fetch(url, { method: 'POST' });
            if (!applyResp.ok) throw new Error('apply-attack failed');
            const dto = await applyResp.json();
            setCritDto(dto);
            await Promise.allSettled([refreshDefenderFromServer(), refreshAttackerFromServer()]);
            broadcastAdventureRefresh();
          }
          if (usingOffHandView) {
            markOffHandComplete();
          } else {
            markOffHandReadyAfterPrimary();
          }
        }
      } else if (resStr === 'Fail') {
        // Enable fail roll box
        setFailEnabled(true);
        setFailRolling(false);
        setFailTensFace(0); setFailOnesFace(0); setFailLastRoll(null); setFailOpenSign(0); setFailOpenTotal(null); setFailDto(null);
      }
    } catch (e: any) {
      setError(e?.message || 'Resolve failed');
    } finally {
      setResolving(false);
    }
  }

  // Crit roll apply (target-specific endpoint)
  async function handleCritRoll() {
    if (!attackRes?.result || !critEnabled || critRolling || !defender || !attacker) return;
    const resStr = (attackRes.result || '').toString().trim();
    const upper = resStr.toUpperCase();
    const critLetter = upper.slice(-1);
    if (!critLetter || critLetter === 'X' || upper === 'FAIL') return;

    setCritRolling(true);
    const localInterval = window.setInterval(() => {
      setCritTensFace((p) => (p + 1) % 10);
      setCritOnesFace((p) => (p + 1) % 10);
    }, 50);
    try {
      const fetchPromise = fetch('http://localhost:8081/api/dice/d100').then((r) => {
        if (!r.ok) throw new Error('Crit dice roll failed');
        return r.json();
      }) as Promise<number>;
      const waitPromise = new Promise<void>((res) => setTimeout(res, 1200));
      const [rolled] = await Promise.all([fetchPromise, waitPromise]);
      const value = typeof rolled === 'number' ? rolled : 1;
      const tens = value === 100 ? 0 : Math.floor(value / 10);
      const ones = value === 100 ? 0 : value % 10;
      setCritTensFace(tens); setCritOnesFace(ones); setCritLastRoll(value);

      // Modified crit result by letter (same as Crit.tsx)
      const letterOnly = (critLetter || '').toString().toUpperCase();
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

      try {
        const defenderId = defender.id ?? (players || []).find((pl) => String(pl.characterId) === defenderToken)?.id;
        const url = `http://localhost:8081/api/fight/apply-crit-to-target?defenderId=${encodeURIComponent(defenderId!)}&result=${encodeURIComponent(resStr)}&critResult=${encodeURIComponent(modifiedCritResult)}&critType=${encodeURIComponent(attackerCrit || 'none')}`;
        const resp = await fetch(url, { method: 'POST' });
        if (!resp.ok) throw new Error('apply-attack-with-crit failed');
        const dto = await resp.json();
        setCritDto(dto);
        setCritEnabled(false);
        await Promise.allSettled([refreshDefenderFromServer(), refreshAttackerFromServer()]);
        broadcastAdventureRefresh();
        if (usingOffHandView) {
          markOffHandComplete();
        } else {
          markOffHandReadyAfterPrimary();
        }
      } catch (e: any) {
        setError(e?.message || 'Crit apply failed');
      }
    } catch (e: any) {
      setError(e?.message || 'Crit roll failed');
    } finally {
      window.clearInterval(localInterval);
      setCritRolling(false);
    }
  }

  // Fail roll apply (same flow as AdventureFightRound, but relies on global pair; use only when available)
  async function handleFailRoll() {
    if (!failEnabled || failRolling) return;
    setFailRolling(true);
    const localInterval = window.setInterval(() => {
      setFailTensFace((p) => (p + 1) % 10);
      setFailOnesFace((p) => (p + 1) % 10);
    }, 50);
    try {
      const fetchPromise = fetch('http://localhost:8081/api/dice/d100').then((r) => {
        if (!r.ok) throw new Error('Fail dice roll failed');
        return r.json();
      }) as Promise<number>;
      const waitPromise = new Promise<void>((res) => setTimeout(res, 1200));
      const [rolled] = await Promise.all([fetchPromise, waitPromise]);
      const value = typeof rolled === 'number' ? rolled : 1;
      const tens = value === 100 ? 0 : Math.floor(value / 10);
      const ones = value === 100 ? 0 : value % 10;
      setFailTensFace(tens); setFailOnesFace(ones); setFailLastRoll(value);

      let nextSign = failOpenSign;
      let nextTotal = failOpenTotal == null ? null : failOpenTotal;
      if (nextSign === 0 || nextTotal == null) {
        if (value >= 96) { nextSign = 1; nextTotal = value; }
        else if (value <= 4) { nextSign = -1; nextTotal = value; }
        else { nextSign = 0; nextTotal = value; }
      } else {
        const base = nextTotal == null ? 0 : nextTotal;
        if (nextSign === 1) nextTotal = base + value;
        if (nextSign === -1) nextTotal = base - value;
        if (nextSign === 1 && value < 96) nextSign = 0;
        if (nextSign === -1 && value > 4) nextSign = 0;
      }
      setFailOpenTotal(nextTotal); setFailOpenSign(nextSign);

      const sequenceClosed = nextTotal != null && nextSign === 0;
      if (sequenceClosed) {
        // Apply fail directly to the selected attacker (independent of global pair)
        const attackerId = attacker?.id ?? (players || []).find((pl) => String(pl.characterId) === attackerToken)?.id;
        if (attackerId == null) throw new Error('No attacker selected');
        const resp = await fetch(`http://localhost:8081/api/fight/apply-fail-to-attacker?attackerId=${encodeURIComponent(String(attackerId))}&failRoll=${nextTotal}`, { method: 'POST' });
        if (!resp.ok) throw new Error('apply-fail-to-attacker failed');
        const dto = await resp.json();
        setFailDto(dto);
        setFailEnabled(false);
        // Fail effects typically affect attacker; refresh both to be safe
        await Promise.allSettled([refreshAttackerFromServer(), refreshDefenderFromServer()]);
        broadcastAdventureRefresh();
      }
    } catch (e: any) {
      setError(e?.message || 'Fail roll failed');
    } finally {
      window.clearInterval(localInterval);
      setFailRolling(false);
    }
  }

  // Width helpers similar to Crit and AdventureMain
  function maxLen(arr: string[]): number { return arr.reduce((m, s) => Math.max(m, (s || '').length), 0); }
  const idWidthCh = (() => {
    const list = players && players.length > 0 ? players : [{ characterId: 'JK1', name: 'JK1', isAlive: true, stunnedForRounds: 0 } as any];
    const labels = ['None'].concat(
      list.map((pl: any) => {
        const dead = pl.isAlive === false; const stunned = (pl.stunnedForRounds ?? 0) > 0;
        const mark = `${dead ? ' \u2620' : ''}${stunned ? ' \u26A1' : ''}`;
        return `${String(pl.characterId)} - ${pl.name || ''}${mark}`;
      })
    );
    return maxLen(labels);
  })();
  const armorWidthCh = maxLen(armorOptions.map((o) => o.label));

  const isDualWield = attackerAttack === 'dualWield';

  return (
    <div style={{ padding: 8 }}>
      <h1 style={{ marginTop: 0, textAlign: 'center' }}>SINGLE ATTACK</h1>
      <div style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={async () => {
            try {
              const homeUrl = new URL('/home', window.location.origin).toString();
              if (window.opener && !window.opener.closed) {
                try { window.opener.location.href = homeUrl; window.opener.focus(); window.close(); return; } catch {}
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
          onClick={async () => {
            try {
              await Promise.allSettled([refreshAttackerFromServer(), refreshDefenderFromServer()]);
            } catch {}
            resetRollState();
            setReadyToRoll(false);
            setMod(initialMod());
            setRm(initialRm());
          }}
          style={{ padding: '6px 12px', background: '#2f5597', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}
          title="Restart the attack process while keeping current selections"
        >
          REROLL
        </button>
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
          .result-box { display: inline-flex; align-items: center; justify-content: center; width: 120px; height: 120px; border: 1px solid #ddd; border-radius: 8px; background: #f9fafb; padding: 0; }
          .result-box.orange { background: #fed7aa; border-color: #e67e22; }
          .result-label { display: block; width: 120px; text-align: center; font-size: 14px; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: .4px; line-height: 1; align-self: center; white-space: nowrap; }
          .result-value { font-size: 48px; font-weight: 900; color: #111; line-height: 1; }
          .result-col { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; width: 120px; }
          .mods-table th, .mods-table td { padding: 4px 6px !important; font-size: 12px; }
        `}
      </style>

      <table className="table">
        <thead>
          <tr>
            <th rowSpan={2}>Target of Attack</th>
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
          {/* Attacker row */}
          <tr>
            <td>
              <select
                key={`att-sel-${playersVersion}`}
                value={attackerToken}
                onChange={(e) => { setAttackerToken(e.target.value); setDefenderToken('none'); }}
                style={{ width: `${idWidthCh + 2}ch` }}
                aria-label="Attacker ID"
              >
                <option value="none">None</option>
                {(players && players.length > 0 ? players.filter((pl: any) => !!pl.isPlaying) : [{ characterId: 'JK1', name: 'JK1', isAlive: true, stunnedForRounds: 0 } as any]).map((pl: any) => {
                  const dead = pl.isAlive === false; const stunned = (pl.stunnedForRounds ?? 0) > 0;
                  const mark = `${dead ? ' \u2620' : ''}${stunned ? ' \u26A1' : ''}`;
                  const label = `${String(pl.characterId)} - ${pl.name || ''}${mark}`;
                  return (
                    <option key={String(pl.characterId)} value={String(pl.characterId)} style={dead ? { color: '#d32f2f' } : {}}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </td>
            {attacker ? (
              <>
                <td>{attacker.characterId}</td>
                <td>{attacker.name}</td>
                <td>{attacker.gender}</td>
                <td>{attacker.race}</td>
                <td>{attacker.playerClass}</td>
                <td className="right">{attacker.lvl}</td>
                <td
                  className="right"
                  style={isXpOverCap(Number(attacker.lvl), Number(attacker.xp)) ? { position: 'relative', background: '#ffd700', color: '#111', fontWeight: 800 } : { position: 'relative' }}
                  title={isXpOverCap(Number(attacker.lvl), Number(attacker.xp)) ? 'Level up available' : undefined}
                >
                  {formatXp(Number(attacker.xp || 0))}
                  {isXpOverCap(Number(attacker.lvl), Number(attacker.xp)) && (
                    <span aria-hidden="true" style={{ position: 'absolute', top: 2, right: 2, lineHeight: 0 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M12 3l7 7h-4v11H9V10H5l7-7z" />
                      </svg>
                    </span>
                  )}
                </td>
                <td className="right">{attacker.hpMax}</td>
                <td style={hpStyle(attacker)} title={hpTitle(attacker)}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{hpTitle(attacker)}</div>
                  <div>{attacker.hpActual}</div>
                </td>
                <td>
                  {attacker.isAlive ? (
                    <span title="Alive" aria-label="Alive"><svg width="16" height="16" viewBox="0 0 24 24" fill="#2fa84f" stroke="#2fa84f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s-6-4.35-9-8.25C1 10 2.5 6 6.5 6c2.09 0 3.57 1.19 4.5 2.44C11.93 7.19 13.41 6 15.5 6 19.5 6 21 10 21 12.75 18 16.65 12 21 12 21z" /></svg></span>
                  ) : (
                    <span title="Dead" aria-label="Dead"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d32f2f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><line x1="8" y1="8" x2="16" y2="16" /><line x1="16" y1="8" x2="8" y2="16" /></svg></span>
                  )}
                </td>
                <td>
                  {attacker.isActive ? (
                    <span title="Active" aria-label="Active"><svg width="14" height="14" viewBox="0 0 24 24" fill="#2fa84f" stroke="#2fa84f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="6" /></svg></span>
                  ) : (
                    <span title="Inactive" aria-label="Inactive"><svg width="14" height="14" viewBox="0 0 24 24" fill="#bbb" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="6" /><line x1="6" y1="6" x2="18" y2="18" /></svg></span>
                  )}
                </td>
                <td>
                  {attacker.isStunned ? (
                    <span title="Stunned" aria-label="Stunned"><svg width="16" height="16" viewBox="0 0 24 24" fill="#e11d48" stroke="#e11d48" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 2l-8 11h6l-2 9 8-12h-6z" /></svg></span>
                  ) : (
                    <span title="Not stunned" aria-label="Not stunned"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2fa84f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8" /></svg></span>
                  )}
                </td>
                {/* Target dropdown for defender selection */}
                <td>
                  {attacker ? (
                    <select
                      key={`def-sel-${playersVersion}-${attacker.characterId}`}
                      value={defenderToken}
                      onChange={(e) => setDefenderToken(e.target.value)}
                      style={{ minWidth: 140 }}
                    >
                      <option value="none">none</option>
                      {(players || []).filter((o: any) => o.characterId !== attacker.characterId).filter((o: any) => !!o.isPlaying).map((o: any) => {
                        const dead = o.isAlive === false; const stunned = !!o.isStunned || (o.stunnedForRounds ?? 0) > 0;
                        const mark = `${dead ? ' \u2620' : ''}${stunned ? ' \u26A1' : ''}`;
                        return (<option key={String(o.characterId)} value={String(o.characterId)} style={dead ? { color: '#d32f2f' } : {}}>{String(o.characterId)}{mark}</option>);
                      })}
                    </select>
                  ) : null}
                </td>
                <td>
                  <select
                    value={attackerWeaponValue}
                    onChange={(e) => handleWeaponChange(e.target.value)}
                    style={{ width: `${weaponSelectWidthCh}ch` }}
                  >
                    {weaponOptionsForPlayer(weaponOptionsByPlayer, attacker?.id).map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </td>
                <td>{labelActivity(attackerActivity || (attacker?.playerActivity as string | undefined))}</td>
                <td>{labelAttack(attackerAttack || (attacker?.attackType as string | undefined))}</td>
                <td>{labelCrit(attackerCrit || (attacker?.critType as string | undefined))}</td>
                <td>
                  <select
                    value={attackerArmor || ''}
                    onChange={(e) => setAttackerArmor(e.target.value)}
                    style={{ width: `${armorWidthCh + 2}ch` }}
                  >
                    {armorOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </td>
                <td className="right">{(() => computeTbPair({ ...(attacker as any), attackType: attackerAttack } as Player).main)()}</td>
                <td className="right">{(() => computeTbPair({ ...(attacker as any), attackType: attackerAttack } as Player).offHand)()}</td>
                <td>
                  {(() => {
                    const pair = computeTbPair({ ...(attacker as any), attackType: attackerAttack } as Player);
                    const tb = pair.main;
                    const neg = tb < 0;
                    const max = Math.floor(Math.max(0, tb) * 0.5);
                    const value = neg ? 0 : Math.min(Math.max(0, Number(attacker.tbUsedForDefense) || 0), max);
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
                          setAttacker((prev) => (prev ? { ...prev, tbUsedForDefense: val } as Player : prev));
                        }}
                        style={{ width: 70, textAlign: 'right' }}
                        aria-label="TB used for defense"
                        title={neg ? 'TB < 0 ➜ Defense TB fixed at 0' : `Max ${max} (50% of TB)`}
                      />
                    );
                  })()}
                </td>
                <td className="right">{attacker.vb}</td>
                <td>
                  {attacker.shield ? (
                    <span title="Shield: Yes" aria-label="Shield: Yes"><svg width="16" height="16" viewBox="0 0 24 24" fill="#2f5597" stroke="#2f5597" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l7 3v5c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-3z"/><path d="M9 12l2 2 4-4" fill="none"/></svg></span>
                  ) : (
                    <span title="Shield: No" aria-label="Shield: No"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l7 3v5c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-3z"/><line x1="6" y1="6" x2="18" y2="18" /></svg></span>
                  )}
                </td>
                <td className="right">{attacker.dualWield ?? 0}</td>
                <td className="right">{attacker.stunnedForRounds}</td>
                <td className="right">{attacker.penaltyOfActions}</td>
                <td className="right">{attacker.hpLossPerRound}</td>
                <td className="right">{attacker.mm}</td>
                <td className="right">{attacker.agilityBonus}</td>
                <td className="right">{attacker.mdLenyeg}</td>
                <td className="right">{attacker.mdKapcsolat}</td>
                <td className="right">{attacker.perception}</td>
                <td className="right">{attacker.tracking}</td>
                <td className="right">{attacker.lockPicking}</td>
                <td className="right">{attacker.disarmTraps}</td>
                <td className="right">{attacker.objectUsage}</td>
                <td className="right">{attacker.runes}</td>
                <td className="right">{attacker.influence}</td>
                <td className="right">{attacker.stealth}</td>
              </>
            ) : (
              <td colSpan={36} style={{ color: '#888' }}>Select attacker…</td>
            )}
          </tr>

          {/* Defender row */}
          <tr>
            <td>{defender ? 'Defender' : ''}</td>
            {defender ? (
              <>
                <td>{defender.characterId}</td>
                <td>{defender.name}</td>
                <td>{defender.gender}</td>
                <td>{defender.race}</td>
                <td>{defender.playerClass}</td>
                <td className="right">{defender.lvl}</td>
                <td className="right">{formatXp(Number(defender.xp || 0))}</td>
                <td className="right">{defender.hpMax}</td>
                <td style={hpStyle(defender)} title={hpTitle(defender)}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{hpTitle(defender)}</div>
                  <div>{defender.hpActual}</div>
                </td>
                <td>
                  {defender.isAlive ? (
                    <span title="Alive" aria-label="Alive"><svg width="16" height="16" viewBox="0 0 24 24" fill="#2fa84f" stroke="#2fa84f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s-6-4.35-9-8.25C1 10 2.5 6 6.5 6c2.09 0 3.57 1.19 4.5 2.44C11.93 7.19 13.41 6 15.5 6 19.5 6 21 10 21 12.75 18 16.65 12 21 12 21z" /></svg></span>
                  ) : (
                    <span title="Dead" aria-label="Dead"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d32f2f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><line x1="8" y1="8" x2="16" y2="16" /><line x1="16" y1="8" x2="8" y2="16" /></svg></span>
                  )}
                </td>
                <td>
                  {defender.isActive ? (
                    <span title="Active" aria-label="Active"><svg width="14" height="14" viewBox="0 0 24 24" fill="#2fa84f" stroke="#2fa84f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="6" /></svg></span>
                  ) : (
                    <span title="Inactive" aria-label="Inactive"><svg width="14" height="14" viewBox="0 0 24 24" fill="#bbb" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="6" /><line x1="6" y1="6" x2="18" y2="18" /></svg></span>
                  )}
                </td>
                <td>
                  {defender.isStunned ? (
                    <span title="Stunned" aria-label="Stunned"><svg width="16" height="16" viewBox="0 0 24 24" fill="#e11d48" stroke="#e11d48" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 2l-8 11h6l-2 9 8-12h-6z" /></svg></span>
                  ) : (
                    <span title="Not stunned" aria-label="Not stunned"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2fa84f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8" /></svg></span>
                  )}
                </td>
                <td>{defender.target == null ? 'none' : String(defender.target)}</td>
                <td>
                  {(() => {
                    const activity = defender.playerActivity ?? null;
                    const attack = defender.attackType ?? null;
                    const crit = defender.critType ?? null;
                    const defenderId = defender.id;
                    const inventoryWeapons = Number.isFinite(defenderId) ? inventoryByPlayerId[defenderId!] ?? [] : [];
                    const match = inventoryWeapons.find(
                      (w) =>
                        (w.activityType ?? null) === activity &&
                        (w.attackType ?? null) === attack &&
                        (w.critType ?? null) === crit
                    );
                    return match?.name ?? '—';
                  })()}
                </td>
                <td>{labelActivity(defender.playerActivity as any)}</td>
                <td>{labelAttack(defender.attackType as any)}</td>
                <td>{labelCrit(defender.critType as any)}</td>
                <td>
                  <select
                    value={defenderArmor || ''}
                    onChange={(e) => setDefenderArmor(e.target.value)}
                    style={{ width: `${armorWidthCh + 2}ch` }}
                  >
                    {armorOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </td>
                <td className="right">{defender.tb}</td>
                <td className="right">{defender.tbOffHand ?? 0}</td>
                <td>
                  {(() => {
                    const tb = Number(defender.tb) || 0;
                    const neg = tb < 0;
                    const max = Math.floor(Math.max(0, tb) * 0.5);
                    const value = neg ? 0 : Math.min(Math.max(0, Number(defender.tbUsedForDefense) || 0), max);
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
                          setDefender((prev) => (prev ? { ...prev, tbUsedForDefense: val } as Player : prev));
                        }}
                        style={{ width: 70, textAlign: 'right' }}
                        aria-label="TB used for defense"
                        title={neg ? 'TB < 0 ➜ Defense TB fixed at 0' : `Max ${max} (50% of TB)`}
                      />
                    );
                  })()}
                </td>
                <td className="right">{defender.vb}</td>
                <td>
                  {defender.shield ? (
                    <span title="Shield: Yes" aria-label="Shield: Yes"><svg width="16" height="16" viewBox="0 0 24 24" fill="#2f5597" stroke="#2f5597" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l7 3v5c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-3z"/><path d="M9 12l2 2 4-4" fill="none"/></svg></span>
                  ) : (
                    <span title="Shield: No" aria-label="Shield: No"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l7 3v5c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-3z"/><line x1="6" y1="6" x2="18" y2="18" /></svg></span>
                  )}
                </td>
                <td className="right">{defender.dualWield ?? 0}</td>
                <td className="right">{defender.stunnedForRounds}</td>
                <td className="right">{defender.penaltyOfActions}</td>
                <td className="right">{defender.hpLossPerRound}</td>
                <td className="right">{defender.mm}</td>
                <td className="right">{defender.agilityBonus}</td>
                <td className="right">{defender.mdLenyeg}</td>
                <td className="right">{defender.mdKapcsolat}</td>
                <td className="right">{defender.perception}</td>
                <td className="right">{defender.tracking}</td>
                <td className="right">{defender.lockPicking}</td>
                <td className="right">{defender.disarmTraps}</td>
                <td className="right">{defender.objectUsage}</td>
                <td className="right">{defender.runes}</td>
                <td className="right">{defender.influence}</td>
                <td className="right">{defender.stealth}</td>
              </>
            ) : (
              <td colSpan={36} style={{ color: '#888' }}>{attacker ? 'Select target…' : ''}</td>
            )}
          </tr>
        </tbody>
      </table>
      {/* Modifiers and roll/result panels (copied from AdventureFightRound) */}

      <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 8, alignItems: 'flex-start', justifyContent: 'flex-start', width: '100%', overflowX: 'auto' }}>
        {(() => {
          const activity = attackerActivity as string | undefined;
          const meleeActive = activity === '_3PhisicalAttackOrMovement';
          const meleeDisabled = !meleeActive;
          function meleeLabel(base: string, active: boolean, amt: number): string { const sign = amt > 0 ? '+' : ''; return `${base} (${sign}${amt})`; }
          return (
            <div style={{ display: 'block', verticalAlign: 'top', flex: '0 0 700px', width: 700, minWidth: 700, maxWidth: 700, marginTop: 8, marginBottom: 4, opacity: meleeDisabled ? 0.6 : 1, overflow: 'hidden' }} title={meleeDisabled ? 'Inactive: only for Attack or Movement' : undefined}>
              <h2 style={{ margin: '0 0 6px 0', fontSize: 16 }}>Melee Modifiers</h2>
              <table className="table mods-table" style={{ width: 700, tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '75%' }} />
                  <col style={{ width: '25%' }} />
                </colgroup>
                <thead><tr><th>Melee Modifier</th><th>Value</th></tr></thead>
                <tbody>
                  <tr><td>{meleeLabel('Attack from weak side', mod.attackFromWeakSide, 15)}</td><td><input type="checkbox" checked={mod.attackFromWeakSide} disabled={meleeDisabled} onChange={(e) => setMod((m) => ({ ...m, attackFromWeakSide: e.target.checked }))} /></td></tr>
                  <tr><td>{meleeLabel('Attack from behind', mod.attackFromBehind, 20)}</td><td><input type="checkbox" checked={mod.attackFromBehind} disabled={meleeDisabled} onChange={(e) => setMod((m) => ({ ...m, attackFromBehind: e.target.checked }))} /></td></tr>
                  <tr><td>{meleeLabel('Defender surprised', mod.defenderSurprised, 20)}</td><td><input type="checkbox" checked={mod.defenderSurprised} disabled={meleeDisabled} onChange={(e) => setMod((m) => ({ ...m, defenderSurprised: e.target.checked }))} /></td></tr>
                  <tr><td>{meleeLabel('Defender stunned', !!defender?.isStunned, 20)}</td><td><input type="checkbox" checked={!!defender?.isStunned} disabled aria-label="Defender stunned (auto)" /></td></tr>
                  <tr><td>{meleeLabel('Attacker weapon change', mod.attackerWeaponChange, -30)}</td><td><input type="checkbox" checked={mod.attackerWeaponChange} disabled={meleeDisabled} onChange={(e) => setMod((m) => ({ ...m, attackerWeaponChange: e.target.checked }))} /></td></tr>
                  <tr><td>{meleeLabel('Attacker target change', mod.attackerTargetChange, -30)}</td><td><input type="checkbox" checked={mod.attackerTargetChange} disabled={meleeDisabled} onChange={(e) => setMod((m) => ({ ...m, attackerTargetChange: e.target.checked }))} /></td></tr>
                  <tr><td>{meleeLabel('Attacker HP below 50%', autoAttackerHPBelow50, -20)}</td><td><input type="checkbox" checked={autoAttackerHPBelow50} disabled aria-label="Attacker HP below 50% (auto)" /></td></tr>
                  <tr><td>{meleeLabel('Attacker moved > 3m', mod.attackerMoreThan3MetersMovement, -10)}</td><td><input type="checkbox" checked={mod.attackerMoreThan3MetersMovement} disabled={meleeDisabled} onChange={(e) => setMod((m) => ({ ...m, attackerMoreThan3MetersMovement: e.target.checked }))} /></td></tr>
                  <tr><td>GM modifier</td><td><input type="number" value={mod.modifierByGameMaster} onChange={(e) => { const v = Math.floor(Number(e.target.value) || 0); setMod((m) => ({ ...m, modifierByGameMaster: v })); }} style={{ width: 80, textAlign: 'right' }} disabled={meleeDisabled} /></td></tr>
                </tbody>
              </table>
            </div>
          );
        })()}

        {(() => {
          const activity = attackerActivity as string | undefined;
          const attackType = attackerAttack as string | undefined;
          const rangedActive = activity === '_2RangedAttack' || activity === '_1PerformMagic';
          const rangedDisabled = !rangedActive;
          const isPerformMagic = activity === '_1PerformMagic';
          const isMagicBall = attackType === 'magicBall';
          const isBaseMagic = attackType === 'baseMagic';
          const defenderHasShield = !!defender?.shield;
          return (
            <div style={{ display: 'block', verticalAlign: 'top', flex: '0 0 700px', width: 700, minWidth: 700, maxWidth: 700, marginTop: 8, marginBottom: 4, opacity: rangedDisabled ? 0.6 : 1, overflow: 'hidden' }} title={rangedDisabled ? 'Inactive: only for Ranged or Perform Magic' : undefined}>
              <h2 style={{ margin: '0 0 6px 0', fontSize: 16 }}>Ranged/Magic modifiers</h2>
              <table className="table mods-table" style={{ width: 700, tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '75%' }} />
                  <col style={{ width: '25%' }} />
                </colgroup>
                <thead><tr><th>Ranged/Magic Modifier</th><th>Value</th></tr></thead>
                <tbody>
                  <tr>
                    <td>Distance of attack</td>
                    <td>
                      <select value={rm.distanceOfAttack} onChange={(e) => setRm((prev) => ({ ...prev, distanceOfAttack: e.target.value as any }))} disabled={false} aria-label={'Distance of attack'}>
                        <option value="_0_3m">0–3 m (+35)</option>
                        <option value="_3_15m">3–15 m (0)</option>
                        <option value="_15_30m">15–30 m (-20)</option>
                        <option value="_30_60m">30–60 m (-40)</option>
                        <option value="_60_90m">60–90 m (-55)</option>
                        <option value="_90m_plus">90 m + (-75)</option>
                      </select>
                    </td>
                  </tr>
                  <tr style={{ opacity: isPerformMagic ? 1 : 0.6 }} title={isPerformMagic ? undefined : 'Active only when Activity is Perform Magic'}>
                    <td>Preparation time (rounds)</td>
                    <td>
                      <select value={rm.prepareRounds} onChange={(e) => setRm((prev) => ({ ...prev, prepareRounds: Number(e.target.value) as 0 | 1 | 2 | 3 | 4 }))} disabled={!isPerformMagic}>
                        <option value={0}>0 (-20)</option>
                        <option value={1}>1 (-10)</option>
                        <option value={2}>2 (0)</option>
                        <option value={3}>3 (+10)</option>
                        <option value={4}>4 (+20)</option>
                      </select>
                    </td>
                  </tr>
                  <tr style={{ opacity: rangedDisabled ? 0.6 : 1 }} title={rangedDisabled ? 'Inactive: only for Ranged or Perform Magic' : undefined}>
                    <td>Target in cover (MM roll result)</td>
                    <td>
                      <input type="number" value={rm.coverPenalty} onChange={(e) => setRm((prev) => ({ ...prev, coverPenalty: Math.floor(Number(e.target.value) || 0) }))} disabled={rangedDisabled} style={{ width: 120, textAlign: 'right' }} />
                    </td>
                  </tr>
                  <tr style={{ opacity: (rangedDisabled || !defenderHasShield) ? 0.6 : 1 }} title={!defenderHasShield ? 'Inactive: defender has no shield' : (rangedDisabled ? 'Inactive: only for Ranged or Perform Magic' : undefined)}>
                    <td>Target's shield not in LoS (+25)</td>
                    <td><input type="checkbox" checked={!rm.shieldInLoS} disabled={rangedDisabled || !defenderHasShield} onChange={(e) => setRm((p) => ({ ...p, shieldInLoS: !e.target.checked }))} /></td>
                  </tr>
                  <tr style={{ opacity: isMagicBall ? 1 : 0.6 }} title={isMagicBall ? undefined : 'Active only when Attack is Magic Ball'}>
                    <td>Target in middle of Magic Ball (+20)</td>
                    <td><input type="checkbox" checked={rm.inMiddleOfMagicBall} disabled={!isMagicBall} onChange={(e) => setRm((p) => ({ ...p, inMiddleOfMagicBall: e.target.checked }))} /></td>
                  </tr>
                  <tr style={{ opacity: isMagicBall ? 1 : 0.6 }} title={isMagicBall ? undefined : 'Active only when Attack is Magic Ball'}>
                    <td>Target is aware of attack (-10)</td>
                    <td><input type="checkbox" checked={rm.targetAware} disabled={!isMagicBall} onChange={(e) => setRm((p) => ({ ...p, targetAware: e.target.checked }))} /></td>
                  </tr>
                  <tr style={{ opacity: rangedDisabled ? 0.6 : 1 }} title={rangedDisabled ? 'Inactive: only for Ranged or Perform Magic' : undefined}>
                    <td>Target not moving (+10)</td>
                    <td><input type="checkbox" checked={rm.targetNotMoving} disabled={rangedDisabled} onChange={(e) => setRm((p) => ({ ...p, targetNotMoving: e.target.checked }))} /></td>
                  </tr>
                  <tr style={{ opacity: isBaseMagic ? 1 : 0.6 }} title={isBaseMagic ? undefined : 'Active only when Attack is Base Magic'}>
                    <td>Base mage type</td>
                    <td>
                      <select value={rm.baseMageType} onChange={(e) => setRm((p) => ({ ...p, baseMageType: e.target.value as 'lenyeg' | 'kapcsolat' }))} disabled={!isBaseMagic} title="Lényeg: 0, Kapcsolat: -10">
                        <option value="lenyeg">Lényeg (0)</option>
                        <option value="kapcsolat">Kapcsolat (-10)</option>
                      </select>
                    </td>
                  </tr>
                  <tr style={{ opacity: isBaseMagic ? 1 : 0.6 }} title={isBaseMagic ? undefined : 'Active only when Attack is Base Magic'}>
                    <td>MD bonus (+50)</td>
                    <td><input type="checkbox" checked={rm.mdBonus} disabled={!isBaseMagic} onChange={(e) => setRm((p) => ({ ...p, mdBonus: e.target.checked }))} /></td>
                  </tr>
                  <tr style={{ opacity: isBaseMagic ? 1 : 0.6 }} title={isBaseMagic ? undefined : 'Active only when Attack is Base Magic'}>
                    <td>Agreeing target (-50)</td>
                    <td><input type="checkbox" checked={rm.agreeingTarget} disabled={!isBaseMagic} onChange={(e) => setRm((p) => ({ ...p, agreeingTarget: e.target.checked }))} /></td>
                  </tr>
                  <tr style={{ opacity: rangedDisabled ? 0.6 : 1 }} title={rangedDisabled ? 'Inactive: only for Ranged or Perform Magic' : undefined}>
                    <td>GM modifier</td>
                    <td><input type="number" value={rm.gmModifier} onChange={(e) => { const v = Math.floor(Number(e.target.value) || 0); setRm((m) => ({ ...m, gmModifier: v })); }} disabled={rangedDisabled} style={{ width: 80, textAlign: 'right' }} /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })()}

        <div style={{ display: 'block', verticalAlign: 'top', flex: '0 0 500px', width: 500, minWidth: 500, maxWidth: 500, marginTop: 30, marginBottom: 4 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', minWidth: '100%', maxWidth: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 8, gap: 8, margin: '0 auto' }}>
            {(() => {
              const openStarted = openTotal != null && openSign !== 0;
              const firstOpenAwaitingReroll = openStarted && (lastRoll == null || lastRoll === openTotal);
              const canRollNow = openTotal == null ? true : openSign === 0 ? false : firstOpenAwaitingReroll || (lastRoll != null && lastRoll >= 96);
              const disabled = rolling || !canRollNow;
              const showGate = !readyToRoll && openTotal == null;
              const offHandDisabled = showGate || !offHandReady || rolling || resolving || isOffHandSequence;
              return (
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  {showGate ? (
                    <button type="button" onClick={() => setReadyToRoll(true)} style={{ background: '#f4a261', color: '#000', width: 75, height: 75, borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, letterSpacing: 0.5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', lineHeight: 1.1 }}>All modifiers set</button>
                  ) : (
                    <button type="button" onClick={handleRoll} disabled={disabled} style={{ background: disabled ? '#888' : '#0a7d2f', color: '#ffffff', width: 75, height: 75, borderRadius: 10, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 12, letterSpacing: 0.5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', lineHeight: 1.1 }}>ROLL</button>
                  )}
                  {isDualWield ? (
                    <button
                      type="button"
                      onClick={handleOffHandRoll}
                      disabled={offHandDisabled}
                      style={{
                        background: (!offHandDisabled) ? '#0a7d2f' : '#888',
                        color: '#ffffff',
                        width: 75,
                        height: 75,
                        borderRadius: 10,
                        border: 'none',
                        cursor: (!offHandDisabled) ? 'pointer' : 'not-allowed',
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
                      ROLL OH
                    </button>
                  ) : null}
                </div>
              );
            })()}
            <div className="dice-wrap">
              <div className={`die tens${rolling ? ' rolling' : ''}`} aria-label="tens-die">{tensFace}</div>
              <div className={`die ones${rolling ? ' rolling' : ''}`} aria-label="ones-die">{onesFace}</div>
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', justifyContent: 'center', marginTop: 8 }}>
              <div className="result-col">
                <span className="result-label">Open roll</span>
                <div className="result-box"><span className="result-value">{(!offHandAwaitingRoll && openTotal != null) ? `${openTotal}` : ''}</span></div>
              </div>
              <div className="result-col">
                <span className="result-label">Modified roll</span>
                <div className="result-box orange">
                  {(() => {
                    if (offHandAwaitingRoll || openTotal == null) return <span className="result-value" />;
                    const total = computeLocalModifiedTotal();
                    return <span className="result-value">{total != null ? `${total}` : ''}</span>;
                  })()}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className="result-label">Modifiers</span>
                {(() => {
                  const activity = attackerActivity as string | undefined;
                  const attackType = attackerAttack as string | undefined;
                  const usingMelee = activity === '_3PhisicalAttackOrMovement';
                  const usingRanged = activity === '_2RangedAttack' || activity === '_1PerformMagic';
                  const isPerformMagic = activity === '_1PerformMagic';
                  let modSum = 0;
                  if (usingMelee) {
                    if (mod.attackFromWeakSide) modSum += 15;
                    if (mod.attackFromBehind) modSum += 20;
                    if (mod.defenderSurprised) modSum += 20;
                    if (defender?.isStunned) modSum += 20;
                    if (mod.attackerWeaponChange) modSum -= 30;
                    if (autoAttackerHPBelow50) modSum -= 20;
                    if (mod.attackerMoreThan3MetersMovement) modSum -= 10;
                    modSum += Number(mod.modifierByGameMaster) || 0;
                  } else if (usingRanged) {
                    switch (rm.distanceOfAttack) { case '_0_3m': modSum += 35; break; case '_3_15m': modSum += 0; break; case '_15_30m': modSum -= 20; break; case '_30_60m': modSum -= 40; break; case '_60_90m': modSum -= 55; break; case '_90m_plus': modSum -= 75; break; }
                    if (isPerformMagic) { const r = Math.max(0, Math.min(4, Math.floor(Number(rm.prepareRounds) || 0))); if (r === 0) modSum -= 20; else if (r === 1) modSum -= 10; else if (r === 2) modSum += 0; else if (r === 3) modSum += 10; else if (r === 4) modSum += 20; }
                    modSum += Math.floor(Number(rm.coverPenalty) || 0);
                    const defenderHasShield = !!defender?.shield;
                    if (!rm.shieldInLoS && defenderHasShield) modSum += 25;
                    if (attackType === 'magicBall') { if (rm.inMiddleOfMagicBall) modSum += 20; if (rm.targetAware) modSum -= 10; }
                    if (rm.targetNotMoving) modSum += 10;
                    if (attackType === 'baseMagic') { if (rm.baseMageType === 'kapcsolat') modSum -= 10; if (rm.mdBonus) modSum += 50; if (rm.agreeingTarget) modSum -= 50; }
                    modSum += Number(rm.gmModifier) || 0;
                  }
                  const usingOffHand = usingOffHandView;
                  const atk = attacker ? ({ ...attacker, attackType: attackerAttack } as Player) : undefined;
                  const tbPair = atk ? computeTbPair(atk) : { main: 0, offHand: 0 };
                  const attackerTb = usingOffHand ? (tbPair.offHand ?? 0) : (tbPair.main ?? 0);
                  const cAttackerTBForDefense = usingOffHand ? 0 : -Math.abs(Number(attacker?.tbUsedForDefense) || 0);
                  const cAttackerPenalty = -Math.abs(Number(attacker?.penaltyOfActions) || 0);
                  const cDefenderVB = -Math.abs(Number(defender?.vb) || 0);
                  const cDefenderTBForDefense = -Math.abs(Number(defender?.tbUsedForDefense) || 0);
                  const cDefenderShield = defender?.shield ? -25 : 0;
                  const cDefenderPenalty = Math.abs(Number(defender?.penaltyOfActions) || 0);
                  const modLabel = usingMelee ? 'Melee modifiers' : 'Ranged/Magic modifiers';
                  const items = [
                    { label: 'Attacker TB', val: attackerTb },
                    { label: 'Attacker TB for defense', val: cAttackerTBForDefense },
                    { label: 'Attacker penalty', val: cAttackerPenalty },
                    { label: 'Defender VB', val: cDefenderVB },
                    { label: 'Defender TB for defense', val: cDefenderTBForDefense },
                    { label: 'Defender shield', val: cDefenderShield },
                    { label: 'Defender penalty', val: cDefenderPenalty },
                    { label: modLabel, val: modSum },
                  ];
                  const modifiersTotal = attackerTb + cAttackerTBForDefense + cAttackerPenalty + cDefenderVB + cDefenderTBForDefense + cDefenderShield + cDefenderPenalty + modSum;
                  return (
                    <div style={{ border: '1px solid #555', borderRadius: 8, padding: 4, minWidth: 0, width: 'auto', height: 120, color: '#555', overflow: 'hidden', whiteSpace: 'normal' }}>
                      {items.map((it) => (
                        <div key={it.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11, lineHeight: 1.1 }}>
                          <span style={{ color: '#555' }}>{it.label}</span>
                          <strong style={{ color: '#555', fontWeight: 700 }}>{it.val}</strong>
                        </div>
                      ))}
                      <div style={{ height: 1, background: '#555', margin: '2px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11, lineHeight: 1.1 }}>
                        <span style={{ fontWeight: 700, color: '#555' }}>Modifiers total</span>
                        <span style={{ fontWeight: 900, color: '#555' }}>{modifiersTotal}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        {error ? (<div style={{ marginTop: 8, color: '#b91c1c', fontWeight: 600 }}>Error: {error}</div>) : null}

        {attackRes ? (
          <div style={{ marginTop: 16, border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ marginTop: 16, border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
                  <div className="result-col">
                    <span className="result-label">Modified roll</span>
                    <div className="result-box orange"><span className="result-value">{attackRes.total}</span></div>
                  </div>
                  <div className="result-col">
                    <span className="result-label">Attack result</span>
                    <div className="result-box"><span className="result-value">{(() => { const s = (attackRes.result || '').toString(); return s.endsWith('X') ? s.slice(0, -1) : s; })()}</span></div>
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}></div>
                  <table className="table" style={{ maxWidth: 560, tableLayout: 'fixed', width: 560 }}>
                    <colgroup>
                      <col style={{ width: '20%' }} />
                      <col style={{ width: '20%' }} />
                      <col style={{ width: '20%' }} />
                      <col style={{ width: '20%' }} />
                      <col style={{ width: '20%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Plate</th>
                        <th>Chainmail</th>
                        <th>Heavy<br/>Leather</th>
                        <th>Leather</th>
                        <th>None</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {(['plate','chainmail','heavyLeather','leather','none'] as const).map((armorKey, idx) => {
                          const isDef = defender?.armorType === armorKey;
                          return (
                            <td key={armorKey} style={{ fontWeight: isDef ? 900 : 600, background: isDef ? '#d1fae5' : undefined, color: '#111' }}>
                              {attackRes.row?.[idx] ?? ''}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              {(() => {
                const resStr = (attackRes?.result || '').toString().trim();
                const upper = resStr.toUpperCase();
                const letter = upper && upper !== 'FAIL' ? upper.slice(-1) : '';
                const show = !!letter && letter !== 'X';
                return show ? (
                  <div style={{ marginTop: 16, border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'center' }}>
                      <div className="result-col" style={{ alignItems: 'center', width: 'auto' }}>
                        <button type="button" onClick={handleCritRoll} disabled={!critEnabled || critRolling} style={{ marginTop: 6, background: critEnabled ? '#16a34a' : '#9ca3af', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 8px', cursor: (!critEnabled || critRolling) ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                          {critRolling ? 'Rolling…' : 'Roll Critical'}
                        </button>
                        <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                          {(() => {
                            const tensFixed = (critLastRoll != null) ? (critLastRoll === 100 ? 0 : Math.floor(critLastRoll / 10)) : null;
                            const onesFixed = (critLastRoll != null) ? (critLastRoll === 100 ? 0 : (critLastRoll % 10)) : null;
                            const tensShow = critRolling ? critTensFace : (tensFixed != null ? tensFixed : critTensFace);
                            const onesShow = critRolling ? critOnesFace : (onesFixed != null ? onesFixed : critOnesFace);
                            return (<><div className={`die tens${critRolling ? ' rolling' : ''}`} aria-label="crit-tens">{tensShow}</div><div className={`die ones${critRolling ? ' rolling' : ''}`} aria-label="crit-ones">{onesShow}</div></>);
                          })()}
                        </div>
                        <span className="result-label" style={{ textAlign: 'center' }}>Critical roll</span>
                        <div className="result-box" title={critEnabled ? 'Critical roll available' : 'No critical required'}>
                          <span className="result-value">{critLastRoll != null ? `${critLastRoll}` : ''}</span>
                        </div>
                      </div>
                      {(() => {
                        const resStr = (attackRes?.result || '').toString().trim();
                        const upper = resStr.toUpperCase();
                        const letter = upper && upper !== 'FAIL' ? upper.slice(-1) : '';
                        let modVal: number | null = null;
                        if (critLastRoll != null && letter) {
                          const base = critLastRoll;
                          switch (letter) { case 'T': modVal = base - 50; break; case 'A': modVal = base - 20; break; case 'B': modVal = base - 10; break; case 'C': modVal = base; break; case 'D': modVal = base + 10; break; case 'E': modVal = base + 20; break; default: modVal = null; }
                        }
                        return (
                          <div className="result-col" style={{ alignItems: 'center', width: 'auto' }}>
                            <span className="result-label" style={{ textAlign: 'center' }}>Crit result</span>
                            <div className="result-box orange" title="Modified value used for crit table"><span className="result-value">{modVal != null ? `${modVal}` : ''}</span></div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ) : null;
              })()}
              {attackRes?.result === 'Fail' && (
                <div style={{ marginTop: 16, border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
                  <div className="result-col" style={{ alignItems: 'center', width: 'auto' }}>
                    <button type="button" onClick={handleFailRoll} disabled={!failEnabled || failRolling} style={{ marginTop: 6, background: failEnabled ? '#16a34a' : '#9ca3af', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 8px', cursor: (!failEnabled || failRolling) ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                      {failRolling ? 'Rolling…' : 'Roll Fail'}
                    </button>
                    <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                      {(() => {
                        const tensFixed = (failLastRoll != null) ? (failLastRoll === 100 ? 0 : Math.floor(failLastRoll / 10)) : null;
                        const onesFixed = (failLastRoll != null) ? (failLastRoll === 100 ? 0 : (failLastRoll % 10)) : null;
                        const tensShow = failRolling ? failTensFace : (tensFixed != null ? tensFixed : failTensFace);
                        const onesShow = failRolling ? failOnesFace : (onesFixed != null ? onesFixed : failOnesFace);
                        return (<><div className={`die tens${failRolling ? ' rolling' : ''}`} aria-label="fail-tens">{tensShow}</div><div className={`die ones${failRolling ? ' rolling' : ''}`} aria-label="fail-ones">{onesShow}</div></>);
                      })()}
                    </div>
                    <span className="result-label" style={{ textAlign: 'center' }}>Fail roll</span>
                    <div className="result-box" title={failEnabled ? 'Fail roll available' : 'No fail roll required'}>
                      <span className="result-value">{failLastRoll != null ? `${failLastRoll}` : ''}</span>
                    </div>
                  </div>
                </div>
              )}
              {critDto && String(critDto.crit).toUpperCase() === 'X' && (
                <div style={{ marginTop: 12, border: '1px solid #ddd', borderRadius: 8, padding: 12, background: '#FFF5EB', color: '#7a2e0c' }}>
                  <div style={{ fontWeight: 800, marginBottom: 6, textAlign: 'center' }}>Base damage</div>
                  <table className="table mods-table" style={{ width: '100%', maxWidth: 560 }}>
                    <tbody>
                      <tr><td style={{ textAlign: 'left' }}>Damage</td><td><strong style={{ color: '#7a2e0c' }}>{critDto.baseDamage ?? 0}</strong></td></tr>
                      <tr><td style={{ textAlign: 'left' }}>Bleeding (HP loss/round)</td><td><strong style={{ color: '#7a2e0c' }}>{critDto.critResultHPLossPerRound ?? 0}</strong></td></tr>
                      <tr><td style={{ textAlign: 'left' }}>Total</td><td><strong style={{ color: '#7a2e0c' }}>{critDto.fullDamage ?? 0}</strong></td></tr>
                    </tbody>
                  </table>
                </div>
              )}
              {failDto && (
                <div style={{ marginTop: 12, border: '1px solid #ddd', borderRadius: 8, padding: 12, background: '#FFF5EB', color: '#7a2e0c' }}>
                  <div style={{ fontWeight: 800, marginBottom: 6, textAlign: 'center' }}>FAIL</div>
                  <div style={{ marginBottom: 4, border: '1px solid #ddd', borderRadius: 6, padding: '6px 8px', background: '#fff', color: '#111' }}>
                    <strong>{failDto.failResultText}</strong>
                  </div>
                  <table className="table mods-table" style={{ width: '100%', maxWidth: 560 }}>
                    <tbody>
                      <tr><td style={{ textAlign: 'left' }}>Extra dmg</td><td><strong style={{ color: '#7a2e0c' }}>{(failDto as any).failResultAdditionalDamage ?? 0}</strong></td></tr>
                      <tr><td style={{ textAlign: 'left' }}>Bleeding (HP loss/round)</td><td><strong style={{ color: '#7a2e0c' }}>{(failDto as any).failResultHPLossPerRound ?? 0}</strong></td></tr>
                      <tr><td style={{ textAlign: 'left' }}>Stunned rounds</td><td><strong style={{ color: '#7a2e0c' }}>{(failDto as any).failResultStunnedForRounds ?? 0}</strong></td></tr>
                      <tr><td style={{ textAlign: 'left' }}>Penalty of actions</td><td><strong style={{ color: '#7a2e0c' }}>{(failDto as any).failResultPenaltyOfActions ?? 0}</strong></td></tr>
                      <tr><td style={{ textAlign: 'left' }}>Instant death</td><td>{(failDto as any).failResultsInstantDeath ? (<span title="Instant death" aria-label="Instant death"><svg width="16" height="16" viewBox="0 0 24 24" fill="#b91c1c" stroke="#b91c1c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2C7 2 3 6 3 11c0 3.9 2.5 7.2 6 8.4V22h6v-2.6c3.5-1.2 6-4.5 6-8.4 0-5-4-9-9-9z"/><circle cx="9" cy="11" r="1.5" fill="#fff" /><circle cx="15" cy="11" r="1.5" fill="#fff" /><path d="M9 15c1 .7 2 .7 3 .7s2 0 3-.7" fill="none" stroke="#fff" /></svg></span>) : (<span />)}</td></tr>
                    </tbody>
                  </table>
                </div>
              )}
              {critDto && String(critDto.crit).toUpperCase() !== 'X' && (
                <div style={{ marginTop: 16, border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontWeight: 800, marginBottom: 8, textAlign: 'center', fontSize: 18, background: (() => { const s = (critDto.crit || '').toString().toUpperCase(); const letter = (s.match(/[A-ET]/) || [null])[0]; switch (letter) { case 'T': return '#FFF5EB'; case 'A': return '#FFE8D5'; case 'B': return '#FFD8B0'; case 'C': return '#FFC285'; case 'D': return '#FFAA5E'; case 'E': return '#FF8A3D'; default: return '#e8eef9'; } })(), color: '#2f5597', padding: '6px 10px', borderRadius: 6 }}>
                    {critDto.crit} {labelCrit(attackerCrit as any)} Critical
                  </div>
                  <div style={{ marginBottom: 4, border: '1px solid #ddd', borderRadius: 6, padding: '6px 8px' }}>
                    <strong>{critDto.critResultText}</strong>
                  </div>
                  <table className="table mods-table" style={{ width: '100%', maxWidth: 560 }}>
                    <tbody>
                      <tr><td style={{ textAlign: 'left' }}>Extra dmg</td><td><strong>{critDto.critResultAdditionalDamage}</strong></td></tr>
                      <tr><td style={{ textAlign: 'left' }}>Bleeding (HP loss/round)</td><td><strong>{critDto.critResultHPLossPerRound}</strong></td></tr>
                      <tr><td style={{ textAlign: 'left' }}>Stunned rounds</td><td><strong>{critDto.critResultStunnedForRounds}</strong></td></tr>
                      <tr><td style={{ textAlign: 'left' }}>Penalty of actions</td><td><strong>{critDto.critResultPenaltyOfActions}</strong></td></tr>
                      <tr><td style={{ textAlign: 'left' }}>Instant death</td><td>{critDto.critResultsInstantDeath ? (<span title="Instant death" aria-label="Instant death"><svg width="16" height="16" viewBox="0 0 24 24" fill="#b91c1c" stroke="#b91c1c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2C7 2 3 6 3 11c0 3.9 2.5 7.2 6 8.4V22h6v-2.6c3.5-1.2 6-4.5 6-8.4 0-5-4-9-9-9z"/><circle cx="9" cy="11" r="1.5" fill="#fff" /><circle cx="15" cy="11" r="1.5" fill="#fff" /><path d="M9 15c1 .7 2 .7 3 .7s2 0 3-.7" fill="none" stroke="#fff" /></svg></span>) : (<span />)}</td></tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {error && (<div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}><div style={{ color: '#b91c1c', fontWeight: 700 }}>{error}</div></div>)}
    </div>
  );
}
