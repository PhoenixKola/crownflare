import assert from 'node:assert/strict';
import test from 'node:test';
import { B03_MOVES } from '../../src/game/combat/b03Moves.ts';
import { initialB06Encounter, recordB06Damage, recordB06Elapsed, stepB06Encounter } from '../../src/game/enemies/b06EncounterFlow.ts';
import {
  b06EnemyIsGuarding, createB06Director, createB06Enemy, resolveB06MoveTargets, spawnB06Projectile, stepB06Director,
  type B06EnemyRuntime, type B06PlayerThreatFrame,
} from '../../src/game/enemies/b06EnemyModel.ts';

const playerFrame = (overrides: Partial<B06PlayerThreatFrame> = {}): B06PlayerThreatFrame => ({
  x: 250, y: 226, width: 15, height: 30, hp: 5, invulnerableMs: 0, dashInvulnerableMs: 0, ...overrides,
});

test('B06 encounter flow is authored, rewards once, and gives a clear retry path', () => {
  let state = initialB06Encounter();
  for (const phase of ['mixed', 'escalation', 'elite', 'reward'] as const) {
    state = stepB06Encounter(state, 'wave-cleared');
    assert.equal(state.phase, phase);
  }
  state = stepB06Encounter(state, 'claim-reward');
  assert.equal(state.phase, 'exit');
  assert.equal(state.rewardClaimed, true);
  assert.equal(stepB06Encounter(state, 'claim-reward'), state);
  state = stepB06Encounter(state, 'enter-exit');
  assert.equal(state.phase, 'victory');
  state = recordB06Damage(recordB06Elapsed(state, 1000));
  assert.equal(state.elapsedMs, 0);
  assert.equal(state.damageTaken, 1);
  const defeat = stepB06Encounter(initialB06Encounter(), 'player-defeated');
  assert.equal(defeat.phase, 'defeat');
  assert.deepEqual(stepB06Encounter(defeat, 'retry'), initialB06Encounter());
});

test('B06 authored move contact resolves an AOE target once by stable ID', () => {
  const move = B03_MOVES.resonance;
  const attacker = { x: 100, footY: 120, facing: 1 as const };
  const targets = [
    { id: 'wave-2:wisp:1', archetype: 'orbit-wisp', x: 178, y: 106, width: 34, height: 28, hp: 4, alive: true },
    { id: 'wave-2:runner:1', archetype: 'shardrunner', x: 150, y: 111, width: 24, height: 20, hp: 4, alive: true },
  ];
  const first = resolveB06MoveTargets(move, attacker, targets, new Set());
  assert.deepEqual(first.contacts.map(({ target, result }) => [target.id, result]), [
    ['wave-2:runner:1', 'hit'], ['wave-2:wisp:1', 'hit'],
  ]);
  const second = resolveB06MoveTargets(move, attacker, targets, first.hitTargets);
  assert.equal(second.contacts.length, 0, 'one move instance cannot hit the same target again');
  assert.equal(second.hitTargets.size, 2);
});

test('B06 preserves behind-target and elevation misses in both facings', () => {
  const move = B03_MOVES['light-1'];
  const behind = { id: 'behind', x: 72, y: 106, width: 20, height: 28, hp: 3, alive: true };
  assert.equal(resolveB06MoveTargets(move, { x: 100, footY: 120, facing: 1 }, [behind], new Set()).contacts[0]?.result, 'miss');
  const airborne = { ...behind, id: 'airborne', x: 128, y: 66 };
  assert.equal(resolveB06MoveTargets(move, { x: 100, footY: 120, facing: 1 }, [airborne], new Set()).contacts[0]?.result, 'miss');
  const leftTarget = { ...behind, id: 'left', x: 72, y: 106 };
  assert.equal(resolveB06MoveTargets(move, { x: 100, footY: 120, facing: -1 }, [leftTarget], new Set()).contacts[0]?.result, 'hit');
});

test('Bastion guard faces the attacker and launcher moves break the brace', () => {
  const bastion = { ...createB06Enemy('wave-3:bastion:1', 'pressure-bastion', 300), facing: -1 as const, phase: 'guard' as const };
  assert.equal(b06EnemyIsGuarding(bastion, 250, 'light-1'), true);
  assert.equal(b06EnemyIsGuarding(bastion, 350, 'light-1'), false, 'rear attacks bypass the shield');
  assert.equal(b06EnemyIsGuarding(bastion, 250, 'heavy'), false, 'launcher counter bypasses the brace');
  const target = { id: bastion.id, x: 300, y: bastion.y, width: 52, height: 56, hp: 7, alive: true, guarding: true, guardBreakable: true };
  const regular = resolveB06MoveTargets(B03_MOVES['light-1'], { x: 270, footY: 241, facing: 1 }, [target], new Set());
  assert.equal(regular.contacts[0]?.result, 'blocked');
  const launcher = resolveB06MoveTargets(B03_MOVES.heavy, { x: 270, footY: 241, facing: 1 }, [target], new Set());
  assert.equal(launcher.contacts[0]?.result, 'hit');
  assert.equal(launcher.contacts[0]?.guardBreak, true);
});

