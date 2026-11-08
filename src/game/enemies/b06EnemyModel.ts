import { combatantRect, isBlockedByRect, overlaps, resolveMoveContact, type B03MoveDefinition, type CombatRect, type ContactResult, type Facing } from '../combat/b03Moves.ts';
import type { EnemyWorldContext } from '../rooms/roomTypes.ts';

export type B06Archetype = 'spindle-sentry' | 'shardrunner' | 'orbit-wisp' | 'pressure-bastion' | 'cantor';
export type B06EnemyPhase = 'intro' | 'idle' | 'approach' | 'guard' | 'telegraph' | 'commit' | 'recover' | 'hurt' | 'stagger' | 'vulnerable' | 'ko';
export type B06EnemyAction = 'runner-dash' | 'sentry-lunge' | 'wisp-shot' | 'bastion-overhead' | 'cantor-sweep' | 'cantor-pulse' | null;

export type B06EnemyRuntime = {
  readonly id: string;
  readonly archetype: B06Archetype;
  readonly supportSurfaceId: string;
  readonly homeX: number;
  readonly x: number;
  readonly y: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly facing: -1 | 1;
  readonly phase: B06EnemyPhase;
  readonly phaseMs: number;
  readonly cooldownMs: number;
  readonly action: B06EnemyAction;
  readonly actionFacing: -1 | 1;
  readonly actionHit: boolean;
  readonly attackSequence: number;
  readonly hitstunMs: number;
  readonly knockbackX: number;
  readonly guardBrokenMs: number;
  readonly vulnerabilityMs: number;
};

export type B06Projectile = {
  readonly id: string;
  readonly ownerId: string;
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly ageMs: number;
  readonly lifeMs: number;
  readonly damage: number;
  readonly radius: number;
};

export type B06DirectorState = {
  readonly world: EnemyWorldContext;
  readonly enemies: readonly B06EnemyRuntime[];
  readonly projectiles: readonly B06Projectile[];
  readonly accumulatorMs: number;
  readonly eventSequence: number;
};

export type B06PlayerThreatFrame = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly hp: number;
  readonly invulnerableMs: number;
  readonly dashInvulnerableMs: number;
};

export type B06DirectorEvent =
  | { readonly type: 'telegraph'; readonly enemyId: string; readonly action: Exclude<B06EnemyAction, null>; readonly facing: -1 | 1 }
  | { readonly type: 'strike'; readonly enemyId: string; readonly action: Exclude<B06EnemyAction, null>; readonly facing: -1 | 1; readonly x: number; readonly y: number; readonly sequence: number }
  | { readonly type: 'projectile-fired'; readonly enemyId: string; readonly projectileId: string }
  | { readonly type: 'projectile-blocked'; readonly projectileId: string }
  | { readonly type: 'projectile-hit'; readonly enemyId: string; readonly projectileId: string }
  | { readonly type: 'enemy-recovered'; readonly enemyId: string };

export type B06EnemyContact = 'hit' | 'guard-break' | 'stagger' | 'interrupt';
export type B06CombatTargetShape = { readonly id: string; readonly archetype?: string; readonly x: number; readonly y: number; readonly width: number; readonly height: number; readonly hp: number; readonly alive: boolean; readonly invulnerableMs?: number; readonly guarding?: boolean; readonly guardBreakable?: boolean };
export type B06MoveContact = { readonly target: B06CombatTargetShape; readonly result: ContactResult; readonly guardBreak: boolean };

