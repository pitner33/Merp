import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Player } from '../types';
import { isXpOverCap, formatXp } from '../utils/xp';

type MMFailResponse = {
  failResultText?: string;
  applied?: boolean;
  failResultAdditionalDamage?: number;
  failResultHPLossPerRound?: number;
  failResultStunnedForRounds?: number;
  failResultPenaltyOfActions?: number;
  failResultPenaltyDurationRounds?: number;
  failResultsInstantDeath?: boolean;
};

export default function MM() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [playersVersion, setPlayersVersion] = useState(0);

  // Selections and resolved players
  const [attackerToken, setAttackerToken] = useState<string>('none');
  const [attacker, setAttacker] = useState<Player | null>(null);
  const [defenderToken, setDefenderToken] = useState<string>('none');
  const [defender, setDefender] = useState<Player | null>(null);

  // Controlled dropdown values for attacker and defender
  const [attackerActivity, setAttackerActivity] = useState<string | undefined>(undefined);
  const [attackerAttack, setAttackerAttack] = useState<string | undefined>(undefined);
  const [attackerCrit, setAttackerCrit] = useState<string | undefined>(undefined);
  const [attackerArmor, setAttackerArmor] = useState<string | undefined>(undefined);
  const [defenderArmor, setDefenderArmor] = useState<string | undefined>(undefined);
  const [mmType, setMmType] = useState<'Movement' | 'Maneuver'>('Movement');
  const [maneuverType, setManeuverType] = useState<string>('Movement');
  const [difficulty, setDifficulty] = useState<string>('Average');

  // Melee modifiers (copied/adapted from AdventureFightRound)
  const [mod, setMod] = useState({
    playerStunned: false,
    playerKnockedOnGround: false,
    playerLimbUnusable: false,
    specialProficiencyBonus: 0,
    modifierByGameMaster: 0,
  });

  // Per-maneuver minimal modifiers (non-Movement)
  const [maneuverMods, setManeuverMods] = useState<Record<string, {
    specialProficiencyBonus: number;
    modifierByGameMaster: number;
    lookingForSpecificInfo?: boolean;
    magicTypeDifferent?: boolean;
    knownMagicOrAbility?: boolean;
    capableSameSpell?: boolean;
    loyalFollower?: boolean;
    audienceHired?: boolean;
  }>>({});

  // Dice roll state (like AdventureFightRound)
  const [rolling, setRolling] = useState(false);
  const [tensFace, setTensFace] = useState<number>(0);
  const [onesFace, setOnesFace] = useState<number>(0);
  const [openSign, setOpenSign] = useState<0 | 1 | -1>(0);
  const [openTotal, setOpenTotal] = useState<number | null>(null);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [readyToRoll, setReadyToRoll] = useState(false);

  // MM resolve + fail flow (no Critical)
  const [mmRes, setMmRes] = useState<null | { resultText: string; usedRow?: number; usedCol?: number; row?: string[] }>(null);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failEnabled, setFailEnabled] = useState(false);
  const [failRolling, setFailRolling] = useState(false);
  const [failTensFace, setFailTensFace] = useState<number>(0);
  const [failOnesFace, setFailOnesFace] = useState<number>(0);
  const [failLastRoll, setFailLastRoll] = useState<number | null>(null);
  const [failOpenSign, setFailOpenSign] = useState<0 | 1 | -1>(0);
  const [failOpenTotal, setFailOpenTotal] = useState<number | null>(null);
  const [failText, setFailText] = useState<string | null>(null);
  const [failDto, setFailDto] = useState<MMFailResponse | null>(null);

  useEffect(() => {
    document.title = 'MM';
  }, []);

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
  function labelArmor(v?: string): string {
    const map: Record<string, string> = { none: 'None', leather: 'Leather', heavyLeather: 'Heavy Leather', chainmail: 'Chainmail', plate: 'Plate' };
    return v && map[v] ? map[v] : (v || '');
  }

  // Compute TB based on current attack type (same logic as SingleAttack)
  function computeTb(p: Player): number | undefined {
    const a = (p.attackType || 'slashing') as string;
    switch (a) {
      case 'none': return 0;
      case 'slashing':
      case 'blunt':
      case 'clawsAndFangs':
      case 'grabOrBalance': return p.tbOneHanded;
      case 'twoHanded': return p.tbTwoHanded;
      case 'ranged': return p.tbRanged;
      case 'baseMagic': return p.tbBaseMagic;
      case 'magicBall':
      case 'magicProjectile': return p.tbTargetMagic;
      default: return p.tb;
    }
  }

  // Reset MM result when a fresh open roll starts
  useEffect(() => {
    setMmRes(null);
    setFailEnabled(false);
    setFailRolling(false);
    setFailTensFace(0);
    setFailOnesFace(0);
    setFailLastRoll(null);
    setFailOpenSign(0);
    setFailOpenTotal(null);
    setFailText(null);
    setFailDto(null);
  }, [openTotal]);

  // Auto-resolve when open roll sequence is closed
  useEffect(() => {
    const run = async () => {
      if (openTotal == null) return;
      if (openSign !== 0) return;
      const used = computeLocalModifiedTotal();
      if (typeof used !== 'number') return;
      try {
        setResolving(true);
        setError(null);
        setMmRes(null);
        const params = new URLSearchParams();
        params.set('mmType', mmType);
        if (mmType === 'Maneuver') {
          params.set('maneuverType', maneuverType);
        } else {
          params.set('difficulty', difficulty);
        }
        params.set('modifiedRoll', String(used));
        const r = await fetch(`http://localhost:8081/api/mm/resolve?${params.toString()}`);
        if (!r.ok) throw new Error('MM resolve failed');
        const data = await r.json();
        setMmRes({ resultText: data?.resultText ?? '', usedRow: data?.usedRow, usedCol: data?.usedCol, row: Array.isArray(data?.row) ? data.row as string[] : undefined });
        if (mmType === 'Movement') {
          const needFail = !!data?.failRequired;
          if (needFail) {
            setFailEnabled(true);
            setFailRolling(false);
            setFailTensFace(0);
            setFailOnesFace(0);
            setFailLastRoll(null);
            setFailOpenSign(0);
            setFailOpenTotal(null);
            setFailText(null);
          } else {
            setFailEnabled(false);
          }
        } else {
          setFailEnabled(false);
          setFailRolling(false);
          setFailTensFace(0);
          setFailOnesFace(0);
          setFailLastRoll(null);
          setFailOpenSign(0);
          setFailOpenTotal(null);
          setFailText(null);
        }
      } catch (e: any) {
        setError(e?.message || 'Resolve failed');
      } finally {
        setResolving(false);
      }
    };
    run();
  }, [mmType, maneuverType, difficulty, openTotal, openSign]);

  async function refreshAttackerFromServer(playerId: number) {
    try {
      const res = await fetch(`http://localhost:8081/api/players/${playerId}`);
      if (!res.ok) return;
      const fresh = (await res.json()) as Player;
      setAttacker(fresh);
      let listUpdated = false;
      setPlayers((prev) => {
        if (!prev) return prev;
        const next = prev.map((pl) => {
          if (pl.id === fresh.id) {
            listUpdated = true;
            return fresh;
          }
          return pl;
        });
        return listUpdated ? next : prev;
      });
      if (listUpdated) setPlayersVersion((v) => v + 1);
    } catch {}
  }

  async function handleFailRollMM() {
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
      setFailTensFace(tens);
      setFailOnesFace(ones);
      setFailLastRoll(value);

      // Compute next open-ended state locally
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
      setFailOpenTotal(nextTotal);
      setFailOpenSign(nextSign);

      const sequenceClosed = nextTotal != null && nextSign === 0;
      if (sequenceClosed) {
        // Fetch fail text and apply effects
        const ft = await fetch(`http://localhost:8081/api/mm/fail-text?failRoll=${nextTotal}`);
        if (ft.ok) {
          const dto = (await ft.json()) as MMFailResponse;
          setFailText(dto?.failResultText ?? null);
        }
        const pid = attacker?.id;
        if (pid != null) {
          const ap = await fetch(`http://localhost:8081/api/mm/apply-fail?playerId=${pid}&failRoll=${nextTotal}`, { method: 'POST' });
          if (ap.ok) {
            const dto = (await ap.json()) as MMFailResponse | null;
            setFailDto(dto ?? null);
            if (dto?.failResultText) setFailText(dto.failResultText);
            await refreshAttackerFromServer(pid);
          }
        }
        setFailEnabled(false);
      }
    } catch (e: any) {
      setError(e?.message || 'Fail roll failed');
    } finally {
      window.clearInterval(localInterval);
      setFailRolling(false);
    }
  }

  function deriveActive(activity?: string, isAlive?: boolean, stunnedForRounds?: number): boolean {
    const alive = isAlive !== false;
    const stunned = (stunnedForRounds ?? 0) > 0;
    if (!alive) return false;
    if (stunned) return false;
    if (activity === '_5DoNothing' || activity === '_4PrepareMagic') return false;
    return true;
  }

  // Options and constraints
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
  const armorOptions = [
    { value: 'none', label: 'None' },
    { value: 'leather', label: 'Leather' },
    { value: 'heavyLeather', label: 'Heavy Leather' },
    { value: 'chainmail', label: 'Chainmail' },
    { value: 'plate', label: 'Plate' },
  ];

  function attacksByActivity(activity?: string, player?: Player): string[] {
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
    const all = ['_1PerformMagic', '_2RangedAttack', '_3PhisicalAttackOrMovement', '_4PrepareMagic', '_5DoNothing'];
    if (!target || target === 'none') return ['_5DoNothing', '_4PrepareMagic'];
    return all;
  }
  const critByAttack: Record<string, string[]> = {
    none: ['none'],
    slashing: ['none', 'slashing', 'bigCreaturePhisical'],
    blunt: ['none', 'blunt', 'bigCreaturePhisial'],
    twoHanded: ['none', 'slashing', 'blunt', 'piercing', 'bigCreaturePhisical'],
    dualWield: ['none', 'slashing', 'blunt', 'piercing', 'bigCreaturePhisical'],
    ranged: ['none', 'piercing', 'balance', 'crushing', 'bigCreaturePhisical'],
    clawsAndFangs: ['none', 'slashing', 'piercing', 'crushing', 'grab', 'bigCreaturePhisical'],
    grabOrBalance: ['none', 'grab', 'balance', 'crushing', 'bigCreaturePhisical'],
    baseMagic: ['none', 'heat', 'cold', 'electricity', 'balance', 'crushing', 'grab', 'bigCreatureMagic'],
    magicBall: ['none', 'heat', 'cold', 'electricity', 'bigCreatureMagic'],
    magicProjectile: ['none', 'heat', 'cold', 'electricity', 'bigCreatureMagic'],
  } as any;

  // Resolve tokens to players
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

  // Enforce dependencies when target changes
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
    setAttacker((prev) => (prev ? { ...prev, isActive: deriveActive(enforcedAct, prev.isAlive, prev.stunnedForRounds) } as Player : prev));
  }, [defenderToken]);

  // Reset maneuver type when MM type changes
  useEffect(() => {
    setManeuverType(mmType === 'Movement' ? 'Movement' : 'Other');
  }, [mmType]);

  function resetAllUI() {
    try {
      setReadyToRoll(false);
      setRolling(false);
      setTensFace(0);
      setOnesFace(0);
      setOpenSign(0);
      setOpenTotal(null);
      setLastRoll(null);
      setMmType('Movement');
      setManeuverType('Movement');
      setDifficulty('Average');
      setDefenderToken('none');
      setMod((m) => ({
        ...m,
        playerKnockedOnGround: false,
        playerLimbUnusable: false,
        specialProficiencyBonus: 0,
        modifierByGameMaster: 0,
      }));
      setManeuverMods({});
    } catch {}
  }

  // Auto-computed melee flags
  const autoDefenderStunned = !!defender?.isStunned;
  const autoAttackerHPBelow50 = !!attacker && Number(attacker.hpActual) < Number(attacker.hpMax) * 0.5;
  const autoPlayerStunned = !!attacker?.isStunned;

  // Keep auto fields synchronized
  useEffect(() => {
    setMod((m) => ({
      ...m,
      playerStunned: autoPlayerStunned,
    }));
  }, [autoPlayerStunned]);

  // Reset manual melee modifiers when attacker changes
  useEffect(() => {
    setMod((m) => ({
      ...m,
      playerKnockedOnGround: false,
      playerLimbUnusable: false,
      specialProficiencyBonus: 0,
      modifierByGameMaster: 0,
    }));
  }, [attacker?.id]);

  function movementLabel(base: string, amt: number): string {
    const sign = amt > 0 ? '+' : '';
    return `${base} (${sign}${amt})`;
  }

  function getDifficultyBonus(d: string): number {
    const s = (d || '').toLowerCase();
    switch (s) {
      case 'piece of cake': return 30;
      case 'very easy': return 20;
      case 'easy': return 10;
      case 'average': return 0;
      case 'hard': return -10;
      case 'very hard': return -20;
      case 'extremely hard': return -30;
      case 'insane': return -50;
      case 'absurd': return -70;
      default: return 0;
    }
  }

  // Compute modified total (movement modifiers only)
  function computeLocalModifiedTotal(): number | undefined {
    if (openTotal == null) return undefined;
    const a = attacker as Player | null;
    if (mmType === 'Movement') {
      const mmBonus = Number(a?.mm) || 0;
      const playerPenalty = -Math.abs(Number(a?.penaltyOfActions) || 0);
      let sum = 0;
      sum += mmBonus; // MM bonus from player attribute
      if (maneuverType === 'Stealth') {
        sum += Number((attacker as any)?.stealth) || 0; // Stealth bonus
      }
      sum += Math.floor(Number(mod.specialProficiencyBonus) || 0);
      if (mod.playerStunned) sum += -50;
      if (mod.playerKnockedOnGround) sum += -70;
      if (mod.playerLimbUnusable) sum += -30;
      sum += playerPenalty; // Player's penalty
      sum += Math.floor(Number(mod.modifierByGameMaster) || 0); // GM modifier
      return openTotal + sum;
    } else {
      const cur = maneuverMods[maneuverType] ?? { specialProficiencyBonus: 0, modifierByGameMaster: 0 };
      const includeDifficulty = !(maneuverType === 'Object usage' || maneuverType === 'Runes');
      const diff = includeDifficulty ? getDifficultyBonus(difficulty) : 0;
      let sum = diff + Math.floor(Number(cur.specialProficiencyBonus) || 0) + Math.floor(Number(cur.modifierByGameMaster) || 0);
      if (maneuverType === 'Perception' || maneuverType === 'Tracking') {
        const attrVal = maneuverType === 'Perception' ? Number((attacker as any)?.perception) || 0 : Number((attacker as any)?.tracking) || 0;
        const looking = !!cur.lookingForSpecificInfo;
        sum += attrVal + (looking ? 20 : 0);
      } else if (maneuverType === 'Lockpicking') {
        const attrVal = Number((attacker as any)?.lockPicking) || 0;
        sum += attrVal;
      } else if (maneuverType === 'Stealth') {
        const attrVal = Number((attacker as any)?.stealth) || 0;
        sum += attrVal;
      } else if (maneuverType === 'Object usage' || maneuverType === 'Runes') {
        const lvl = Number((attacker as any)?.lvl) || 0;
        const attrVal = maneuverType === 'Object usage' ? (Number((attacker as any)?.objectUsage) || 0) : (Number((attacker as any)?.runes) || 0);
        const magicTypeDiff = !!cur.magicTypeDifferent ? -30 : 0;
        const known = !!cur.knownMagicOrAbility ? 20 : -10;
        const sameSpell = !!cur.capableSameSpell ? 30 : 0;
        sum += lvl + attrVal + magicTypeDiff + known + sameSpell;
      } else if (maneuverType === 'Influence') {
        const attrVal = Number((attacker as any)?.influence) || 0;
        const loyal = !!cur.loyalFollower ? 50 : 0;
        const hired = !!cur.audienceHired ? 20 : 0;
        sum += attrVal + loyal + hired;
      }
      return openTotal + sum;
    }
  }

  async function handleRoll() {
    if (rolling) return;
    setRolling(true);
    const id = window.setInterval(() => {
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
    } catch {}
    finally {
      window.clearInterval(id);
      setRolling(false);
    }
  }

  // Width helpers for selects
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
  const activityWidthCh = maxLen(activityOptions.map((o) => o.label));
  const attackWidthCh = maxLen(attackOptions.map((o) => o.label));
  const critWidthCh = maxLen(critOptions.map((o) => o.label));
  const armorWidthCh = maxLen(armorOptions.map((o) => o.label));

  return (
    <div style={{ padding: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h1 style={{ marginTop: 0, textAlign: 'center' }}>MM</h1>
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
          onClick={() => {
            try {
              resetAllUI();
            } catch {}
          }}
          style={{ padding: '6px 12px', background: '#2f5597', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}
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
          .mods-table th, .mods-table td { padding: 4px 6px !important; font-size: 12px; }
          .dice-wrap { display: flex; align-items: center; justify-content: center; gap: 16px; margin: 10px 0 18px; }
          .die { width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 24px; color: #fff; border-radius: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.25); user-select: none; }
          .die.tens { background: #e95f3dff; }
          .die.ones { background: #a8e733ff; }
          .die.rolling { animation: dice-bounce 300ms infinite alternate ease-in-out; }
          @keyframes dice-bounce { from { transform: translateY(0) rotate(0deg); } to { transform: translateY(-4px) rotate(6deg); } }
          .result { font-weight: 800; font-size: 22px; }
          .result-box { display: inline-flex; align-items: center; justify-content: center; width: 120px; height: 120px; border: 1px solid #ddd; border-radius: 8px; background: #f9fafb; padding: 0; }
          .result-box.orange { background: #fed7aa; border-color: #e67e22; }
          .result-label { display: block; width: 120px; text-align: center; font-size: 14px; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: .4px; line-height: 1; align-self: center; white-space: nowrap; }
          .result-value { font-size: 48px; font-weight: 900; color: #111; line-height: 1; }
          .result-col { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; width: 120px; }
        `}
      </style>

      <div style={{ width: '100%', overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th rowSpan={2}>Player</th>
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
              <th rowSpan={2}>Stunned rounds</th>
              <th rowSpan={2}>HP loss/round</th>
              <th rowSpan={2}>MM type</th>
              <th rowSpan={2}>Maneuver type</th>
              <th rowSpan={2}>Difficulty</th>
              <th rowSpan={2}>Penalty</th>
              <th rowSpan={2}>MM</th>
              <th rowSpan={2}>AGI Bonus</th>
              <th rowSpan={2}>Perception</th>
              <th rowSpan={2}>Tracking</th>
              <th rowSpan={2}>Lockpicking</th>
              <th rowSpan={2}>Disarm Traps</th>
              <th rowSpan={2}>Object Usage</th>
              <th rowSpan={2}>Runes</th>
              <th rowSpan={2}>Influence</th>
              <th rowSpan={2}>Stealth</th>
            </tr>
            
          </thead>
          <tbody>
            {/* Attacker row only */}
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
                  <td className="right">{attacker.stunnedForRounds ?? 0}</td>
                  <td className="right">{attacker.hpLossPerRound ?? 0}</td>
                  <td>
                    <select value={mmType} onChange={(e) => setMmType(e.target.value as any)}>
                      <option value="Movement">Movement</option>
                      <option value="Maneuver">Maneuver</option>
                    </select>
                  </td>
                  <td>
                    {(() => {
                      const opts = mmType === 'Movement'
                        ? ['Movement', 'Stealth']
                        : ['Perception', 'Tracking', 'Lockpicking', 'Disarm traps', 'Object usage', 'Runes', 'Influence', 'Other'];
                      const value = opts.includes(maneuverType) ? maneuverType : opts[0];
                      return (
                        <select value={value} onChange={(e) => setManeuverType(e.target.value)}>
                          {opts.map((o) => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      );
                    })()}
                  </td>
                  <td>
                    <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                      <option value="Piece of cake">Piece of cake</option>
                      <option value="Very easy">Very easy</option>
                      <option value="Easy">Easy</option>
                      <option value="Average">Average</option>
                      <option value="Hard">Hard</option>
                      <option value="Very Hard">Very Hard</option>
                      <option value="Extremely hard">Extremely hard</option>
                      <option value="Insane">Insane</option>
                      <option value="Absurd">Absurd</option>
                    </select>
                  </td>
                  
                  <td className="right">{attacker.penaltyOfActions}</td>
                  <td className="right">{attacker.mm}</td>
                  <td className="right">{attacker.agilityBonus}</td>
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
                <td colSpan={28} style={{ color: '#888' }}>Select attacker…</td>
              )}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Modifiers + Dice panel row */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 20,
          alignItems: 'flex-start',
          justifyContent: 'center',
          width: 'fit-content',
          maxWidth: '100%',
          overflowX: 'auto',
          margin: '20px auto 0',
        }}
      >
        {(() => {
          const movementDisabled = false;
          if (mmType === 'Movement') {
            return (
              <div style={{ display: 'block', verticalAlign: 'top', flex: '0 0 700px', width: 700, minWidth: 700, maxWidth: 700, marginBottom: 8 }}>
                <h2 style={{ margin: '0 0 6px 0', fontSize: 16 }}>{maneuverType === 'Stealth' ? 'Stealth Modifiers' : 'Movement Modifiers'}</h2>
                <table className="table mods-table" style={{ width: 700, tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '75%' }} />
                    <col style={{ width: '25%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>{maneuverType === 'Stealth' ? 'Stealth Modifier' : 'Movement Modifier'}</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{movementLabel('MM bonus (from player attribute)', Number(attacker?.mm) || 0)}</td>
                      <td>
                        <input type="number" value={Number(attacker?.mm) || 0} disabled aria-label="MM bonus (from player)" style={{ width: 80, textAlign: 'right' }} />
                      </td>
                    </tr>
                    {maneuverType === 'Stealth' && (
                      <tr>
                        <td>{movementLabel('Stealth bonus (from player attribute)', Number((attacker as any)?.stealth) || 0)}</td>
                        <td>
                          <input type="number" value={Number((attacker as any)?.stealth) || 0} disabled aria-label="Stealth bonus (from player)" style={{ width: 80, textAlign: 'right' }} />
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td>{movementLabel('Special proficiency bonus', Number(mod.specialProficiencyBonus) || 0)}</td>
                      <td>
                        <input
                          type="number"
                          value={mod.specialProficiencyBonus}
                          onChange={(e) => {
                            const v = Math.floor(Number(e.target.value) || 0);
                            setMod((m) => ({ ...m, specialProficiencyBonus: v }));
                          }}
                          style={{ width: 80, textAlign: 'right' }}
                          disabled={movementDisabled}
                        />
                      </td>
                    </tr>
                    <tr>
                      <td>{movementLabel('Player stunned (auto)', -50)}</td>
                      <td><input type="checkbox" checked={mod.playerStunned} disabled aria-label="Player stunned (auto)" /></td>
                    </tr>
                    <tr>
                      <td>{movementLabel('Player knocked on the ground', -70)}</td>
                      <td><input type="checkbox" checked={mod.playerKnockedOnGround} disabled={movementDisabled} onChange={(e) => setMod((m) => ({ ...m, playerKnockedOnGround: e.target.checked }))} /></td>
                    </tr>
                    <tr>
                      <td>{movementLabel('Any limb of the player is unusable', -30)}</td>
                      <td><input type="checkbox" checked={mod.playerLimbUnusable} disabled={movementDisabled} onChange={(e) => setMod((m) => ({ ...m, playerLimbUnusable: e.target.checked }))} /></td>
                    </tr>
                    <tr>
                      <td>{movementLabel("Player's penalty (from Penalty)", -Math.abs(Number(attacker?.penaltyOfActions) || 0))}</td>
                      <td>
                        <input type="number" value={-Math.abs(Number(attacker?.penaltyOfActions) || 0)} disabled aria-label="Player's penalty (from Penalty)" style={{ width: 80, textAlign: 'right' }} />
                      </td>
                    </tr>
                    <tr>
                      <td>GM modifier</td>
                      <td>
                        <input
                          type="number"
                          value={mod.modifierByGameMaster}
                          onChange={(e) => {
                            const v = Math.floor(Number(e.target.value) || 0);
                            setMod((m) => ({ ...m, modifierByGameMaster: v }));
                          }}
                          style={{ width: 80, textAlign: 'right' }}
                          disabled={movementDisabled}
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          }

          const cur = maneuverMods[maneuverType] ?? { specialProficiencyBonus: 0, modifierByGameMaster: 0 };
          const includeDifficulty = !(maneuverType === 'Object usage' || maneuverType === 'Runes');
          const diff = includeDifficulty ? getDifficultyBonus(difficulty) : 0;
          return (
            <div style={{ display: 'block', verticalAlign: 'top', flex: '0 0 700px', width: 700, minWidth: 700, maxWidth: 700, marginBottom: 8 }}>
              <h2 style={{ margin: '0 0 6px 0', fontSize: 16 }}>{maneuverType} Modifiers</h2>
              <table className="table mods-table" style={{ width: 700, tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '75%' }} />
                  <col style={{ width: '25%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>{maneuverType} Modifier</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {includeDifficulty && (
                    <tr>
                      <td>Difficulty</td>
                      <td>
                        <input type="number" value={diff} disabled aria-label="Difficulty bonus" style={{ width: 80, textAlign: 'right' }} />
                      </td>
                    </tr>
                  )}
                  {(maneuverType === 'Perception' || maneuverType === 'Tracking') && (
                    <>
                      <tr>
                        <td>{maneuverType} bonus (from player attribute)</td>
                        <td>
                          <input type="number" value={maneuverType === 'Perception' ? (Number((attacker as any)?.perception) || 0) : (Number((attacker as any)?.tracking) || 0)} disabled aria-label={`${maneuverType} bonus (from player)`} style={{ width: 80, textAlign: 'right' }} />
                        </td>
                      </tr>
                      <tr>
                        <td>Player is looking for specific information (+20)</td>
                        <td>
                          <input
                            type="checkbox"
                            checked={!!cur.lookingForSpecificInfo}
                            onChange={(e) => {
                              const v = e.target.checked;
                              setManeuverMods((prev) => ({
                                ...prev,
                                [maneuverType]: { ...(prev[maneuverType] ?? { specialProficiencyBonus: 0, modifierByGameMaster: 0 }), lookingForSpecificInfo: v },
                              }));
                            }}
                          />
                        </td>
                      </tr>
                    </>
                  )}
                  {(maneuverType === 'Lockpicking' || maneuverType === 'Disarm traps') && (
                    <>
                      <tr>
                        <td>{maneuverType} bonus (from player attribute)</td>
                        <td>
                          <input
                            type="number"
                            value={maneuverType === 'Lockpicking' ? (Number((attacker as any)?.lockPicking) || 0) : (Number((attacker as any)?.disarmTraps) || 0)}
                            disabled
                            aria-label={`${maneuverType} bonus (from player)`}
                            style={{ width: 80, textAlign: 'right' }}
                          />
                        </td>
                      </tr>
                    </>
                  )}
                  {maneuverType === 'Influence' && (
                    <>
                      <tr>
                        <td>Influence bonus (from player attribute)</td>
                        <td>
                          <input
                            type="number"
                            value={Number((attacker as any)?.influence) || 0}
                            disabled
                            aria-label="Influence bonus (from player)"
                            style={{ width: 80, textAlign: 'right' }}
                          />
                        </td>
                      </tr>
                      <tr>
                        <td>Audience is loyal follower / fan of player (+50)</td>
                        <td>
                          <input
                            type="checkbox"
                            checked={!!cur.loyalFollower}
                            onChange={(e) => {
                              const v = e.target.checked;
                              setManeuverMods((prev) => ({
                                ...prev,
                                [maneuverType]: { ...(prev[maneuverType] ?? { specialProficiencyBonus: 0, modifierByGameMaster: 0 }), loyalFollower: v },
                              }));
                            }}
                          />
                        </td>
                      </tr>
                      <tr>
                        <td>Audience is hired (+20)</td>
                        <td>
                          <input
                            type="checkbox"
                            checked={!!cur.audienceHired}
                            onChange={(e) => {
                              const v = e.target.checked;
                              setManeuverMods((prev) => ({
                                ...prev,
                                [maneuverType]: { ...(prev[maneuverType] ?? { specialProficiencyBonus: 0, modifierByGameMaster: 0 }), audienceHired: v },
                              }));
                            }}
                          />
                        </td>
                      </tr>
                    </>
                  )}
                  {(maneuverType === 'Object usage' || maneuverType === 'Runes') && (
                    <>
                      <tr>
                        <td>Level (from player)</td>
                        <td>
                          <input type="number" value={Number((attacker as any)?.lvl) || 0} disabled aria-label="Level (from player)" style={{ width: 80, textAlign: 'right' }} />
                        </td>
                      </tr>
                      <tr>
                        <td>{maneuverType} bonus (from player attribute)</td>
                        <td>
                          <input
                            type="number"
                            value={maneuverType === 'Object usage' ? (Number((attacker as any)?.objectUsage) || 0) : (Number((attacker as any)?.runes) || 0)}
                            disabled
                            aria-label={`${maneuverType} bonus (from player)`}
                            style={{ width: 80, textAlign: 'right' }}
                          />
                        </td>
                      </tr>
                      <tr>
                        <td>Magic type is different from mage's magic type (-30)</td>
                        <td>
                          <input
                            type="checkbox"
                            checked={!!cur.magicTypeDifferent}
                            onChange={(e) => {
                              const v = e.target.checked;
                              setManeuverMods((prev) => ({
                                ...prev,
                                [maneuverType]: { ...(prev[maneuverType] ?? { specialProficiencyBonus: 0, modifierByGameMaster: 0 }), magicTypeDifferent: v },
                              }));
                            }}
                          />
                        </td>
                      </tr>
                      <tr>
                        <td>Known magic or ability (+20 / -10)</td>
                        <td>
                          <input
                            type="checkbox"
                            checked={!!cur.knownMagicOrAbility}
                            onChange={(e) => {
                              const v = e.target.checked;
                              setManeuverMods((prev) => ({
                                ...prev,
                                [maneuverType]: { ...(prev[maneuverType] ?? { specialProficiencyBonus: 0, modifierByGameMaster: 0 }), knownMagicOrAbility: v },
                              }));
                            }}
                          />
                        </td>
                      </tr>
                      <tr>
                        <td>Player is capable to perform the same spell (+30)</td>
                        <td>
                          <input
                            type="checkbox"
                            checked={!!cur.capableSameSpell}
                            onChange={(e) => {
                              const v = e.target.checked;
                              setManeuverMods((prev) => ({
                                ...prev,
                                [maneuverType]: { ...(prev[maneuverType] ?? { specialProficiencyBonus: 0, modifierByGameMaster: 0 }), capableSameSpell: v },
                              }));
                            }}
                          />
                        </td>
                      </tr>
                    </>
                  )}
                  {(maneuverType === 'Stealth') && (
                    <>
                      <tr>
                        <td>Stealth bonus (from player attribute)</td>
                        <td>
                          <input
                            type="number"
                            value={Number((attacker as any)?.stealth) || 0}
                            disabled
                            aria-label="Stealth bonus (from player)"
                            style={{ width: 80, textAlign: 'right' }}
                          />
                        </td>
                      </tr>
                    </>
                  )}
                  <tr>
                    <td>Special proficiency bonus</td>
                    <td>
                      <input
                        type="number"
                        value={cur.specialProficiencyBonus}
                        onChange={(e) => {
                          const v = Math.floor(Number(e.target.value) || 0);
                          setManeuverMods((prev) => ({ ...prev, [maneuverType]: { ...(prev[maneuverType] ?? { specialProficiencyBonus: 0, modifierByGameMaster: 0 }), specialProficiencyBonus: v } }));
                        }}
                        style={{ width: 80, textAlign: 'right' }}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td>GM modifier</td>
                    <td>
                      <input
                        type="number"
                        value={cur.modifierByGameMaster}
                        onChange={(e) => {
                          const v = Math.floor(Number(e.target.value) || 0);
                          setManeuverMods((prev) => ({ ...prev, [maneuverType]: { ...(prev[maneuverType] ?? { specialProficiencyBonus: 0, modifierByGameMaster: 0 }), modifierByGameMaster: v } }));
                        }}
                        style={{ width: 80, textAlign: 'right' }}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })()}

        {(() => {
          const openStarted = openTotal != null && openSign !== 0;
          const firstOpenAwaitingReroll = openStarted && (lastRoll == null || lastRoll === openTotal);
          const canRollNow = openTotal == null ? true : openSign === 0 ? false : (firstOpenAwaitingReroll || (lastRoll != null && lastRoll >= 96));
          const disabled = rolling || !canRollNow;
          const showGate = !readyToRoll && openTotal == null;
          const usedTotal = computeLocalModifiedTotal();
          return (
            <div style={{ display: 'block', verticalAlign: 'top', flex: '0 0 500px', width: 500, minWidth: 500, maxWidth: 500, marginTop: 30, marginBottom: 4, padding: 10, border: '1px solid #ddd', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 8 }}>
                {showGate ? (
                  <button
                    type="button"
                    onClick={() => setReadyToRoll(true)}
                    style={{ background: '#f4a261', color: '#000', width: 75, height: 75, borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12, letterSpacing: 0.5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', lineHeight: 1.1 }}
                  >
                    All modifiers set
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleRoll}
                    disabled={disabled}
                    style={{ background: disabled ? '#888' : '#0a7d2f', color: '#ffffff', width: 75, height: 75, borderRadius: 10, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 12, letterSpacing: 0.5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', lineHeight: 1.1 }}
                  >
                    ROLL
                  </button>
                )}
              </div>
              <div className="dice-wrap">
                <div className={`die tens${rolling ? ' rolling' : ''}`} aria-label="tens-die">{tensFace}</div>
                <div className={`die ones${rolling ? ' rolling' : ''}`} aria-label="ones-die">{onesFace}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <span className="result-label">OPEN ROLL</span>
                  <div className="result-box"><span className="result-value">{openTotal != null ? openTotal : ''}</span></div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <span className="result-label">MODIFIED ROLL</span>
                  <div className="result-box orange"><span className="result-value">{openTotal != null ? (usedTotal ?? '') : ''}</span></div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '0 0 180px', width: 180 }}>
                  <span className="result-label" style={{ width: '100%' }}>MODIFIERS</span>
                  {(() => {
                    if (mmType === 'Movement') {
                      const a = attacker as Player | null;
                      const mmBonus = Number(a?.mm) || 0;
                      const specProf = Math.floor(Number(mod.specialProficiencyBonus) || 0);
                      const stealthBonus = maneuverType === 'Stealth' ? (Number((attacker as any)?.stealth) || 0) : 0;
                      const stunned = mod.playerStunned ? -50 : 0;
                      const knocked = mod.playerKnockedOnGround ? -70 : 0;
                      const limb = mod.playerLimbUnusable ? -30 : 0;
                      const playerPenalty = -Math.abs(Number(a?.penaltyOfActions) || 0);
                      const gm = Math.floor(Number(mod.modifierByGameMaster) || 0);
                      const items = [
                        { label: 'MM bonus', val: mmBonus },
                        ...(maneuverType === 'Stealth' ? [{ label: 'Stealth bonus', val: stealthBonus }] : []),
                        { label: 'Special proficiency', val: specProf },
                        { label: 'Player stunned', val: stunned },
                        { label: 'Knocked on ground', val: knocked },
                        { label: 'Limb unusable', val: limb },
                        { label: "Player's penalty", val: playerPenalty },
                        { label: 'GM modifier', val: gm },
                      ];
                      const modifiersTotal = mmBonus + stealthBonus + specProf + stunned + knocked + limb + playerPenalty + gm;
                      return (
                        <div style={{ border: '1px solid #555', borderRadius: 8, padding: 4, minWidth: 0, width: 'auto', height: 120, color: '#555', overflow: 'hidden', whiteSpace: 'normal' }}>
                          {items.map((p) => (
                            <div key={p.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11, lineHeight: 1.1 }}>
                              <span style={{ color: '#555' }}>{p.label}</span>
                              <strong style={{ color: '#555', fontWeight: 700 }}>{p.val}</strong>
                            </div>
                          ))}
                          <div style={{ height: 1, background: '#555', margin: '2px 0' }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11, lineHeight: 1.1 }}>
                            <span style={{ fontWeight: 700, color: '#555' }}>Modifiers total</span>
                            <span style={{ fontWeight: 900, color: '#555' }}>{modifiersTotal}</span>
                          </div>
                        </div>
                      );
                    } else {
                      const cur = maneuverMods[maneuverType] ?? { specialProficiencyBonus: 0, modifierByGameMaster: 0 };
                      const includeDifficulty = !(maneuverType === 'Object usage' || maneuverType === 'Runes');
                      const diff = includeDifficulty ? getDifficultyBonus(difficulty) : 0;
                      const specProf = Math.floor(Number(cur.specialProficiencyBonus) || 0);
                      const gm = Math.floor(Number(cur.modifierByGameMaster) || 0);
                      let items: { label: string; val: number }[] = [
                        ...(includeDifficulty ? [{ label: 'Difficulty', val: diff } as const] : []),
                        { label: 'Special proficiency', val: specProf },
                        { label: 'GM modifier', val: gm },
                      ];
                      let modifiersTotal = (includeDifficulty ? diff : 0) + specProf + gm;
                      if (maneuverType === 'Perception' || maneuverType === 'Tracking') {
                        const attrVal = maneuverType === 'Perception' ? (Number((attacker as any)?.perception) || 0) : (Number((attacker as any)?.tracking) || 0);
                        const looking = !!cur.lookingForSpecificInfo;
                        items = [
                          ...(includeDifficulty ? [{ label: 'Difficulty', val: diff } as const] : []),
                          { label: `${maneuverType} bonus`, val: attrVal },
                          { label: 'Looking for specific info', val: looking ? 20 : 0 },
                          { label: 'Special proficiency', val: specProf },
                          { label: 'GM modifier', val: gm },
                        ];
                        modifiersTotal = (includeDifficulty ? diff : 0) + attrVal + (looking ? 20 : 0) + specProf + gm;
                      } else if (maneuverType === 'Lockpicking' || maneuverType === 'Disarm traps') {
                        const attrVal = maneuverType === 'Lockpicking' ? (Number((attacker as any)?.lockPicking) || 0) : (Number((attacker as any)?.disarmTraps) || 0);
                        items = [
                          ...(includeDifficulty ? [{ label: 'Difficulty', val: diff } as const] : []),
                          { label: `${maneuverType} bonus`, val: attrVal },
                          { label: 'Special proficiency', val: specProf },
                          { label: 'GM modifier', val: gm },
                        ];
                        modifiersTotal = (includeDifficulty ? diff : 0) + attrVal + specProf + gm;
                      } else if (maneuverType === 'Stealth') {
                        const attrVal = Number((attacker as any)?.stealth) || 0;
                        items = [
                          ...(includeDifficulty ? [{ label: 'Difficulty', val: diff } as const] : []),
                          { label: 'Stealth bonus', val: attrVal },
                          { label: 'Special proficiency', val: specProf },
                          { label: 'GM modifier', val: gm },
                        ];
                        modifiersTotal = (includeDifficulty ? diff : 0) + attrVal + specProf + gm;
                      } else if (maneuverType === 'Influence') {
                        const attrVal = Number((attacker as any)?.influence) || 0;
                        const loyal = !!cur.loyalFollower ? 50 : 0;
                        const hired = !!cur.audienceHired ? 20 : 0;
                        items = [
                          ...(includeDifficulty ? [{ label: 'Difficulty', val: diff } as const] : []),
                          { label: 'Influence bonus', val: attrVal },
                          { label: 'Audience loyal/fan', val: loyal },
                          { label: 'Audience hired', val: hired },
                          { label: 'Special proficiency', val: specProf },
                          { label: 'GM modifier', val: gm },
                        ];
                        modifiersTotal = (includeDifficulty ? diff : 0) + attrVal + loyal + hired + specProf + gm;
                      } else if (maneuverType === 'Object usage' || maneuverType === 'Runes') {
                        const lvl = Number((attacker as any)?.lvl) || 0;
                        const attrVal = maneuverType === 'Object usage' ? (Number((attacker as any)?.objectUsage) || 0) : (Number((attacker as any)?.runes) || 0);
                        const magicTypeDiff = !!cur.magicTypeDifferent ? -30 : 0;
                        const known = !!cur.knownMagicOrAbility ? 20 : -10;
                        const sameSpell = !!cur.capableSameSpell ? 30 : 0;
                        items = [
                          { label: 'Level', val: lvl },
                          { label: `${maneuverType} bonus`, val: attrVal },
                          { label: "Magic type different", val: magicTypeDiff },
                          { label: 'Known magic/ability', val: known },
                          { label: 'Capable same spell', val: sameSpell },
                          { label: 'Special proficiency', val: specProf },
                          { label: 'GM modifier', val: gm },
                        ];
                        modifiersTotal = lvl + attrVal + magicTypeDiff + known + sameSpell + specProf + gm;
                      }
                      return (
                        <div style={{ border: '1px solid #555', borderRadius: 8, padding: 4, minWidth: 0, width: 'auto', height: 120, color: '#555', overflow: 'hidden', whiteSpace: 'normal' }}>
                          {items.map((p) => (
                            <div key={p.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11, lineHeight: 1.1 }}>
                              <span style={{ color: '#555' }}>{p.label}</span>
                              <strong style={{ color: '#555', fontWeight: 700 }}>{p.val}</strong>
                            </div>
                          ))}
                          <div style={{ height: 1, background: '#555', margin: '2px 0' }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11, lineHeight: 1.1 }}>
                            <span style={{ fontWeight: 700, color: '#555' }}>Modifiers total</span>
                            <span style={{ fontWeight: 900, color: '#555' }}>{modifiersTotal}</span>
                          </div>
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>

              
            </div>
            
          );
        })()}
      </div>
      {/* MM result + Fail area container (same style as L804) */}
      <div
        className="mmresultcontainer"
        style={{
          display: 'flex',
          flexWrap: 'nowrap',
          gap: 20,
          alignItems: 'center',
          justifyContent: 'center',
          width: 'fit-content',
          maxWidth: '100%',
          overflowX: 'auto',
          margin: '18px auto 0',
          border: '1px solid #b0b0b0',
          borderRadius: 10,
          padding: 12,
          boxSizing: 'border-box',
        }}
      >
        {mmType === 'Maneuver' ? (
          (() => {
            const usedTotalVal = computeLocalModifiedTotal();
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: '1 1 0', minWidth: 360 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
                  <div className="result-col" style={{ alignItems: 'center', width: 'auto' }}>
                    <span className="result-label">Modified roll</span>
                    <div className="result-box orange">
                      <span className="result-value">{openTotal != null ? (usedTotalVal ?? '') : ''}</span>
                    </div>
                  </div>
                  <textarea
                    readOnly
                    placeholder="Result will appear here…"
                    value={mmRes?.resultText ?? ''}
                    style={{ width: 560, height: 96, padding: 12, fontSize: 16, fontWeight: 600, lineHeight: 1.4, border: '1px solid #d1d5db', borderRadius: 8, background: '#f9fafb', color: '#111', resize: 'none' }}
                  />
                  {resolving && (
                    <span style={{ fontSize: 14, color: '#6b7280', fontStyle: 'italic' }}>Resolving…</span>
                  )}
                </div>
              </div>
            );
          })()
        ) : (
          <>
            {(() => {
              const usedTotalVal = computeLocalModifiedTotal();
              return (
                <div style={{ marginTop: 16, border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
                    <div className="result-col">
                      <span className="result-label">Modified roll</span>
                      <div className="result-box orange">
                        <span className="result-value">{openTotal != null ? (usedTotalVal ?? '') : ''}</span>
                      </div>
                    </div>
                    <div className="result-col" style={{ alignItems: 'center', width: 'auto' }}>
                      <span className="result-label" style={{ textAlign: 'center' }}>MM result</span>
                      <div className="result-box">
                        <span className="result-value">{mmRes?.resultText || ''}</span>
                      </div>
                    </div>
                  </div>
                  {mmType === 'Movement' && mmRes?.row && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}></div>
                      <table className="table" style={{ maxWidth: 560, tableLayout: 'fixed', width: 560 }}>
                        <colgroup>
                          <col style={{ width: '11.11%' }} />
                          <col style={{ width: '11.11%' }} />
                          <col style={{ width: '11.11%' }} />
                          <col style={{ width: '11.11%' }} />
                          <col style={{ width: '11.11%' }} />
                          <col style={{ width: '11.11%' }} />
                          <col style={{ width: '11.11%' }} />
                          <col style={{ width: '11.11%' }} />
                          <col style={{ width: '11.11%' }} />
                        </colgroup>
                        <thead>
                          <tr>
                            <th>Piece</th>
                            <th>Very easy</th>
                            <th>Easy</th>
                            <th>Average</th>
                            <th>Hard</th>
                            <th>Very Hard</th>
                            <th>Extremely</th>
                            <th>Insane</th>
                            <th>Absurd</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            {(mmRes.row || []).slice(0, 9).map((val, idx) => (
                              <td key={idx} style={{ fontWeight: idx + 1 === (mmRes?.usedCol || 0) ? 900 : 600, background: idx + 1 === (mmRes?.usedCol || 0) ? '#d1fae5' : undefined, color: '#111' }}>{val ?? ''}</td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })()}

            {mmType === 'Movement' && (failEnabled || failText || failDto) && (
              <div style={{ marginTop: 16, border: '1px solid #ddd', borderRadius: 8, padding: 12, minWidth: 220 }}>
                <div className="result-col" style={{ alignItems: 'center', width: 'auto' }}>
                  <button
                    type="button"
                    onClick={handleFailRollMM}
                    disabled={!failEnabled || failRolling}
                    style={{ marginTop: 6, background: failEnabled ? '#16a34a' : '#9ca3af', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 8px', cursor: (!failEnabled || failRolling) ? 'not-allowed' : 'pointer', fontWeight: 600 }}
                  >
                    {failRolling ? 'Rolling…' : 'Roll Fail'}
                  </button>
                  <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div className={`die tens${failRolling ? ' rolling' : ''}`} aria-label="fail-tens">{failTensFace}</div>
                    <div className={`die ones${failRolling ? ' rolling' : ''}`} aria-label="fail-ones">{failOnesFace}</div>
                  </div>
                  <span className="result-label" style={{ textAlign: 'center' }}>Fail roll</span>
                  <div className="result-box" title={failEnabled ? 'Fail roll available' : 'No fail required'}>
                    <span className="result-value">{failLastRoll != null ? `${failLastRoll}` : ''}</span>
                  </div>
                </div>
              </div>
            )}

            {mmType === 'Movement' && (failEnabled || failText || failDto) && (
              <div style={{ marginTop: 16, border: '1px solid #ddd', borderRadius: 8, padding: 12, background: failDto ? '#FFF5EB' : '#f9fafb', color: failDto ? '#7a2e0c' : '#555', maxWidth: 560 }}>
                {failDto || failText ? (
                  <>
                    <div style={{ fontWeight: 800, marginBottom: 6, textAlign: 'center' }}>FAIL</div>
                    <div style={{ marginBottom: 4, border: '1px solid #ddd', borderRadius: 6, padding: '6px 8px', background: '#fff', color: '#111' }}>
                      <strong>{failDto?.failResultText ?? failText ?? ''}</strong>
                    </div>
                    <table className="table mods-table" style={{ width: '100%', maxWidth: 560 }}>
                      <tbody>
                        <tr>
                          <td style={{ textAlign: 'left' }}>Extra dmg</td>
                          <td><strong style={{ color: failDto ? '#7a2e0c' : '#555' }}>{failDto?.failResultAdditionalDamage ?? 0}</strong></td>
                        </tr>
                        <tr>
                          <td style={{ textAlign: 'left' }}>Bleeding (HP loss/round)</td>
                          <td><strong style={{ color: failDto ? '#7a2e0c' : '#555' }}>{failDto?.failResultHPLossPerRound ?? 0}</strong></td>
                        </tr>
                        <tr>
                          <td style={{ textAlign: 'left' }}>Stunned rounds</td>
                          <td><strong style={{ color: failDto ? '#7a2e0c' : '#555' }}>{failDto?.failResultStunnedForRounds ?? 0}</strong></td>
                        </tr>
                        <tr>
                          <td style={{ textAlign: 'left' }}>Penalty of actions</td>
                          <td>
                            <strong style={{ color: failDto ? '#7a2e0c' : '#555' }}>
                              {(() => {
                                const val = failDto?.failResultPenaltyOfActions ?? 0;
                                const dur = failDto?.failResultPenaltyDurationRounds ?? 0;
                                return dur > 0 ? `${val} (${dur}r)` : `${val}`;
                              })()}
                            </strong>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ textAlign: 'left' }}>Instant death</td>
                          <td>
                            {failDto?.failResultsInstantDeath ? (
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
                  </>
                ) : (
                  <div style={{ textAlign: 'center', fontStyle: 'italic', color: '#777' }}>Awaiting fail result…</div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