function firstRunnerAttack(fps: number): { tellMs: number; strikeMs: number; directionAtCommit: number } {
  const runner = createB06Enemy('wave-1:shardrunner:1', 'shardrunner', 200);
  let state = createB06Director([runner]);
  let elapsed = 0;
  let tellMs = -1;
  let strikeMs = -1;
  let directionAtCommit = 0;
  const delta = 1000 / fps;
  for (let frame = 0; frame < fps * 3 && strikeMs < 0; frame += 1) {
    elapsed += delta;
    const changedPlayer = elapsed > 90 ? playerFrame({ x: 150 }) : playerFrame({ x: 250 });
    const result = stepB06Director(state, changedPlayer, delta);
    state = result.state;
    if (tellMs < 0 && result.events.some((event) => event.type === 'telegraph')) tellMs = elapsed;
    if (state.enemies[0]?.phase === 'commit' && directionAtCommit === 0) directionAtCommit = state.enemies[0].facing;
    if (strikeMs < 0 && result.events.some((event) => event.type === 'strike')) strikeMs = elapsed;
  }
  return { tellMs, strikeMs, directionAtCommit };
}

test('B06 telegraph and contact stay deterministic at 30, 60 and 120 Hz with locked attack direction', () => {
  const results = [30, 60, 120].map(firstRunnerAttack);
  for (const result of results) {
    assert.ok(result.tellMs > 0);
    assert.ok(result.strikeMs > result.tellMs + 500);
    assert.equal(result.directionAtCommit, 1, 'runner keeps the direction locked when Iona crosses behind it');
  }
  const strikeTimes = results.map((result) => result.strikeMs);
  assert.ok(Math.max(...strikeTimes) - Math.min(...strikeTimes) <= 34, `strike-time spread was ${strikeTimes.join(', ')}`);
});

test('B06 melee emits exactly one strike at its active contact frame, after the telegraph', () => {
  const runner = createB06Enemy('single-contact:runner', 'shardrunner', 200);
  let director = createB06Director([runner]);
  let elapsed = 0;
  const events: Array<{ type: string; at: number }> = [];
  while (elapsed < 1500) {
    const step = stepB06Director(director, playerFrame({ x: 250 }), 1000 / 60);
    director = step.state; elapsed += 1000 / 60;
    events.push(...step.events.map((event) => ({ type: event.type, at: Math.round(elapsed) })));
  }
  const tellAt = events.find((event) => event.type === 'telegraph')?.at ?? 0;
  const strikes = events.filter((event) => event.type === 'strike');
  assert.equal(strikes.length, 1, `one attack action emitted ${strikes.length} strike contacts`);
  assert.ok(strikes[0]!.at > tellAt + 500, 'the hit remains behind the authored telegraph');
});

test('B06 projectile has a single owner shot, is blocked by geometry, and expires', () => {
  const wisp: B06EnemyRuntime = { ...createB06Enemy('wave-2:orbit-wisp:1', 'orbit-wisp', 200), facing: 1, phase: 'recover', cooldownMs: 5000 };
  const player = playerFrame({ x: 440, y: 151 });
  let director = createB06Director([wisp]);
  director = spawnB06Projectile(director, wisp, player);
  director = spawnB06Projectile(director, wisp, player);
  assert.equal(director.projectiles.length, 1, 'one Wisp cannot stack shots');
  const blocker = [{ left: 260, right: 270, top: 125, bottom: 177 }];
  const events: string[] = [];
  for (let frame = 0; frame < 120 && director.projectiles.length > 0; frame += 1) {
    const result = stepB06Director(director, player, 1000 / 60, blocker);
    director = result.state;
    events.push(...result.events.map((event) => event.type));
  }
  assert.ok(events.includes('projectile-blocked'));
  assert.equal(director.projectiles.length, 0);

  let expiring = createB06Director([wisp]);
  expiring = { ...expiring, projectiles: [{ id: 'test-shot', ownerId: wisp.id, x: 200, y: 80, vx: 100, vy: 0, ageMs: 0, lifeMs: 40, damage: 1, radius: 4 }] };
  const expired = stepB06Director(expiring, playerFrame({ x: 700, y: 220 }), 100, []);
  assert.equal(expired.state.projectiles.length, 0, 'expired projectile releases its runtime record');
});

test('Orbit Wisp holds its authored open air lane instead of kiting across the arena', () => {
  const wisp = createB06Enemy('wave-2:orbit-wisp:1', 'orbit-wisp', 665);
  let state = createB06Director([wisp]);
  for (let tick = 0; tick < 240; tick += 1) {
    state = stepB06Director(state, playerFrame({ x: 625 }), 1000 / 60).state;
    const current = state.enemies[0]!;
    assert.ok(current.x >= wisp.homeX - 32 && current.x <= wisp.homeX + 32, `Wisp left its authored lane at ${current.x}`);
  }
});

test('B06 event/state creation is reproducible for the same stable wave IDs', () => {
  const make = (): ReturnType<typeof createB06Director> => createB06Director([
    createB06Enemy('wave-3:spindle-sentry:1', 'spindle-sentry', 790),
    createB06Enemy('wave-3:pressure-bastion:1', 'pressure-bastion', 890),
  ]);
  const left = make();
  const right = make();
  assert.deepEqual(left, right);
  const a = stepB06Director(left, playerFrame({ x: 650 }), 120, []);
  const b = stepB06Director(right, playerFrame({ x: 650 }), 120, []);
  assert.deepEqual(a, b);
});
