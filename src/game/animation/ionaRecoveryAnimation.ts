export type RecoveryFacing = -1 | 1;
export type RecoveryAction = 'idle' | 'run' | 'jab';
export type RecoveryFrame = { readonly id: string; readonly durationMs: number; readonly pose: string };

export const IONA_RECOVERY_CLIPS: Readonly<Record<'idle' | 'run', readonly RecoveryFrame[]>> = {
  idle: [
    { id: 'idle-0', durationMs: 420, pose: 'ready' },
    { id: 'idle-1', durationMs: 260, pose: 'inhale' },
    { id: 'idle-2', durationMs: 300, pose: 'weight-settle' },
    { id: 'idle-3', durationMs: 420, pose: 'quiet-settle' },
  ],
  run: [
    { id: 'run-0', durationMs: 105, pose: 'forward-contact' },
    { id: 'run-1', durationMs: 95, pose: 'passing' },
    { id: 'run-2', durationMs: 90, pose: 'airborne' },
    { id: 'run-3', durationMs: 105, pose: 'opposite-contact' },
  ],
};

export const IONA_RECOVERY_JAB = {
  startupMs: 130,
  activeMs: 100,
  recoveryMs: 260,
  contactEventMs: 162,
  frameAtElapsed(elapsedMs: number): string {
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new Error('Invalid jab elapsed time');
    if (elapsedMs < 80) return 'jab-0';
    if (elapsedMs < this.startupMs) return 'jab-1';
    if (elapsedMs < this.startupMs + this.activeMs) return 'jab-2';
    if (elapsedMs < this.startupMs + this.activeMs + 120) return 'jab-3';
    return 'idle-3';
  },
} as const;

export const IONA_RECOVERY_FRAME_IDS = [
  'idle-0', 'idle-1', 'idle-2', 'idle-3',
  'run-0', 'run-1', 'run-2', 'run-3',
  'jab-0', 'jab-1', 'jab-2', 'jab-3',
] as const;

export function recoveryAssetKey(frameId: string, facing: RecoveryFacing): string {
  return `iona-recovery-${frameId}-${facing < 0 ? 'left' : 'right'}`;
}

export function recoveryFrameAt(clip: readonly RecoveryFrame[], elapsedMs: number): string {
  if (clip.length === 0 || !Number.isFinite(elapsedMs) || elapsedMs < 0 || clip.some((frame) => frame.durationMs <= 0)) {
    throw new Error('Invalid recovery animation clip/time');
  }
  const duration = clip.reduce((sum, frame) => sum + frame.durationMs, 0);
  let cursor = elapsedMs % duration;
  for (const frame of clip) {
    if (cursor < frame.durationMs) return frame.id;
    cursor -= frame.durationMs;
  }
  return clip[clip.length - 1]!.id;
}

export function validateRecoveryAnimationAssets(assetKeys: readonly string[]): string[] {
  const available = new Set(assetKeys);
  return IONA_RECOVERY_FRAME_IDS.flatMap((id) => ([-1, 1] as const).map((facing) => recoveryAssetKey(id, facing)))
    .filter((key) => !available.has(key));
}
