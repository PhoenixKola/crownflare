import type { B08BossId } from './b08BossTypes.ts';

export const B08_BOSS_ROOM_IDS: Readonly<Record<B08BossId, string>> = {
  'sundial-custodian': 'sg-resonance-gallery',
  'spoolheart-regent': 'vl-condensation-vault',
  'broken-meridian': 'vl-night-side-threshold',
};

const BOSS_BY_ROOM = new Map(Object.entries(B08_BOSS_ROOM_IDS).map(([bossId, roomId]) => [roomId, bossId as B08BossId]));

export function bossForB08Room(roomId: string): B08BossId | null {
  return BOSS_BY_ROOM.get(roomId) ?? null;
}
