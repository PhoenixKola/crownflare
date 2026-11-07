import type * as Phaser from 'phaser';

export type TextureClipFrame<TFacing extends string> = {
  readonly id: string;
  readonly facing: TFacing;
  readonly durationMs: number;
};

export type TextureClip<TFacing extends string> = {
  readonly key: string;
  readonly frames: readonly TextureClipFrame<TFacing>[];
  readonly repeat: number;
};

/** Shared registration for separately authored per-pose textures. Events remain presentation signals. */
export function registerTextureClips<TFacing extends string>(
  scene: Phaser.Scene,
  clips: readonly TextureClip<TFacing>[],
  assetKey: (id: string, facing: TFacing) => string,
): void {
  for (const clip of clips) {
    if (scene.anims.exists(clip.key)) continue;
    scene.anims.create({
      key: clip.key,
      frames: clip.frames.map((frame) => ({ key: assetKey(frame.id, frame.facing), frame: 0, duration: frame.durationMs })),
      // Keep frame-specific timings: Phaser adds them to this minimal parent duration.
      duration: 1,
      repeat: clip.repeat,
      skipMissedFrames: false,
    });
  }
}

export function missingTextureKeys<T extends { readonly id: string; readonly facing: TFacing }, TFacing extends string>(
  textures: readonly T[],
  assetKey: (id: string, facing: TFacing) => string,
  availableKeys: readonly string[],
): string[] {
  const available = new Set(availableKeys);
  return textures.map(({ id, facing }) => assetKey(id, facing)).filter((key) => !available.has(key));
}