/** Immutable contact resolver: sorted stable target IDs and a retained per-move set prevent repeated AOE hits. */
export function resolveB06MoveTargets(
  move: B03MoveDefinition,
  attacker: { readonly x: number; readonly footY: number; readonly facing: Facing },
  targets: readonly B06CombatTargetShape[],
  alreadyHit: ReadonlySet<string>,
  blockers: readonly CombatRect[] = [],
): { readonly contacts: readonly B06MoveContact[]; readonly hitTargets: ReadonlySet<string> } {
  const hitTargets = new Set(alreadyHit);
  const contacts: B06MoveContact[] = [];
  for (const target of [...targets].sort((a, b) => a.id.localeCompare(b.id))) {
    if (hitTargets.has(target.id)) continue;
    const raw = resolveMoveContact(move, attacker, {
      x: target.x, footY: target.y + target.height / 2, width: target.width, height: target.height,
      hp: target.hp, alive: target.alive, invulnerableMs: target.invulnerableMs, guarding: target.guarding,
    }, blockers);
    // A whiff is not contact. Keep the target eligible if it legitimately enters
    // this move's live hitbox before the active window closes; once any real
    // contact outcome occurs, retain the ID for the life of this move instance.
    if (raw !== 'miss' && raw !== 'obstructed') hitTargets.add(target.id);
    const guardBreak = raw === 'blocked' && target.guardBreakable === true && ['heavy', 'air-light', 'light-3', 'finisher'].includes(move.id);
    contacts.push({ target, result: guardBreak ? 'hit' : raw, guardBreak });
  }
  return { contacts, hitTargets };
}

const FIXED_STEP_MS = 1000 / 60;
const MAX_FRAME_MS = 100;
const ENEMY_HP: Readonly<Record<B06Archetype, number>> = {
  'spindle-sentry': 6,
  shardrunner: 4,
  'orbit-wisp': 4,
  'pressure-bastion': 7,
  cantor: 12,
};
const GROUND_Y = 241;
// Keep the Wisp clearly airborne while allowing the standard jump arc to reach its body.
const WISP_Y = 168;
const WORLD_LEFT = 72;
const WORLD_RIGHT = 1488;
const DEFAULT_WORLD: EnemyWorldContext = {
  id: 'b06-sunderglass-arena',
  bounds: { left: WORLD_LEFT, right: WORLD_RIGHT, top: 0, bottom: 270 },
  projectileBounds: { left: WORLD_LEFT, right: WORLD_RIGHT, top: 20, bottom: 270 },
  groundTop: GROUND_Y,
  defaultSurfaceId: 'arena-floor',
  surfaces: [{ id: 'arena-floor', left: WORLD_LEFT, right: WORLD_RIGHT, top: GROUND_Y }],
  hoverLane: { minY: 72, maxY: 195, homeY: WISP_Y },
};

export const B06_ENEMY_PROFILES = {
  'spindle-sentry': { displayName: 'Fractured Spindle Sentry', width: 42, height: 48, moveSpeed: 48, wakeRange: 240, attackRange: 82, tellMs: 440, commitMs: 200, recoveryMs: 510, cooldownMs: 540 },
  shardrunner: { displayName: 'Shardrunner', width: 40, height: 54, moveSpeed: 78, wakeRange: 240, attackRange: 74, tellMs: 560, commitMs: 210, recoveryMs: 640, cooldownMs: 580 },
  'orbit-wisp': { displayName: 'Orbit Wisp', width: 38, height: 38, moveSpeed: 46, wakeRange: 270, attackRange: 225, tellMs: 860, commitMs: 170, recoveryMs: 540, cooldownMs: 920 },
  'pressure-bastion': { displayName: 'Pressure Bastion', width: 52, height: 56, moveSpeed: 30, wakeRange: 240, attackRange: 126, tellMs: 820, commitMs: 220, recoveryMs: 850, cooldownMs: 900 },
  cantor: { displayName: 'Cantor of the Split Ring', width: 54, height: 68, moveSpeed: 36, wakeRange: 270, attackRange: 178, tellMs: 840, commitMs: 220, recoveryMs: 660, cooldownMs: 720 },
} as const;

