export type B04EncounterPhase = 'sentry-one' | 'reward' | 'sentry-two' | 'exit' | 'victory' | 'defeat';
export type B04EncounterEvent = 'first-sentry-cleared' | 'claim-shard' | 'second-sentry-cleared' | 'enter-gate' | 'player-defeated' | 'retry';

export type B04EncounterState = {
  readonly phase: B04EncounterPhase;
  readonly rewardClaimed: boolean;
  readonly damageTaken: number;
  readonly elapsedMs: number;
};

export const initialB04Encounter = (): B04EncounterState => ({ phase: 'sentry-one', rewardClaimed: false, damageTaken: 0, elapsedMs: 0 });

export function stepB04Encounter(state: B04EncounterState, event: B04EncounterEvent): B04EncounterState {
  if (event === 'retry') return initialB04Encounter();
  if (state.phase === 'victory' || state.phase === 'defeat') return state;
  if (event === 'player-defeated') return { ...state, phase: 'defeat' };
  if (event === 'first-sentry-cleared' && state.phase === 'sentry-one') return { ...state, phase: 'reward' };
  if (event === 'claim-shard' && state.phase === 'reward' && !state.rewardClaimed) return { ...state, phase: 'sentry-two', rewardClaimed: true };
  if (event === 'second-sentry-cleared' && state.phase === 'sentry-two') return { ...state, phase: 'exit' };
  if (event === 'enter-gate' && state.phase === 'exit') return { ...state, phase: 'victory' };
  return state;
}

export function recordB04Elapsed(state: B04EncounterState, deltaMs: number): B04EncounterState {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new Error('Invalid B04 elapsed time step');
  return state.phase === 'victory' || state.phase === 'defeat' ? state : { ...state, elapsedMs: state.elapsedMs + deltaMs };
}

export function recordB04Damage(state: B04EncounterState): B04EncounterState {
  return { ...state, damageTaken: state.damageTaken + 1 };
}
