import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultSave, parseSave, SAVE_NAMESPACE, PREVIOUS_SAVE_NAMESPACE, LEGACY_SAVE_NAMESPACE, persistSave, loadSave, recordRunResult } from '../../src/game/persistence/save.ts';
import { advanceB07Room, chooseB07Route, initialB07Route } from '../../src/game/rooms/b07RouteAssembly.ts';
import { createRunBuild } from '../../src/game/roguelite/b09RunBuild.ts';

test('save namespace is project-specific and versioned', () => assert.equal(SAVE_NAMESPACE, 'project-crownflare:save:v2'));
test('missing, corrupt and future-version data produce safe defaults', () => {
  assert.deepEqual(parseSave(null), defaultSave());
  assert.deepEqual(parseSave('{oops'), defaultSave());
  assert.deepEqual(parseSave('{"version":88}'), defaultSave());
});
test('V1 options and completed runs migrate explicitly into V2', () => {
  const migrated = parseSave(JSON.stringify({ version: 1, options: { reduceMotion: true, masterVolume: .4 }, meta: { completedRuns: 7 } }));
  assert.equal(migrated.version, 2); assert.equal(migrated.options.reduceMotion, true); assert.equal(migrated.options.masterVolume, .4);
  assert.equal(migrated.meta.completedRuns, 7); assert.equal(migrated.activeRun, null);
});
test('V2 roundtrip verifies integrity and restores previous valid snapshot after corruption', () => {
  const store = new Map<string, string>();
  const st = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); } };
  assert.equal(persistSave(st, defaultSave()), true);
  const first = loadSave(st); assert.equal(first.revision, 1);
  assert.equal(persistSave(st, { ...first, options: { ...first.options, masterVolume: .3 } }), true);
  assert.equal(loadSave(st).options.masterVolume, .3);
  assert.ok(store.has(PREVIOUS_SAVE_NAMESPACE));
  store.set(SAVE_NAMESPACE, '{bad');
  assert.equal(loadSave(st).options.masterVolume, .8);
  const tampered = JSON.parse(JSON.stringify(first)); tampered.meta.completedRuns = 999;
  assert.equal(parseSave(JSON.stringify(tampered)).meta.completedRuns, 0);
});
test('legacy V1 key migrates without deleting its source', () => {
  const store = new Map<string, string>([[LEGACY_SAVE_NAMESPACE, JSON.stringify({ version: 1, options: { reduceMotion: true, masterVolume: .55 }, meta: { completedRuns: 2 } })]]);
  const loaded = loadSave({ getItem: (key) => store.get(key) ?? null, setItem: (key, value) => { store.set(key, value); } });
  assert.equal(loaded.meta.completedRuns, 2); assert.equal(loaded.options.masterVolume, .55); assert.equal(store.has(LEGACY_SAVE_NAMESPACE), true);
  assert.equal(JSON.parse(store.get(SAVE_NAMESPACE) ?? 'null').version, 2);
  assert.equal(JSON.parse(store.get(SAVE_NAMESPACE) ?? 'null').meta.completedRuns, 2);
});
test('room-boundary checkpoint deep roundtrips route, upgrade ledger and durable resources', () => {
  const store = new Map<string, string>();
  const st = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); } };
  const seed = 0x1234abcd;
  const route = { ...chooseB07Route(advanceB07Room(initialB07Route(seed)), 'conduit-challenge'), rewarded: ['sg-breach-steps'], repairCharges: 2, resonance: 24 };
  const build = { ...createRunBuild(seed), ranks: { 'echo-palm': 1 as const }, acquisitions: [{ sourceId: 'room:sg-copper-causeway' as const, choiceId: 'echo-palm' as const, rank: 1, drawIndex: 0 }], ledger: { claimedSourceIds: ['room:sg-copper-causeway' as const] } };
  const checkpoint = { runId: 'test-run', seed, route, build, playerHp: 3, resonance: 62, dawnrushEnergy: 48, dawnrushActive: true, bossesCleared: ['sundial-custodian'], elapsedMs: 94000, damageTaken: 2, checkpointId: '1234abcd:2:sg-to-vesper-gate' };
  const before = { ...defaultSave(), activeRun: checkpoint };
  assert.equal(persistSave(st, before), true);
  const restored = loadSave(st).activeRun;
  assert.deepEqual(restored, checkpoint);
  assert.notEqual(restored, checkpoint);
});
test('victory/defeat result application is idempotent and unlocks only on victory', () => {
  const build = createRunBuild(91);
  const summary = { runId: 'one', result: 'victory' as const, seed: 91, elapsedMs: 13000, damageTaken: 1, visited: ['sg-breach-steps'], choices: {}, bossesCleared: ['sundial-custodian', 'spoolheart-regent', 'broken-meridian'], build };
  const first = recordRunResult(defaultSave(), summary);
  const second = recordRunResult(first, summary);
  assert.equal(first.meta.completedRuns, 1); assert.equal(second.meta.completedRuns, 1);
  assert.equal(second.meta.beaconAwakened, true); assert.equal(second.story.meridianEndingSeen, true); assert.equal(second.activeRun, null);
  const defeat = recordRunResult(defaultSave(), { ...summary, runId: 'two', result: 'defeat' });
  assert.equal(defeat.meta.completedRuns, 1); assert.equal(defeat.meta.beaconAwakened, false); assert.equal(defeat.story.meridianEndingSeen, false);
});
test('storage permission failures fall back and report writes safely', () => {
  assert.deepEqual(loadSave({ getItem: () => { throw new Error('blocked'); } }), defaultSave());
  assert.equal(persistSave({ getItem: () => null, setItem: () => { throw new Error('blocked'); } }, defaultSave()), false);
});
