import { B08_BOSS_PROFILES } from './b08BossProfiles.ts';
import type { B08BossEvent, B08BossPattern, B08BossPatternId, B08BossPlayerFrame, B08BossRect, B08BossRuntime } from './b08BossTypes.ts';

const STEP_MS = 1000 / 60;
const clamp = (value: number, low: number, high: number): number => Math.max(low, Math.min(high, value));

export function b08BossIsVulnerable(boss: B08BossRuntime): boolean {
  if (boss.phase !== 'recovery') return false;
  const profile = B08_BOSS_PROFILES[boss.id];
  const pattern = profile.patterns.find((entry) => entry.id === boss.pattern);
  return boss.phaseMs >= 120 && boss.phaseMs <= Math.min(pattern?.recoveryMs ?? 0, pattern?.vulnerableMs ?? 0);
}

export function damageB08Boss(boss: B08BossRuntime, amount: number): B08BossRuntime {
  if (boss.hp <= 0 || boss.phase === 'ko' || !b08BossIsVulnerable(boss)) return boss;
  const profile = B08_BOSS_PROFILES[boss.id];
  const hp = Math.max(0, boss.hp - Math.max(1, Math.trunc(amount)));
  if (hp === 0) return { ...boss, hp: 0, phase: 'ko', phaseMs: 0, attackId: `${boss.id}:ko`, pattern: null, alreadyHit: true };
  if (boss.phaseNumber === 1 && hp / boss.maxHp <= profile.vulnerabilityThreshold) {
    return { ...boss, hp, phase: 'phase-change', phaseMs: 0, phaseNumber: 2, attackId: `${boss.id}:phase-2`, pattern: null, alreadyHit: true };
  }
  return { ...boss, hp, hurtMs: 125, alreadyHit: true };
}

export function b08BossContactKey(sequence: number, actionId: string, eventId: string, bossId: string): string {
  return `${sequence}:${actionId}:${eventId}:b08-boss:${bossId}`;
}

function getPattern(boss: B08BossRuntime): B08BossPattern {
  const patterns = B08_BOSS_PROFILES[boss.id].patterns;
  const pattern = patterns[boss.patternIndex % patterns.length]!;
  return boss.phaseNumber === 2
    ? { ...pattern, tellMs: Math.max(690, pattern.tellMs - 130), activeMs: pattern.activeMs + 45, recoveryMs: Math.max(500, pattern.recoveryMs - 80) }
    : pattern;
}

export function b08BossAttackRects(boss: B08BossRuntime, pattern: B08BossPatternId | null = boss.pattern): readonly B08BossRect[] {
  const safe = boss.safeX;
  const gap = 58;
  if (pattern === 'zenith-stamp') return [{ left: boss.targetX - 42, right: boss.targetX + 42, top: 183, bottom: 241 }];
  if (pattern === 'thread-drop') return [{ left: boss.targetX - 34, right: boss.targetX + 34, top: 143, bottom: 241 }];
  if (pattern === 'spindle-rewind') return [];
  if (pattern === 'loom-lash') return [{ left: Math.min(boss.x, boss.targetX) - 18, right: Math.max(boss.x, boss.targetX) + 18, top: 194, bottom: 239 }];
  if (pattern === 'daybreak-afterglow') {
    const y0 = boss.attackSequence % 2 === 0 ? 190 : 210;
    const y1 = y0 + 25;
    return [
      { left: 88, right: Math.max(88, safe - gap), top: y0, bottom: y1 },
      { left: Math.min(872, safe + gap), right: 872, top: y0, bottom: y1 },
    ];
  }
  // Broad, ground-level sweep with a persistent, clearly marked safe lane.
  return [
    { left: 88, right: Math.max(88, safe - gap), top: 194, bottom: 239 },
    { left: Math.min(872, safe + gap), right: 872, top: 194, bottom: 239 },
  ];
}

function makeSafeLane(playerX: number): number {
  // The boss never aims the gap at the player's exact location. One of two
  // authored lanes is announced at wind-up, giving the player a real choice.
  return playerX < 480 ? 300 : 700;
}

