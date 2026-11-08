import { hash32 } from '../rooms/b07RouteAssembly.ts';

export const B09_BUILD_VERSION = 1 as const;

export type UpgradeId = 'echo-palm' | 'skyline-return' | 'countercurrent' | 'momentum-relay' | 'grounding-coil' | 'resonant-reclamation' | 'solar-relay' | 'radiant-discipline' | 'close-orbit' | 'field-recycler' | 'aerial-imprint' | 'last-orbit';
export type UpgradeCategory = 'strike' | 'mobility' | 'defense' | 'resonance' | 'risk-reward' | 'dawnrush' | 'utility';
export type UpgradeTier = 'common' | 'rare';
export type UpgradeEffect =
  | { readonly kind: 'contact-bonus'; readonly damage: number; readonly condition: 'light-3' | 'launcher-followup' | 'dodge-followup' | 'close-range' }
  | { readonly kind: 'dash-i-frames'; readonly milliseconds: number }
  | { readonly kind: 'punish-shield'; readonly durationMs: number; readonly cooldownMs: number }
  | { readonly kind: 'resonance-milestone'; readonly hits: number; readonly gain: number }
  | { readonly kind: 'dawnrush-energy'; readonly gain: number; readonly condition: 'solar-drive' | 'confirmed-contact' }
  | { readonly kind: 'field-recycler'; readonly branchRooms: readonly string[]; readonly repairCharges: number }
  | { readonly kind: 'air-stagger'; readonly multiplier: number }
  | { readonly kind: 'last-orbit'; readonly hpThreshold: number; readonly resonanceCost: number };

export type UpgradeDefinition = {
  readonly id: UpgradeId;
  readonly name: string;
  readonly category: UpgradeCategory;
  readonly tier: UpgradeTier;
  readonly weight: number;
  readonly maxRank: number;
  readonly rule: string;
  readonly baseEffect: UpgradeEffect;
  readonly rankRule: string;
  readonly icon: string;
  readonly prerequisites?: readonly UpgradeId[];
  readonly excludes?: readonly UpgradeId[];
};

