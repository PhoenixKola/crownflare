export type IonaLocomotion = 'idle' | 'run' | 'jumpRise' | 'jumpApex' | 'fall' | 'land' | 'dash' | 'dashRecover' | 'start' | 'stop' | 'turn';
export type IonaFacing = -1 | 1;
export type IonaFrame = { readonly id: string; readonly durationMs: number };
export const IONA_CLIPS: Readonly<Record<IonaLocomotion, readonly IonaFrame[]>> = {
  idle: [{id:'idle-0',durationMs:180},{id:'idle-1',durationMs:220},{id:'idle-2',durationMs:180},{id:'idle-1',durationMs:220}],
  run: [{id:'run-0',durationMs:90},{id:'run-1',durationMs:100},{id:'run-2',durationMs:90},{id:'run-3',durationMs:100}],
  jumpRise: [{id:'jump-rise',durationMs:95}],
  jumpApex: [{id:'jump-apex',durationMs:115}],
  fall: [{id:'jump-fall',durationMs:100}],
  land: [{id:'land-0',durationMs:75},{id:'land-1',durationMs:100}],
  dash: [{id:'dash-0',durationMs:55},{id:'dash-1',durationMs:70}],
  dashRecover: [{id:'dash-recover',durationMs:100}],
  start: [{id:'start-0',durationMs:70}],
  stop: [{id:'stop-0',durationMs:85}],
  turn: [{id:'turn-0',durationMs:90}],
};
export const IONA_ATTACK_FRAMES = { windup:'hit-windup', contact:'hit-contact', recovery:'hit-recover' } as const;
export function frameAt(clip: readonly IonaFrame[], elapsedMs: number): string {
  if (clip.length === 0 || !Number.isFinite(elapsedMs) || elapsedMs < 0 || clip.some((frame) => frame.durationMs <= 0)) throw new Error('Invalid animation clip/time');
  const length = clip.reduce((sum, frame) => sum + frame.durationMs, 0);
  let cursor = elapsedMs % length;
  for (const frame of clip) {
    if (cursor < frame.durationMs) return frame.id;
    cursor -= frame.durationMs;
  }
  return clip[clip.length - 1]!.id;
}
export function animationAssetKey(frameId: string, facing: IonaFacing): string {
  return 'iona-' + frameId + '-' + (facing < 0 ? 'left' : 'right');
}
export function validateIonaAnimationAssets(assetKeys: readonly string[]): string[] {
  const available = new Set(assetKeys);
  const facings: IonaFacing[] = [-1,1];
  const required = Object.values(IONA_CLIPS).flatMap((clip) => clip.map((frame) => frame.id))
    .concat(Object.values(IONA_ATTACK_FRAMES));
  return [...new Set(required.flatMap((id) => facings.map((facing) => animationAssetKey(id,facing))))]
    .filter((key) => !available.has(key));
}
