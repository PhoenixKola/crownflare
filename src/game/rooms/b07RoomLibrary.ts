import type { B07ParallaxLayer, B07Platform, B07RoomTemplate, EnemyWorldContext } from './roomTypes.ts';

const WIDTH = 960;
const HEIGHT = 270;
const GROUND = 241;
const SUND_GLASS_LAYERS: readonly B07ParallaxLayer[] = [
  { textureKey: 'b07-sg-horizon', scrollFactorX: .07, scrollFactorY: .02, depth: -32 },
  { textureKey: 'b07-sg-midground', scrollFactorX: .24, scrollFactorY: .03, depth: -22, alpha: .94 },
  { textureKey: 'b07-sg-foreground', scrollFactorX: .52, scrollFactorY: .08, depth: -10, alpha: .75 },
];
const VESPER_LAYERS: readonly B07ParallaxLayer[] = [
  { textureKey: 'b07-vesper-horizon', scrollFactorX: .055, scrollFactorY: .02, depth: -34 },
  { textureKey: 'b07-vesper-engineering', scrollFactorX: .22, scrollFactorY: .035, depth: -23, alpha: .96 },
  { textureKey: 'b07-vesper-foreground', scrollFactorX: .48, scrollFactorY: .08, depth: -10, alpha: .82 },
];
const SUND_PLATFORMS: B07RoomTemplate['visualKeys']['platformKeys'] = {
  'sunderglass-long': 'b07-sg-platform-long',
  'sunderglass-short': 'b07-sg-platform-short',
  'sunderglass-conduit': 'b07-sg-platform-conduit',
  'vesper-ledge': 'b07-vesper-platform-ledge',
  'vesper-thread': 'b07-vesper-platform-thread',
  'vesper-lift': 'b07-vesper-platform-lift',
};
const VESPER_PLATFORMS = SUND_PLATFORMS;
const sg = (id: string, left: number, top: number, width: number, art: B07Platform['art'] = 'sunderglass-long', oneWay = false, surface = true, enemySupport = surface): B07Platform => ({ id, left, top, width, height: top >= GROUND ? 29 : 12, surface, oneWay, enemySupport, projectileBlocker: !oneWay, art });
const vl = (id: string, left: number, top: number, width: number, art: B07Platform['art'] = 'vesper-ledge', oneWay = false, surface = true, enemySupport = surface): B07Platform => ({ id, left, top, width, height: top >= GROUND ? 29 : 12, surface, oneWay, enemySupport, projectileBlocker: !oneWay, art });

const common = {
  direction: 'right' as const,
  world: { width: WIDTH, height: HEIGHT, groundTop: GROUND },
  authoringVersion: 1 as const,
  validationTags: ['base-reachable', 'spawn-safe', 'exit-safe', 'authored-collision'] as const,
};

