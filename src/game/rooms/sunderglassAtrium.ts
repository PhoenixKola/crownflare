export type AtriumPlatform = {
  readonly id: string;
  readonly centerX: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  readonly art: 'long' | 'short' | 'conduit';
};

export const SUNDERGLASS_ATRIUM = {
  id: 'sunderglass-atrium',
  name: 'The Sunderglass Atrium',
  world: { width: 1560, height: 270, groundTop: 241 },
  entryX: 56,
  entryStartX: 130,
  rewardX: 380,
  exitX: 1480,
  sentries: [285, 1278] as const,
  platforms: [
    { id: 'ground', centerX: 780, top: 241, width: 1560, height: 29, art: 'long' },
    { id: 'first-bridge', centerX: 220, top: 196, width: 96, height: 11, art: 'short' },
    { id: 'copper-bridge', centerX: 390, top: 165, width: 82, height: 11, art: 'long' },
    { id: 'windward-ledge', centerX: 560, top: 195, width: 82, height: 11, art: 'short' },
    { id: 'conduit-bridge', centerX: 780, top: 178, width: 94, height: 11, art: 'conduit' },
    { id: 'broken-span', centerX: 965, top: 196, width: 95, height: 11, art: 'long' },
    { id: 'upper-span', centerX: 1150, top: 167, width: 110, height: 11, art: 'short' },
    { id: 'gate-approach', centerX: 1380, top: 192, width: 120, height: 11, art: 'long' },
  ] satisfies readonly AtriumPlatform[],
} as const;

export const B04_ASSETS = {
  horizon: 'b04-horizon',
  architecture: 'b04-architecture',
  platformLong: 'b04-platform-long',
  platformShort: 'b04-platform-short',
  conduit: 'b04-conduit-tile',
  entry: 'b04-entry-beacon',
  shard: 'b04-reward-shard',
  gate: 'b04-exit-gate',
  telegraph: 'b04-sentry-telegraph',
  sentryAttack: ['b04-sentry-attack-0', 'b04-sentry-attack-1', 'b04-sentry-attack-2'] as const,
  impacts: ['b04-impact-0', 'b04-impact-1', 'b04-impact-2'] as const,
  ambience: 'b04-sunderglass-ambience',
} as const;
