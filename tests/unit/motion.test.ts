import test from 'node:test';
import assert from 'node:assert/strict';
import { initialMoveState, MOTION, stepMovement } from '../../src/game/movement/motion.ts';
const input = (axis = 0, jumpPressed = false, jumpHeld = false, dashPressed = false) => ({ axis, jumpPressed, jumpHeld, dashPressed });
test('idle stays still', () => { const result = stepMovement(initialMoveState(), input(), true, 16); assert.equal(result.next.xVelocity, 0); });
test('horizontal acceleration clamps at max', () => { let s = initialMoveState(); for (let i = 0; i < 60; i++) s = stepMovement(s, input(1), true, 16).next; assert.equal(s.xVelocity, MOTION.maxSpeed); });
test('direction is stable and reverses with input', () => { let s = stepMovement(initialMoveState(), input(-1), true, 16).next; assert.equal(s.facing, -1); s = stepMovement(s, input(1), true, 16).next; assert.equal(s.facing, 1); });
test('ground jump works and consumes coyote and input buffer', () => { const r = stepMovement(initialMoveState(), input(0, true, true), true, 16); assert.equal(r.jumped, true); assert.equal(r.next.yVelocity, MOTION.jumpSpeed); assert.equal(r.next.coyoteMs, 0); });
test('coyote jump is allowed briefly and not repeated', () => { const first = stepMovement(initialMoveState(), input(), true, 16).next; const r = stepMovement(first, input(0,true,true), false, 16); assert.equal(r.jumped, true); assert.equal(stepMovement(r.next, input(), false, 16).jumped, false); });
test('buffered jump fires on landing', () => { const air = stepMovement(initialMoveState(), input(0,true,true), false, 16).next; assert.equal(stepMovement(air, input(), true, 16).jumped, true); });
test('releasing jump cuts the rise while holding it preserves the arc', () => {
  const airborne = { ...initialMoveState(), yVelocity: MOTION.jumpSpeed };
  assert.equal(stepMovement(airborne, input(), false, 16).releaseCut, true);
  assert.equal(stepMovement(airborne, input(0, false, true), false, 16).releaseCut, false);
});
test('dash activates once, has cooldown and stable facing', () => { const first = stepMovement(initialMoveState(), input(-1,false,false,true), true, 16); assert.equal(first.dashed,true); assert.equal(first.next.xVelocity,-MOTION.dashSpeed); assert.equal(stepMovement(first.next, input(-1,false,false,true), true, 16).dashed,false); });
test('invalid time steps are rejected', () => assert.throws(() => stepMovement(initialMoveState(), input(), false, 180)));
