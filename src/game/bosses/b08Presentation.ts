import type { B08BossRuntime } from './b08BossTypes.ts';

/** Time-sliced use of existing authored boss key poses for visible windup and phase transitions. */
export function b08PresentationPose(boss: B08BossRuntime): string {
  if (boss.phase === 'ko') return 'ko';
  if (boss.phase === 'phase-change') {
    if (boss.id === 'sundial-custodian') return boss.phaseMs < 210 ? 'ready' : 'phase-2';
    if (boss.id === 'spoolheart-regent') return Math.floor(boss.phaseMs / 150) % 2 === 0 ? 'rewind' : 'phase-2';
    return boss.phaseMs < 230 ? 'phase-change' : 'phase-2';
  }
  if (boss.phaseNumber === 2 && boss.phase === 'recovery') return 'phase-2';
  if (boss.hurtMs > 0) return boss.id === 'spoolheart-regent' ? 'rewind' : 'hurt';
  if (boss.phase === 'intro') return boss.phaseMs > 300 ? 'ready' : 'idle';

  let tellPose = 'cleave-telegraph';
  let strikePose = 'cleave';
  if (boss.id === 'sundial-custodian') {
    tellPose = boss.pattern === 'zenith-stamp' ? 'stamp-telegraph' : 'sweep-telegraph';
    strikePose = boss.pattern === 'zenith-stamp' ? 'stamp' : 'sweep';
  } else if (boss.id === 'spoolheart-regent') {
    tellPose = boss.pattern === 'thread-drop' ? 'thread-telegraph' : 'lash-telegraph';
    strikePose = boss.pattern === 'thread-drop' ? 'thread-drop' : boss.pattern === 'spindle-rewind' ? 'rewind' : 'lash';
  } else if (boss.pattern === 'daybreak-afterglow') {
    tellPose = 'cleave-telegraph'; strikePose = 'afterglow';
  }

  if (boss.phase === 'telegraph') return boss.phaseMs < 130 ? 'ready' : tellPose;
  if (boss.phase === 'commit') return boss.phaseMs < 70 ? tellPose : strikePose;
  if (boss.id === 'broken-meridian') return 'core-exposed';
  if (boss.id === 'spoolheart-regent' && boss.pattern === 'spindle-rewind') return 'rewind';
  return 'ready';
}