export const B09_UPGRADES: Readonly<Record<UpgradeId, UpgradeDefinition>> = {
  'echo-palm': { id: 'echo-palm', name: 'Echo Palm', category: 'strike', tier: 'common', weight: 4, maxRank: 2, rule: 'The third light strike deals +2 damage on confirmed contact.', baseEffect: { kind: 'contact-bonus', damage: 2, condition: 'light-3' }, rankRule: '+1 damage per rank.', icon: 'echo-palm' },
  'skyline-return': { id: 'skyline-return', name: 'Skyline Return', category: 'strike', tier: 'rare', weight: 2, maxRank: 2, rule: 'Launch a foe, then land an aerial follow-up within 1.2s for +2 damage.', baseEffect: { kind: 'contact-bonus', damage: 2, condition: 'launcher-followup' }, rankRule: '+1 damage per rank.', icon: 'skyline-return' },
  countercurrent: { id: 'countercurrent', name: 'Countercurrent', category: 'risk-reward', tier: 'rare', weight: 2, maxRank: 2, rule: 'A successful dodge empowers your next strike for 2.2s: +3 damage.', baseEffect: { kind: 'contact-bonus', damage: 3, condition: 'dodge-followup' }, rankRule: '+1 damage per rank.', icon: 'countercurrent' },
  'momentum-relay': { id: 'momentum-relay', name: 'Momentum Relay', category: 'mobility', tier: 'common', weight: 4, maxRank: 2, rule: 'Dash invulnerability lasts 30ms longer; it never changes body size or travel speed.', baseEffect: { kind: 'dash-i-frames', milliseconds: 30 }, rankRule: '+15ms per rank, capped at 195ms total.', icon: 'momentum-relay' },
  'grounding-coil': { id: 'grounding-coil', name: 'Grounding Coil', category: 'defense', tier: 'rare', weight: 2, maxRank: 1, rule: 'A guard-break or interrupted enemy primes one shield for 5s; next hit is blocked. 10s recharge.', baseEffect: { kind: 'punish-shield', durationMs: 5000, cooldownMs: 10000 }, rankRule: 'One rank.', icon: 'grounding-coil' },
  'resonant-reclamation': { id: 'resonant-reclamation', name: 'Resonant Reclamation', category: 'resonance', tier: 'common', weight: 4, maxRank: 2, rule: 'Every 3 distinct confirmed attack contacts restore 8 combat Resonance.', baseEffect: { kind: 'resonance-milestone', hits: 3, gain: 8 }, rankRule: '+2 Resonance per rank.', icon: 'resonant-reclamation' },
  'solar-relay': { id: 'solar-relay', name: 'Solar Relay', category: 'dawnrush', tier: 'rare', weight: 2, maxRank: 1, rule: 'A confirmed Dawnrush Solar Drive hit restores 6 form energy.', baseEffect: { kind: 'dawnrush-energy', gain: 6, condition: 'solar-drive' }, rankRule: 'One rank.', icon: 'solar-relay' },
  'radiant-discipline': { id: 'radiant-discipline', name: 'Radiant Discipline', category: 'dawnrush', tier: 'common', weight: 3, maxRank: 2, rule: 'Confirmed Dawnrush hits restore 3 form energy, once per attack and at most every 1s.', baseEffect: { kind: 'dawnrush-energy', gain: 3, condition: 'confirmed-contact' }, rankRule: '+1 energy per rank; form energy remains capped at 100.', icon: 'radiant-discipline' },
  'close-orbit': { id: 'close-orbit', name: 'Close Orbit', category: 'risk-reward', tier: 'rare', weight: 2, maxRank: 2, rule: 'Strike within 56px of a foe for +2 damage; 4s internal cooldown.', baseEffect: { kind: 'contact-bonus', damage: 2, condition: 'close-range' }, rankRule: '+1 damage per rank.', icon: 'close-orbit' },
  'field-recycler': { id: 'field-recycler', name: 'Field Recycler', category: 'utility', tier: 'rare', weight: 2, maxRank: 1, rule: 'Claiming the risky Conduit Annex or Lattice Hall reward grants +1 field repair.', baseEffect: { kind: 'field-recycler', branchRooms: ['sg-conduit-annex', 'vl-lattice-hall'], repairCharges: 1 }, rankRule: 'One rank; each room reward pays once.', icon: 'field-recycler' },
  'aerial-imprint': { id: 'aerial-imprint', name: 'Aerial Imprint', category: 'strike', tier: 'common', weight: 3, maxRank: 2, rule: 'An aerial hit on a launched foe adds 35% knockback.', baseEffect: { kind: 'air-stagger', multiplier: 1.35 }, rankRule: '+15% per rank.', icon: 'aerial-imprint', prerequisites: ['skyline-return'] },
  'last-orbit': { id: 'last-orbit', name: 'Last Orbit', category: 'defense', tier: 'rare', weight: 1, maxRank: 1, rule: 'At 25+ combat Resonance, survive one lethal hit at 2 HP or less with 1 HP; spend 25 Resonance.', baseEffect: { kind: 'last-orbit', hpThreshold: 2, resonanceCost: 25 }, rankRule: 'One rank.', icon: 'last-orbit' },
};

export type FallbackChoiceId = 'field-repair' | 'resonance-cache' | 'solar-cell';
export type UpgradeChoiceId = UpgradeId | FallbackChoiceId;
export type UpgradeChoice = { readonly id: UpgradeChoiceId; readonly kind: 'upgrade' | 'fallback'; readonly upgradeId?: UpgradeId; readonly name: string; readonly rule: string; readonly icon: string; readonly tier?: UpgradeTier; readonly currentRank?: number; readonly nextRank?: number };
export type UpgradeChoiceSource = `room:${string}` | `boss:${string}` | `event:${string}`;
export type UpgradeOffer = { readonly sourceId: UpgradeChoiceSource; readonly drawIndex: number; readonly buildFingerprint: string; readonly choices: readonly UpgradeChoice[]; readonly fallbackUsed: boolean };
export type UpgradeAcquisition = { readonly sourceId: UpgradeChoiceSource; readonly choiceId: UpgradeChoiceId; readonly rank: number; readonly drawIndex: number };
export type RunRewardLedger = { readonly claimedSourceIds: readonly UpgradeChoiceSource[] };
export type RunBuildState = {
  readonly version: typeof B09_BUILD_VERSION;
  readonly seed: number;
  readonly ranks: Readonly<Partial<Record<UpgradeId, number>>>;
  readonly acquisitions: readonly UpgradeAcquisition[];
  readonly ledger: RunRewardLedger;
};

