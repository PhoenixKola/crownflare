import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createB08Boss } from '../../src/game/bosses/b08BossProfiles.ts';
import { b08PresentationPose } from '../../src/game/bosses/b08Presentation.ts';
import { b08BossContactKey, b08BossIsVulnerable, damageB08Boss, stepB08Boss } from '../../src/game/bosses/b08BossDirector.ts';
import type { B08BossPlayerFrame, B08BossRuntime } from '../../src/game/bosses/b08BossTypes.ts';
import { B08_BOSS_ROOM_IDS, bossForB08Room } from '../../src/game/bosses/b08BossRoutes.ts';
import { seededB07Route } from '../../src/game/rooms/b07RouteAssembly.ts';

const player = (x: number, changes: Partial<B08BossPlayerFrame> = {}): B08BossPlayerFrame => ({ x, y: 226, width: 15, height: 30, hp: 5, invulnerableMs: 0, dashInvulnerableMs: 0, ...changes });
const artManifest = JSON.parse(readFileSync(new URL('../../public/assets/bosses/b08/asset-manifest.json', import.meta.url), 'utf8')) as { bosses: Record<string, { poses: string[] }> };
function run(boss: B08BossRuntime, frame: B08BossPlayerFrame, milliseconds: number) {
  let current = boss;
  const events = [] as ReturnType<typeof stepB08Boss>['events'][number][];
  for (let remaining = milliseconds; remaining > 0; remaining -= 50) {
    const result = stepB08Boss(current, frame, Math.min(50, remaining));
    current = result.boss; events.push(...result.events);
  }
  return { boss: current, events };
}

test('B08 boss attack does not strike before its authored telegraph ends', () => {
  const result = run(createB08Boss('sundial-custodian'), player(140), 2300);
  const tell = result.events.findIndex((event) => event.type === 'telegraph');
  const strike = result.events.findIndex((event) => event.type === 'strike');
  assert.ok(tell >= 0 && strike > tell);
  assert.equal(result.events.slice(0, tell).some((event) => event.type === 'strike'), false);
  assert.equal(result.events.filter((event) => event.type === 'player-hit').length, 1);
});

test('announced safe lane and active dodge invulnerability suppress boss contact', () => {
  const safe = run(createB08Boss('sundial-custodian'), player(300), 2300);
  assert.equal(safe.events.some((event) => event.type === 'player-hit'), false);
  const dodged = run(createB08Boss('spoolheart-regent'), player(140, { dashInvulnerableMs: 80 }), 2300);
  assert.equal(dodged.events.some((event) => event.type === 'player-hit'), false);
});

test('boss accepts damage only during recovery and advances to phase two at the authored threshold', () => {
  let state = createB08Boss('sundial-custodian');
  assert.equal(b08BossIsVulnerable(state), false);
  assert.equal(damageB08Boss(state, 3).hp, state.hp);
  const recovery = run(state, player(300), 2950).boss;
  assert.equal(recovery.phase, 'recovery');
  assert.equal(b08BossIsVulnerable(recovery), true);
  state = recovery;
  while (state.hp / state.maxHp > .52) state = damageB08Boss(state, 4);
  assert.equal(state.phase, 'phase-change');
  assert.equal(state.phaseNumber, 2);
});

test('B08 telegraphs and phase changes step through existing key poses at readable timing', () => {
  const sun = createB08Boss('sundial-custodian');
  assert.equal(b08PresentationPose({ ...sun, phase: 'telegraph', phaseMs: 0, pattern: 'glassline-sweep' }), 'ready');
  assert.equal(b08PresentationPose({ ...sun, phase: 'telegraph', phaseMs: 130, pattern: 'glassline-sweep' }), 'sweep-telegraph');
  assert.equal(b08PresentationPose({ ...sun, phase: 'commit', phaseMs: 0, pattern: 'glassline-sweep' }), 'sweep-telegraph');
  assert.equal(b08PresentationPose({ ...sun, phase: 'commit', phaseMs: 70, pattern: 'glassline-sweep' }), 'sweep');
  assert.equal(b08PresentationPose({ ...sun, phase: 'phase-change', phaseMs: 0 }), 'ready');
  assert.equal(b08PresentationPose({ ...sun, phase: 'phase-change', phaseMs: 210 }), 'phase-2');

  const spool = createB08Boss('spoolheart-regent');
  assert.equal(b08PresentationPose({ ...spool, phase: 'phase-change', phaseMs: 0 }), 'rewind');
  assert.equal(b08PresentationPose({ ...spool, phase: 'phase-change', phaseMs: 150 }), 'phase-2');
  const meridian = createB08Boss('broken-meridian');
  assert.equal(b08PresentationPose({ ...meridian, phase: 'phase-change', phaseMs: 0 }), 'phase-change');
  assert.equal(b08PresentationPose({ ...meridian, phase: 'phase-change', phaseMs: 230 }), 'phase-2');
});

