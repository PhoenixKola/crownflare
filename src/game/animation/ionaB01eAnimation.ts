import type * as Phaser from 'phaser';
import { IONA_B01D_CLIPS, IONA_B01D_FRAME_IDS, IONA_B01D_FACINGS, type IonaB01DFacing } from './ionaB01dAnimation.ts';
import { missingTextureKeys, registerTextureClips, type TextureClip } from './textureClips.ts';

export type IonaB01EFacing = IonaB01DFacing;
export type IonaB01EClip = TextureClip<IonaB01EFacing>;
export type IonaLabCandidate = 'b01c'|'b01d'|'b01e';
export const IONA_B01E_FRAME_IDS = [...IONA_B01D_FRAME_IDS, 'combo-2-windup-1'] as const;
export const IONA_B01E_FACINGS = IONA_B01D_FACINGS;
export const IONA_B01E_TEXTURES: readonly { readonly id: string; readonly facing: IonaB01EFacing }[] =
  IONA_B01E_FRAME_IDS.flatMap((id) => IONA_B01E_FACINGS.map((facing) => ({ id, facing })));

export function ionaB01EAssetKey(id: string, facing: IonaB01EFacing): string {
  return `iona-b01e-${id}-${facing}`;
}

export function ionaB01EAnimationKey(clip: string): string {
  return `iona-b01e-${clip}`;
}

export function nextIonaLabCandidate(current: IonaLabCandidate): IonaLabCandidate {
  return current === 'b01c' ? 'b01d' : current === 'b01d' ? 'b01e' : 'b01c';
}

export const IONA_B01E_CLIPS: readonly IonaB01EClip[] = IONA_B01D_CLIPS.map((clip) => {
  const name = clip.key.replace(/^iona-b01d-/, '');
  const match = name.match(/^combo-2-(left|right)$/);
  if (match) {
    const facing = match[1] as IonaB01EFacing;
    return {
      key: ionaB01EAnimationKey(name), repeat: 0,
      frames: [
        { id: 'combo-2-windup', facing, durationMs: 55 },
        { id: 'combo-2-windup-1', facing, durationMs: 55 },
        { id: 'combo-2-contact', facing, durationMs: 90 },
        { id: 'combo-2-recovery', facing, durationMs: 170 },
      ],
    };
  }
  return { ...clip, key: ionaB01EAnimationKey(name) };
});

export function registerIonaB01EAnimations(scene: Phaser.Scene): void {
  registerTextureClips(scene, IONA_B01E_CLIPS, ionaB01EAssetKey);
}

export function validateIonaB01ETextures(assetKeys: readonly string[]): string[] {
  return missingTextureKeys(IONA_B01E_TEXTURES, ionaB01EAssetKey, assetKeys);
}