export function createRunBuild(seed: number): RunBuildState {
  return { version: B09_BUILD_VERSION, seed: Number.isFinite(seed) ? Math.trunc(seed) >>> 0 : 1, ranks: {}, acquisitions: [], ledger: { claimedSourceIds: [] } };
}

export type EffectiveModifiers = {
  readonly echoPalmDamage: number; readonly skylineDamage: number; readonly countercurrentDamage: number;
  readonly dashInvulnerabilityMs: number; readonly shield: UpgradeEffect & { readonly kind: 'punish-shield' } | null;
  readonly resonanceMilestone: UpgradeEffect & { readonly kind: 'resonance-milestone' } | null;
  readonly solarEnergy: number; readonly radiantEnergy: number; readonly closeOrbitDamage: number;
  readonly fieldRecycler: UpgradeEffect & { readonly kind: 'field-recycler' } | null;
  readonly aerialMultiplier: number; readonly lastOrbit: UpgradeEffect & { readonly kind: 'last-orbit' } | null;
};

export function effectiveModifiers(build: RunBuildState): EffectiveModifiers {
  const rank = (id: UpgradeId) => Math.max(0, Math.min(B09_UPGRADES[id].maxRank, build.ranks[id] ?? 0));
  const effect = <K extends UpgradeEffect['kind']>(id: UpgradeId, kind: K) => B09_UPGRADES[id].baseEffect.kind === kind ? B09_UPGRADES[id].baseEffect as Extract<UpgradeEffect, { kind: K }> : null;
  return {
    echoPalmDamage: rank('echo-palm') ? 2 + rank('echo-palm') - 1 : 0,
    skylineDamage: rank('skyline-return') ? 2 + rank('skyline-return') - 1 : 0,
    countercurrentDamage: rank('countercurrent') ? 3 + rank('countercurrent') - 1 : 0,
    dashInvulnerabilityMs: rank('momentum-relay') ? Math.min(45, 30 + (rank('momentum-relay') - 1) * 15) : 0,
    shield: rank('grounding-coil') ? effect('grounding-coil', 'punish-shield') : null,
    resonanceMilestone: rank('resonant-reclamation') ? { ...effect('resonant-reclamation', 'resonance-milestone')!, gain: 8 + 2 * (rank('resonant-reclamation') - 1) } : null,
    solarEnergy: rank('solar-relay') ? 6 : 0,
    radiantEnergy: rank('radiant-discipline') ? 3 + rank('radiant-discipline') - 1 : 0,
    closeOrbitDamage: rank('close-orbit') ? 2 + rank('close-orbit') - 1 : 0,
    fieldRecycler: rank('field-recycler') ? effect('field-recycler', 'field-recycler') : null,
    aerialMultiplier: rank('aerial-imprint') ? 1.35 + .15 * (rank('aerial-imprint') - 1) : 1,
    lastOrbit: rank('last-orbit') ? effect('last-orbit', 'last-orbit') : null,
  };
}

export function fieldRecyclerRepair(build: RunBuildState, roomId: string): number {
  const effect = effectiveModifiers(build).fieldRecycler;
  return effect?.branchRooms.includes(roomId) ? effect.repairCharges : 0;
}

export function eligibleUpgrades(build: RunBuildState): readonly UpgradeId[] {
  return (Object.keys(B09_UPGRADES) as UpgradeId[]).filter((id) => {
    const def = B09_UPGRADES[id]; const rank = build.ranks[id] ?? 0;
    return rank < def.maxRank && (def.prerequisites ?? []).every((pre) => (build.ranks[pre] ?? 0) > 0)
      && !(def.excludes ?? []).some((other) => (build.ranks[other] ?? 0) > 0);
  });
}

