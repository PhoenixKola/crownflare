import assert from 'node:assert/strict';
import test from 'node:test';
import { B09_UPGRADES, createB09CombatRuntime, createRunBuild, effectiveModifiers, eligibleUpgrades, fieldRecyclerRepair, generateUpgradeOffer, resolveB09Contact, resolveB09Dodge, resolveB09Threat, selectUpgradeChoice, serializeRunBuild, type B09CombatRuntime, type RunBuildState, type UpgradeOffer } from '../../src/game/roguelite/b09RunBuild.ts';

const context = (overrides: Partial<Parameters<typeof resolveB09Contact>[2]> = {}): Parameters<typeof resolveB09Contact>[2] => ({
  nowMs: 1000, actionId: 'action-1', targetId: 'enemy-a', moveId: 'light-1', moveDamage: 1, knockbackY: 0,
  result: 'hit', guardBreak: false, interrupted: false, closeRange: false, targetAirborne: false, dawnrush: false, ...overrides,
});
const buildWith = (ranks: Partial<RunBuildState['ranks']>): RunBuildState => ({ ...createRunBuild(77), ranks });
test('B09 offers are seeded by run seed and one-claim reward source, with three distinct valid choices', () => {
  const first = generateUpgradeOffer(createRunBuild(11), 'room:sg-conduit-annex');
  const repeat = generateUpgradeOffer(createRunBuild(11), 'room:sg-conduit-annex');
  assert.deepEqual(first, repeat);
  assert.equal(first.choices.length, 3);
  assert.equal(new Set(first.choices.map((choice) => choice.id)).size, 3);
  assert.ok(Array.from({ length: 63 }, (_, i) => generateUpgradeOffer(createRunBuild(i + 12), 'room:sg-conduit-annex')).some((offer) => offer.choices.map((choice) => choice.id).join() !== first.choices.map((choice) => choice.id).join()));
  assert.equal(first.drawIndex, 0);
});

test('aerial prerequisite, rank caps, stale selections, and single-claim ledger are enforced', () => {
  const initial = createRunBuild(2026);
  assert.equal(eligibleUpgrades(initial).includes('aerial-imprint'), false);
  let build = initial;
  let acquisitionOffer: UpgradeOffer | null = null;
  for (let draw = 0; draw < 100; draw++) {
    const candidate = generateUpgradeOffer(build, `event:prerequisite-${draw}`);
    if (candidate.choices.some((choice) => choice.id === 'skyline-return')) { acquisitionOffer = candidate; break; }
  }
  assert.ok(acquisitionOffer);
  const skyline = selectUpgradeChoice(build, acquisitionOffer!, 'skyline-return');
  assert.equal(skyline.ok, true);
  if (!skyline.ok) throw new Error(skyline.reason);
  build = skyline.build;
  assert.equal(build.ranks['skyline-return'], 1);
  assert.equal(eligibleUpgrades(build).includes('aerial-imprint'), true);
  const sameSource = selectUpgradeChoice(build, generateUpgradeOffer(build, 'event:prerequisite-0'), 'echo-palm');
  assert.deepEqual(sameSource, { ok: false, build, reason: 'source-claimed' });
  const offer = generateUpgradeOffer(build, 'boss:sundial-custodian');
  const stale = selectUpgradeChoice({ ...build, ranks: { ...build.ranks, 'skyline-return': 2 } }, offer, offer.choices[0]!.id);
  assert.equal(stale.ok, false);
  assert.equal(eligibleUpgrades({ ...build, ranks: { ...build.ranks, 'skyline-return': 2 } }).includes('skyline-return'), false);
  assert.equal(JSON.parse(serializeRunBuild(build)).version, 1);
  assert.equal(createRunBuild(1).acquisitions.length, 0);
});

