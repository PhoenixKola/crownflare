import * as Phaser from 'phaser';
import type { MoveInput } from '../movement/motion';
import { DEFAULT_CONTROL_SETTINGS, KEYBOARD_CODES, loadControlSettings, readPadActions, selectStandardPad, type ControlSettings, type RebindableAction, type StandardPadLike } from './controlSettings';

const KEY_CODE: Readonly<Record<string, number>> = {
  Space: Phaser.Input.Keyboard.KeyCodes.SPACE,
  KeyW: Phaser.Input.Keyboard.KeyCodes.W,
  ArrowUp: Phaser.Input.Keyboard.KeyCodes.UP,
  KeyA: Phaser.Input.Keyboard.KeyCodes.A,
  ArrowLeft: Phaser.Input.Keyboard.KeyCodes.LEFT,
  KeyD: Phaser.Input.Keyboard.KeyCodes.D,
  ArrowRight: Phaser.Input.Keyboard.KeyCodes.RIGHT,
  ShiftLeft: Phaser.Input.Keyboard.KeyCodes.SHIFT,
  ShiftRight: Phaser.Input.Keyboard.KeyCodes.SHIFT,
  KeyJ: Phaser.Input.Keyboard.KeyCodes.J,
  KeyK: Phaser.Input.Keyboard.KeyCodes.K,
  KeyQ: Phaser.Input.Keyboard.KeyCodes.Q,
  KeyE: Phaser.Input.Keyboard.KeyCodes.E,
  KeyR: Phaser.Input.Keyboard.KeyCodes.R,
};

export type MappedPlayInput = {
  readonly move: MoveInput;
  readonly pause: boolean;
  readonly controller: boolean;
  readonly controllerIndex: number;
  readonly actions: Readonly<Record<RebindableAction, boolean>>;
};

function gamepads(): (StandardPadLike | null)[] {
  try { return Array.from(navigator.getGamepads?.() ?? []) as (StandardPadLike | null)[]; }
  catch { return []; }
}

function safeSettings(): ControlSettings {
  try { return loadControlSettings(window.localStorage); }
  catch { return DEFAULT_CONTROL_SETTINGS; }
}

export class InputController {
  private readonly keys: Record<RebindableAction, Phaser.Input.Keyboard.Key[]>;
  private readonly directionKeys: { left: Phaser.Input.Keyboard.Key; leftArrow: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key; rightArrow: Phaser.Input.Keyboard.Key };
  private settings: ControlSettings;
  private currentPadIndex = -1;
  private axisEngaged = false;
  private previousPad: Record<RebindableAction, boolean> = { jump: false, light: false, heavy: false, dash: false, special: false, interact: false, transform: false };
  private previousPause = false;
  private pointerPressed: Partial<Record<RebindableAction, boolean>> = {};
  private actionEdges: Record<RebindableAction, boolean> = { jump: false, light: false, heavy: false, dash: false, special: false, interact: false, transform: false };
  readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, settings = safeSettings()) {
    this.scene = scene;
    this.settings = settings;
    const manager = scene.input.keyboard;
    if (!manager) throw new Error('Keyboard input missing');
    this.keys = Object.fromEntries(Object.entries(KEYBOARD_CODES).map(([action, codes]) => [action, codes.map((code) => manager.addKey(KEY_CODE[code]!))])) as Record<RebindableAction, Phaser.Input.Keyboard.Key[]>;
    this.directionKeys = { left: manager.addKey(Phaser.Input.Keyboard.KeyCodes.A), leftArrow: manager.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT), right: manager.addKey(Phaser.Input.Keyboard.KeyCodes.D), rightArrow: manager.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT) };
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      if (pointer.button === 0) this.pointerPressed.light = true;
      if (pointer.button === 2) this.pointerPressed.heavy = true;
    });
  }

  setControlSettings(settings: ControlSettings): void { this.settings = settings; }
  getControlSettings(): ControlSettings { return this.settings; }

  requestRumble(strength = 0.16, duration = 45): void {
    if (!this.settings.rumbleEnabled) return;
    const pad = selectStandardPad(gamepads(), this.currentPadIndex) as (Gamepad & { vibrationActuator?: { playEffect?: (type: string, options: { duration: number; strongMagnitude: number; weakMagnitude: number }) => Promise<string> } }) | null;
    const actuator = pad?.vibrationActuator;
    if (!actuator || typeof actuator.playEffect !== 'function') return;
    const amount = Math.max(0, Math.min(0.3, strength));
    void actuator.playEffect('dual-rumble', { duration: Math.max(20, Math.min(55, duration)), strongMagnitude: amount, weakMagnitude: amount * 0.7 }).catch(() => {});
  }

  resetTransientState(): void {
    this.scene.input.keyboard?.resetKeys();
    this.pointerPressed = {};
    this.actionEdges = { jump: false, light: false, heavy: false, dash: false, special: false, interact: false, transform: false };
    const pad = selectStandardPad(gamepads(), this.currentPadIndex);
    this.currentPadIndex = pad?.index ?? -1;
    const read = readPadActions(pad, this.settings);
    this.axisEngaged = read.axisEngaged;
    this.previousPad = { ...read.pressed };
    this.previousPause = read.pausePressed;
  }

  read(): MappedPlayInput {
    const pads = gamepads();
    const pad = selectStandardPad(pads, this.currentPadIndex);
    const swapped = (pad?.index ?? -1) !== this.currentPadIndex;
    this.currentPadIndex = pad?.index ?? -1;
    if (swapped) this.axisEngaged = false;
    const padState = readPadActions(pad, this.settings, this.axisEngaged);
    this.axisEngaged = padState.axisEngaged;
    const keyboardDown = (action: RebindableAction) => this.keys[action].some((key) => key.isDown);
    const keyboardEdge = (action: RebindableAction) => this.keys[action].some((key) => Phaser.Input.Keyboard.JustDown(key));
    const nextEdges = {} as Record<RebindableAction, boolean>;
    for (const action of Object.keys(KEYBOARD_CODES) as RebindableAction[]) {
      nextEdges[action] = keyboardEdge(action) || (!swapped && padState.pressed[action] && !this.previousPad[action]) || !!this.pointerPressed[action];
    }
    const keyboardAxis = Number(this.directionKeys.right.isDown || this.directionKeys.rightArrow.isDown) - Number(this.directionKeys.left.isDown || this.directionKeys.leftArrow.isDown);
    const axis = Math.abs(padState.axis) >= this.settings.deadZone ? padState.axis : keyboardAxis;
    const pausePressed = !!pad && !swapped && padState.pausePressed && !this.previousPause;
    const jumpHeld = keyboardDown('jump') || !!padState.pressed.jump;
    this.previousPad = { ...padState.pressed };
    this.previousPause = padState.pausePressed;
    this.pointerPressed = {};
    this.actionEdges = nextEdges;
    return {
      move: { axis: Math.max(-1, Math.min(1, axis)), jumpPressed: nextEdges.jump, jumpHeld, dashPressed: nextEdges.dash },
      pause: pausePressed,
      controller: !!pad,
      controllerIndex: pad?.index ?? -1,
      actions: { ...nextEdges },
    };
  }

  pressed(action: RebindableAction): boolean { return this.actionEdges[action]; }
}