const FALLBACKS: readonly UpgradeChoice[] = [
  { id: 'field-repair', kind: 'fallback', name: 'Field Repair', rule: '+1 field repair charge.', icon: 'field-recycler' },
  { id: 'resonance-cache', kind: 'fallback', name: 'Resonance Cache', rule: '+12 combat Resonance (capped at 100).', icon: 'resonant-reclamation' },
  { id: 'solar-cell', kind: 'fallback', name: 'Solar Cell', rule: '+12 Dawnrush energy (capped at 100).', icon: 'solar-relay' },
];

export function generateUpgradeOffer(build: RunBuildState, sourceId: UpgradeChoiceSource): UpgradeOffer {
  if (!isValidSourceId(sourceId)) throw new Error(`Invalid B09 reward source: ${sourceId}`);
  const eligible = [...eligibleUpgrades(build)];
  let state = hash32(`${build.seed >>> 0}:b09:${sourceId}:0`);
  const next = () => { state = (state + 0x6d2b79f5) >>> 0; let t = state; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return (t ^ (t >>> 14)) >>> 0; };
  const selected: UpgradeChoice[] = [];
  while (eligible.length && selected.length < 3) {
    const total = eligible.reduce((sum, id) => sum + B09_UPGRADES[id].weight, 0);
    let pick = next() % total;
    const index = eligible.findIndex((id) => (pick -= B09_UPGRADES[id].weight) < 0);
    const id = eligible.splice(index < 0 ? 0 : index, 1)[0]!;
    const def = B09_UPGRADES[id]; const currentRank = build.ranks[id] ?? 0;
    selected.push({ id, kind: 'upgrade', upgradeId: id, name: def.name, rule: `${def.rule} ${def.rankRule}`, icon: def.icon, tier: def.tier, currentRank, nextRank: currentRank + 1 });
  }
  const fallbackUsed = selected.length < 3;
  if (fallbackUsed) {
    const offset = next() % FALLBACKS.length;
    for (let i = 0; selected.length < 3; i++) selected.push(FALLBACKS[(offset + i) % FALLBACKS.length]!);
  }
  return { sourceId, drawIndex: 0, buildFingerprint: buildFingerprint(build), choices: selected, fallbackUsed };
}

export type RunBuildSelection = { readonly ok: true; readonly build: RunBuildState; readonly choice: UpgradeChoice } | { readonly ok: false; readonly build: RunBuildState; readonly reason: 'source-claimed' | 'stale-offer' | 'invalid-choice' | 'rank-cap' };

export function selectUpgradeChoice(build: RunBuildState, offer: UpgradeOffer, choiceId: UpgradeChoiceId): RunBuildSelection {
  if (!isValidSourceId(offer.sourceId)) return { ok: false, build, reason: 'stale-offer' };
  if (build.ledger.claimedSourceIds.includes(offer.sourceId)) return { ok: false, build, reason: 'source-claimed' };
  if (offer.buildFingerprint !== buildFingerprint(build)) return { ok: false, build, reason: 'stale-offer' };
  const fresh = generateUpgradeOffer(build, offer.sourceId);
  if (fresh.choices.map((choice) => choice.id).join('|') !== offer.choices.map((choice) => choice.id).join('|')) return { ok: false, build, reason: 'stale-offer' };
  const choice = offer.choices.find((candidate) => candidate.id === choiceId);
  if (!choice) return { ok: false, build, reason: 'invalid-choice' };
  let ranks = build.ranks;
  let nextRank = 0;
  if (choice.kind === 'upgrade' && choice.upgradeId) {
    const currentRank = build.ranks[choice.upgradeId] ?? 0;
    if (!eligibleUpgrades(build).includes(choice.upgradeId)) return { ok: false, build, reason: 'rank-cap' };
    nextRank = currentRank + 1;
    ranks = { ...build.ranks, [choice.upgradeId]: nextRank };
  }
  const acquisition: UpgradeAcquisition = { sourceId: offer.sourceId, choiceId: choice.id, rank: nextRank, drawIndex: offer.drawIndex };
  const updated: RunBuildState = {
    ...build, ranks,
    acquisitions: [...build.acquisitions, acquisition],
    ledger: { claimedSourceIds: [...build.ledger.claimedSourceIds, offer.sourceId] },
  };
  return { ok: true, build: updated, choice };
}

