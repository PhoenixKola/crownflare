import test from 'node:test';
import assert from 'node:assert/strict';
import { B03_MOVES } from '../../src/game/combat/b03Moves.ts';
import { DAWNRUSH_MOVES, dawnrushMoveIds } from '../../src/game/combat/dawnrushMoves.ts';
import { dawnrushLocomotionFrame } from '../../src/game/animation/dawnrushAnimation.ts';
import { beginAction, idleClock, stepAction } from '../../src/game/combat/sim.ts';

test('Dawnrush has its own authored timings, reach, damage and signature identity', () => {
  assert.deepEqual(dawnrushMoveIds().sort(), Object.keys(B03_MOVES).sort());
  assert.equal(DAWNRUSH_MOVES.resonance.action.id, 'iona-dawnrush-solar-drive');
  assert.ok(DAWNRUSH_MOVES['light-1'].action.startupMs < B03_MOVES['light-1'].action.startupMs);
  assert.ok(DAWNRUSH_MOVES['light-3'].hitbox.width > B03_MOVES['light-3'].hitbox.width);
  assert.ok(DAWNRUSH_MOVES.heavy.damage > B03_MOVES.heavy.damage);
  assert.ok(DAWNRUSH_MOVES['air-light'].hitbox.height > 0);
});

test('Solar Drive emits exactly one authored contact on its deterministic timeline', () => {
  const move = DAWNRUSH_MOVES.resonance;
  let clock = beginAction(move.action);
  const events: string[] = [];
  for (let i = 0; i < 100 && clock.phase !== 'idle'; i += 1) {
    const next = stepAction(clock, move.action, 16);
    events.push(...next.events.map((event) => event.eventId));
    clock = next.clock;
  }
  assert.deepEqual(events, ['contact']);
  assert.equal(clock.phase, 'idle');
  assert.equal(idleClock.phase, 'idle');
});

test('Dawnrush locomotion animates and maintains distinct dash/run frames', () => {
  assert.notEqual(dawnrushLocomotionFrame('run', 0), dawnrushLocomotionFrame('run', 150));
  assert.equal(dawnrushLocomotionFrame('dash', 0), 'dash-streamline');
  assert.equal(dawnrushLocomotionFrame('dash-recovery', 0), 'dash-brake');
});