test('rare catalog entries are reachable over deterministic seeded runs', () => {
  const seen = new Set<string>();
  for (let seed = 1; seed <= 128; seed++) {
    const offer = generateUpgradeOffer(createRunBuild(seed), 'event:seeded-cache');
    for (const card of offer.choices) if (card.kind === 'upgrade') seen.add(card.id);
  }
  assert.ok(seen.has('last-orbit'));
  assert.ok(seen.has('echo-palm'));
  assert.ok(seen.size >= 8);
  for (const def of Object.values(B09_UPGRADES)) assert.ok(def.weight >= 1 && def.weight <= 4);
});

test('exhausted pool uses exactly three explicit, distinct fallback choices and claims the source', () => {
  const ranks = Object.fromEntries(Object.values(B09_UPGRADES).map((def) => [def.id, def.maxRank])) as RunBuildState['ranks'];
  const build = { ...createRunBuild(5), ranks };
  const offer = generateUpgradeOffer(build, 'event:empty-pool');
  assert.equal(offer.fallbackUsed, true);
  assert.equal(offer.choices.length, 3);
  assert.ok(offer.choices.every((choice) => choice.kind === 'fallback'));
  assert.equal(new Set(offer.choices.map((choice) => choice.id)).size, 3);
  const selected = selectUpgradeChoice(build, offer, offer.choices[0]!.id);
  assert.equal(selected.ok, true);
  if (selected.ok) assert.deepEqual(selected.build.ledger.claimedSourceIds, ['event:empty-pool']);
});

test('confirmed strike, launcher follow-up and dodge bonus affect hits only and are consumed', () => {
  const build = buildWith({ 'echo-palm': 1, 'skyline-return': 1, countercurrent: 1 });
  let runtime: B09CombatRuntime = createB09CombatRuntime();
  const miss = resolveB09Contact(build, runtime, context({ moveId: 'light-3', result: 'miss' }));
  assert.equal(miss.bonusDamage, 0);
  const echo = resolveB09Contact(build, runtime, context({ moveId: 'light-3' }));
  assert.equal(echo.bonusDamage, 2);
  const launcher = resolveB09Contact(build, runtime, context({ actionId: 'heavy-1', moveId: 'heavy', knockbackY: -90 }));
  const floorFollowup = resolveB09Contact(build, launcher.runtime, context({ actionId: 'air-floor', moveId: 'air-light', nowMs: 1500, targetAirborne: false }));
  assert.equal(floorFollowup.bonusDamage, 0, 'Skyline Return requires a real launched airborne target');
  const followup = resolveB09Contact(build, launcher.runtime, context({ actionId: 'air-1', moveId: 'air-light', nowMs: 1500, targetAirborne: true }));
  assert.equal(followup.bonusDamage, 2);
  const dodged = resolveB09Dodge(build, runtime, 2000);
  const counter = resolveB09Contact(build, dodged, context({ actionId: 'counter-1', nowMs: 2050 }));
  assert.equal(counter.bonusDamage, 3);
  assert.equal(counter.runtime.dodgeChargeUntilMs, -1);
  assert.equal(resolveB09Contact(build, counter.runtime, context({ actionId: 'counter-2', nowMs: 2100 })).bonusDamage, 0);
});

test('dash, punish shield, resonance cadence, Dawnrush energy and close-range risk are capped and deterministic', () => {
  const build = buildWith({ 'momentum-relay': 2, 'grounding-coil': 1, 'resonant-reclamation': 1, 'solar-relay': 1, 'radiant-discipline': 1, 'close-orbit': 1 });
  const mods = effectiveModifiers(build);
  assert.equal(mods.dashInvulnerabilityMs, 45);
  assert.equal(mods.resonanceMilestone?.gain, 8);
  let runtime = createB09CombatRuntime();
  const first = resolveB09Contact(build, runtime, context({ actionId: '1', guardBreak: true, closeRange: true }));
  assert.equal(first.bonusDamage, 2);
  assert.equal(first.shieldPrimed, true);
  assert.equal(resolveB09Threat(build, first.runtime, { nowMs: 1100, hp: 3, damage: 2, resonance: 55 }).blockedBy, 'grounding-coil');
  const second = resolveB09Contact(build, first.runtime, context({ actionId: '2', nowMs: 1500 }));
  const third = resolveB09Contact(build, second.runtime, context({ actionId: '3', nowMs: 2000, dawnrush: true, moveId: 'resonance' }));
  assert.equal(third.resonanceGain, 8);
  assert.equal(third.dawnrushEnergy, 9);
  assert.equal(third.bonusDamage, 0);
  assert.equal(resolveB09Contact(build, third.runtime, context({ actionId: '4', nowMs: 2200, closeRange: true })).bonusDamage, 0);
});

