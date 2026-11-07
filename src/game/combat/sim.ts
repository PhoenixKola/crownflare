/** One deterministic action/event clock; callers resolve effects only when its typed events fire. */
export type ActionPhase = 'idle' | 'startup' | 'active' | 'recovery';
export type CombatEvent = { readonly actionId: string; readonly eventId: string; readonly atMs: number; readonly moveId?: string; readonly sourceId?: string; readonly targetId?: string };
export type ActionDef = { readonly id: string; readonly startupMs: number; readonly activeMs: number; readonly recoveryMs: number; readonly moveId?: string; readonly sourceId?: string; readonly targetId?: string; readonly events: readonly { readonly id: string; readonly atMs: number }[] };
export type CombatClock = { readonly elapsedMs: number; readonly phase: ActionPhase; readonly actionId: string | null; readonly emitted: readonly string[] };
export const idleClock: CombatClock = { elapsedMs: 0, phase: 'idle', actionId: null, emitted: [] };
export function beginAction(def: ActionDef): CombatClock {
  if ([def.startupMs, def.activeMs, def.recoveryMs].some((n) => !Number.isFinite(n) || n < 0)) throw new Error('Invalid action phase duration');
  const duration = def.startupMs + def.activeMs + def.recoveryMs;
  if (def.events.some((ev) => ev.atMs < 0 || ev.atMs > duration)) throw new Error('Action event outside lifetime');
  return { elapsedMs: 0, phase: 'startup', actionId: def.id, emitted: [] };
}
export function stepAction(clock: CombatClock, def: ActionDef, elapsedMs: number): { clock: CombatClock; events: CombatEvent[] } {
  if (clock.actionId !== def.id || clock.phase === 'idle') return { clock, events: [] };
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new Error('Invalid step duration');
  const previous = clock.elapsedMs;
  const next = previous + elapsedMs;
  const total = def.startupMs + def.activeMs + def.recoveryMs;
  const emitted = new Set(clock.emitted);
  const events: CombatEvent[] = [];
  for (const event of def.events) {
    if (event.atMs >= previous && event.atMs <= next && !emitted.has(event.id)) {
      emitted.add(event.id);
      events.push({
        actionId: def.id, eventId: event.id, atMs: event.atMs,
        ...(def.moveId ? { moveId: def.moveId } : {}),
        ...(def.sourceId ? { sourceId: def.sourceId } : {}),
        ...(def.targetId ? { targetId: def.targetId } : {}),
      });
    }
  }
  const phase: ActionPhase = next >= total ? 'idle' : next < def.startupMs ? 'startup' : next < def.startupMs + def.activeMs ? 'active' : 'recovery';
  return { clock: { elapsedMs: Math.min(next, total), phase, actionId: phase === 'idle' ? null : def.id, emitted: [...emitted] }, events };
}