export function createB06Enemy(id: string, archetype: B06Archetype, x: number, world: EnemyWorldContext = DEFAULT_WORLD, supportSurfaceId = world.defaultSurfaceId): B06EnemyRuntime {
  const surface = world.surfaces.find((candidate) => candidate.id === supportSurfaceId) ?? world.surfaces.find((candidate) => candidate.id === world.defaultSurfaceId);
  if (!surface) throw new Error(`Enemy ${id} has no authored support surface in ${world.id}`);
  const bounds = surfaceLimits(surface, B06_ENEMY_PROFILES[archetype].width, world);
  const homeX = clamp(x, bounds.left, bounds.right);
  return {
    id, archetype, supportSurfaceId: surface.id, homeX, x: homeX,
    y: archetype === 'orbit-wisp' ? clamp(world.hoverLane.homeY, world.hoverLane.minY, world.hoverLane.maxY) : surface.top - B06_ENEMY_PROFILES[archetype].height / 2,
    hp: ENEMY_HP[archetype], maxHp: ENEMY_HP[archetype], facing: -1, phase: archetype === 'cantor' ? 'intro' : archetype === 'pressure-bastion' ? 'guard' : 'idle',
    phaseMs: 0, cooldownMs: archetype === 'cantor' ? 620 : 0, action: null, actionFacing: -1, actionHit: false,
    attackSequence: 0, hitstunMs: 0, knockbackX: 0, guardBrokenMs: 0, vulnerabilityMs: 0,
  };
}

export function createB06Director(enemies: readonly B06EnemyRuntime[] = [], world: EnemyWorldContext = DEFAULT_WORLD): B06DirectorState {
  return { world, enemies: [...enemies], projectiles: [], accumulatorMs: 0, eventSequence: 0 };
}

export function applyB06EnemyContact(enemy: B06EnemyRuntime, kind: B06EnemyContact, damage: number, knockbackX: number): B06EnemyRuntime {
  if (enemy.phase === 'ko' || enemy.hp <= 0) return enemy;
  const nextHp = Math.max(0, enemy.hp - Math.max(0, Math.round(damage)));
  if (nextHp <= 0) return { ...enemy, hp: 0, phase: 'ko', phaseMs: 0, action: null, actionHit: true, hitstunMs: 0, knockbackX: 0, guardBrokenMs: 0, vulnerabilityMs: 0 };
  const guardBroken = kind === 'guard-break';
  const interrupt = kind === 'interrupt' || kind === 'stagger' || guardBroken;
  return {
    ...enemy,
    hp: nextHp,
    phase: guardBroken ? 'vulnerable' : kind === 'stagger' ? 'stagger' : 'hurt',
    phaseMs: 0,
    action: null,
    actionHit: true,
    attackSequence: enemy.attackSequence + (interrupt ? 1 : 0),
    hitstunMs: guardBroken ? 980 : kind === 'stagger' ? 420 : 260,
    knockbackX,
    guardBrokenMs: guardBroken ? 2100 : Math.max(0, enemy.guardBrokenMs - 1),
    vulnerabilityMs: guardBroken ? 2100 : enemy.archetype === 'cantor' ? 760 : 0,
  };
}

export function b06EnemyIsGuarding(enemy: B06EnemyRuntime, playerX: number, moveId: string, playerFootY?: number): boolean {
  if (enemy.archetype !== 'pressure-bastion' || enemy.phase !== 'guard' || enemy.guardBrokenMs > 0) return false;
  if (playerFootY !== undefined && Math.abs(playerFootY - (enemy.y + B06_ENEMY_PROFILES[enemy.archetype].height / 2)) > 46) return false;
  const playerSide: -1 | 1 = playerX < enemy.x ? -1 : 1;
  if (playerSide !== enemy.facing) return false;
  // Launchers and committed finishers crack the brace; ordinary front-facing strikes are visibly blocked.
  return !['heavy', 'air-light', 'light-3', 'finisher'].includes(moveId);
}

