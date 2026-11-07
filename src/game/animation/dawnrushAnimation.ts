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
export const DAWNRUSH_REVERSION_FRAMES = ['revert-contract', 'revert-release', 'revert-handoff', 'revert-ready'] as const;

export const DAWNRUSH_COMBAT_FRAMES = [
  'light-1-windup', 'light-1-contact', 'light-1-recovery',
  'light-2-windup', 'light-2-contact', 'light-2-recovery',
  'light-3-windup', 'light-3-contact', 'light-3-recovery',
  'hurt-flinch', 'hurt-stagger', 'hurt-ko', 'hurt-recovery',
  'heavy-windup', 'heavy-contact', 'heavy-recovery', 'aerial-windup', 'aerial-contact',
  'aerial-recovery', 'solar-gather', 'solar-ignite', 'solar-drive', 'solar-lash', 'solar-recovery',
  'finisher-windup', 'finisher-impact', 'finisher-release', 'finisher-recovery',
] as const;

export const DAWNRUSH_VFX_FRAMES = [
  'fx-transform-ring', 'fx-silhouette-burst', 'fx-orbit-filaments', 'fx-dash-streak',
  'fx-palm-arc', 'fx-combo-arc', 'fx-impact-star', 'fx-solar-pressure-wave',
] as const;

export const DAWNRUSH_AURA_FRAME_GROUPS = {
  pressure: ['fx-pressure-0', 'fx-pressure-1', 'fx-pressure-2', 'fx-pressure-3'],
  orbit: ['fx-orbit-0', 'fx-orbit-1', 'fx-orbit-2', 'fx-orbit-3'],
  speed: ['fx-speed-0', 'fx-speed-1', 'fx-speed-2', 'fx-speed-3'],
  finisher: ['fx-finisher-0', 'fx-finisher-1', 'fx-finisher-2', 'fx-finisher-3'],
} as const;
export const DAWNRUSH_AURA_FRAMES = Object.values(DAWNRUSH_AURA_FRAME_GROUPS).flat();

export const DAWNRUSH_MOVE_FRAMES: Readonly<Record<B03MoveId, { startup: string; contact: string; recovery: string }>> = {
  'light-1': { startup: 'light-1-windup', contact: 'light-1-contact', recovery: 'light-1-recovery' },
  'light-2': { startup: 'light-2-windup', contact: 'light-2-contact', recovery: 'light-2-recovery' },
  'light-3': { startup: 'light-3-windup', contact: 'light-3-contact', recovery: 'light-3-recovery' },
  heavy: { startup: 'heavy-windup', contact: 'heavy-contact', recovery: 'heavy-recovery' },
  'air-light': { startup: 'aerial-windup', contact: 'aerial-contact', recovery: 'aerial-recovery' },
  resonance: { startup: 'solar-gather', contact: 'solar-drive', recovery: 'solar-recovery' },
  finisher: { startup: 'finisher-windup', contact: 'finisher-impact', recovery: 'finisher-recovery' },
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
  const contactAtMs: Readonly<Record<B03MoveId, number>> = {
    'light-1': 91, 'light-2': 112, 'light-3': 149, heavy: 220, 'air-light': 130, resonance: 251, finisher: 352,
  };
  if (move === 'finisher') {
    if (phase === 'startup') return 'finisher-windup';
    if (phase === 'active') return elapsedMs < contactAtMs.finisher ? 'finisher-windup' : elapsedMs < 376 ? 'finisher-impact' : 'finisher-release';
    return elapsedMs < 565 ? 'finisher-release' : 'finisher-recovery';
  }
  if (move === 'resonance') {
    if (phase === 'startup') return 'solar-gather';
    if (phase === 'active') return elapsedMs < contactAtMs.resonance ? 'solar-ignite' : 'solar-drive';
    return elapsedMs < 360 ? 'solar-lash' : 'solar-recovery';
  }
  if (phase === 'active' && elapsedMs < contactAtMs[move]) return DAWNRUSH_MOVE_FRAMES[move].startup;
  return DAWNRUSH_MOVE_FRAMES[move][phase === 'active' ? 'contact' : phase];
}
