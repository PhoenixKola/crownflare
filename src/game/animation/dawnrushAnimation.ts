import type { B03MoveId } from '../combat/b03Moves';

export const DAWNRUSH_LOCOMOTION_FRAMES = [
  'idle-ready', 'idle-breath-1', 'idle-breath-2', 'sprint-start',
  'run-forward-0', 'run-forward-1', 'run-crossing', 'run-contact',
  'jump-rise', 'jump-apex', 'jump-fall', 'landing',
  'dash-ignition', 'dash-streamline', 'dash-brake', 'turn-ready',
] as const;

export const DAWNRUSH_TRANSFORM_FRAMES = [
  'transform-anticipation', 'transform-ignition', 'transform-silhouette', 'transform-ready',
] as const;

export const DAWNRUSH_COMBAT_FRAMES = [
  'light-1-windup', 'light-1-contact', 'light-2-contact', 'light-3-contact', 'light-recovery',
  'heavy-windup', 'heavy-contact', 'heavy-recovery', 'aerial-windup', 'aerial-contact',
  'aerial-recovery', 'solar-gather', 'solar-ignite', 'solar-drive', 'solar-lash', 'solar-recovery',
] as const;

export const DAWNRUSH_VFX_FRAMES = [
  'fx-transform-ring', 'fx-silhouette-burst', 'fx-orbit-filaments', 'fx-dash-streak',
  'fx-palm-arc', 'fx-combo-arc', 'fx-impact-star', 'fx-solar-pressure-wave',
] as const;

export const DAWNRUSH_MOVE_FRAMES: Readonly<Record<B03MoveId, { startup: string; contact: string; recovery: string }>> = {
  'light-1': { startup: 'light-1-windup', contact: 'light-1-contact', recovery: 'light-recovery' },
  'light-2': { startup: 'light-1-windup', contact: 'light-2-contact', recovery: 'light-recovery' },
  'light-3': { startup: 'light-1-windup', contact: 'light-3-contact', recovery: 'light-recovery' },
  heavy: { startup: 'heavy-windup', contact: 'heavy-contact', recovery: 'heavy-recovery' },
  'air-light': { startup: 'aerial-windup', contact: 'aerial-contact', recovery: 'aerial-recovery' },
  resonance: { startup: 'solar-gather', contact: 'solar-drive', recovery: 'solar-recovery' },
};

export function dawnrushLocomotionFrame(state: 'idle' | 'run' | 'start' | 'turn' | 'rise' | 'apex' | 'fall' | 'land' | 'dash' | 'dash-recovery', elapsedMs: number): string {
  if (state === 'idle') return ['idle-ready', 'idle-breath-1', 'idle-ready', 'idle-breath-2'][Math.floor(elapsedMs / 210) % 4]!;
  if (state === 'run') return ['run-forward-0', 'run-forward-1', 'run-crossing', 'run-contact'][Math.floor(elapsedMs / 74) % 4]!;
  if (state === 'start') return 'sprint-start';
  if (state === 'turn') return 'turn-ready';
  if (state === 'rise') return 'jump-rise';
  if (state === 'apex') return 'jump-apex';
  if (state === 'fall') return 'jump-fall';
  if (state === 'land') return 'landing';
  if (state === 'dash') return 'dash-streamline';
  return 'dash-brake';
}

export function dawnrushMoveFrame(move: B03MoveId, phase: 'startup' | 'active' | 'recovery', elapsedMs = 0): string {
  if (move === 'resonance') {
    if (phase === 'startup') return 'solar-gather';
    if (phase === 'active') return elapsedMs < 225 ? 'solar-ignite' : elapsedMs < 275 ? 'solar-drive' : 'solar-lash';
    return elapsedMs < 360 ? 'solar-lash' : 'solar-recovery';
  }
  return DAWNRUSH_MOVE_FRAMES[move][phase === 'active' ? 'contact' : phase];
}
