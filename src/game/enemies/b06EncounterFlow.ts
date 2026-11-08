export type B06EncounterPhase = 'familiarization' | 'mixed' | 'escalation' | 'elite' | 'reward' | 'exit' | 'victory' | 'defeat';
export type B06EncounterEvent = 'wave-cleared' | 'claim-reward' | 'enter-exit' | 'player-defeated' | 'retry';
export type B06EncounterState = {
  readonly phase: B06EncounterPhase;
  readonly rewardClaimed: boolean;
  readonly wavesCleared: number;
  readonly damageTaken: number;
  readonly elapsedMs: number;
};

export const initialB06Encounter = (): B06EncounterState => ({ phase: 'familiarization', rewardClaimed: false, wavesCleared: 0, damageTaken: 0, elapsedMs: 0 });

export function stepB06Encounter(state: B06EncounterState, event: B06EncounterEvent): B06EncounterState {
  if (event === 'retry') return initialB06Encounter();
  if (state.phase === 'victory' || state.phase === 'defeat') return state;
  if (event === 'player-defeated') return { ...state, phase: 'defeat' };
  if (event === 'wave-cleared' && state.phase === 'familiarization') return { ...state, phase: 'mixed', wavesCleared: 1 };
  if (event === 'wave-cleared' && state.phase === 'mixed') return { ...state, phase: 'escalation', wavesCleared: 2 };
  if (event === 'wave-cleared' && state.phase === 'escalation') return { ...state, phase: 'elite', wavesCleared: 3 };
  if (event === 'wave-cleared' && state.phase === 'elite') return { ...state, phase: 'reward', wavesCleared: 4 };
  if (event === 'claim-reward' && state.phase === 'reward' && !state.rewardClaimed) return { ...state, phase: 'exit', rewardClaimed: true };
  if (event === 'enter-exit' && state.phase === 'exit') return { ...state, phase: 'victory' };
  return state;
}

export function recordB06Elapsed(state: B06EncounterState, deltaMs: number): B06EncounterState {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new Error('Invalid B06 elapsed time step');
  return state.phase === 'victory' || state.phase === 'defeat' ? state : { ...state, elapsedMs: state.elapsedMs + deltaMs };
}

export function recordB06Damage(state: B06EncounterState): B06EncounterState {
  return { ...state, damageTaken: state.damageTaken + 1 };
}