export function stepB06Director(state: B06DirectorState, player: B06PlayerThreatFrame, deltaMs: number, blockers: readonly CombatRect[] = []): { state: B06DirectorState; events: B06DirectorEvent[] } {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new Error('Invalid B06 director step');
  let accumulatorMs = state.accumulatorMs + Math.min(MAX_FRAME_MS, deltaMs);
  let enemies = [...state.enemies];
  let projectiles = [...state.projectiles];
  let eventSequence = state.eventSequence;
  const events: B06DirectorEvent[] = [];
  let steps = 0;
  while (accumulatorMs + 1e-7 >= FIXED_STEP_MS && steps < 6) {
    accumulatorMs -= FIXED_STEP_MS;
    steps += 1;
    const threatBusy = enemies.some((enemy) => enemy.hp > 0 && (enemy.phase === 'telegraph' || enemy.phase === 'commit'));
    let attackClaimed = threatBusy;
    enemies = enemies.map((enemy) => {
      const hasOwnedProjectile = enemy.archetype === 'orbit-wisp' && projectiles.some((projectile) => projectile.ownerId === enemy.id);
      const result = stepEnemy(enemy, player, FIXED_STEP_MS, !attackClaimed && !hasOwnedProjectile, state.world, blockers);
      if (result.startedTell) attackClaimed = true;
      if (result.event) events.push(result.event);
      if (result.recovered) events.push({ type: 'enemy-recovered', enemyId: enemy.id });
      return result.enemy;
    });
    enemies = separateGroundEnemies(enemies, state.world);
    const projectileResult = stepProjectiles(projectiles, enemies, player, blockers, FIXED_STEP_MS, state.world);
    projectiles = projectileResult.projectiles;
    events.push(...projectileResult.events);
    eventSequence += events.length;
  }
  return { state: { world: state.world, enemies, projectiles, accumulatorMs: Math.max(0, accumulatorMs), eventSequence }, events };
}

