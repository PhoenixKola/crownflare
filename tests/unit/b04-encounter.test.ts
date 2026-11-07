import assert from 'node:assert/strict';
import test from 'node:test';
import { initialB04Encounter, recordB04Damage, recordB04Elapsed, stepB04Encounter } from '../../src/game/enemies/b04EncounterFlow.ts';

test('B04 progresses through both sentries, one shard, and an explicit exit', () => {
  let state = initialB04Encounter();
  state = stepB04Encounter(state, 'first-sentry-cleared');
  assert.equal(state.phase, 'reward');
  state = stepB04Encounter(state, 'claim-shard');
  assert.equal(state.phase, 'sentry-two');
  assert.equal(state.rewardClaimed, true);
  assert.equal(stepB04Encounter(state, 'claim-shard'), state);
  state = stepB04Encounter(state, 'second-sentry-cleared');
  assert.equal(state.phase, 'exit');
  state = stepB04Encounter(state, 'enter-gate');
  assert.equal(state.phase, 'victory');
  assert.equal(stepB04Encounter(state, 'player-defeated'), state);
});

test('B04 defeat is terminal until retry and retry clears run results', () => {
  const defeated = stepB04Encounter(initialB04Encounter(), 'player-defeated');
  assert.equal(defeated.phase, 'defeat');
  assert.equal(stepB04Encounter(defeated, 'first-sentry-cleared'), defeated);
  assert.deepEqual(stepB04Encounter(defeated, 'retry'), initialB04Encounter());
});

test('B04 result data records bounded elapsed time and incoming damage', () => {
  let state = recordB04Elapsed(initialB04Encounter(), 1000 / 60);
  state = recordB04Damage(state);
  state = recordB04Damage(state);
  assert.equal(state.damageTaken, 2);
  assert.equal(state.elapsedMs, 1000 / 60);
  assert.throws(() => recordB04Elapsed(state, -1), /Invalid B04 elapsed time step/);
});
