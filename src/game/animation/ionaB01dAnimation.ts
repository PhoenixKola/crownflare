import type * as Phaser from 'phaser';
import { IONA_B01C_CLIPS, IONA_B01C_FRAME_IDS, IONA_B01C_FACINGS, type IonaB01CFacing } from './ionaB01cAnimation.ts';
import { missingTextureKeys, registerTextureClips, type TextureClip } from './textureClips.ts';

export type IonaB01DFacing = IonaB01CFacing;
export type IonaB01DFrame = { readonly id: string; readonly facing: IonaB01DFacing; readonly durationMs: number };
export type IonaB01DClip = TextureClip<IonaB01DFacing>;

export const IONA_B01D_FRAME_IDS = IONA_B01C_FRAME_IDS.filter((id) => id !== 'run-4' && id !== 'run-5');
export const IONA_B01D_FACINGS = IONA_B01C_FACINGS;
export const IONA_B01D_TEXTURES: readonly { readonly id: string; readonly facing: IonaB01DFacing }[] =
  IONA_B01D_FRAME_IDS.flatMap((id) => IONA_B01D_FACINGS.map((facing) => ({ id, facing })));

export function ionaB01DAssetKey(id: string, facing: IonaB01DFacing): string {
  return `iona-b01d-${id}-${facing}`;
}

export function ionaB01DAnimationKey(clip: string): string {
  return `iona-b01d-${clip}`;
}

export const IONA_B01D_CLIPS: readonly IonaB01DClip[] = IONA_B01C_CLIPS.map((clip) => {
  const clipName = clip.key.replace(/^iona-b01c-/, '');
  const runFacing = clipName.match(/^run-(left|right)$/)?.[1] as IonaB01DFacing | undefined;
  if (runFacing) {
    return {
      ...clip,
      key: ionaB01DAnimationKey(clipName),
      // Four source poses keep the historical 420ms six-frame cycle cadence.
      frames: ['run-0', 'run-1', 'run-3', 'run-2'].map((id) => ({ id, facing: runFacing, durationMs: 105 })),
    };
  }
  return { ...clip, key: ionaB01DAnimationKey(clipName) };
});

export function registerIonaB01DAnimations(scene: Phaser.Scene): void {
  registerTextureClips(scene, IONA_B01D_CLIPS, ionaB01DAssetKey);
}

export function validateIonaB01DTextures(assetKeys: readonly string[]): string[] {
  return missingTextureKeys(IONA_B01D_TEXTURES, ionaB01DAssetKey, assetKeys);
}
