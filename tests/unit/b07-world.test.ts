import assert from 'node:assert/strict';
import test from 'node:test';
import { b06EnemyIsGuarding, createB06Director, createB06Enemy, resolveB06MoveTargets, stepB06Director, type B06PlayerThreatFrame } from '../../src/game/enemies/b06EnemyModel.ts';
import { B03_MOVES } from '../../src/game/combat/b03Moves.ts';
import { advanceB07Room, chooseB07Route, collectB07Reward, currentB07Choice, initialB07Route, instantiateB07Room, seededB07Route } from '../../src/game/rooms/b07RouteAssembly.ts';
import { B07_ROOM_LIBRARY, B07_ROOM_BY_ID, enemyWorldForRoom } from '../../src/game/rooms/b07RoomLibrary.ts';
import { stepB07Hazard } from '../../src/game/rooms/b07Hazards.ts';
import { validateB07Library } from '../../src/game/rooms/b07Validation.ts';

test('B07 route choices reconverge at both regions and stay deterministic for a seed', () => {
  const safe = seededB07Route(2026, 'safe-recovery', 'spindle-lift');
  const challenge = seededB07Route(2026, 'conduit-challenge', 'lattice-elite');
  assert.equal(safe.complete, true);
  assert.equal(challenge.complete, true);
  assert.equal(safe.visited.at(-1), 'vl-night-side-threshold');
  assert.equal(safe.visited.at(-2), 'vl-condensation-vault');
  assert.ok(safe.visited.includes('sg-to-vesper-gate'));
  assert.ok(challenge.visited.includes('sg-to-vesper-gate'));
  assert.ok(safe.visited.includes('sg-copper-causeway'));
  assert.ok(challenge.visited.includes('sg-conduit-annex'));
  assert.ok(safe.visited.includes('vl-spindle-lift'));
  assert.ok(challenge.visited.includes('vl-lattice-hall'));
  assert.deepEqual(seededB07Route(2026, 'safe-recovery', 'spindle-lift'), safe);
  assert.notDeepEqual(instantiateB07Room(B07_ROOM_BY_ID.get('vl-lattice-hall')!, 2026), instantiateB07Room(B07_ROOM_BY_ID.get('vl-lattice-hall')!, 2027));
  assert.equal(safe.repairCharges, 3);
  assert.equal(safe.resonance, 14);
  assert.equal(challenge.resonance, 58);
});

test('B07 route menus appear at the authored branch nodes and reject unrelated options', () => {
  let route = initialB07Route(17);
  route = advanceB07Room(route);
  assert.equal(currentB07Choice(route), 'reach');
  assert.equal(chooseB07Route(route, 'lattice-elite'), route);
  route = chooseB07Route(route, 'safe-recovery');
  assert.equal(route.rooms[1], 'sg-copper-causeway');
  route = advanceB07Room(route);
  route = advanceB07Room(route);
  route = advanceB07Room(route);
  assert.equal(currentB07Choice(route), 'loom');
  const reward = collectB07Reward(route);
  assert.equal(reward, route, 'the gate transition has no collectible reward');
});

test('B07 Base reachability and room data validate across the authored library', () => {
  assert.equal(B07_ROOM_LIBRARY.filter((room) => room.region === 'sunderglass-reach').length, 5);
  assert.equal(B07_ROOM_LIBRARY.filter((room) => room.region === 'vesper-loomworks').length, 4);
  assert.deepEqual(validateB07Library(), []);
});

test('B07 hazard telegraphs precede active damage windows at 30, 60 and 120 Hz', () => {
  const hazard = B07_ROOM_BY_ID.get('vl-lattice-hall')!.hazards[0]!;
  let results: string[] = [];
  for (const hz of [30, 60, 120]) {
    let elapsed = 0;
    let state = '';
    let seen = new Set<string>();
    for (let frame = 0; frame < hz * 4; frame += 1) {
      const sample = stepB07Hazard(hazard, elapsed)!;
      if (state !== sample.phase) { seen.add(sample.phase); state = sample.phase; }
      elapsed += 1000 / hz;
    }
    results.push([...seen].join(','));
  }
  assert.deepEqual(results, ['warning,active,recovery', 'warning,active,recovery', 'warning,active,recovery']);
});

