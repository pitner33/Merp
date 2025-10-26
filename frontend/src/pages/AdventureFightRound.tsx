import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
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
  const [readyToRoll, setReadyToRoll] = useState(false);

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

  // Ranged/Magic modifiers state
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

  // Auto-computed modifiers
  const autoDefenderStunned = !!defender?.isStunned;
  const autoAttackerHPBelow50 = !!attacker && Number(attacker.hpActual) < Number(attacker.hpMax) * 0.5;

  // Keep auto fields synchronized
  useEffect(() => {
    setMod((m) => ({
      ...m,
      defenderStunned: autoDefenderStunned,
      attackerHPBelow50Percent: autoAttackerHPBelow50,
    }));
  }, [autoDefenderStunned, autoAttackerHPBelow50]);

  // Reset manual modifiers when pair changes
  useEffect(() => {
    setMod((m) => ({
      ...m,
      attackFromWeakSide: false,
      attackFromBehind: false,
      defenderSurprised: false,
      attackerWeaponChange: false,
      attackerTargetChange: false,
      attackerMoreThan3MetersMovement: false,
      modifierByGameMaster: 0,
    }));
    setRm({
      distanceOfAttack: '_3_15m',
      prepareRounds: 0,
      coverPenalty: 0,
      shieldInLoS: true,
      inMiddleOfMagicBall: false,
      targetAware: false,
      targetNotMoving: false,
      baseMageType: 'lenyeg',
      mdBonus: false,
      agreeingTarget: false,
      gmModifier: 0,
    });
    setReadyToRoll(false);
  }, [attacker?.id, defender?.id]);

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

  function meleeLabel(base: string, active: boolean, amt: number): string {
    const sign = amt > 0 ? '+' : '';
    return `${base} (${sign}${amt})`;
  }

  useEffect(() => {
    resetRollState();
  }, []);

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
          .result-box.orange { background: #fed7aa; border-color: #e67e22; }
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
              <th rowSpan={2}>Role</th>
              <th rowSpan={2}>ID</th>
              <th rowSpan={2}>Name</th>
              <th rowSpan={2}>Target</th>
              <th rowSpan={2}>max HP</th>
              <th rowSpan={2}>HP</th>
              <th rowSpan={2}>Alive</th>
              <th rowSpan={2}>Active</th>
              <th rowSpan={2}>Stunned</th>
              <th rowSpan={2}>Activity</th>
              <th rowSpan={2}>Attack</th>
              <th rowSpan={2}>Crit</th>
              <th rowSpan={2}>Armor</th>
              <th rowSpan={2}>TB</th>
              <th rowSpan={2}>TB for Defense</th>
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
              <th rowSpan={2}>Gender</th>
              <th rowSpan={2}>Race</th>
              <th rowSpan={2}>Class</th>
              <th rowSpan={2}>lvl</th>
              <th rowSpan={2}>XP</th>
            </tr>
            <tr>
              <th>Lenyeg</th>
              <th>Kapcsolat</th>
            </tr>
          </thead>
          <tbody>
            {[{ role: 'Attacker', p: attacker }, { role: 'Defender', p: defender }].map(({ role, p }) => (
              <tr key={role}>
                <td>{role}</td>
                <td>{p?.characterId}</td>
                <td>{p?.name}</td>
                <td>{p?.target}</td>
                <td className="right">{p?.hpMax}</td>
                <td style={p ? hpStyle(p) : undefined} title={p ? hpTitle(p) : undefined}>
                  <div>{p?.hpActual}</div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{p ? hpTitle(p) : ''}</div>
                </td>
                <td>
                  {p?.isAlive ? (
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
                  {p?.isActive ? (
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
                  {p?.isStunned ? (
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
                <td>{labelActivity(p?.playerActivity as any)}</td>
                <td>{labelAttack(p?.attackType as any)}</td>
                <td>{labelCrit(p?.critType as any)}</td>
                <td>{labelArmor(p?.armorType as any)}</td>
                <td className="right">{p ? computeTb(p) : ''}</td>
                <td className="right">{p?.tbUsedForDefense}</td>
                <td className="right">{p?.vb}</td>
                <td>
                  {p?.shield ? (
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
                <td className="right">{p?.stunnedForRounds}</td>
                <td className="right">{p?.penaltyOfActions}</td>
                <td className="right">{p?.hpLossPerRound}</td>
                <td className="right">{p?.mm}</td>
                <td className="right">{p?.agilityBonus}</td>
                <td className="right">{p?.mdLenyeg}</td>
                <td className="right">{p?.mdKapcsolat}</td>
                <td className="right">{p?.perception}</td>
                <td className="right">{p?.tracking}</td>
                <td className="right">{p?.lockPicking}</td>
                <td className="right">{p?.disarmTraps}</td>
                <td className="right">{p?.objectUsage}</td>
                <td className="right">{p?.runes}</td>
                <td className="right">{p?.influence}</td>
                <td className="right">{p?.stealth}</td>
                <td>{p?.gender}</td>
                <td>{p?.race}</td>
                <td>{p?.playerClass}</td>
                <td className="right">{p?.lvl}</td>
                <td className="right">{p?.xp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {(() => {
        const activity = attacker?.playerActivity as string | undefined;
        const meleeActive = activity === '_3PhisicalAttackOrMovement';
        const meleeDisabled = !meleeActive;
        return (
      <div style={{ display: 'inline-block', verticalAlign: 'top', width: '49%', marginTop: 16, marginBottom: 8, marginRight: 8, opacity: meleeDisabled ? 0.6 : 1 }} title={meleeDisabled ? 'Inactive: only for Attack or Movement' : undefined}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: 18 }}>Melee Modifiers</h2>
        <table className="table" style={{ maxWidth: 760 }}>
          <thead>
            <tr>
              <th>Melee Modifier</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            
            <tr>
              <td>{meleeLabel('Attack from weak side', mod.attackFromWeakSide, 15)}</td>
              <td><input type="checkbox" checked={mod.attackFromWeakSide} disabled={meleeDisabled} onChange={(e) => setMod((m) => ({ ...m, attackFromWeakSide: e.target.checked }))} /></td>
            </tr>
            <tr>
              <td>{meleeLabel('Attack from behind', mod.attackFromBehind, 20)}</td>
              <td><input type="checkbox" checked={mod.attackFromBehind} disabled={meleeDisabled} onChange={(e) => setMod((m) => ({ ...m, attackFromBehind: e.target.checked }))} /></td>
            </tr>
            <tr>
              <td>{meleeLabel('Defender surprised', mod.defenderSurprised, 20)}</td>
              <td><input type="checkbox" checked={mod.defenderSurprised} disabled={meleeDisabled} onChange={(e) => setMod((m) => ({ ...m, defenderSurprised: e.target.checked }))} /></td>
            </tr>
            <tr>
              <td>{meleeLabel('Defender stunned', autoDefenderStunned, 20)}</td>
              <td><input type="checkbox" checked={autoDefenderStunned} disabled aria-label="Defender stunned (auto)" /></td>
            </tr>
            <tr>
              <td>{meleeLabel('Attacker weapon change', mod.attackerWeaponChange, -30)}</td>
              <td><input type="checkbox" checked={mod.attackerWeaponChange} disabled={meleeDisabled} onChange={(e) => setMod((m) => ({ ...m, attackerWeaponChange: e.target.checked }))} /></td>
            </tr>
            <tr>
              <td>{meleeLabel('Attacker target change', mod.attackerTargetChange, -30)}</td>
              <td><input type="checkbox" checked={mod.attackerTargetChange} disabled={meleeDisabled} onChange={(e) => setMod((m) => ({ ...m, attackerTargetChange: e.target.checked }))} /></td>
            </tr>
            <tr>
              <td>{meleeLabel('Attacker HP below 50%', autoAttackerHPBelow50, -20)}</td>
              <td><input type="checkbox" checked={autoAttackerHPBelow50} disabled aria-label="Attacker HP below 50% (auto)" /></td>
            </tr>
            <tr>
              <td>{meleeLabel('Attacker moved \u003e 3m', mod.attackerMoreThan3MetersMovement, -10)}</td>
              <td><input type="checkbox" checked={mod.attackerMoreThan3MetersMovement} disabled={meleeDisabled} onChange={(e) => setMod((m) => ({ ...m, attackerMoreThan3MetersMovement: e.target.checked }))} /></td>
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
                  disabled={meleeDisabled}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
        );
      })()}

      {(() => {
        const activity = attacker?.playerActivity as string | undefined;
        const attackType = attacker?.attackType as string | undefined;
        const rangedActive = activity === '_2RangedAttack' || activity === '_1PerformMagic';
        const rangedDisabled = !rangedActive;
        const isPerformMagic = activity === '_1PerformMagic';
        const isMagicBall = attackType === 'magicBall';
        const isBaseMagic = attackType === 'baseMagic';
        const defenderHasShield = !!defender?.shield;
        return (
      <div style={{ display: 'inline-block', verticalAlign: 'top', width: '49%', marginTop: 16, marginBottom: 8, opacity: rangedDisabled ? 0.6 : 1 }} title={rangedDisabled ? 'Inactive: only for Ranged or Perform Magic' : undefined}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: 18 }}>Ranged/Magic modifiers</h2>
        <table className="table" style={{ maxWidth: 860 }}>
          <thead>
            <tr>
              <th>Ranged/Magic Modifier</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              return (
                <>
                  <tr>
                    <td>Distance of attack</td>
                    <td>
                      <select
                        value={rm.distanceOfAttack}
                        onChange={(e) => setRm((prev) => ({ ...prev, distanceOfAttack: e.target.value as any }))}
                        disabled={false}
                        aria-label={'Distance of attack'}
                      >
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
                      <select
                        value={rm.prepareRounds}
                        onChange={(e) => setRm((prev) => ({ ...prev, prepareRounds: Number(e.target.value) as 0 | 1 | 2 | 3 | 4 }))}
                        disabled={!isPerformMagic}
                      >
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
                      <input
                        type="number"
                        value={rm.coverPenalty}
                        onChange={(e) => setRm((prev) => ({ ...prev, coverPenalty: Math.floor(Number(e.target.value) || 0) }))}
                        disabled={rangedDisabled}
                        style={{ width: 120, textAlign: 'right' }}
                      />
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
                      <select
                        value={rm.baseMageType}
                        onChange={(e) => setRm((p) => ({ ...p, baseMageType: e.target.value as 'lenyeg' | 'kapcsolat' }))}
                        disabled={!isBaseMagic}
                        title="Lényeg: 0, Kapcsolat: -10"
                      >
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
                    <td>
                      <input
                        type="number"
                        value={rm.gmModifier}
                        onChange={(e) => {
                          const v = Math.floor(Number(e.target.value) || 0);
                          setRm((m) => ({ ...m, gmModifier: v }));
                        }}
                        disabled={rangedDisabled}
                        style={{ width: 80, textAlign: 'right' }}
                      />
                    </td>
                  </tr>
                </>
              );
            })()}
          </tbody>
        </table>
      </div>
        );
      })()}

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
          const showGate = !readyToRoll && openTotal == null;
          return (
            <div>
              {showGate ? (
                <button
                  type="button"
                  onClick={() => setReadyToRoll(true)}
                  style={{
                    background: '#f4a261',
                    color: '#000',
                    width: 75,
                    height: 75,
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
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
                  All modifiers set
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRoll}
                  disabled={disabled}
                  style={{
                    background: disabled ? '#888' : '#0a7d2f',
                    color: '#ffffff',
                    width: 75,
                    height: 75,
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
              )}
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
            <div className="result-box orange">
              <span className="result-value">{
                (() => {
                  if (openTotal == null) return '';
                  const activity = attacker?.playerActivity as string | undefined;
                  const attackType = attacker?.attackType as string | undefined;
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

                  const attackerTb = attacker ? (computeTb(attacker) || 0) : 0;
                  const cAttackerTB = attackerTb;
                  const cAttackerTBForDefense = -Math.abs(Number(attacker?.tbUsedForDefense) || 0);
                  const cAttackerPenalty = -Math.abs(Number(attacker?.penaltyOfActions) || 0);
                  const cDefenderVB = -Math.abs(Number(defender?.vb) || 0);
                  const cDefenderTBForDefense = -Math.abs(Number(defender?.tbUsedForDefense) || 0);
                  const cDefenderShield = defender?.shield ? -25 : 0;
                  const cDefenderPenalty = Math.abs(Number(defender?.penaltyOfActions) || 0);

                  const open = openTotal;
                  const total = open + cAttackerTB + cAttackerTBForDefense + cAttackerPenalty + cDefenderVB + cDefenderTBForDefense + cDefenderShield + cDefenderPenalty + modSum;
                  return `${total}`;
                })()
              }</span>
            </div>
          </div>
          {(() => {
            const activity = attacker?.playerActivity as string | undefined;
            const attackType = attacker?.attackType as string | undefined;
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

            const attackerTb = attacker ? (computeTb(attacker) || 0) : 0;
            const attackerTbForDefense = Number(attacker?.tbUsedForDefense) || 0;
            const attackerPenalty = Number(attacker?.penaltyOfActions) || 0; // negative in total
            const defenderVb = Number(defender?.vb) || 0;
            const defenderTbForDefense = Number(defender?.tbUsedForDefense) || 0;
            const defenderShield = defender?.shield ? -25 : 0;
            const defenderPenalty = Number(defender?.penaltyOfActions) || 0; // positive in total

            const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
            const asNeg = (n: number) => (n > 0 ? `-${n}` : `${n}`);
            const asPos = (n: number) => (n > 0 ? `+${n}` : `${n}`);
            const modLabel = usingMelee ? 'Melee modifiers' : (usingRanged ? 'Ranged/Magic modifiers' : 'Modifiers');

            // Signed contributions subtotal (without Open roll)
            const cAttackerTB = attackerTb;
            const cAttackerTBForDefense = -Math.abs(attackerTbForDefense);
            const cAttackerPenalty = -Math.abs(attackerPenalty);
            const cDefenderVB = -Math.abs(defenderVb);
            const cDefenderTBForDefense = -Math.abs(defenderTbForDefense);
            const cDefenderShield = defenderShield; // already signed
            const cDefenderPenalty = Math.abs(defenderPenalty);
            const subtotal = cAttackerTB + cAttackerTBForDefense + cAttackerPenalty + cDefenderVB + cDefenderTBForDefense + cDefenderShield + cDefenderPenalty + modSum;

            return (
              <div style={{ alignSelf: 'flex-start', marginTop: 16, paddingTop: 0, borderTop: '1px dashed #ddd' }}>
                <div style={{ fontSize: 12, color: '#444', lineHeight: 1.25 }}>
                  <div>Attacker TB: <strong>{attacker ? attackerTb : ''}</strong></div>
                  <div>Attacker TB for defense: <strong>{attacker ? asNeg(attackerTbForDefense) : ''}</strong></div>
                  <div>Attacker Penalty: <strong>{attacker ? asNeg(attackerPenalty) : ''}</strong></div>
                  <div>Defender VB: <strong>{defender ? asNeg(defenderVb) : ''}</strong></div>
                  <div>Defender TB for defense: <strong>{defender ? asNeg(defenderTbForDefense) : ''}</strong></div>
                  <div>Defender has shield: <strong>{defender ? (defenderShield !== 0 ? '-25' : '0') : ''}</strong></div>
                  <div>Defender Penalty: <strong>{defender ? asPos(defenderPenalty) : ''}</strong></div>
                  <div>{modLabel}: <strong>{fmt(modSum)}</strong></div>
                  <div style={{ marginTop: 4, borderTop: '1px dashed #ddd', paddingTop: 4 }}>Sum (without Open roll): <strong>{fmt(subtotal)}</strong></div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
