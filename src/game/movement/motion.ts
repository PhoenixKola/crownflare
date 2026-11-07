/** Deterministic intent rules. Phaser Arcade owns final collision resolution. */
export interface MoveInput { readonly axis: number; readonly jumpPressed: boolean; readonly jumpHeld: boolean; readonly dashPressed: boolean }
export interface MoveState { readonly xVelocity: number; readonly yVelocity: number; readonly facing: -1 | 1; readonly coyoteMs: number; readonly jumpBufferMs: number; readonly dashMs: number; readonly dashCooldownMs: number }
export interface MoveOutput { readonly next: MoveState; readonly jumped: boolean; readonly dashed: boolean; readonly releaseCut: boolean }
export const MOTION = { acceleration: 1800, maxSpeed: 155, friction: 2200, jumpSpeed: -285, coyoteMs: 105, jumpBufferMs: 110, dashSpeed: 360, dashDurationMs: 125, dashCooldownMs: 430 } as const;
export function initialMoveState(): MoveState { return { xVelocity: 0, yVelocity: 0, facing: 1, coyoteMs: 0, jumpBufferMs: 0, dashMs: 0, dashCooldownMs: 0 }; }
const toward = (value: number, target: number, maxChange: number): number => value < target ? Math.min(value + maxChange, target) : Math.max(value - maxChange, target);
export function stepMovement(old: MoveState, input: MoveInput, grounded: boolean, deltaMs: number): MoveOutput {
  if (!Number.isFinite(deltaMs) || deltaMs < 0 || deltaMs > 100) throw new Error('Invalid simulation timestep');
  const dt = deltaMs / 1000;
  const axis = Math.max(-1, Math.min(1, input.axis));
  const facing = axis > .15 ? 1 : axis < -.15 ? -1 : old.facing;
  const coyoteMs = grounded ? MOTION.coyoteMs : Math.max(0, old.coyoteMs - deltaMs);
  let jumpBufferMs = input.jumpPressed ? MOTION.jumpBufferMs : Math.max(0, old.jumpBufferMs - deltaMs);
  let dashMs = Math.max(0, old.dashMs - deltaMs);
  let dashCooldownMs = Math.max(0, old.dashCooldownMs - deltaMs);
  const dashed = input.dashPressed && dashMs === 0 && dashCooldownMs === 0;
  if (dashed) { dashMs = MOTION.dashDurationMs; dashCooldownMs = MOTION.dashCooldownMs; }
  const jumped = jumpBufferMs > 0 && coyoteMs > 0 && dashMs === 0;
  if (jumped) jumpBufferMs = 0;
  const releaseCut = !input.jumpHeld && old.yVelocity < -95 && !jumped;
  const speed = dashMs > 0 ? MOTION.dashSpeed * facing : toward(old.xVelocity, axis * MOTION.maxSpeed, (axis === 0 ? MOTION.friction : MOTION.acceleration) * dt);
  return {
    next: { xVelocity: speed, yVelocity: jumped ? MOTION.jumpSpeed : old.yVelocity, facing, coyoteMs: jumped ? 0 : coyoteMs, jumpBufferMs, dashMs, dashCooldownMs },
    jumped, dashed, releaseCut,
  };
}
