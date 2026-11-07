import type { ActionDef } from './sim';
import type { B03MoveDefinition, B03MoveId } from './b03Moves';

const action = (id: string, startupMs: number, activeMs: number, recoveryMs: number, contactAtMs: number): ActionDef => ({
  id, moveId: id, sourceId: 'iona-dawnrush', targetId: 'spindle-sentry', startupMs, activeMs, recoveryMs,
  events: [{ id: 'contact', atMs: contactAtMs }],
});

/** Separate authored combat timings and geometry for Iona's accelerated form. */
export const DAWNRUSH_MOVES: Readonly<Record<B03MoveId, B03MoveDefinition>> = {
  'light-1': { id: 'light-1', action: action('iona-dawnrush-solar-palm', 66, 70, 128, 91), hitbox: { forward: 12, top: 22, width: 40, height: 23 }, damage: 1, knockbackX: 86, knockbackY: 0, resonanceCost: 0, cooldownMs: 0, grounded: true, airborne: false, cancelWindow: [118, 214], hitstopMs: 38, animation: { startup: 'light-1-windup', contact: 'light-1-contact', recovery: 'light-recovery' } },
  'light-2': { id: 'light-2', action: action('iona-dawnrush-ribbon-kick', 82, 78, 132, 112), hitbox: { forward: 14, top: 30, width: 48, height: 30 }, damage: 1, knockbackX: 104, knockbackY: 0, resonanceCost: 0, cooldownMs: 0, grounded: true, airborne: false, cancelWindow: [138, 235], hitstopMs: 42, animation: { startup: 'light-1-windup', contact: 'light-2-contact', recovery: 'light-recovery' } },
  'light-3': { id: 'light-3', action: action('iona-dawnrush-solar-heel', 105, 88, 176, 149), hitbox: { forward: 12, top: 46, width: 58, height: 44 }, damage: 2, knockbackX: 132, knockbackY: -100, resonanceCost: 0, cooldownMs: 0, grounded: true, airborne: false, cancelWindow: [188, 292], hitstopMs: 58, animation: { startup: 'light-1-windup', contact: 'light-3-contact', recovery: 'light-recovery' } },
  heavy: { id: 'heavy', action: action('iona-dawnrush-solar-break', 175, 94, 286, 220), hitbox: { forward: 10, top: 24, width: 52, height: 40 }, damage: 3, knockbackX: 150, knockbackY: -315, resonanceCost: 0, cooldownMs: 0, grounded: true, airborne: false, cancelWindow: [260, 380], hitstopMs: 80, animation: { startup: 'heavy-windup', contact: 'heavy-contact', recovery: 'heavy-recovery' } },
  'air-light': { id: 'air-light', action: action('iona-dawnrush-comet-heel', 78, 92, 210, 130), hitbox: { forward: 12, top: 44, width: 54, height: 34 }, damage: 2, knockbackX: 126, knockbackY: 48, resonanceCost: 0, cooldownMs: 0, grounded: false, airborne: true, cancelWindow: [164, 258], hitstopMs: 46, animation: { startup: 'aerial-windup', contact: 'aerial-contact', recovery: 'aerial-recovery' } },
  resonance: { id: 'resonance', action: action('iona-dawnrush-solar-drive', 195, 112, 350, 251), hitbox: { forward: 20, top: 28, width: 92, height: 43 }, damage: 4, knockbackX: 188, knockbackY: -65, resonanceCost: 32, cooldownMs: 1050, grounded: true, airborne: false, cancelWindow: [300, 438], hitstopMs: 78, animation: { startup: 'solar-gather', contact: 'solar-drive', recovery: 'solar-recovery' } },
};

export function dawnrushMoveIds(): readonly B03MoveId[] {
  return Object.keys(DAWNRUSH_MOVES) as B03MoveId[];
}
