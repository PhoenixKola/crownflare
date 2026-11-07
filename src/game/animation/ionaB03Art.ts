export const IONA_B03_POSES = [
  'heavy-windup', 'heavy-contact', 'heavy-recovery',
  'air-windup', 'air-contact', 'air-recovery',
  'special-windup', 'special-contact', 'special-recovery',
  'hurt-flinch', 'hurt-stagger', 'hurt-ko',
] as const;
export type IonaB03Pose = typeof IONA_B03_POSES[number];
export type IonaB03Facing = 'left' | 'right';

export const IONA_B03_ENEMY_STATES = ['idle', 'telegraph', 'lunge', 'hurt', 'stagger', 'ko'] as const;
export type IonaB03EnemyState = typeof IONA_B03_ENEMY_STATES[number];

export const IONA_B03_VFX_FRAMES = ['resonance-wave-0', 'resonance-wave-1', 'resonance-wave-2', 'resonance-wave-3'] as const;

export function ionaB03PoseTexture(pose: IonaB03Pose, facing: IonaB03Facing): string {
  return `iona-b03-${pose}-${facing}`;
}

export function ionaB03EnemyTexture(state: IonaB03EnemyState): string {
  return `iona-b03-sentry-${state}`;
}

export const IONA_B03_ART_APPROVAL = {
  candidateManifest: 'art-source/manifests/iona-b03-candidate-v1.json',
  runtimePromotionEnabled: false,
  ownerApproval: 'PENDING_OWNER_REVIEW',
} as const;