test('all four B07 branch combinations reach the three B08 bosses in authored order', () => {
  for (const reach of ['safe-recovery', 'conduit-challenge'] as const) {
    for (const loom of ['spindle-lift', 'lattice-elite'] as const) {
      const route = seededB07Route(20261108, reach, loom);
      assert.equal(route.complete, true);
      const bosses = route.rooms.map(bossForB08Room).filter((boss) => boss !== null);
      assert.deepEqual(bosses, ['sundial-custodian', 'spoolheart-regent', 'broken-meridian']);
      assert.deepEqual(route.visited.slice(-2), ['vl-condensation-vault', 'vl-night-side-threshold']);
    }
  }
  assert.deepEqual(Object.values(B08_BOSS_ROOM_IDS), ['sg-resonance-gallery', 'vl-condensation-vault', 'vl-night-side-threshold']);
  assert.equal(bossForB08Room('sg-breach-steps'), null);
});

test('all authored boss patterns retain deterministic order at 30, 60 and 120 Hz', () => {
  const patterns = {
    'sundial-custodian': ['glassline-sweep', 'zenith-stamp'],
    'spoolheart-regent': ['loom-lash', 'thread-drop', 'spindle-rewind'],
    'broken-meridian': ['meridian-cleave', 'daybreak-afterglow'],
  } as const;
  for (const [id, expected] of Object.entries(patterns) as [keyof typeof patterns, readonly string[]][]) {
    const traces = [30, 60, 120].map((hz) => {
      let boss = createB08Boss(id);
      const trace: string[] = [];
      for (let frame = 0; frame < hz * 36; frame += 1) {
        const result = stepB08Boss(boss, player(300), 1000 / hz);
        boss = result.boss;
        for (const event of result.events) if (event.type === 'telegraph') trace.push(event.pattern);
      }
      return trace;
    });
    assert.deepEqual(traces[0], traces[1], `${id} differs at 30 and 60 Hz`);
    assert.deepEqual(traces[1], traces[2], `${id} differs at 60 and 120 Hz`);
    assert.deepEqual([...new Set(traces[0])].slice(0, expected.length), expected);
  }
});

test('all three bosses export the generated phase-two pose used by the live scene', () => {
  for (const id of ['sundial-custodian', 'spoolheart-regent', 'broken-meridian']) {
    assert.ok(artManifest.bosses[id]?.poses.includes('phase-2'), `${id} is missing its phase-two runtime pose`);
    assert.ok(existsSync(new URL(`../../public/assets/bosses/b08/${id}/phase-2.png`, import.meta.url)), `${id} phase-two PNG was not exported`);
  }
});

test('telegraph target and safe lane lock before commit; recovery damage reaches terminal KO', () => {
  let boss = createB08Boss('broken-meridian');
  const trace: string[] = [];
  for (let i = 0; i < 80 && boss.phase !== 'telegraph'; i += 1) boss = stepB08Boss(boss, player(300), 50).boss;
  const target = boss.targetX;
  const safe = boss.safeX;
  for (let i = 0; i < 20; i += 1) boss = stepB08Boss(boss, player(820), 50).boss;
  assert.equal(boss.targetX, target);
  assert.equal(boss.safeX, safe);
  while (boss.phase !== 'recovery') {
    const result = stepB08Boss(boss, player(820), 50);
    boss = result.boss;
    trace.push(...result.events.map((event) => event.type));
  }
  assert.ok(trace.includes('strike'));
  let guard = 0;
  while (boss.hp > 0 && guard++ < 20) {
    if (!b08BossIsVulnerable(boss)) boss = run(boss, player(300), 120).boss;
    if (boss.phase === 'phase-change') boss = run(boss, player(300), 2000).boss;
    if (boss.phase === 'telegraph' || boss.phase === 'commit') boss = run(boss, player(300), 2200).boss;
    if (boss.phase === 'recovery' && b08BossIsVulnerable(boss)) boss = damageB08Boss(boss, 30);
  }
  assert.equal(boss.phase, 'ko');
  assert.equal(boss.hp, 0);
  assert.equal(stepB08Boss(boss, player(300), 10000).boss, boss);
});

test('contact deduplication allows one hit per unique swing while rejecting event repeats', () => {
  const firstSwing = b08BossContactKey(1, 'iona-base-combo-1', 'contact', 'sundial-custodian');
  assert.equal(b08BossContactKey(1, 'iona-base-combo-1', 'contact', 'sundial-custodian'), firstSwing);
  assert.notEqual(b08BossContactKey(2, 'iona-base-combo-1', 'contact', 'sundial-custodian'), firstSwing);
});
