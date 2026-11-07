import type { ActionDef } from './sim';

export type B03MoveId = 'light-1' | 'light-2' | 'light-3' | 'heavy' | 'air-light' | 'resonance';
export type Facing = -1 | 1;
export type CombatRect = { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number };
export type MoveHitbox = { readonly forward: number; readonly top: number; readonly width: number; readonly height: number };
export type B03MoveDefinition = {
  readonly id: B03MoveId;
  readonly action: ActionDef;
  readonly hitbox: MoveHitbox;
  readonly damage: number;
  readonly knockbackX: number;
  readonly knockbackY: number;
  readonly resonanceCost: number;
  readonly cooldownMs: number;
  readonly grounded: boolean;
  readonly airborne: boolean;
  readonly cancelWindow: readonly [number, number];
  readonly hitstopMs: number;
  readonly animation: { readonly startup: string; readonly contact: string; readonly recovery: string };
};

const action = (id: string, startupMs: number, activeMs: number, recoveryMs: number, contactAtMs: number): ActionDef => ({
  id,
  moveId: id,
  sourceId: 'iona-player',
  targetId: 'spindle-sentry',
  startupMs,
  activeMs,
  recoveryMs,
  events: [{ id: 'contact', atMs: contactAtMs }],
});

export const B03_MOVES: Readonly<Record<B03MoveId, B03MoveDefinition>> = {
  'light-1': { id: 'light-1', action: action('iona-base-combo-1', 90, 80, 170, 112), hitbox: { forward: 8, top: 25, width: 30, height: 18 }, damage: 1, knockbackX: 58, knockbackY: 0, resonanceCost: 0, cooldownMs: 0, grounded: true, airborne: false, cancelWindow: [180, 285], hitstopMs: 42, animation: { startup: 'combo-1-windup', contact: 'combo-1-contact', recovery: 'combo-1-recovery' } },
  'light-2': { id: 'light-2', action: action('iona-base-combo-2', 110, 90, 170, 138), hitbox: { forward: 11, top: 32, width: 38, height: 28 }, damage: 1, knockbackX: 82, knockbackY: 0, resonanceCost: 0, cooldownMs: 0, grounded: true, airborne: false, cancelWindow: [200, 305], hitstopMs: 48, animation: { startup: 'combo-2-windup', contact: 'combo-2-contact', recovery: 'combo-2-recovery' } },
  'light-3': { id: 'light-3', action: action('iona-base-combo-3', 140, 100, 220, 165), hitbox: { forward: 7, top: 49, width: 43, height: 43 }, damage: 2, knockbackX: 100, knockbackY: -80, resonanceCost: 0, cooldownMs: 0, grounded: true, airborne: false, cancelWindow: [270, 385], hitstopMs: 70, animation: { startup: 'combo-3-windup', contact: 'combo-3-contact', recovery: 'combo-3-recovery' } },
  heavy: { id: 'heavy', action: action('iona-heavy-launcher', 225, 80, 385, 275), hitbox: { forward: 6, top: 27, width: 38, height: 34 }, damage: 2, knockbackX: 78, knockbackY: -270, resonanceCost: 0, cooldownMs: 0, grounded: true, airborne: false, cancelWindow: [310, 470], hitstopMs: 94, animation: { startup: 'heavy-windup', contact: 'heavy-contact', recovery: 'heavy-recovery' } },
  'air-light': { id: 'air-light', action: action('iona-aerial-strike', 115, 95, 280, 160), hitbox: { forward: 7, top: 46, width: 43, height: 26 }, damage: 1, knockbackX: 94, knockbackY: 25, resonanceCost: 0, cooldownMs: 0, grounded: false, airborne: true, cancelWindow: [220, 325], hitstopMs: 52, animation: { startup: 'air-windup', contact: 'air-contact', recovery: 'air-recovery' } },
  resonance: { id: 'resonance', action: action('iona-resonance-imprint', 270, 90, 480, 340), hitbox: { forward: 15, top: 34, width: 68, height: 29 }, damage: 2, knockbackX: 110, knockbackY: -35, resonanceCost: 35, cooldownMs: 900, grounded: true, airborne: false, cancelWindow: [390, 530], hitstopMs: 66, animation: { startup: 'special-windup', contact: 'special-contact', recovery: 'special-recovery' } },
};

export type CombatantGeometry = { readonly x: number; readonly footY: number; readonly width: number; readonly height: number; readonly hp: number; readonly invulnerableMs?: number; readonly guarding?: boolean; readonly alive?: boolean };
export type ContactResult = 'hit' | 'miss' | 'blocked' | 'invulnerable' | 'ko' | 'obstructed';

export function moveHitbox(move: B03MoveDefinition, x: number, footY: number, facing: Facing): CombatRect {
  const left = facing > 0 ? x + move.hitbox.forward : x - move.hitbox.forward - move.hitbox.width;
  const top = footY - move.hitbox.top;
  return { left, top, right: left + move.hitbox.width, bottom: top + move.hitbox.height };
}

export function combatantRect(value: CombatantGeometry): CombatRect {
  return { left: value.x - value.width / 2, right: value.x + value.width / 2, top: value.footY - value.height, bottom: value.footY };
}

export function overlaps(a: CombatRect, b: CombatRect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export function isBlockedByRect(fromX: number, toX: number, attack: CombatRect, blockers: readonly CombatRect[] = []): boolean {
  const sweep = { left: Math.min(fromX, toX), right: Math.max(fromX, toX), top: attack.top, bottom: attack.bottom };
  return blockers.some((blocker) => overlaps(sweep, blocker));
}

export function resolveMoveContact(move: B03MoveDefinition, attacker: { readonly x: number; readonly footY: number; readonly facing: Facing }, target: CombatantGeometry, blockers: readonly CombatRect[] = []): ContactResult {
  if (target.alive === false || target.hp <= 0) return 'ko';
  const strike = moveHitbox(move, attacker.x, attacker.footY, attacker.facing);
  if (isBlockedByRect(attacker.x, target.x, strike, blockers)) return 'obstructed';
  if (!overlaps(strike, combatantRect(target))) return 'miss';
  if ((target.invulnerableMs ?? 0) > 0) return 'invulnerable';
  if (target.guarding) return 'blocked';
  return 'hit';
}

export function canCancelIntoCombo(move: B03MoveDefinition, elapsedMs: number): boolean {
  return elapsedMs >= move.cancelWindow[0] && elapsedMs <= move.cancelWindow[1];
}
