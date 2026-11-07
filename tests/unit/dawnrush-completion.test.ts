import test from 'node:test';
import assert from 'node:assert/strict';
import { DAWNRUSH_MOVES } from '../../src/game/combat/dawnrushMoves.ts';
import { beginAction, stepAction } from '../../src/game/combat/sim.ts';
import { beginDawnrushReversion, canSwitchDawnrushForm, canUseDawnrushFinisher, DAWNRUSH_FINISHER_REQUIREMENTS, dawnrushActivationPhases, stepDawnrushForm, type DawnrushFormStep } from '../../src/game/combat/dawnrushLifecycle.ts';
import { dawnrushMoveFrame } from '../../src/game/animation/dawnrushAnimation.ts';
import { resolveMoveContact } from '../../src/game/combat/b03Moves.ts';

function activation(mode: 'showcase' | 'combat'): DawnrushFormStep {
  const [first, second, third] = dawnrushActivationPhases(mode);
  let form: DawnrushFormStep = { state: 'anticipation', phaseMs: first, energy: 70, transitions: [] };
  for (const phase of [first, second, third]) {
    form = stepDawnrushForm(form, phase, mode);
  }
  return form;
}

test('activation keeps the 1.7s showcase and shortens the ordinary combat route to 720ms', () => {
  assert.equal(dawnrushActivationPhases('showcase').reduce((a, b) => a + b, 0), 1700);
  assert.equal(dawnrushActivationPhases('combat').reduce((a, b) => a + b, 0), 720);
  assert.equal(activation('showcase').state, 'dawnrush');
  assert.equal(activation('combat').state, 'dawnrush');
});

test('manual reversion and gauge depletion use the same three visible phases before Base', () => {
  const manual = beginDawnrushReversion('dawnrush', 40);
  assert.equal(manual.state, 'reverting-contract');
  let form = stepDawnrushForm(manual, 120, 'combat');
  assert.equal(form.state, 'reverting-release');
  form = stepDawnrushForm(form, 140, 'combat');
  assert.equal(form.state, 'reverting-handoff');
  form = stepDawnrushForm(form, 160, 'combat');
  assert.equal(form.state, 'base');
  assert.equal(form.energy, 40, 'reversion preserves the remaining Dawnrush gauge');

  const empty = stepDawnrushForm({ state: 'dawnrush', phaseMs: 0, energy: .05, transitions: [] }, 20, 'combat');
  assert.equal(empty.state, 'reverting-contract');
  assert.equal(empty.energy, 0);
});

test('transform input stays gated through damage, dash, attack and KO, while airborne activation remains allowed', () => {
  const base = { state: 'base' as const, phaseMs: 0, playerHp: 5, hurtMs: 0, dashMs: 0, moveActive: false };
  assert.equal(canSwitchDawnrushForm(base), true, 'a jump is not a form-switch blocker');
  assert.equal(canSwitchDawnrushForm({ ...base, hurtMs: 180 }), false, 'buffered form input waits until damage recovery');
  assert.equal(canSwitchDawnrushForm({ ...base, dashMs: 80 }), false, 'buffered form input waits until the dash settles');
  assert.equal(canSwitchDawnrushForm({ ...base, moveActive: true }), false, 'form input waits for the authoritative move clock');
  assert.equal(canSwitchDawnrushForm({ ...base, playerHp: 0 }), false, 'KO cannot activate a form');
  assert.equal(canSwitchDawnrushForm({ ...base, state: 'dawnrush', phaseMs: 20 }), false, 'entry settle cannot be interrupted');
  assert.equal(canSwitchDawnrushForm({ ...base, state: 'dawnrush' }), true, 'active form accepts manual reversion');

  const start = beginDawnrushReversion('dawnrush', 12);
  assert.equal(stepDawnrushForm(start, 60, 'combat').state, 'reverting-contract');
  assert.equal(stepDawnrushForm(start, 120, 'combat').state, 'reverting-release');
  const move = DAWNRUSH_MOVES['light-1'];
  assert.equal(resolveMoveContact(move, { x: 100, footY: 120, facing: 1 }, { x: 128, footY: 120, width: 20, height: 28, hp: 3, invulnerableMs: 0 }), 'hit');
});

test('each Dawnrush combo strike owns different anticipation, contact and recovery art', () => {
  const ids = ['light-1', 'light-2', 'light-3'] as const;
  const startup = ids.map((id) => DAWNRUSH_MOVES[id].animation.startup);
  const contact = ids.map((id) => dawnrushMoveFrame(id, 'active'));
  const recovery = ids.map((id) => dawnrushMoveFrame(id, 'recovery'));
  assert.equal(new Set(startup).size, 3);
  assert.equal(new Set(contact).size, 3);
  assert.equal(new Set(recovery).size, 3);
  assert.equal(dawnrushMoveFrame('light-1', 'active', 66), 'light-1-windup', 'anticipation remains until the authoritative contact event');
  assert.equal(dawnrushMoveFrame('light-1', 'active', DAWNRUSH_MOVES['light-1'].action.events[0]!.atMs), 'light-1-contact');
});

test('Dawnfall Breaker is earned, costs resources, uses authored timing, facing and obstructed short-range contact', () => {
  const move = DAWNRUSH_MOVES.finisher;
  assert.equal(move.resonanceCost, 60);
  assert.equal(move.dawnrushEnergyCost, 25);
  assert.equal(move.cooldownMs, 2800);
  assert.equal(move.damage, 5);
  assert.equal(move.action.events[0]?.atMs, 352);
  assert.equal(dawnrushMoveFrame('finisher', 'startup'), 'finisher-windup');
  assert.equal(dawnrushMoveFrame('finisher', 'active', 351), 'finisher-windup');
  assert.equal(dawnrushMoveFrame('finisher', 'active', 352), 'finisher-impact');
  assert.equal(dawnrushMoveFrame('finisher', 'recovery', 700), 'finisher-recovery');
  const eligible = { state: 'dawnrush' as const, phaseMs: 0, energy: 25, resonance: 60, cooldownMs: 0 };
  assert.equal(canUseDawnrushFinisher(eligible), true);
  assert.equal(canUseDawnrushFinisher({ ...eligible, resonance: 59 }), false);
  assert.equal(canUseDawnrushFinisher({ ...eligible, energy: 24 }), false);
  assert.equal(canUseDawnrushFinisher({ ...eligible, cooldownMs: 1 }), false);
  assert.equal(canUseDawnrushFinisher({ ...eligible, phaseMs: 1 }), false);
  assert.deepEqual(DAWNRUSH_FINISHER_REQUIREMENTS, { resonance: 60, energy: 25, cooldownMs: 2800 });

  const contacts: number[] = [];
  let clock = beginAction(move.action);
  while (clock.phase !== 'idle') {
    const next = stepAction(clock, move.action, 1000 / 60);
    clock = next.clock;
    contacts.push(...next.events.map((event) => event.atMs));
  }
  assert.deepEqual(contacts, [352]);
  const target = { x: 142, footY: 120, width: 22, height: 32, hp: 8 };
  assert.equal(resolveMoveContact(move, { x: 100, footY: 120, facing: 1 }, target), 'hit');
  assert.equal(resolveMoveContact(move, { x: 100, footY: 120, facing: -1 }, target), 'miss');
  assert.equal(resolveMoveContact(move, { x: 100, footY: 120, facing: 1 }, target, [{ left: 120, right: 126, top: 75, bottom: 110 }]), 'obstructed');
});
