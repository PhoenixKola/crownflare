import test from 'node:test';
import assert from 'node:assert/strict';
import { GamepadStartEdge } from '../../src/game/input/gamepadStartEdge.ts';

test('paused Start monitor ignores a button held across the pause boundary', () => {
  const edge = new GamepadStartEdge();
  edge.reset(true);
  assert.equal(edge.poll(true), false);
  assert.equal(edge.poll(false), false);
  assert.equal(edge.poll(true), true);
  assert.equal(edge.poll(true), false);
});

test('paused Start monitor resumes only on a fresh press after the controller connects', () => {
  const edge = new GamepadStartEdge();
  assert.equal(edge.poll(false), false);
  assert.equal(edge.poll(true), true);
  assert.equal(edge.poll(true), false);
  assert.equal(edge.poll(false), false);
  assert.equal(edge.poll(true), true);
});