function launchPattern(boss: B08BossRuntime, player: B08BossPlayerFrame): { boss: B08BossRuntime; event: B08BossEvent } {
  const pattern = getPattern(boss);
  const facing = player.x < boss.x ? -1 : 1;
  const next: B08BossRuntime = {
    ...boss,
    phase: 'telegraph', phaseMs: 0,
    attackId: `${boss.id}:${boss.attackSequence + 1}`,
    pattern: pattern.id, facing,
    targetX: clamp(player.x, 130, 830), safeX: makeSafeLane(player.x),
    attackSequence: boss.attackSequence + 1, alreadyHit: false,
  };
  return { boss: next, event: { type: 'telegraph', bossId: boss.id, attackId: next.attackId, pattern: pattern.id, phaseNumber: next.phaseNumber, rects: [], safeX: next.safeX } };
}

function intersects(a: B08BossRect, b: B08BossRect): boolean {
  return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
}

export function stepB08Boss(initial: B08BossRuntime, player: B08BossPlayerFrame, deltaMs: number): { readonly boss: B08BossRuntime; readonly events: readonly B08BossEvent[] } {
  if (initial.phase === 'ko') return { boss: initial, events: [] };
  let boss = initial;
  const events: B08BossEvent[] = [];
  let accumulatorMs = Math.min(100, Math.max(0, initial.accumulatorMs + deltaMs));
  let safety = 0;
  while (accumulatorMs + .0001 >= STEP_MS && safety < 6) {
    safety += 1;
    accumulatorMs -= STEP_MS;
    const phaseMs = boss.phaseMs + STEP_MS;
    boss = { ...boss, phaseMs, hurtMs: Math.max(0, boss.hurtMs - STEP_MS) };
    const profile = B08_BOSS_PROFILES[boss.id];
    if (boss.phase === 'intro' && phaseMs >= profile.introMs) {
      const launched = launchPattern({ ...boss, patternIndex: boss.patternIndex }, player);
      boss = launched.boss; events.push(launched.event);
      continue;
    }
    if (boss.phase === 'phase-change' && phaseMs >= profile.phaseChangeMs) {
      const launched = launchPattern(boss, player);
      boss = launched.boss; events.push(launched.event);
      continue;
    }
    const pattern = getPattern(boss);
    if (boss.phase === 'telegraph' && phaseMs >= pattern.tellMs) {
      boss = { ...boss, phase: 'commit', phaseMs: 0, alreadyHit: false };
      const rects = b08BossAttackRects(boss, pattern.id);
      events.push({ type: 'strike', bossId: boss.id, attackId: boss.attackId, pattern: pattern.id, phaseNumber: boss.phaseNumber, rects, safeX: boss.safeX });
      const playerRect = { left: player.x - player.width / 2, right: player.x + player.width / 2, top: player.y - player.height / 2, bottom: player.y + player.height / 2 };
      if (player.invulnerableMs > 0 || player.dashInvulnerableMs > 0) {
        // Keep the event for visuals/audio, but collision is suppressed by Iona's active dodge.
      } else if (rects.some((rect) => intersects(rect, playerRect))) {
        boss = { ...boss, alreadyHit: true };
        events.push({ type: 'player-hit', bossId: boss.id, attackId: boss.attackId, pattern: pattern.id, damage: 1, playerX: player.x, playerY: player.y, rects });
      }
      continue;
    }
    if (boss.phase === 'commit' && phaseMs >= pattern.activeMs) {
      boss = { ...boss, phase: 'recovery', phaseMs: 0, alreadyHit: false };
      events.push({ type: 'recovery', bossId: boss.id, attackId: boss.attackId, pattern: pattern.id, phaseNumber: boss.phaseNumber, rects: [], safeX: boss.safeX });
      continue;
    }
    if (boss.phase === 'recovery' && phaseMs >= pattern.recoveryMs) {
      const launched = launchPattern({ ...boss, patternIndex: boss.patternIndex + 1 }, player);
      boss = launched.boss; events.push(launched.event);
      continue;
    }
  }
  return { boss: { ...boss, accumulatorMs }, events };
}
