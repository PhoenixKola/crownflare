import type { B07RouteState } from '../rooms/roomTypes.ts';
import type { RunBuildState } from '../roguelite/b09RunBuild.ts';

export const SAVE_NAMESPACE = 'project-crownflare:save:v2';
export const LEGACY_SAVE_NAMESPACE = 'project-crownflare:save:v1';
export const PREVIOUS_SAVE_NAMESPACE = 'project-crownflare:save:v2:previous';
export const PRESERVED_SAVE_NAMESPACE = 'project-crownflare:save:unrecognized';

export type SaveV1 = { version: 1; options: { reduceMotion: boolean; masterVolume: number }; meta: { completedRuns: number } };
export type B10RunCheckpoint = {
  runId: string;
  seed: number;
  route: B07RouteState;
  build: RunBuildState;
  playerHp: number;
  resonance: number;
  dawnrushEnergy: number;
  dawnrushActive: boolean;
  bossesCleared: readonly string[];
  elapsedMs: number;
  damageTaken: number;
  checkpointId: string;
};
export type B10RunSummary = {
  runId: string; result: 'victory' | 'defeat'; seed: number; elapsedMs: number; damageTaken: number;
  visited: readonly string[]; choices: B07RouteState['choices']; eventChoices?: Readonly<Record<string, string>>; bossesCleared: readonly string[]; build: RunBuildState;
};
export type SaveV2 = {
  version: 2;
  revision: number;
  checksum: string;
  options: { reduceMotion: boolean; masterVolume: number };
  meta: { completedRuns: number; beaconAwakened: boolean; completedRunIds: readonly string[]; lastRun: B10RunSummary | null };
  story: { prologueSeen: boolean; loomBeatSeen: boolean; meridianEndingSeen: boolean };
  activeRun: B10RunCheckpoint | null;
};

export const defaultSave = (): SaveV2 => sealSave({
  version: 2, revision: 0, checksum: '',
  options: { reduceMotion: false, masterVolume: 0.8 },
  meta: { completedRuns: 0, beaconAwakened: false, completedRunIds: [], lastRun: null },
  story: { prologueSeen: false, loomBeatSeen: false, meridianEndingSeen: false }, activeRun: null,
});

function stable(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stable(record[key])}`).join(',')}}`;
}
function hash(value: string): string {
  let result = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) result = Math.imul(result ^ value.charCodeAt(i), 0x01000193) >>> 0;
  return result.toString(16).padStart(8, '0');
}
function withoutChecksum(data: SaveV2): Omit<SaveV2, 'checksum'> { const { checksum: _checksum, ...payload } = data; return payload; }
export function sealSave(data: Omit<SaveV2, 'checksum'> | SaveV2): SaveV2 {
  const payload = { ...data, version: 2 as const, checksum: '' } as SaveV2;
  return { ...payload, checksum: hash(stable(withoutChecksum(payload))) };
}

