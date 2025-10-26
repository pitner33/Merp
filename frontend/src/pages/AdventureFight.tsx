import { useLocation, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Player } from '../types';

export default function AdventureFight() {
  const location = useLocation();
  const players = (location.state as { players?: Player[] } | undefined)?.players || [];
  const [rows, setRows] = useState<Player[]>(players);
  const [toast, setToast] = useState<{ message: string; x?: number; y?: number } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function loadOrdered() {
      try {
        setLoading(true);
        const res = await fetch('http://localhost:8081/api/players/ordered');
        if (!res.ok) throw new Error(`Failed to load ordered players (${res.status})`);
        const data = (await res.json()) as Player[];
        if (isMounted && Array.isArray(data)) {
          setRows(data);
        }
      } catch (e) {
        // Fallback: keep navigation state order if fetch fails
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadOrdered();
    return () => {
      isMounted = false;
    };
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

  return (
    <div style={{ padding: 16 }}>
      <h1>Fight</h1>
      <div style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
        <Link to="/adventure/main">&larr; Back to Adventure</Link>
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
                <th rowSpan={2}>Target</th>
                <th rowSpan={2}>max HP</th>
                <th rowSpan={2}>HP</th>
                <th rowSpan={2}>Alive</th>
                <th rowSpan={2}>Active</th>
                <th rowSpan={2}>Activity</th>
                <th rowSpan={2}>Attack</th>
                <th rowSpan={2}>Crit</th>
                <th rowSpan={2}>Armor</th>
                <th rowSpan={2}>TB</th>
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
                <th rowSpan={2}>Gender</th>
                <th rowSpan={2}>Race</th>
                <th rowSpan={2}>Class</th>
                <th rowSpan={2}>lvl</th>
                <th rowSpan={2}>XP</th>
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
                  <td>
                    <select
                      value={p.target == null ? 'none' : p.target === p.characterId ? 'self' : p.target}
                      onChange={(e) => {
                        const value = e.target.value;
                        setRows((prev) =>
                          prev.map((r) => {
                            if (r.id !== p.id) return r;
                            if (value === 'none') return { ...r, target: undefined };
                            if (value === 'self') return { ...r, target: r.characterId };
                            return { ...r, target: value };
                          })
                        );
                      }}
                    >
                      <option value="none">none</option>
                      <option value="self">self</option>
                      {rows
                        .filter((o) => o.id !== p.id)
                        .map((o) => (
                          <option key={o.id} value={o.characterId}>
                            {o.characterId}
                          </option>
                        ))}
                    </select>
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
                    <select
                      value={p.playerActivity ?? '_5DoNothing'}
                      onChange={(e) => {
                        const value = e.target.value;
                        setRows((prev) =>
                          prev.map((r) =>
                            r.id === p.id ? { ...r, playerActivity: value } : r
                          )
                        );
                      }}
                    >
                      {activityOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={p.attackType ?? 'slashing'}
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
                      {attackOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {(() => {
                      const allowed = critByAttack[p.attackType ?? 'slashing'] ?? ['none'];
                      return (
                        <select
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
                  <td>{p.gender}</td>
                  <td>{p.race}</td>
                  <td>{p.playerClass}</td>
                  <td className="right">{p.lvl}</td>
                  <td className="right">{p.xp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