export function serializeRunBuild(build: RunBuildState): string {
  return JSON.stringify({ version: build.version, seed: build.seed, ranks: Object.fromEntries(Object.entries(build.ranks).sort(([a], [b]) => a.localeCompare(b))), acquisitions: build.acquisitions, ledger: { claimedSourceIds: [...build.ledger.claimedSourceIds].sort() } });
}

function buildFingerprint(build: RunBuildState): string {
  return `${build.version}:${build.seed}:${Object.entries(build.ranks).sort(([a], [b]) => a.localeCompare(b)).map(([id, rank]) => `${id}=${rank}`).join(',')}:${[...build.ledger.claimedSourceIds].sort().join(',')}`;
}

export type B09CombatRuntime = {
  readonly dodgeChargeUntilMs: number; readonly launcherUntilByTarget: Readonly<Record<string, number>>;
  readonly lastContactActionId: string; readonly contactMilestone: number;
  readonly lastSolarActionId: string; readonly lastRadiantActionId: string; readonly lastRadiantAtMs: number;
  readonly shieldUntilMs: number; readonly shieldCooldownUntilMs: number; readonly lastOrbitUsed: boolean;
  readonly closeOrbitReadyAtMs: number;
};
export function createB09CombatRuntime(): B09CombatRuntime { return { dodgeChargeUntilMs: -1, launcherUntilByTarget: {}, lastContactActionId: '', contactMilestone: 0, lastSolarActionId: '', lastRadiantActionId: '', lastRadiantAtMs: -10000, shieldUntilMs: -1, shieldCooldownUntilMs: 0, lastOrbitUsed: false, closeOrbitReadyAtMs: 0 }; }

export type B09ContactInput = { readonly nowMs: number; readonly actionId: string; readonly targetId: string; readonly moveId: string; readonly moveDamage: number; readonly knockbackY: number; readonly result: 'hit' | 'miss' | 'blocked' | 'obstructed' | 'invulnerable' | 'ko'; readonly guardBreak: boolean; readonly interrupted: boolean; readonly closeRange: boolean; readonly targetAirborne: boolean; readonly dawnrush: boolean };
export type B09ContactOutput = { readonly runtime: B09CombatRuntime; readonly bonusDamage: number; readonly knockbackMultiplier: number; readonly resonanceGain: number; readonly dawnrushEnergy: number; readonly shieldPrimed: boolean };