export const B07_ROOM_LIBRARY = [
  {
    ...common, id: 'sg-breach-steps', region: 'sunderglass-reach', role: 'entry', difficultyBudget: 1, desiredDurationSec: 28,
    platforms: [sg('west-floor', 0, GROUND, 335), sg('copper-step', 256, 195, 180, 'sunderglass-short', true), sg('middle-floor', 395, GROUND, 270), sg('windward-step', 548, 173, 178, 'sunderglass-conduit', true), sg('east-floor', 725, GROUND, 235)],
    playerSpawn: { x: 64, surfaceId: 'west-floor' }, exit: { x: 918, surfaceId: 'east-floor', safeRadius: 72 }, enemies: [], hazards: [], reward: { kind: 'none', amount: 0, x: 0, surfaceId: 'west-floor' },
    visualKeys: { horizon: 'b07-sg-horizon', midground: 'b07-sg-midground', foreground: 'b07-sg-foreground', platformKeys: SUND_PLATFORMS, landmark: 'b07-sg-entry-arch' }, parallax: SUND_GLASS_LAYERS, ambienceKey: 'b07-audio-sunderglass',
  },
  {
    ...common, id: 'sg-copper-causeway', region: 'sunderglass-reach', role: 'traversal', difficultyBudget: 1, desiredDurationSec: 32,
    platforms: [sg('west-floor', 0, GROUND, 370), sg('safe-arcade', 328, 190, 286, 'sunderglass-short', true), sg('east-floor', 428, GROUND, 532), sg('upper-arcade', 610, 170, 190, 'sunderglass-long', true)],
    playerSpawn: { x: 66, surfaceId: 'west-floor' }, exit: { x: 918, surfaceId: 'east-floor', safeRadius: 76 }, enemies: [],
    hazards: [{ id: 'sun-conduit-arc', kind: 'charged-conduit', bounds: { left: 422, right: 500, top: 216, bottom: 241 }, cycleMs: 2920, warningMs: 820, activeMs: 560, recoveryMs: 1540, damage: 1 }],
    reward: { kind: 'repair', amount: 1, x: 760, surfaceId: 'east-floor' },
    visualKeys: { horizon: 'b07-sg-horizon', midground: 'b07-sg-midground', foreground: 'b07-sg-foreground', platformKeys: SUND_PLATFORMS, landmark: 'b07-sg-conduit-frame' }, parallax: SUND_GLASS_LAYERS, ambienceKey: 'b07-audio-sunderglass',
  },
  {
    ...common, id: 'sg-conduit-annex', region: 'sunderglass-reach', role: 'combat', difficultyBudget: 5, desiredDurationSec: 46,
    platforms: [sg('annex-floor', 0, GROUND, WIDTH), sg('north-balcony', 274, 190, 168, 'sunderglass-short', true), sg('south-balcony', 600, 188, 158, 'sunderglass-conduit', true)],
    playerSpawn: { x: 72, surfaceId: 'annex-floor' }, exit: { x: 918, surfaceId: 'annex-floor', safeRadius: 76 },
    enemies: [{ id: 'annex-sentry', archetype: 'spindle-sentry', x: 590, surfaceId: 'annex-floor' }, { id: 'annex-runner', archetype: 'shardrunner', x: 748, surfaceId: 'annex-floor' }],
    hazards: [{ id: 'annex-conduit-arc', kind: 'charged-conduit', bounds: { left: 426, right: 488, top: 216, bottom: 241 }, cycleMs: 3200, warningMs: 900, activeMs: 520, recoveryMs: 1780, damage: 1 }],
    reward: { kind: 'resonance', amount: 24, x: 848, surfaceId: 'annex-floor' },
    visualKeys: { horizon: 'b07-sg-horizon', midground: 'b07-sg-midground', foreground: 'b07-sg-foreground', platformKeys: SUND_PLATFORMS, landmark: 'b07-sg-annex-lens' }, parallax: SUND_GLASS_LAYERS, ambienceKey: 'b07-audio-sunderglass',
  },
  {
    ...common, id: 'sg-resonance-gallery', region: 'sunderglass-reach', role: 'event', difficultyBudget: 2, desiredDurationSec: 24,
    platforms: [sg('gallery-floor', 0, GROUND, WIDTH), sg('west-viewing-ledge', 186, 196, 176, 'sunderglass-short', true), sg('east-viewing-ledge', 598, 178, 202, 'sunderglass-long', true)],
    playerSpawn: { x: 64, surfaceId: 'gallery-floor' }, exit: { x: 918, surfaceId: 'gallery-floor', safeRadius: 72 }, enemies: [], hazards: [], reward: { kind: 'repair-and-resonance', amount: 1, x: 524, surfaceId: 'gallery-floor' },
    visualKeys: { horizon: 'b07-sg-horizon', midground: 'b07-sg-midground', foreground: 'b07-sg-foreground', platformKeys: SUND_PLATFORMS, landmark: 'b07-sg-resonance-dais' }, parallax: SUND_GLASS_LAYERS, ambienceKey: 'b07-audio-sunderglass',
  },
  {
    ...common, id: 'sg-to-vesper-gate', region: 'sunderglass-reach', role: 'transition', difficultyBudget: 0, desiredDurationSec: 12,
    platforms: [sg('threshold-floor', 0, GROUND, WIDTH), sg('threshold-lintel', 354, 193, 232, 'sunderglass-conduit', true, false, false)],
    playerSpawn: { x: 64, surfaceId: 'threshold-floor' }, exit: { x: 904, surfaceId: 'threshold-floor', safeRadius: 86 }, enemies: [], hazards: [], reward: { kind: 'none', amount: 0, x: 0, surfaceId: 'threshold-floor' },
    visualKeys: { horizon: 'b07-sg-horizon', midground: 'b07-sg-midground', foreground: 'b07-vesper-foreground', platformKeys: SUND_PLATFORMS, landmark: 'b07-vesper-transition' }, parallax: SUND_GLASS_LAYERS, ambienceKey: 'b07-audio-transition',
  },
  {
    ...common, id: 'vl-spindle-lift', region: 'vesper-loomworks', role: 'traversal', difficultyBudget: 3, desiredDurationSec: 38,
    platforms: [vl('west-deck', 0, GROUND, 310), vl('loom-lift', 342, 213, 116, 'vesper-lift', true), vl('middle-deck', 490, GROUND, 208), vl('high-thread', 654, 184, 178, 'vesper-thread', true), vl('east-deck', 760, GROUND, 200)],
    playerSpawn: { x: 64, surfaceId: 'west-deck' }, exit: { x: 918, surfaceId: 'east-deck', safeRadius: 78 }, enemies: [],
    hazards: [{ id: 'loom-lift-cycle', kind: 'moving-lift', platformId: 'loom-lift', lowY: 166, highY: 213, travelMs: 1550, pauseMs: 380 }],
    reward: { kind: 'resonance', amount: 12, x: 818, surfaceId: 'east-deck' },
    visualKeys: { horizon: 'b07-vesper-horizon', midground: 'b07-vesper-engineering', foreground: 'b07-vesper-foreground', platformKeys: VESPER_PLATFORMS, landmark: 'b07-vesper-lift-machine' }, parallax: VESPER_LAYERS, ambienceKey: 'b07-audio-vesper',
  },
  {
    ...common, id: 'vl-lattice-hall', region: 'vesper-loomworks', role: 'elite', difficultyBudget: 7, desiredDurationSec: 50,
    platforms: [vl('lattice-floor', 0, GROUND, WIDTH), vl('west-rib', 160, 193, 172, 'vesper-thread', true), vl('east-rib', 612, 177, 196, 'vesper-ledge', true)],
    playerSpawn: { x: 68, surfaceId: 'lattice-floor' }, exit: { x: 918, surfaceId: 'lattice-floor', safeRadius: 78 },
    enemies: [{ id: 'lattice-wisp', archetype: 'orbit-wisp', x: 552, surfaceId: 'lattice-floor' }, { id: 'lattice-bastion', archetype: 'pressure-bastion', x: 742, surfaceId: 'lattice-floor' }],
    hazards: [{ id: 'loom-thread-press', kind: 'thread-press', rail: { left: 396, right: 522, y: 180 }, width: 44, height: 54, cycleMs: 3100, warningMs: 860, activeMs: 660, recoveryMs: 1580, damage: 1 }],
    reward: { kind: 'resonance', amount: 32, x: 852, surfaceId: 'lattice-floor' },
    visualKeys: { horizon: 'b07-vesper-horizon', midground: 'b07-vesper-engineering', foreground: 'b07-vesper-foreground', platformKeys: VESPER_PLATFORMS, landmark: 'b07-vesper-lattice-gate' }, parallax: VESPER_LAYERS, ambienceKey: 'b07-audio-vesper',
  },
  {
    ...common, id: 'vl-condensation-vault', region: 'vesper-loomworks', role: 'event', difficultyBudget: 2, desiredDurationSec: 25,
    platforms: [vl('vault-floor', 0, GROUND, WIDTH), vl('safe-pocket', 306, 197, 158, 'vesper-thread', true), vl('refractor-step', 592, 176, 178, 'vesper-ledge', true)],
    playerSpawn: { x: 64, surfaceId: 'vault-floor' }, exit: { x: 918, surfaceId: 'vault-floor', safeRadius: 78 }, enemies: [],
    hazards: [{ id: 'vault-thread-press', kind: 'thread-press', rail: { left: 506, right: 636, y: 184 }, width: 38, height: 42, cycleMs: 3360, warningMs: 920, activeMs: 620, recoveryMs: 1820, damage: 1 }],
    reward: { kind: 'repair-and-resonance', amount: 1, x: 840, surfaceId: 'vault-floor' },
    visualKeys: { horizon: 'b07-vesper-horizon', midground: 'b07-vesper-engineering', foreground: 'b07-vesper-foreground', platformKeys: VESPER_PLATFORMS, landmark: 'b07-vesper-condensation-valve' }, parallax: VESPER_LAYERS, ambienceKey: 'b07-audio-vesper',
  },
  {
    ...common, id: 'vl-night-side-threshold', region: 'vesper-loomworks', role: 'exit', difficultyBudget: 0, desiredDurationSec: 16,
    platforms: [vl('threshold-floor', 0, GROUND, WIDTH), vl('boss-lintel', 284, 187, 392, 'vesper-thread', true, false, false)],
    playerSpawn: { x: 64, surfaceId: 'threshold-floor' }, exit: { x: 852, surfaceId: 'threshold-floor', safeRadius: 92 }, enemies: [], hazards: [], reward: { kind: 'none', amount: 0, x: 0, surfaceId: 'threshold-floor' },
    visualKeys: { horizon: 'b07-vesper-horizon', midground: 'b07-vesper-engineering', foreground: 'b07-vesper-foreground', platformKeys: VESPER_PLATFORMS, landmark: 'b07-vesper-boss-threshold' }, parallax: VESPER_LAYERS, ambienceKey: 'b07-audio-vesper',
  },
] satisfies readonly B07RoomTemplate[];

export const B07_ROOM_BY_ID: ReadonlyMap<string, B07RoomTemplate> = new Map(B07_ROOM_LIBRARY.map((room) => [room.id, room]));

export function enemyWorldForRoom(room: B07RoomTemplate): EnemyWorldContext {
  const bounds = { left: 0, right: room.world.width, top: 0, bottom: room.world.height };
  const surfaces = room.platforms.filter((platform) => platform.surface && platform.enemySupport).map((platform) => ({
    id: platform.id,
    left: platform.left,
    right: platform.left + platform.width,
    top: platform.top,
  }));
  const defaultSurface = surfaces.find((surface) => surface.id === room.playerSpawn.surfaceId) ?? surfaces[0];
  if (!defaultSurface) throw new Error(`Room ${room.id} has no enemy support surface`);
  return {
    id: room.id,
    bounds,
    projectileBounds: { left: 0, right: room.world.width, top: 20, bottom: room.world.height },
    groundTop: defaultSurface.top,
    defaultSurfaceId: defaultSurface.id,
    surfaces,
    hoverLane: { minY: 72, maxY: room.world.groundTop - 46, homeY: Math.min(168, room.world.groundTop - 72) },
  };
}