function stepEnemy(enemy: B06EnemyRuntime, player: B06PlayerThreatFrame, dt: number, canAttack: boolean, world: EnemyWorldContext, blockers: readonly CombatRect[]): { enemy: B06EnemyRuntime; startedTell: boolean; recovered: boolean; event?: B06DirectorEvent } {
  if (enemy.phase === 'ko') return { enemy, startedTell: false, recovered: false };
  const profile = B06_ENEMY_PROFILES[enemy.archetype];
  const surface = world.surfaces.find((candidate) => candidate.id === enemy.supportSurfaceId) ?? world.surfaces.find((candidate) => candidate.id === world.defaultSurfaceId)!;
  const limits = surfaceLimits(surface, profile.width, world);
  const moveX = (requested: number): number => {
    const candidate = clamp(requested, limits.left, limits.right);
    const swept = { left: Math.min(enemy.x, candidate) - profile.width / 2, right: Math.max(enemy.x, candidate) + profile.width / 2, top: enemy.y - profile.height / 2, bottom: enemy.y + profile.height / 2 };
    return candidate !== enemy.x && blockers.some((blocker) => overlaps(swept, blocker)) ? enemy.x : candidate;
  };
  const dx = player.x - enemy.x;
  const distance = Math.abs(dx);
  const inView = distance <= 238;
  const facing: -1 | 1 = dx < 0 ? -1 : 1;
  let next = { ...enemy, cooldownMs: Math.max(0, enemy.cooldownMs - dt), guardBrokenMs: Math.max(0, enemy.guardBrokenMs - dt), vulnerabilityMs: Math.max(0, enemy.vulnerabilityMs - dt), facing: enemy.phase === 'telegraph' || enemy.phase === 'commit' ? enemy.facing : facing };
  if (enemy.phase === 'intro') return { enemy: enemy.phaseMs + dt >= 1180 ? { ...next, phase: 'idle', phaseMs: 0 } : { ...next, phaseMs: enemy.phaseMs + dt }, startedTell: false, recovered: false };
  if (enemy.hitstunMs > 0) {
    const hitstunMs = Math.max(0, enemy.hitstunMs - dt);
    next = { ...next, x: moveX(enemy.x + enemy.knockbackX * dt / 1000), hitstunMs, phaseMs: enemy.phaseMs + dt, knockbackX: enemy.knockbackX * .78 };
    if (hitstunMs === 0) next = { ...next, phase: enemy.vulnerabilityMs > 0 ? 'vulnerable' : enemy.archetype === 'pressure-bastion' && enemy.guardBrokenMs <= 0 ? 'guard' : 'idle', phaseMs: 0, knockbackX: 0, action: null };
    return { enemy: next, startedTell: false, recovered: false };
  }
  if (enemy.phase === 'telegraph') {
    const phaseMs = enemy.phaseMs + dt;
    if (phaseMs >= profile.tellMs) {
      const action = enemy.action ?? actionFor(enemy.archetype, enemy.attackSequence);
      next = { ...next, phase: 'commit', phaseMs: 0, action, actionFacing: enemy.facing, actionHit: false };
      // A melee action is only a threat when its authored active/contact frame arrives
      // below. Emitting `strike` here used to apply a second hit at commit start.
      const event: B06DirectorEvent | undefined = enemy.archetype === 'orbit-wisp'
        ? { type: 'projectile-fired', enemyId: enemy.id, projectileId: `${enemy.id}:shot:${enemy.attackSequence + 1}` }
        : undefined;
      return { enemy: next, startedTell: false, recovered: false, ...(event ? { event } : {}) };
    }
    return { enemy: { ...next, phaseMs }, startedTell: false, recovered: false };
  }
  if (enemy.phase === 'commit') {
    const phaseMs = enemy.phaseMs + dt;
    if (enemy.archetype === 'shardrunner') next = { ...next, x: moveX(enemy.x + enemy.actionFacing * 118 * dt / 1000) };
    if (enemy.archetype === 'spindle-sentry') next = { ...next, x: moveX(enemy.x + enemy.actionFacing * 200 * dt / 1000) };
    const contactAt = enemy.archetype === 'spindle-sentry' ? 88 : enemy.archetype === 'shardrunner' ? 76 : enemy.archetype === 'pressure-bastion' ? 132 : 92;
    const strike = !enemy.actionHit && enemy.phaseMs < contactAt && phaseMs >= contactAt && enemy.action
      ? { type: 'strike' as const, enemyId: enemy.id, action: enemy.action, facing: enemy.actionFacing, x: next.x, y: enemy.y, sequence: enemy.attackSequence + 1 }
      : undefined;
    if (phaseMs >= profile.commitMs) return { enemy: { ...next, phase: enemy.archetype === 'cantor' ? 'vulnerable' : 'recover', phaseMs: 0, cooldownMs: profile.cooldownMs, vulnerabilityMs: enemy.archetype === 'cantor' ? 720 : 0, attackSequence: enemy.attackSequence + 1, actionHit: true }, startedTell: false, recovered: false, ...(strike ? { event: strike } : {}) };
    return { enemy: { ...next, phaseMs, actionHit: strike ? true : enemy.actionHit }, startedTell: false, recovered: false, ...(strike ? { event: strike } : {}) };
  }
  if (enemy.phase === 'recover' || enemy.phase === 'vulnerable') {
    const phaseMs = enemy.phaseMs + dt;
    const duration = enemy.phase === 'vulnerable' ? Math.max(profile.recoveryMs, enemy.vulnerabilityMs) : profile.recoveryMs;
    if (phaseMs >= duration) return { enemy: { ...next, phase: enemy.archetype === 'pressure-bastion' ? 'guard' : 'idle', phaseMs: 0, action: null, vulnerabilityMs: 0 }, startedTell: false, recovered: true };
    return { enemy: { ...next, phaseMs }, startedTell: false, recovered: false };
  }
  if (!inView || distance > profile.wakeRange) return { enemy: { ...next, phase: enemy.archetype === 'pressure-bastion' ? 'guard' : 'idle', phaseMs: 0 }, startedTell: false, recovered: false };
  if (enemy.archetype === 'orbit-wisp') {
    // Wisp floats in a visible, fixed lane and never begins a shot off camera.
    const desiredDistance = 185;
    if (distance < 150 || distance > 205) {
      const direction: -1 | 1 = distance > desiredDistance ? Math.sign(dx || 1) as -1 | 1 : (Math.sign(dx || 1) * -1) as -1 | 1;
      const laneX = clamp(enemy.x + direction * profile.moveSpeed * dt / 1000, Math.max(limits.left, enemy.homeX - 32), Math.min(limits.right, enemy.homeX + 32));
      next = { ...next, x: laneX, phase: laneX !== enemy.x ? 'approach' : 'idle', phaseMs: 0 };
    } else if (canAttack && enemy.cooldownMs <= 0) return beginTell(next, 'wisp-shot');
    return { enemy: { ...next, facing, phase: next.phase === 'approach' ? (distance > desiredDistance ? 'approach' : 'idle') : next.phase, phaseMs: 0 }, startedTell: false, recovered: false };
  }
  if (enemy.archetype === 'pressure-bastion' && enemy.guardBrokenMs <= 0) {
    if (distance > 104) return { enemy: { ...next, x: moveX(enemy.x + Math.sign(dx) * profile.moveSpeed * dt / 1000), phase: 'approach', phaseMs: 0, facing }, startedTell: false, recovered: false };
    if (canAttack && enemy.cooldownMs <= 0) return beginTell({ ...next, phase: 'guard', facing }, 'bastion-overhead');
    return { enemy: { ...next, phase: 'guard', phaseMs: enemy.phaseMs + dt, facing }, startedTell: false, recovered: false };
  }
  if (distance > profile.attackRange) {
    const gap = enemy.archetype === 'spindle-sentry' || enemy.archetype === 'shardrunner' ? 38 : 48;
    return { enemy: { ...next, x: moveX(enemy.x + Math.sign(dx) * Math.min(profile.moveSpeed * dt / 1000, Math.max(0, distance - gap))), phase: 'approach', phaseMs: 0 }, startedTell: false, recovered: false };
  }
  if (enemy.phase === 'approach') next = { ...next, phase: 'idle', phaseMs: 0 };
  if (!canAttack || enemy.cooldownMs > 0) return { enemy: { ...next, phase: enemy.archetype === 'pressure-bastion' ? 'guard' : next.phase, phaseMs: next.phaseMs + dt }, startedTell: false, recovered: false };
  return beginTell(next, actionFor(enemy.archetype, enemy.attackSequence));
}