export function resolveB09Contact(build: RunBuildState, runtime: B09CombatRuntime, input: B09ContactInput): B09ContactOutput {
  const mods = effectiveModifiers(build); let next = runtime; let bonusDamage = 0; let resonanceGain = 0; let dawnrushEnergy = 0; let shieldPrimed = false; let knockbackMultiplier = 1;
  if (input.result !== 'hit') return { runtime: next, bonusDamage, knockbackMultiplier, resonanceGain, dawnrushEnergy, shieldPrimed };
  if (input.moveId === 'light-3') bonusDamage += mods.echoPalmDamage;
  const launcherExpiry = runtime.launcherUntilByTarget[input.targetId];
  if (input.moveId === 'air-light' && input.targetAirborne && launcherExpiry !== undefined && launcherExpiry >= input.nowMs) { bonusDamage += mods.skylineDamage; const cleared = { ...runtime.launcherUntilByTarget }; delete cleared[input.targetId]; next = { ...next, launcherUntilByTarget: cleared }; }
  if (input.knockbackY < -55) next = { ...next, launcherUntilByTarget: { ...next.launcherUntilByTarget, [input.targetId]: input.nowMs + 1200 } };
  if (runtime.dodgeChargeUntilMs > 0 && runtime.dodgeChargeUntilMs >= input.nowMs) { bonusDamage += mods.countercurrentDamage; next = { ...next, dodgeChargeUntilMs: -1 }; }
  if (input.closeRange && input.nowMs >= runtime.closeOrbitReadyAtMs) { bonusDamage += mods.closeOrbitDamage; if (mods.closeOrbitDamage) next = { ...next, closeOrbitReadyAtMs: input.nowMs + 4000 }; }
  if (input.moveId === 'air-light' && input.targetAirborne) knockbackMultiplier = mods.aerialMultiplier;
  if (mods.resonanceMilestone && runtime.lastContactActionId !== input.actionId) {
    const count = runtime.contactMilestone + 1;
    if (count >= mods.resonanceMilestone.hits) { resonanceGain += mods.resonanceMilestone.gain; next = { ...next, contactMilestone: 0, lastContactActionId: input.actionId }; }
    else next = { ...next, contactMilestone: count, lastContactActionId: input.actionId };
  }
  if (input.dawnrush && mods.solarEnergy && input.moveId === 'resonance' && runtime.lastSolarActionId !== input.actionId) { dawnrushEnergy += mods.solarEnergy; next = { ...next, lastSolarActionId: input.actionId }; }
  if (input.dawnrush && mods.radiantEnergy && runtime.lastRadiantActionId !== input.actionId && input.nowMs - runtime.lastRadiantAtMs >= 1000) {
    dawnrushEnergy += mods.radiantEnergy; next = { ...next, lastRadiantActionId: input.actionId, lastRadiantAtMs: input.nowMs };
  }
  if (mods.shield && (input.guardBreak || input.interrupted) && runtime.shieldUntilMs <= input.nowMs && input.nowMs >= runtime.shieldCooldownUntilMs) {
    next = { ...next, shieldUntilMs: input.nowMs + mods.shield.durationMs, shieldCooldownUntilMs: input.nowMs + mods.shield.cooldownMs }; shieldPrimed = true;
  }
  return { runtime: next, bonusDamage, knockbackMultiplier, resonanceGain, dawnrushEnergy, shieldPrimed };
}

export function resolveB09Dodge(build: RunBuildState, runtime: B09CombatRuntime, nowMs: number): B09CombatRuntime {
  return (build.ranks.countercurrent ?? 0) > 0 ? { ...runtime, dodgeChargeUntilMs: nowMs + 2200 } : runtime;
}

export type B09ThreatOutput = { readonly runtime: B09CombatRuntime; readonly damage: number; readonly blockedBy: 'grounding-coil' | 'last-orbit' | null; readonly resonanceCost: number };
export function resolveB09Threat(build: RunBuildState, runtime: B09CombatRuntime, input: { readonly nowMs: number; readonly hp: number; readonly damage: number; readonly resonance: number }): B09ThreatOutput {
  if (input.damage <= 0) return { runtime, damage: 0, blockedBy: null, resonanceCost: 0 };
  if (effectiveModifiers(build).shield && runtime.shieldUntilMs > 0 && runtime.shieldUntilMs >= input.nowMs) return { runtime: { ...runtime, shieldUntilMs: -1 }, damage: 0, blockedBy: 'grounding-coil', resonanceCost: 0 };
  const lastOrbit = effectiveModifiers(build).lastOrbit;
  if (lastOrbit && input.resonance >= lastOrbit.resonanceCost && !runtime.lastOrbitUsed && input.hp <= lastOrbit.hpThreshold && input.hp - input.damage <= 0) return { runtime: { ...runtime, lastOrbitUsed: true }, damage: Math.max(0, input.hp - 1), blockedBy: 'last-orbit', resonanceCost: lastOrbit.resonanceCost };
  return { runtime, damage: input.damage, blockedBy: null, resonanceCost: 0 };
}

export function isValidSourceId(value: string): value is UpgradeChoiceSource { return /^(room|boss|event):[a-z0-9-]+$/.test(value); }
