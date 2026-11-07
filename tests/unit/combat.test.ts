import test from 'node:test';
import assert from 'node:assert/strict';
import { beginAction, idleClock, stepAction, type ActionDef } from '../../src/game/combat/sim.ts';
const def: ActionDef = { id: 'test-strike', startupMs: 100, activeMs: 50, recoveryMs: 120, events: [{ id: 'contact', atMs: 108 }, { id: 'recover', atMs: 151 }] };
test('combat begins at startup with no phantom hit', () => { assert.equal(beginAction(def).phase,'startup'); assert.equal(stepAction(idleClock,def,400).events.length,0); });
test('contact event fires exactly once across uneven steps', () => { let clock=beginAction(def); const events:string[]=[]; for(const dt of [66,33,10,45,116]) {const next=stepAction(clock,def,dt); clock=next.clock; events.push(...next.events.map(x=>x.eventId));} assert.deepEqual(events,['contact','recover']); assert.equal(clock.phase,'idle'); });
test('action events are guarded to the definition lifetime', () => { assert.throws(() => beginAction({...def,events:[{id:'bad',atMs:500}]})); });
test('an event at the action start fires once on the first simulation step', () => {
  const starting: ActionDef = { id: 'start-event', startupMs: 0, activeMs: 10, recoveryMs: 0, events: [{ id: 'begin', atMs: 0 }] };
  const result = stepAction(beginAction(starting), starting, 0);
  assert.deepEqual(result.events.map((event) => event.eventId), ['begin']);
});
