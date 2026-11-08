import { MOTION } from '../movement/motion.ts';
import { B07_ROOM_LIBRARY } from './b07RoomLibrary.ts';
import type { B07RoomTemplate } from './roomTypes.ts';

const GRAVITY = 790;
const SAFE_HORIZONTAL_REACH = MOTION.maxSpeed * (2 * Math.abs(MOTION.jumpSpeed) / GRAVITY) * .82;
const SAFE_VERTICAL_REACH = (MOTION.jumpSpeed ** 2) / (2 * GRAVITY) * .9;

export type B07ValidationIssue = { readonly roomId: string; readonly message: string };

export function validateB07Room(room: B07RoomTemplate): B07ValidationIssue[] {
  const issues: B07ValidationIssue[] = [];
  const surfaces = room.platforms.filter((platform) => platform.surface);
  const byId = new Map(surfaces.map((surface) => [surface.id, surface]));
  if (!byId.has(room.playerSpawn.surfaceId)) issues.push({ roomId: room.id, message: 'player spawn surface is missing' });
  if (!byId.has(room.exit.surfaceId)) issues.push({ roomId: room.id, message: 'exit support surface is missing' });
  if (room.playerSpawn.x < 18 || room.playerSpawn.x >= room.world.width - 18) issues.push({ roomId: room.id, message: 'player spawn is outside safe room bounds' });
  if (room.exit.x < 18 || room.exit.x >= room.world.width - 18) issues.push({ roomId: room.id, message: 'exit is outside safe room bounds' });
  for (const platform of room.platforms) {
    if (platform.left < 0 || platform.left + platform.width > room.world.width || platform.top < 0 || platform.top + platform.height > room.world.height) issues.push({ roomId: room.id, message: `platform ${platform.id} leaves room bounds` });
  }
  for (const spawn of room.enemies) {
    const surface = byId.get(spawn.surfaceId);
    if (!surface || !surface.enemySupport) issues.push({ roomId: room.id, message: `enemy ${spawn.id} has no safe support surface` });
    else if (spawn.x < surface.left + 28 || spawn.x > surface.left + surface.width - 28) issues.push({ roomId: room.id, message: `enemy ${spawn.id} spawn is not inset on its support surface` });
  }
  for (const hazard of room.hazards) {
    if (hazard.kind === 'charged-conduit' && (hazard.bounds.left < 0 || hazard.bounds.right > room.world.width || hazard.bounds.top < 0 || hazard.bounds.bottom > room.world.groundTop)) issues.push({ roomId: room.id, message: `hazard ${hazard.id} has invalid bounds` });
    if (hazard.kind === 'thread-press' && (hazard.rail.left < 0 || hazard.rail.right > room.world.width || hazard.width <= 0 || hazard.height <= 0)) issues.push({ roomId: room.id, message: `hazard ${hazard.id} has invalid bounds` });
    if (hazard.kind !== 'moving-lift' && hazard.warningMs + hazard.activeMs + hazard.recoveryMs !== hazard.cycleMs) issues.push({ roomId: room.id, message: `hazard ${hazard.id} timing does not fill its cycle` });
  }
  if (!connected(room, byId)) issues.push({ roomId: room.id, message: 'Base jump cannot connect spawn to exit without requiring dash' });
  return issues;
}

export function validateB07Library(rooms: readonly B07RoomTemplate[] = B07_ROOM_LIBRARY): B07ValidationIssue[] {
  return rooms.flatMap(validateB07Room);
}

function connected(room: B07RoomTemplate, surfaces: ReadonlyMap<string, B07RoomTemplate['platforms'][number]>): boolean {
  const start = surfaces.get(room.playerSpawn.surfaceId);
  const goal = surfaces.get(room.exit.surfaceId);
  if (!start || !goal) return false;
  const queue = [start.id];
  const visited = new Set(queue);
  while (queue.length) {
    const from = surfaces.get(queue.shift()!);
    if (!from) continue;
    if (from.id === goal.id || room.exit.x >= from.left && room.exit.x <= from.left + from.width) return true;
    for (const to of surfaces.values()) {
      if (visited.has(to.id)) continue;
      const horizontalGap = Math.max(0, to.left - (from.left + from.width), from.left - (to.left + to.width));
      const verticalRise = from.top - to.top;
      if (horizontalGap <= SAFE_HORIZONTAL_REACH && verticalRise <= SAFE_VERTICAL_REACH && verticalRise >= -130) { visited.add(to.id); queue.push(to.id); }
    }
  }
  return false;
}
