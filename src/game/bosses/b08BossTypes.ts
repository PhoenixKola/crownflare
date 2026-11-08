export type B08BossId = 'sundial-custodian' | 'spoolheart-regent' | 'broken-meridian';
export type B08BossPatternId = 'glassline-sweep' | 'zenith-stamp' | 'loom-lash' | 'thread-drop' | 'spindle-rewind' | 'meridian-cleave' | 'daybreak-afterglow';
export type B08BossPhase = 'intro' | 'telegraph' | 'commit' | 'recovery' | 'phase-change' | 'ko';
export type B08BossPattern = {
  readonly id: B08BossPatternId;
  readonly tellMs: number;
  readonly activeMs: number;
  readonly recoveryMs: number;
  readonly vulnerableMs: number;
};
export type B08BossProfile = {
  readonly id: B08BossId;
  readonly name: string;
  readonly epithet: string;
  readonly hp: number;
  readonly width: number;
  readonly height: number;
  readonly introMs: number;
  readonly phaseChangeMs: number;
  readonly vulnerabilityThreshold: number;
  readonly patterns: readonly B08BossPattern[];
  readonly audioPrefix: string;
};
export type B08BossRuntime = {
  readonly id: B08BossId;
  readonly hp: number;
  readonly maxHp: number;
  readonly phase: B08BossPhase;
  readonly phaseMs: number;
  readonly hurtMs: number;
  readonly phaseNumber: 1 | 2;
  readonly patternIndex: number;
  readonly attackSequence: number;
  readonly attackId: string;
  readonly pattern: B08BossPatternId | null;
  readonly x: number;
  readonly y: number;
  readonly facing: -1 | 1;
  readonly targetX: number;
  readonly safeX: number;
  readonly alreadyHit: boolean;
  readonly accumulatorMs: number;
};
export type B08BossPlayerFrame = { readonly x: number; readonly y: number; readonly width: number; readonly height: number; readonly hp: number; readonly invulnerableMs: number; readonly dashInvulnerableMs: number };
export type B08BossRect = { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number };
export type B08BossEvent =
  | { readonly type: 'telegraph' | 'strike' | 'recovery' | 'phase-change' | 'ko'; readonly bossId: B08BossId; readonly attackId: string; readonly pattern: B08BossPatternId | null; readonly phaseNumber: 1 | 2; readonly rects: readonly B08BossRect[]; readonly safeX: number }
  | { readonly type: 'player-hit'; readonly bossId: B08BossId; readonly attackId: string; readonly pattern: B08BossPatternId; readonly damage: number; readonly playerX: number; readonly playerY: number; readonly rects: readonly B08BossRect[] };