function beginTell(enemy: B06EnemyRuntime, action: Exclude<B06EnemyAction, null>): { enemy: B06EnemyRuntime; startedTell: boolean; recovered: boolean; event: B06DirectorEvent } {
  const next = { ...enemy, phase: 'telegraph' as const, phaseMs: 0, action, actionFacing: enemy.facing, actionHit: false };
  return { enemy: next, startedTell: true, recovered: false, event: { type: 'telegraph', enemyId: enemy.id, action, facing: enemy.facing } };
}

function actionFor(archetype: B06Archetype, sequence: number): Exclude<B06EnemyAction, null> {
  if (archetype === 'shardrunner') return 'runner-dash';
  if (archetype === 'spindle-sentry') return 'sentry-lunge';
  if (archetype === 'orbit-wisp') return 'wisp-shot';
  if (archetype === 'pressure-bastion') return 'bastion-overhead';
  return sequence % 2 === 0 ? 'cantor-sweep' : 'cantor-pulse';
}

function stepProjectiles(projectiles: readonly B06Projectile[], enemies: readonly B06EnemyRuntime[], player: B06PlayerThreatFrame, blockers: readonly CombatRect[], dt: number, world: EnemyWorldContext): { projectiles: B06Projectile[]; events: B06DirectorEvent[] } {
  const next: B06Projectile[] = [];
  const events: B06DirectorEvent[] = [];
  const playerRect = combatantRect({ x: player.x, footY: player.y + player.height / 2, width: player.width, height: player.height, hp: player.hp });
  for (const projectile of projectiles) {
    const updated = { ...projectile, x: projectile.x + projectile.vx * dt / 1000, y: projectile.y + projectile.vy * dt / 1000, ageMs: projectile.ageMs + dt };
    const attackRect = { left: Math.min(projectile.x, updated.x) - projectile.radius, right: Math.max(projectile.x, updated.x) + projectile.radius, top: Math.min(projectile.y, updated.y) - projectile.radius, bottom: Math.max(projectile.y, updated.y) + projectile.radius };
    if (updated.ageMs >= updated.lifeMs || updated.x < world.projectileBounds.left || updated.x > world.projectileBounds.right || updated.y < world.projectileBounds.top || updated.y > world.projectileBounds.bottom) continue;
    if (isBlockedByRect(projectile.x, updated.x, attackRect, blockers)) { events.push({ type: 'projectile-blocked', projectileId: projectile.id }); continue; }
    if (overlaps(attackRect, playerRect)) { events.push({ type: 'projectile-hit', enemyId: projectile.ownerId, projectileId: projectile.id }); continue; }
    // A collision should not occur against its owner if a shot is emitted while the enemy is close.
    if (enemies.find((enemy) => enemy.id === projectile.ownerId)?.hp === 0) continue;
    next.push(updated);
  }
  return { projectiles: next, events };
}