test('B07 moving lift stays inside its authored travel lane', () => {
  const lift = B07_ROOM_BY_ID.get('vl-spindle-lift')!.hazards.find((hazard) => hazard.kind === 'moving-lift')!;
  assert.equal(lift.kind, 'moving-lift');
  const start = stepB07Hazard(lift, 0)!;
  const top = stepB07Hazard(lift, lift.travelMs)!;
  assert.equal(start.y, lift.lowY);
  assert.equal(top.y, lift.highY);
  assert.ok(start.y! >= lift.lowY && start.y! <= lift.highY);
  assert.ok(top.y! >= lift.lowY && top.y! <= lift.highY);
});

test('B06 contact resolver leaves a whiff available, then deduplicates true contact', () => {
  const move = B03_MOVES['light-1'];
  const attacker = { x: 100, footY: 120, facing: 1 as const };
  const far = { id: 'moving-target', x: 250, y: 100, width: 25, height: 35, hp: 5, alive: true };
  const miss = resolveB06MoveTargets(move, attacker, [far], new Set());
  assert.equal(miss.contacts[0]?.result, 'miss');
  assert.equal(miss.hitTargets.has(far.id), false);
  const near = { ...far, x: 128 };
  const contact = resolveB06MoveTargets(move, attacker, [near], miss.hitTargets);
  assert.equal(contact.contacts[0]?.result, 'hit');
  const later = resolveB06MoveTargets(move, attacker, [near], contact.hitTargets);
  assert.equal(later.contacts.length, 0);
});

test('B06 enemies, guards, movement blockers and projectiles use the active room context', () => {
  const room = B07_ROOM_BY_ID.get('vl-lattice-hall')!;
  const world = enemyWorldForRoom(room);
  const bastion = createB06Enemy('elevated-bastion', 'pressure-bastion', 700, world, 'east-rib');
  assert.equal(bastion.y, 149, 'Bastion feet align to the authored elevated support surface');
  assert.equal(b06EnemyIsGuarding({ ...bastion, phase: 'guard', facing: -1 }, 680, 'light-1', 241), false, 'ground attacks do not hit the raised guard lane');
  assert.equal(b06EnemyIsGuarding({ ...bastion, phase: 'guard', facing: -1 }, 680, 'light-1', 177), true, 'matching-height front attacks meet the guard');

  const floorRoom = B07_ROOM_BY_ID.get('sg-conduit-annex')!;
  const floorWorld = enemyWorldForRoom(floorRoom);
  const runner = createB06Enemy('wall-runner', 'shardrunner', 400, floorWorld, 'annex-floor');
  const blockers = [{ left: 430, right: 440, top: 174, bottom: 241 }];
  let director = createB06Director([runner], floorWorld);
  const threat: B06PlayerThreatFrame = { x: 480, y: 226, width: 15, height: 30, hp: 5, invulnerableMs: 0, dashInvulnerableMs: 0 };
  for (let index = 0; index < 30; index += 1) director = stepB06Director(director, threat, 1000 / 60, blockers).state;
  assert.ok(director.enemies[0]!.x <= 410.1, `Shardrunner crossed its room blocker at ${director.enemies[0]!.x}`);

  const projectile = { id: 'edge-shot', ownerId: 'test', x: 950, y: 160, vx: 180, vy: 0, ageMs: 0, lifeMs: 2000, damage: 1, radius: 5 };
  director = { ...createB06Director([], floorWorld), projectiles: [projectile] };
  const outside = stepB06Director(director, threat, 100, []);
  assert.equal(outside.state.projectiles.length, 0, 'room-scoped projectile bounds release an out-of-room shot');
});
