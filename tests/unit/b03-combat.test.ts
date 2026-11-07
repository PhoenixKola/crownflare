import test from 'node:test';
import assert from 'node:assert/strict';
import { B03_MOVES, canCancelIntoCombo, resolveMoveContact } from '../../src/game/combat/b03Moves.ts';
import { beginAction, stepAction } from '../../src/game/combat/sim.ts';

test('B03 preserves the three B01C light-combo contact instants', () => {
  assert.deepEqual(['light-1', 'light-2', 'light-3'].map((id) => B03_MOVES[id as keyof typeof B03_MOVES].action.events[0]?.atMs), [112, 138, 165]);
});

test('B03 move contacts fire once with equivalent 30, 60 and 120 Hz stepping', () => {
  for (const fps of [30, 60, 120]) {
    const move = B03_MOVES['light-2'].action;
    let clock = beginAction(move);
    const seen: number[] = [];
    const delta = 1000 / fps;
    for (let i = 0; i < 100 && clock.phase !== 'idle'; i += 1) {
      const next = stepAction(clock, move, delta);
      clock = next.clock;
      seen.push(...next.events.map((event) => event.atMs));
    }
    assert.deepEqual(seen, [138], `${fps} Hz emitted contacts`);
  }
});

test('heavy, aerial and Resonance moves have separate timing, resource and geometry', () => {
  assert.equal(B03_MOVES.heavy.action.events[0]?.atMs, 275);
  assert.equal(B03_MOVES['air-light'].airborne, true);
  assert.equal(B03_MOVES.resonance.resonanceCost, 35);
  assert.ok(B03_MOVES.resonance.hitbox.width > B03_MOVES.heavy.hitbox.width);
});

test('authored hit shapes hit in front, miss behind, and respect height', () => {
  const move = B03_MOVES['light-1'];
  const player = { x: 100, footY: 120, facing: 1 as const };
  assert.equal(resolveMoveContact(move, player, { x: 128, footY: 120, width: 20, height: 28, hp: 3 }), 'hit');
  assert.equal(resolveMoveContact(move, player, { x: 72, footY: 120, width: 20, height: 28, hp: 3 }), 'miss');
  assert.equal(resolveMoveContact(move, player, { x: 128, footY: 65, width: 20, height: 20, hp: 3 }), 'miss');
});

test('contact resolves current moving-target position and never damages blocked or invulnerable targets', () => {
  const move = B03_MOVES['light-2'];
  const player = { x: 100, footY: 120, facing: 1 as const };
  const crossingTarget = { x: 146, footY: 120, width: 20, height: 28, hp: 3 };
  assert.equal(resolveMoveContact(move, player, crossingTarget), 'hit');
  assert.equal(resolveMoveContact(move, player, { ...crossingTarget, guarding: true }), 'blocked');
  assert.equal(resolveMoveContact(move, player, { ...crossingTarget, invulnerableMs: 10 }), 'invulnerable');
  assert.equal(resolveMoveContact(move, player, { ...crossingTarget, hp: 0 }), 'ko');
});

test('special pressure imprint is stopped by an authored obstacle', () => {
  const move = B03_MOVES.resonance;
  const player = { x: 100, footY: 120, facing: 1 as const };
  const target = { x: 165, footY: 120, width: 20, height: 28, hp: 3 };
  assert.equal(resolveMoveContact(move, player, target), 'hit');
  assert.equal(resolveMoveContact(move, player, target, [{ left: 130, right: 136, top: 65, bottom: 110 }]), 'obstructed');
});

test('combo buffer window is bounded to the authored recovery interval', () => {
  const first = B03_MOVES['light-1'];
  assert.equal(canCancelIntoCombo(first, 179), false);
  assert.equal(canCancelIntoCombo(first, 180), true);
  assert.equal(canCancelIntoCombo(first, 285), true);
  assert.equal(canCancelIntoCombo(first, 286), false);
});
