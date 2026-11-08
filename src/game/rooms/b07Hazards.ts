import type { B07HazardDefinition } from './roomTypes';

export type B07HazardPhase = 'warning' | 'active' | 'recovery';
export type B07HazardFrame = { readonly phase: B07HazardPhase; readonly cycleTimeMs: number; readonly progress: number; readonly x?: number; readonly y?: number };

export function stepB07Hazard(hazard: B07HazardDefinition, elapsedMs: number): B07HazardFrame | null {
  if (hazard.kind === 'moving-lift') {
    const leg = hazard.travelMs + hazard.pauseMs;
    const fullCycle = leg * 2;
    const t = positiveMod(elapsedMs + (hazard.phaseOffsetMs ?? 0), fullCycle);
    const rising = t < leg;
    const travelTime = rising ? Math.min(t, hazard.travelMs) : Math.max(0, leg - (t - leg));
    const progress = Math.max(0, Math.min(1, travelTime / hazard.travelMs));
    return { phase: 'recovery', cycleTimeMs: t, progress, y: hazard.lowY + (hazard.highY - hazard.lowY) * progress };
  }
  const cycleTimeMs = positiveMod(elapsedMs + (hazard.phaseOffsetMs ?? 0), hazard.cycleMs);
  if (cycleTimeMs < hazard.warningMs) return { phase: 'warning', cycleTimeMs, progress: cycleTimeMs / hazard.warningMs };
  if (cycleTimeMs < hazard.warningMs + hazard.activeMs) return { phase: 'active', cycleTimeMs, progress: (cycleTimeMs - hazard.warningMs) / hazard.activeMs };
  return { phase: 'recovery', cycleTimeMs, progress: (cycleTimeMs - hazard.warningMs - hazard.activeMs) / hazard.recoveryMs };
}

/** Velocity for the current authored movement interval, in Arcade pixels/second. */
export function b07MovingLiftVelocity(hazard: Extract<B07HazardDefinition, { kind: 'moving-lift' }>, fromMs: number, toMs: number): number {
  const span = Math.max(0, toMs - fromMs);
  if (span <= 0) return 0;
  const from = stepB07Hazard(hazard, fromMs)?.y;
  const to = stepB07Hazard(hazard, toMs)?.y;
  if (from === undefined || to === undefined) return 0;
  return (to - from) * 1000 / span;
}

function positiveMod(value: number, modulus: number): number { return ((value % modulus) + modulus) % modulus; }
