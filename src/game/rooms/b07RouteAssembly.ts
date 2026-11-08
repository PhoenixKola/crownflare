import { B07_ROOM_BY_ID } from './b07RoomLibrary.ts';
import type { B07BranchChoice, B07ChoiceId, B07ChoiceOption, B07RoomInstance, B07RoomTemplate, B07RouteChoices, B07RouteState } from './roomTypes.ts';

export const B07_ROUTE_PREFIX = ['sg-breach-steps'] as const;
export const B07_ROUTE_MIDDLE = ['sg-resonance-gallery', 'sg-to-vesper-gate'] as const;
export const B07_ROUTE_END = ['vl-condensation-vault', 'vl-night-side-threshold'] as const;
const SEEDED_REGION_ROOMS = {
  reach: ['sg-sunwell-terrace', 'sg-echo-crossing', 'sg-emberwell-circuit'],
  loom: ['vl-counterweight-climb', 'vl-cantor-pressure', 'vl-echo-condenser'],
} as const;
export const B07_CHOICE_OPTIONS: Readonly<Record<B07ChoiceId, readonly B07ChoiceOption[]>> = {
  reach: [
    { id: 'safe-recovery', roomId: 'sg-copper-causeway', title: 'Copper Causeway', risk: 'LOW', focus: 'Timed conduit crossings', reward: 'Repair shard', destination: 'Sunderglass Gallery' },
    { id: 'conduit-challenge', roomId: 'sg-conduit-annex', title: 'Conduit Annex', risk: 'MODERATE', focus: 'Sentry and Shardrunner', reward: '24 resonance', destination: 'Sunderglass Gallery' },
  ],
  loom: [
    { id: 'spindle-lift', roomId: 'vl-spindle-lift', title: 'Spindle Lift', risk: 'LOW', focus: 'Moving lift traversal', reward: '12 resonance', destination: 'Condensation Vault' },
    { id: 'lattice-elite', roomId: 'vl-lattice-hall', title: 'Lattice Hall', risk: 'HIGH', focus: 'Wisp and Bastion', reward: '32 resonance', destination: 'Condensation Vault' },
  ],
};

export function initialB07Route(seed = 1): B07RouteState {
  const normalizedSeed = Number.isFinite(seed) ? Math.trunc(seed) >>> 0 : 1;
  return { seed: normalizedSeed, roomIndex: 0, rooms: [...B07_ROUTE_PREFIX], choices: {}, eventChoices: {}, visited: [], rewarded: [], repairCharges: 0, resonance: 0, complete: false };
}

export function currentB07Choice(state: B07RouteState): B07ChoiceId | null {
  if (state.roomIndex === B07_ROUTE_PREFIX.length && !state.choices.reach) return 'reach';
  return state.choices.reach && state.rooms.includes('sg-to-vesper-gate') && state.roomIndex >= state.rooms.length && !state.choices.loom ? 'loom' : null;
}

export function chooseB07Route(state: B07RouteState, choice: B07BranchChoice): B07RouteState {
  const menu = currentB07Choice(state);
  if (!menu) return state;
  const option = B07_CHOICE_OPTIONS[menu].find((candidate) => candidate.id === choice);
  if (!option) return state;
  const rooms = [...state.rooms, option.roomId];
  const pool = SEEDED_REGION_ROOMS[menu];
  const authoredOrder = [...pool].sort((left, right) => hash32(`${state.seed}:${menu}:${choice}:${left}`) - hash32(`${state.seed}:${menu}:${choice}:${right}`));
  rooms.push(...authoredOrder.slice(0, 2));
  if (menu === 'reach') rooms.push(...B07_ROUTE_MIDDLE);
  else rooms.push(...B07_ROUTE_END);
  const choices: B07RouteChoices = menu === 'reach' ? { ...state.choices, reach: choice as B07RouteChoices['reach'] } : { ...state.choices, loom: choice as B07RouteChoices['loom'] };
  return { ...state, rooms, choices };
}

export function advanceB07Room(state: B07RouteState): B07RouteState {
  if (state.complete || currentB07Choice(state)) return state;
  const room = B07_ROOM_BY_ID.get(state.rooms[state.roomIndex] ?? '');
  if (!room) return state;
  return {
    ...state,
    roomIndex: state.roomIndex + 1,
    visited: [...state.visited, room.id],
    complete: state.roomIndex === state.rooms.length - 1 && room.id === 'vl-night-side-threshold',
  };
}

export function collectB07Reward(state: B07RouteState): B07RouteState {
  const room = B07_ROOM_BY_ID.get(state.rooms[state.roomIndex] ?? '');
  if (!room || state.rewarded.includes(room.id) || room.reward.kind === 'none') return state;
  const repair = room.reward.kind === 'repair' || room.reward.kind === 'repair-and-resonance' ? room.reward.amount : 0;
  const resonance = room.reward.kind === 'resonance' || room.reward.kind === 'repair-and-resonance' ? room.reward.amount : 0;
  return { ...state, rewarded: [...state.rewarded, room.id], repairCharges: state.repairCharges + repair, resonance: state.resonance + resonance };
}

export function recordB07EventChoice(state: B07RouteState, roomId: string, eventId: string, choiceId: string): B07RouteState {
  if (state.rewarded.includes(roomId) || !B07_ROOM_BY_ID.get(roomId)?.event || B07_ROOM_BY_ID.get(roomId)?.event?.id !== eventId) return state;
  return { ...state, rewarded: [...state.rewarded, roomId], eventChoices: { ...(state.eventChoices ?? {}), [eventId]: choiceId } };
}

export function instantiateB07Room(room: B07RoomTemplate, seed: number, variation = 0): B07RoomInstance {
  let rng = hash32(`${seed >>> 0}:${room.id}:${variation}`);
  const next = (): number => { rng = (rng + 0x6d2b79f5) >>> 0; let t = rng; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const jitter = Math.floor(next() * 25) - 12;
  const variant = Math.floor(next() * 3);
  const enemySpawns = room.enemies.map((spawn, index) => ({ ...spawn, x: clamp(spawn.x + (index % 2 ? -jitter : jitter), 56, room.world.width - 56) }));
  const hazards = room.hazards.map((hazard, index) => ({ ...hazard, phaseOffsetMs: Math.floor(next() * (hazard.kind === 'moving-lift' ? (hazard.travelMs + hazard.pauseMs) * 2 : hazard.cycleMs)) + index * 7 }));
  return { templateId: room.id, seed: seed >>> 0, variant, enemySpawns, hazards };
}

export function seededB07Route(seed: number, reach: B07RouteChoices['reach'], loom: B07RouteChoices['loom']): B07RouteState {
  let state = initialB07Route(seed);
  state = advanceB07Room(state);
  state = chooseB07Route(state, reach!);
  while (currentB07Choice(state) !== 'loom') { state = collectB07Reward(state); state = advanceB07Room(state); }
  state = chooseB07Route(state, loom!);
  while (!state.complete) { state = collectB07Reward(state); state = advanceB07Room(state); }
  return state;
}

export function hash32(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  return hash >>> 0;
}

function clamp(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, value)); }
