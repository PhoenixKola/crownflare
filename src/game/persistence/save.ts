export const SAVE_NAMESPACE = 'project-crownflare:save:v1';
export type SaveV1 = { version: 1; options: { reduceMotion: boolean; masterVolume: number }; meta: { completedRuns: number } };
export const defaultSave = (): SaveV1 => ({ version: 1, options: { reduceMotion: false, masterVolume: 0.8 }, meta: { completedRuns: 0 } });
export function parseSave(raw: string | null): SaveV1 {
  if (!raw) return defaultSave();
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return defaultSave();
    const data = value as Record<string, unknown>;
    if (data.version !== 1) return defaultSave();
    const options = data.options as Record<string, unknown> | undefined;
    const meta = data.meta as Record<string, unknown> | undefined;
    if (typeof options?.reduceMotion !== 'boolean' || typeof options?.masterVolume !== 'number' || options.masterVolume < 0 || options.masterVolume > 1 || typeof meta?.completedRuns !== 'number' || !Number.isInteger(meta.completedRuns) || meta.completedRuns < 0) return defaultSave();
    return value as SaveV1;
  } catch { return defaultSave(); }
}
export function loadSave(storage: Pick<Storage, 'getItem'>): SaveV1 { try { return parseSave(storage.getItem(SAVE_NAMESPACE)); } catch { return defaultSave(); } }
export function persistSave(storage: Pick<Storage, 'setItem'>, data: SaveV1): boolean { try { storage.setItem(SAVE_NAMESPACE, JSON.stringify(data)); return true; } catch { return false; } }
