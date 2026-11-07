export const IONA_B01E_AUDIO_CUES = [
  'step-a', 'step-b', 'jump', 'land', 'dash-start', 'dash-brake',
  'palm-whoosh', 'palm-hit', 'kick-whoosh', 'kick-hit',
  'forearm-whoosh', 'forearm-hit', 'miss',
] as const;

export type IonaB01eAudioCue = typeof IONA_B01E_AUDIO_CUES[number];
export type IonaCombatResolution = 'hit' | 'miss';

export function ionaB01eWhooshForMove(moveId: string): IonaB01eAudioCue | null {
  if (moveId === 'iona-base-combo-1') return 'palm-whoosh';
  if (moveId === 'iona-base-combo-2') return 'kick-whoosh';
  if (moveId === 'iona-base-combo-3') return 'forearm-whoosh';
  return null;
}

export function ionaB01eResolutionCue(moveId: string, result: IonaCombatResolution): IonaB01eAudioCue {
  if (result === 'miss') return 'miss';
  if (moveId === 'iona-base-combo-1') return 'palm-hit';
  if (moveId === 'iona-base-combo-2') return 'kick-hit';
  if (moveId === 'iona-base-combo-3') return 'forearm-hit';
  return 'palm-hit';
}

/** Guards one authoritative simulation event against duplicated presentation hooks. */
export class IonaB01eAudioEventGate {
  private readonly played = new Set<string>();

  accept(token: string): boolean {
    if (!token || this.played.has(token)) return false;
    this.played.add(token);
    if (this.played.size > 128) this.played.delete(this.played.values().next().value as string);
    return true;
  }
}

export function isIonaRunContactFrame(frameId: string): boolean {
  return frameId === 'run-0' || frameId === 'run-3';
}
