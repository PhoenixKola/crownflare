export type DawnrushFormState =
  | 'base'
  | 'anticipation' | 'ignition' | 'silhouette' | 'dawnrush'
  | 'reverting-contract' | 'reverting-release' | 'reverting-handoff';

export type DawnrushActivationMode = 'showcase' | 'combat';
export type DawnrushFormStep = {
  readonly state: DawnrushFormState;
  readonly phaseMs: number;
  readonly energy: number;
  readonly transitions: readonly DawnrushFormState[];
};

export const DAWNRUSH_ENERGY_DRAIN_PER_MS = 0.006;
export const DAWNRUSH_REVERSION_PHASES = [120, 140, 160] as const;
export const DAWNRUSH_FINISHER_REQUIREMENTS = { resonance: 60, energy: 25, cooldownMs: 2800 } as const;

export function canUseDawnrushFinisher(value: {
  readonly state: DawnrushFormState;
  readonly phaseMs: number;
  readonly energy: number;
  readonly resonance: number;
  readonly cooldownMs: number;
}): boolean {
  return value.state === 'dawnrush' && value.phaseMs <= 0 && value.energy >= DAWNRUSH_FINISHER_REQUIREMENTS.energy
    && value.resonance >= DAWNRUSH_FINISHER_REQUIREMENTS.resonance && value.cooldownMs <= 0;
}

export function canSwitchDawnrushForm(value: {
  readonly state: DawnrushFormState;
  readonly phaseMs: number;
  readonly playerHp: number;
  readonly hurtMs: number;
  readonly dashMs: number;
  readonly moveActive: boolean;
}): boolean {
  if (value.playerHp <= 0 || value.hurtMs > 0 || value.dashMs > 0 || value.moveActive) return false;
  return value.state === 'base' || value.state === 'dawnrush' && value.phaseMs <= 0;
}

export function dawnrushActivationPhases(mode: DawnrushActivationMode): readonly [number, number, number] {
  return mode === 'showcase' ? [500, 600, 600] : [200, 240, 280];
}

export function beginDawnrushReversion(state: DawnrushFormState, energy = 0): DawnrushFormStep {
  if (state === 'base' || state.startsWith('reverting-')) return { state, phaseMs: 0, energy, transitions: [] };
  return { state: 'reverting-contract', phaseMs: DAWNRUSH_REVERSION_PHASES[0], energy, transitions: ['reverting-contract'] };
}

export function stepDawnrushForm(
  initial: DawnrushFormStep,
  deltaMs: number,
  mode: DawnrushActivationMode,
): DawnrushFormStep {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new Error('Invalid Dawnrush lifecycle step');
  let { state, phaseMs, energy } = initial;
  let remaining = deltaMs;
  const transitions: DawnrushFormState[] = [];
  const activation = dawnrushActivationPhases(mode);

  while (remaining > 0 && state !== 'base') {
    if (state === 'dawnrush') {
      const drainMs = Math.min(remaining, phaseMs > 0 ? phaseMs : remaining);
      const energyMs = Math.min(drainMs, energy / DAWNRUSH_ENERGY_DRAIN_PER_MS);
      energy = Math.max(0, energy - energyMs * DAWNRUSH_ENERGY_DRAIN_PER_MS);
      phaseMs = Math.max(0, phaseMs - energyMs);
      remaining -= energyMs;
      if (energy === 0) {
        state = 'reverting-contract';
        phaseMs = DAWNRUSH_REVERSION_PHASES[0];
        transitions.push(state);
        continue;
      }
      if (phaseMs > 0 || remaining <= 0) break;
      continue;
    }

    if (phaseMs > remaining) {
      phaseMs -= remaining;
      remaining = 0;
      break;
    }
    remaining -= phaseMs;
    phaseMs = 0;
    if (state === 'anticipation') {
      state = 'ignition'; phaseMs = activation[1];
    } else if (state === 'ignition') {
      state = 'silhouette'; phaseMs = activation[2];
    } else if (state === 'silhouette') {
      state = 'dawnrush'; phaseMs = 240;
    } else if (state === 'reverting-contract') {
      state = 'reverting-release'; phaseMs = DAWNRUSH_REVERSION_PHASES[1];
    } else if (state === 'reverting-release') {
      state = 'reverting-handoff'; phaseMs = DAWNRUSH_REVERSION_PHASES[2];
    } else if (state === 'reverting-handoff') {
      state = 'base'; phaseMs = 0;
    } else break;
    transitions.push(state);
  }
  return { state, phaseMs, energy, transitions };
}