function isObject(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function validOptions(value: unknown): value is SaveV2['options'] {
  return isObject(value) && typeof value.reduceMotion === 'boolean' && typeof value.masterVolume === 'number' && Number.isFinite(value.masterVolume) && value.masterVolume >= 0 && value.masterVolume <= 1;
}
function validLegacy(value: unknown): value is SaveV1 {
  if (!isObject(value) || value.version !== 1 || !validOptions(value.options) || !isObject(value.meta)) return false;
  return Number.isSafeInteger(value.meta.completedRuns) && (value.meta.completedRuns as number) >= 0;
}
function validRun(value: unknown): value is B10RunCheckpoint {
  if (!isObject(value) || typeof value.runId !== 'string' || !value.runId || !Number.isSafeInteger(value.seed) || !isObject(value.route) || !isObject(value.build)) return false;
  const route = value.route;
  const build = value.build;
  const eventChoices = route.eventChoices;
  return Number.isInteger(route.roomIndex) && (route.roomIndex as number) >= 0 && Array.isArray(route.rooms) && route.rooms.length > 0
    && route.rooms.every((id) => typeof id === 'string') && Array.isArray(route.visited) && route.visited.every((id) => typeof id === 'string')
    && Array.isArray(route.rewarded) && route.rewarded.every((id) => typeof id === 'string') && isObject(route.choices)
    && (eventChoices === undefined || isObject(eventChoices) && Object.values(eventChoices).every((choice) => typeof choice === 'string'))
    && Number.isInteger(route.repairCharges) && (route.repairCharges as number) >= 0 && Number.isFinite(route.resonance)
    && typeof route.complete === 'boolean' && build.version === 1 && build.seed === value.seed && isObject(build.ranks)
    && Array.isArray(build.acquisitions) && isObject(build.ledger) && Array.isArray(build.ledger.claimedSourceIds)
    && Number.isInteger(value.playerHp) && (value.playerHp as number) >= 1 && (value.playerHp as number) <= 5
    && Number.isFinite(value.resonance) && (value.resonance as number) >= 0 && (value.resonance as number) <= 100
    && Number.isFinite(value.dawnrushEnergy) && (value.dawnrushEnergy as number) >= 0 && (value.dawnrushEnergy as number) <= 100
    && typeof value.dawnrushActive === 'boolean'
    && Array.isArray(value.bossesCleared) && value.bossesCleared.every((id) => typeof id === 'string')
    && Number.isFinite(value.elapsedMs) && (value.elapsedMs as number) >= 0 && Number.isFinite(value.damageTaken) && (value.damageTaken as number) >= 0
    && typeof value.checkpointId === 'string';
}
function validSummary(value: unknown): value is B10RunSummary | null {
  if (value === null) return true;
  if (!isObject(value) || typeof value.runId !== 'string' || (value.result !== 'victory' && value.result !== 'defeat') || !Number.isSafeInteger(value.seed)) return false;
  return Number.isFinite(value.elapsedMs) && Number.isFinite(value.damageTaken) && Array.isArray(value.visited) && value.visited.every((id) => typeof id === 'string')
    && isObject(value.choices) && (value.eventChoices === undefined || isObject(value.eventChoices) && Object.values(value.eventChoices).every((choice) => typeof choice === 'string'))
    && Array.isArray(value.bossesCleared) && value.bossesCleared.every((id) => typeof id === 'string') && isObject(value.build);
}
function validV2(value: unknown): value is SaveV2 {
  if (!isObject(value) || value.version !== 2 || !Number.isSafeInteger(value.revision) || (value.revision as number) < 0 || typeof value.checksum !== 'string') return false;
  if (!validOptions(value.options) || !isObject(value.meta) || !isObject(value.story)) return false;
  if (!Number.isSafeInteger(value.meta.completedRuns) || (value.meta.completedRuns as number) < 0 || typeof value.meta.beaconAwakened !== 'boolean'
    || !Array.isArray(value.meta.completedRunIds) || value.meta.completedRunIds.some((id) => typeof id !== 'string') || !validSummary(value.meta.lastRun)
    || typeof value.story.prologueSeen !== 'boolean' || typeof value.story.loomBeatSeen !== 'boolean' || typeof value.story.meridianEndingSeen !== 'boolean'
    || !(value.activeRun === null || validRun(value.activeRun))) return false;
  const candidate = value as unknown as SaveV2;
  return hash(stable(withoutChecksum(candidate))) === candidate.checksum;
}
export function migrateV1(value: SaveV1): SaveV2 {
  return sealSave({ ...defaultSave(), revision: 1, options: { ...value.options }, meta: { ...defaultSave().meta, completedRuns: value.meta.completedRuns } });
}
export function parseSave(raw: string | null): SaveV2 {
  if (!raw) return defaultSave();
  try {
    const value: unknown = JSON.parse(raw);
    if (validV2(value)) return value;
    if (validLegacy(value)) return migrateV1(value);
    return defaultSave();
  } catch { return defaultSave(); }
}
export function loadSave(storage: Pick<Storage, 'getItem'> & Partial<Pick<Storage, 'setItem'>>): SaveV2 {
  const decode = (raw: string | null): unknown => { if (!raw) return null; try { return JSON.parse(raw); } catch { return undefined; } };
  const migrate = (legacy: SaveV1): SaveV2 => {
    const migrated = migrateV1(legacy);
    if (typeof storage.setItem !== 'function') return migrated;
    const writable = storage as Pick<Storage, 'getItem' | 'setItem'>;
    if (!persistSave(writable, migrated)) return migrated;
    return parseSave(storage.getItem(SAVE_NAMESPACE));
  };
  try {
    const primaryRaw = storage.getItem(SAVE_NAMESPACE);
    const primary = decode(primaryRaw);
    if (validV2(primary)) return primary;
    if (validLegacy(primary)) return migrate(primary);
    const previousRaw = storage.getItem(PREVIOUS_SAVE_NAMESPACE);
    if (validV2(decode(previousRaw))) return parseSave(previousRaw);
    const legacyRaw = storage.getItem(LEGACY_SAVE_NAMESPACE);
    const legacy = decode(legacyRaw);
    if (validLegacy(legacy)) return migrate(legacy);
  } catch { /* private mode and denied storage use a safe in-memory default */ }
  return defaultSave();
}
export function persistSave(storage: Pick<Storage, 'setItem' | 'getItem'>, data: SaveV2): boolean {
  try {
    const currentRaw = storage.getItem(SAVE_NAMESPACE);
    if (currentRaw) {
      let current: unknown;
      try { current = JSON.parse(currentRaw); } catch { current = undefined; }
      if (validV2(current)) storage.setItem(PREVIOUS_SAVE_NAMESPACE, currentRaw);
      else if ((!isObject(current) || typeof current.version !== 'number' || current.version > 2) && !storage.getItem(PRESERVED_SAVE_NAMESPACE)) storage.setItem(PRESERVED_SAVE_NAMESPACE, currentRaw);
    }
    const current = sealSave({ ...data, revision: Math.max(0, data.revision) + 1 });
    if (!validV2(current)) return false;
    storage.setItem(SAVE_NAMESPACE, JSON.stringify(current));
    return true;
  } catch { return false; }
}

export function recordRunResult(data: SaveV2, summary: B10RunSummary): SaveV2 {
  const alreadyCounted = data.meta.completedRunIds.includes(summary.runId);
  return sealSave({
    ...data, activeRun: data.activeRun?.runId === summary.runId ? null : data.activeRun,
    meta: {
      ...data.meta,
      completedRuns: alreadyCounted ? data.meta.completedRuns : data.meta.completedRuns + 1,
      completedRunIds: alreadyCounted ? data.meta.completedRunIds : [...data.meta.completedRunIds, summary.runId].slice(-80),
      beaconAwakened: data.meta.beaconAwakened || summary.result === 'victory',
      lastRun: alreadyCounted ? data.meta.lastRun : summary,
    },
    story: { ...data.story, meridianEndingSeen: data.story.meridianEndingSeen || summary.result === 'victory' },
  });
}
