import * as Phaser from 'phaser';
import type { MoveInput } from '../movement/motion';
export class InputController {
  private readonly keyboard: {
    leftA: Phaser.Input.Keyboard.Key;
    leftArrow: Phaser.Input.Keyboard.Key;
    rightD: Phaser.Input.Keyboard.Key;
    rightArrow: Phaser.Input.Keyboard.Key;
    jumpSpace: Phaser.Input.Keyboard.Key;
    jumpW: Phaser.Input.Keyboard.Key;
    jumpUp: Phaser.Input.Keyboard.Key;
    dash: Phaser.Input.Keyboard.Key;
    attack: Phaser.Input.Keyboard.Key;
  };
  private prevGamepadJump = false;
  private prevGamepadDash = false;
  private prevGamepadPause = false;
  private pointerAttack = false;
  private prevAttackKey = false;
  private keyboardAttack = false;
  readonly scene: Phaser.Scene;
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const manager = scene.input.keyboard;
    if (!manager) throw new Error('Keyboard input missing');
    this.keyboard = {
      leftA: manager.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      leftArrow: manager.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      rightD: manager.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      rightArrow: manager.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      jumpSpace: manager.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      jumpW: manager.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      jumpUp: manager.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      dash: manager.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      attack: manager.addKey(Phaser.Input.Keyboard.KeyCodes.J),
    };
    scene.input.gamepad?.once('connected', () => { /* connected status is polled */ });
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      if (pointer.button === 0) this.pointerAttack = true;
    });
    manager.on('keydown-J', (event: KeyboardEvent) => { if(!event.repeat)this.keyboardAttack = true; });
  }
  resetTransientState(): void {
    this.scene.input.keyboard?.resetKeys();
    this.pointerAttack = false;
    this.keyboardAttack = false;
    this.prevAttackKey = this.keyboard.attack.isDown;
    const pad = this.scene.input.gamepad?.getPad(0);
    this.prevGamepadJump = !!pad?.buttons[0]?.pressed;
    this.prevGamepadDash = !!pad?.buttons[2]?.pressed;
    this.prevGamepadPause = !!pad?.buttons[9]?.pressed;
  }
  read(): { move: MoveInput; pause: boolean; controller: boolean } {
    const keys = this.keyboard;
    const left = keys.leftA.isDown || keys.leftArrow.isDown;
    const right = keys.rightD.isDown || keys.rightArrow.isDown;
    const pad = this.scene.input.gamepad?.getPad(0);
    const controller = !!pad?.connected;
    const stick = controller ? (pad?.axes[0]?.getValue() ?? 0) : 0;
    const padAxis = Math.abs(stick) > 0.2 ? stick : (pad?.buttons[15]?.pressed ? 1 : 0) - (pad?.buttons[14]?.pressed ? 1 : 0);
    const axis = controller && Math.abs(padAxis) > .2 ? padAxis : Number(right) - Number(left);
    const padJump = controller && !!pad?.buttons[0]?.pressed;
    const padDash = controller && !!pad?.buttons[2]?.pressed;
    const padPause = controller && !!pad?.buttons[9]?.pressed;
    const jumpPressed = Phaser.Input.Keyboard.JustDown(keys.jumpSpace) || Phaser.Input.Keyboard.JustDown(keys.jumpW) || Phaser.Input.Keyboard.JustDown(keys.jumpUp) || (padJump && !this.prevGamepadJump);
    const dashPressed = Phaser.Input.Keyboard.JustDown(keys.dash) || (padDash && !this.prevGamepadDash);
    const pause = padPause && !this.prevGamepadPause;
    this.prevGamepadJump = padJump; this.prevGamepadDash = padDash; this.prevGamepadPause = padPause;
    return { move: { axis, jumpPressed, jumpHeld: keys.jumpSpace.isDown || keys.jumpW.isDown || keys.jumpUp.isDown || padJump, dashPressed }, pause, controller };
  }
  readAttackPressed(): boolean {
    const keyDown=this.keyboard.attack.isDown;
    const pressed = (keyDown && !this.prevAttackKey) || this.pointerAttack || this.keyboardAttack;
    this.prevAttackKey=keyDown;
    this.pointerAttack = false;
    this.keyboardAttack = false;
    return pressed;
  }
}
