import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Player } from '../types';
import { isXpOverCap, formatXp } from '../utils/xp';

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

  function attacksByActivity(activity?: string): string[] {
    switch (activity) {
      case '_1PerformMagic': return ['baseMagic', 'magicBall', 'magicProjectile'];
      case '_2RangedAttack': return ['ranged'];
      case '_3PhisicalAttackOrMovement': return ['slashing', 'blunt', 'twoHanded', 'clawsAndFangs', 'grabOrBalance'];
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
    const allowedAtks = attacksByActivity(enforcedAct);
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
              window.location.reload();
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
        `}
      </style>

      <div style={{ width: '100%', overflowX: 'auto' }}>
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
                  <td>
                    <select value={mmType} onChange={(e) => setMmType(e.target.value as any)}>
                      <option value="Movement">Movement</option>
                      <option value="Maneuver">Maneuver</option>
                    </select>
                  </td>
                  <td>
                    {(() => {
                      const opts = mmType === 'Movement'
                        ? ['Movement']
                        : ['Perception', 'Tracking', 'Lockpicking', 'Disarm traps', 'Object usage', 'Runes', 'Influence', 'Stealth', 'Other'];
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
                <td colSpan={26} style={{ color: '#888' }}>Select attacker…</td>
              )}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
