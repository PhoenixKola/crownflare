import type { B08BossId, B08BossProfile, B08BossRuntime } from './b08BossTypes.ts';

export const B08_BOSS_PROFILES: Readonly<Record<B08BossId, B08BossProfile>> = {
  'sundial-custodian': {
    id: 'sundial-custodian', name: 'SUNDIAL CUSTODIAN', epithet: 'THE SEVERED NOON', hp: 22, width: 82, height: 110,
    introMs: 1300, phaseChangeMs: 1450, vulnerabilityThreshold: .52, audioPrefix: 'b08-sundial',
    patterns: [
      { id: 'glassline-sweep', tellMs: 920, activeMs: 280, recoveryMs: 2400, vulnerableMs: 2400 },
      { id: 'zenith-stamp', tellMs: 980, activeMs: 210, recoveryMs: 2400, vulnerableMs: 2400 },
    ],
  },
  'spoolheart-regent': {
    id: 'spoolheart-regent', name: 'SPOOLHEART REGENT', epithet: 'THE NIGHT-SIDE MECHANISM', hp: 25, width: 76, height: 112,
    introMs: 1350, phaseChangeMs: 1500, vulnerabilityThreshold: .52, audioPrefix: 'b08-spoolheart',
    patterns: [
      { id: 'loom-lash', tellMs: 900, activeMs: 250, recoveryMs: 2400, vulnerableMs: 2400 },
      { id: 'thread-drop', tellMs: 1040, activeMs: 240, recoveryMs: 2400, vulnerableMs: 2400 },
      { id: 'spindle-rewind', tellMs: 820, activeMs: 180, recoveryMs: 2400, vulnerableMs: 2400 },
    ],
  },
  'broken-meridian': {
    id: 'broken-meridian', name: 'THE BROKEN MERIDIAN', epithet: "THE SPINDLE'S LAST EQUATION", hp: 30, width: 96, height: 112,
    introMs: 1600, phaseChangeMs: 1750, vulnerabilityThreshold: .5, audioPrefix: 'b08-meridian',
    patterns: [
      { id: 'meridian-cleave', tellMs: 1120, activeMs: 310, recoveryMs: 2400, vulnerableMs: 2400 },
      { id: 'daybreak-afterglow', tellMs: 1080, activeMs: 420, recoveryMs: 2400, vulnerableMs: 2400 },
    ],
  },
};

export function createB08Boss(id: B08BossId, x = 720, y = 171): B08BossRuntime {
  const profile = B08_BOSS_PROFILES[id];
  return {
    id, hp: profile.hp, maxHp: profile.hp, phase: 'intro', phaseMs: 0, hurtMs: 0, phaseNumber: 1,
    patternIndex: 0, attackSequence: 0, attackId: `${id}:intro`, pattern: null,
    x, y, facing: -1, targetX: 180, safeX: 180, alreadyHit: false, accumulatorMs: 0,
  };
}