export function spawnB06Projectile(state: B06DirectorState, enemy: B06EnemyRuntime, player: B06PlayerThreatFrame): B06DirectorState {
  if (enemy.archetype !== 'orbit-wisp' || state.projectiles.filter((shot) => shot.ownerId === enemy.id).length >= 1) return state;
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const speed = 128;
  const projectile: B06Projectile = {
    id: `${enemy.id}:shot:${enemy.attackSequence + 1}`,
    ownerId: enemy.id,
    x: enemy.x + enemy.facing * 22,
    y: enemy.y,
    vx: (dx / length) * speed,
    vy: (dy / length) * speed,
    ageMs: 0,
    lifeMs: 2600,
    damage: 1,
    radius: 7,
  };
  return { ...state, projectiles: [...state.projectiles, projectile].slice(-3) };
}

function clamp(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, value)); }

function separateGroundEnemies(enemies: readonly B06EnemyRuntime[], world: EnemyWorldContext): B06EnemyRuntime[] {
  const next = [...enemies];
  for (let leftIndex = 0; leftIndex < next.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < next.length; rightIndex += 1) {
      const left = next[leftIndex]!;
      const right = next[rightIndex]!;
      if (left.hp <= 0 || right.hp <= 0 || left.archetype === 'orbit-wisp' || right.archetype === 'orbit-wisp' || left.supportSurfaceId !== right.supportSurfaceId) continue;
      const minimumGap = (B06_ENEMY_PROFILES[left.archetype].width + B06_ENEMY_PROFILES[right.archetype].width) / 2 + 8;
      const dx = right.x - left.x;
      if (Math.abs(dx) >= minimumGap) continue;
      const direction = dx === 0 ? (left.id.localeCompare(right.id) < 0 ? 1 : -1) : Math.sign(dx);
      const overlap = minimumGap - Math.abs(dx);
      const leftLocked = left.phase === 'telegraph' || left.phase === 'commit';
      const rightLocked = right.phase === 'telegraph' || right.phase === 'commit';
      if (leftLocked && rightLocked) continue;
      const leftSurface = world.surfaces.find((surface) => surface.id === left.supportSurfaceId) ?? world.surfaces[0]!;
      const rightSurface = world.surfaces.find((surface) => surface.id === right.supportSurfaceId) ?? world.surfaces[0]!;
      const leftBounds = surfaceLimits(leftSurface, B06_ENEMY_PROFILES[left.archetype].width, world);
      const rightBounds = surfaceLimits(rightSurface, B06_ENEMY_PROFILES[right.archetype].width, world);
      if (leftLocked) next[rightIndex] = { ...right, x: clamp(right.x + direction * overlap, rightBounds.left, rightBounds.right) };
      else if (rightLocked) next[leftIndex] = { ...left, x: clamp(left.x - direction * overlap, leftBounds.left, leftBounds.right) };
      else {
        next[leftIndex] = { ...left, x: clamp(left.x - direction * overlap / 2, leftBounds.left, leftBounds.right) };
        next[rightIndex] = { ...right, x: clamp(right.x + direction * overlap / 2, rightBounds.left, rightBounds.right) };
      }
    }
  }
  return next;
}

function surfaceLimits(surface: EnemyWorldContext['surfaces'][number], width: number, world: EnemyWorldContext): { left: number; right: number } {
  const half = width / 2;
  return { left: Math.max(world.bounds.left, surface.left + half), right: Math.min(world.bounds.right, surface.right - half) };
}