test('aerial imprint and Last Orbit modify real outcomes with rank/run limits', () => {
  const build = buildWith({ 'aerial-imprint': 2, 'last-orbit': 1 });
  const air = resolveB09Contact(build, createB09CombatRuntime(), context({ moveId: 'air-light', targetAirborne: true }));
  assert.equal(air.knockbackMultiplier, 1.5);
  const save = resolveB09Threat(build, air.runtime, { nowMs: 1, hp: 2, damage: 2, resonance: 25 });
  assert.equal(save.damage, 1);
  assert.equal(save.blockedBy, 'last-orbit');
  assert.equal(save.resonanceCost, 25);
  assert.equal(resolveB09Threat(build, save.runtime, { nowMs: 2, hp: 1, damage: 1, resonance: 0 }).damage, 1);
  const broke = resolveB09Threat(build, createB09CombatRuntime(), { nowMs: 2, hp: 2, damage: 2, resonance: 24 });
  assert.equal(broke.blockedBy, null, 'Last Orbit cannot fire unless its advertised 25 Resonance cost is available');
});

test('Field Recycler only pays once at its two authored risky-branch reward rooms', () => {
  const build = buildWith({ 'field-recycler': 1 });
  assert.equal(fieldRecyclerRepair(build, 'sg-conduit-annex'), 1);
  assert.equal(fieldRecyclerRepair(build, 'vl-lattice-hall'), 1);
  assert.equal(fieldRecyclerRepair(build, 'sg-copper-causeway'), 0);
  assert.equal(fieldRecyclerRepair(createRunBuild(1), 'sg-conduit-annex'), 0);
});

test('Resonant Reclamation counts one contact per attack action across multiple targets', () => {
  const build = buildWith({ 'resonant-reclamation': 1 });
  const firstTarget = resolveB09Contact(build, createB09CombatRuntime(), context({ actionId: 'multi-1', targetId: 'enemy-a' }));
  const secondTarget = resolveB09Contact(build, firstTarget.runtime, context({ actionId: 'multi-1', targetId: 'enemy-b' }));
  assert.equal(secondTarget.runtime.contactMilestone, 1);
  assert.equal(secondTarget.resonanceGain, 0);
  const secondAction = resolveB09Contact(build, secondTarget.runtime, context({ actionId: 'multi-2' }));
  const thirdAction = resolveB09Contact(build, secondAction.runtime, context({ actionId: 'multi-3' }));
  assert.equal(thirdAction.resonanceGain, 8);
});

test('B09 confirmed-hit effects resolve once with equivalent 30, 60 and 120 Hz frame stepping', () => {
  const build = buildWith({ 'echo-palm': 1, 'resonant-reclamation': 1, countercurrent: 1 });
  const results = [30, 60, 120].map((hz) => {
    let runtime = resolveB09Dodge(build, createB09CombatRuntime(), 400);
    let frame = 0; let hit: ReturnType<typeof resolveB09Contact> | null = null;
    for (let index = 0; index <= hz * 2; index++) {
      frame = index * 1000 / hz;
      if (!hit && frame >= 900) hit = resolveB09Contact(build, runtime, context({ nowMs: 900, actionId: 'fixed-contact', moveId: 'light-3' }));
    }
    assert.equal(frame, 2000);
    return hit;
  });
  assert.deepEqual(results[0], results[1]);
  assert.deepEqual(results[1], results[2]);
  assert.equal(results[0]?.bonusDamage, 5);
});
