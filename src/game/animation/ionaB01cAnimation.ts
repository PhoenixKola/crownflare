import type * as Phaser from 'phaser';

export type IonaB01CFacing = 'left' | 'right';
export type IonaB01CFrame = { readonly id: string; readonly facing: IonaB01CFacing; readonly durationMs: number };
export type IonaB01CClip = { readonly key: string; readonly frames: readonly IonaB01CFrame[]; readonly repeat: number };

const frames = (ids: readonly string[], facing: IonaB01CFacing, durationMs: number): IonaB01CFrame[] =>
  ids.map((id) => ({ id, facing, durationMs }));

export const IONA_B01C_FRAME_IDS = [
  'idle-0', 'idle-1', 'idle-2', 'idle-3',
  'run-0', 'run-1', 'run-2', 'run-3', 'run-4', 'run-5',
  'jump-0', 'jump-1', 'jump-2', 'jump-3', 'jump-4', 'jump-5',
  'dash-0', 'dash-1', 'dash-2', 'dash-3', 'dash-4', 'dash-5',
  'combo-1-windup', 'combo-1-contact', 'combo-1-recovery',
  'combo-2-windup', 'combo-2-contact', 'combo-2-recovery',
  'combo-3-windup', 'combo-3-contact', 'combo-3-recovery',
  'start-0', 'start-1', 'stop-0', 'stop-1', 'turn-1',
] as const;

const COMBO_PHASE_MS = [
  [90, 80, 170],
  [110, 90, 170],
  [140, 100, 220],
] as const;

export const IONA_B01C_FACINGS = ['left', 'right'] as const;
export const IONA_B01C_TEXTURES: readonly { readonly id: string; readonly facing: IonaB01CFacing }[] =
  IONA_B01C_FRAME_IDS.flatMap((id) => IONA_B01C_FACINGS.map((facing) => ({ id, facing })));

export function ionaB01CAssetKey(id: string, facing: IonaB01CFacing): string {
  return `iona-b01c-${id}-${facing}`;
}

export function ionaB01CAnimationKey(clip: string): string {
  return `iona-b01c-${clip}`;
}

const sideClips = (name: string, facing: IonaB01CFacing, ids: readonly string[], durationMs: number, repeat = 0): IonaB01CClip => ({
  key: ionaB01CAnimationKey(`${name}-${facing}`),
  frames: frames(ids, facing, durationMs),
  repeat,
});

export const IONA_B01C_CLIPS: readonly IonaB01CClip[] = [
  ...IONA_B01C_FACINGS.flatMap((facing) => [
    sideClips('idle', facing, ['idle-0', 'idle-1', 'idle-2', 'idle-3'], 350, -1),
    sideClips('run', facing, ['run-0', 'run-1', 'run-2', 'run-3', 'run-4', 'run-5'], 70, -1),
    sideClips('start', facing, ['start-0', 'start-1'], 70),
    sideClips('stop', facing, ['stop-0', 'stop-1'], 70),
    sideClips('jump-takeoff', facing, ['jump-0', 'jump-1'], 40),
    sideClips('jump-rise', facing, ['jump-2'], 1000, -1),
    sideClips('jump-apex', facing, ['jump-3'], 1000, -1),
    sideClips('jump-fall', facing, ['jump-4'], 1000, -1),
    sideClips('jump-land', facing, ['jump-5'], 140),
    sideClips('dash', facing, ['dash-0', 'dash-1', 'dash-2', 'dash-3'], 31.25),
    sideClips('dash-recover', facing, ['dash-4', 'dash-5'], 50),
    ...COMBO_PHASE_MS.map(([windupMs, contactMs, recoveryMs], index) => ({
      key: ionaB01CAnimationKey(`combo-${index + 1}-${facing}`),
      frames: [
        { id: `combo-${index + 1}-windup`, facing, durationMs: windupMs },
        { id: `combo-${index + 1}-contact`, facing, durationMs: contactMs },
        { id: `combo-${index + 1}-recovery`, facing, durationMs: recoveryMs },
      ],
      repeat: 0,
    })),
  ]),
  {
    key: ionaB01CAnimationKey('turn-right-to-left'),
    frames: [
      { id: 'stop-1', facing: 'right', durationMs: 30 },
      { id: 'turn-1', facing: 'left', durationMs: 60 },
    ],
    repeat: 0,
  },
  {
    key: ionaB01CAnimationKey('turn-left-to-right'),
    frames: [
      { id: 'stop-1', facing: 'left', durationMs: 30 },
      { id: 'turn-1', facing: 'right', durationMs: 60 },
    ],
    repeat: 0,
  },
];

/** Register separate-file Phaser 4 animation clips; the world collider remains a separate 15x30 body. */
export function registerIonaB01CAnimations(scene: Phaser.Scene): void {
  for (const clip of IONA_B01C_CLIPS) {
    if (scene.anims.exists(clip.key)) continue;
    scene.anims.create({
      key: clip.key,
      frames: clip.frames.map((frame) => ({ key: ionaB01CAssetKey(frame.id, frame.facing), frame: 0, duration: frame.durationMs })),
      // Phaser adds frame-specific durations to the parent duration. A 1ms base keeps the authored per-frame timings intact.
      duration: 1,
      repeat: clip.repeat,
      skipMissedFrames: false,
    });
  }
}

export function validateIonaB01CTextures(assetKeys: readonly string[]): string[] {
  const available = new Set(assetKeys);
  return IONA_B01C_TEXTURES.map(({ id, facing }) => ionaB01CAssetKey(id, facing)).filter((key) => !available.has(key));
}
