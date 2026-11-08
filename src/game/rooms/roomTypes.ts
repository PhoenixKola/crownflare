export type B07RegionId = 'sunderglass-reach' | 'vesper-loomworks';
export type B07RoomRole = 'entry' | 'combat' | 'traversal' | 'event' | 'elite' | 'transition' | 'exit';
export type B07EnemyArchetype = 'spindle-sentry' | 'shardrunner' | 'orbit-wisp' | 'pressure-bastion' | 'cantor';

export type B07RoomBounds = { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number };
export type B07SupportSurface = { readonly id: string; readonly left: number; readonly right: number; readonly top: number };
export type EnemyWorldContext = {
  readonly id: string;
  readonly bounds: B07RoomBounds;
  readonly projectileBounds: B07RoomBounds;
  readonly groundTop: number;
  readonly defaultSurfaceId: string;
  readonly surfaces: readonly B07SupportSurface[];
  readonly hoverLane: { readonly minY: number; readonly maxY: number; readonly homeY: number };
};

export type B07Platform = {
  readonly id: string;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  readonly surface: boolean;
  readonly oneWay: boolean;
  readonly enemySupport?: boolean;
  readonly projectileBlocker?: boolean;
  readonly art: 'sunderglass-long' | 'sunderglass-short' | 'sunderglass-conduit' | 'vesper-ledge' | 'vesper-thread' | 'vesper-lift';
};

export type B07EnemySpawn = {
  readonly id: string;
  readonly archetype: B07EnemyArchetype;
  readonly x: number;
  readonly surfaceId: string;
};

export type B07HazardDefinition =
  | {
      readonly id: string;
      readonly kind: 'charged-conduit';
      readonly bounds: B07RoomBounds;
      readonly cycleMs: number;
      readonly warningMs: number;
      readonly activeMs: number;
      readonly recoveryMs: number;
      readonly damage: number;
      readonly phaseOffsetMs?: number;
    }
  | {
      readonly id: string;
      readonly kind: 'thread-press';
      readonly rail: { readonly left: number; readonly right: number; readonly y: number };
      readonly width: number;
      readonly height: number;
      readonly cycleMs: number;
      readonly warningMs: number;
      readonly activeMs: number;
      readonly recoveryMs: number;
      readonly damage: number;
      readonly phaseOffsetMs?: number;
    }
  | {
      readonly id: string;
      readonly kind: 'moving-lift';
      readonly platformId: string;
      readonly lowY: number;
      readonly highY: number;
      readonly travelMs: number;
      readonly pauseMs: number;
      readonly phaseOffsetMs?: number;
    };

export type B07ParallaxLayer = { readonly textureKey: string; readonly scrollFactorX: number; readonly scrollFactorY: number; readonly depth: number; readonly alpha?: number };
export type B07RoomTemplate = {
  readonly id: string;
  readonly region: B07RegionId;
  readonly role: B07RoomRole;
  readonly difficultyBudget: number;
  readonly desiredDurationSec: number;
  readonly direction: 'right';
  readonly world: { readonly width: number; readonly height: number; readonly groundTop: number };
  readonly platforms: readonly B07Platform[];
  readonly playerSpawn: { readonly x: number; readonly surfaceId: string };
  readonly exit: { readonly x: number; readonly surfaceId: string; readonly safeRadius: number };
  readonly enemies: readonly B07EnemySpawn[];
  readonly hazards: readonly B07HazardDefinition[];
  readonly reward: { readonly kind: 'none' | 'repair' | 'resonance' | 'repair-and-resonance'; readonly amount: number; readonly x: number; readonly surfaceId: string };
  readonly visualKeys: { readonly horizon: string; readonly midground: string; readonly foreground: string; readonly platformKeys: Readonly<Record<B07Platform['art'], string>>; readonly landmark?: string };
  readonly parallax: readonly B07ParallaxLayer[];
  readonly ambienceKey: string;
  readonly authoringVersion: 1;
  readonly validationTags: readonly string[];
};

export type B07RoomInstance = {
  readonly templateId: string;
  readonly seed: number;
  readonly variant: number;
  readonly enemySpawns: readonly B07EnemySpawn[];
  readonly hazards: readonly B07HazardDefinition[];
};

export type B07BranchChoice = 'safe-recovery' | 'conduit-challenge' | 'spindle-lift' | 'lattice-elite';
export type B07RouteChoices = { readonly reach?: 'safe-recovery' | 'conduit-challenge'; readonly loom?: 'spindle-lift' | 'lattice-elite' };
export type B07ChoiceId = 'reach' | 'loom';
export type B07ChoiceOption = {
  readonly id: B07BranchChoice;
  readonly roomId: string;
  readonly title: string;
  readonly risk: 'LOW' | 'MODERATE' | 'HIGH';
  readonly focus: string;
  readonly reward: string;
  readonly destination: string;
};

export type B07RouteState = {
  readonly seed: number;
  readonly roomIndex: number;
  readonly rooms: readonly string[];
  readonly choices: B07RouteChoices;
  readonly visited: readonly string[];
  readonly rewarded: readonly string[];
  readonly repairCharges: number;
  readonly resonance: number;
  readonly complete: boolean;
};
