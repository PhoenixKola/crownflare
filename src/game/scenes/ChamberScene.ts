import * as Phaser from 'phaser';
import { InputController } from '../input/InputController';
import { initialMoveState, stepMovement, type MoveState } from '../movement/motion';
export type ChamberSnapshot = { x: number; y: number; grounded: boolean; facing: number; dashActive: boolean; cameraX: number; controller: boolean };
const WORLD_WIDTH = 1560;
const WORLD_HEIGHT = 270;
const GROUND_TOP = 241;
/** B00 collision-test chamber: geometry is intentionally TEMPORARY, not approved game art. */
export class ChamberScene extends Phaser.Scene {
  private actor!: Phaser.GameObjects.Rectangle;
  private body!: Phaser.Physics.Arcade.Body;
  private controller!: InputController;
  private motion: MoveState = initialMoveState();
  private controllerConnected = false;
  private groundContact = false;
  private lastTelemetry = 0;
  private onPauseRequested: () => void;
  private onControllerState: (active: boolean) => void;
  constructor(onPauseRequested: () => void, onControllerState: (active: boolean) => void) {
    super({ key: 'Chamber' });
    this.onPauseRequested = onPauseRequested; this.onControllerState = onControllerState;
  }
  create(): void {
    const add = this.add;
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    const bg = add.graphics().setScrollFactor(0);
    bg.fillGradientStyle(0x0c1727, 0x11283c, 0x162a32, 0x101b2c, 1); bg.fillRect(0, 0, 480, 270);
    for (let i = 0; i < 32; i++) {
      const x = i * 52 + 5, y = 32 + ((i * 41) % 118);
      add.rectangle(x, y, 2, 2, 0xb1dcdf, .18).setScrollFactor(.13);
    }
    for (let i = 0; i < 22; i++) {
      const x = i * 98; const h = 28 + (i % 4) * 16;
      add.rectangle(x, GROUND_TOP - h / 2 + 4, 40, h, 0x172e3c, .75).setScrollFactor(.36);
      add.rectangle(x + 8, GROUND_TOP - h + 6, 4, 3, 0x83c1c3, .25).setScrollFactor(.36);
    }
    for (let i = 0; i < 26; i++) {
      const x = i * 64 + 12;
      add.rectangle(x, 229, 3, 20, 0x66bbc2, .25);
    }
    const platforms: Phaser.GameObjects.Rectangle[] = [];
    const tile = (x: number, top: number, width: number, height: number, color = 0x354f54): void => {
      const block = add.rectangle(x, top + height / 2, width, height, color);
      block.setStrokeStyle(1, 0x79b8ad, .75);
      add.rectangle(x, top + 1, width, 2, 0x9adcd0, .7);
      this.physics.add.existing(block, true);
      platforms.push(block);
    };
    tile(780, GROUND_TOP, WORLD_WIDTH, 29, 0x34464b);
    tile(220, 196, 96, 11);
    tile(390, 165, 82, 11);
    tile(560, 195, 82, 11);
    tile(780, 178, 94, 11);
    tile(965, 196, 95, 11);
    tile(1150, 167, 110, 11);
    tile(1380, 192, 120, 11);
    tile(1120, 217, 14, 24, 0x624f50); // dash collision test barrier
    add.text(27, 205, 'SECTOR 00 · SIMULATION CHAMBER', { fontFamily: 'monospace', fontSize: '8px', color: '#cce5d9' });
    add.text(1057, 205, 'DASH BARRIER', { fontFamily: 'monospace', fontSize: '8px', color: '#edab91' });
    add.text(1270, 127, 'BEYOND THE BROKEN DAY', { fontFamily: 'monospace', fontSize: '8px', color: '#85c3bd' });
    add.text(472, 258, 'TEMPORARY / TEST CHAMBER', { fontFamily: 'monospace', fontSize: '7px', color: '#edab91' }).setOrigin(1, 1).setScrollFactor(0);
    this.actor = add.rectangle(80, 200, 15, 30, 0xead4be).setStrokeStyle(1, 0x163641);
    add.rectangle(80, 180, 5, 5, 0x52d4c7).setAlpha(0); // prototype marker: no hero artwork
    this.physics.add.existing(this.actor);
    this.body = this.actor.body as Phaser.Physics.Arcade.Body;
    this.body.setSize(15, 30).setCollideWorldBounds(true).setMaxVelocity(370, 620);
    this.body.setGravityY(790);
    for (const platform of platforms) this.physics.add.collider(this.actor, platform);
    this.cameras.main.startFollow(this.actor, false, .12, .12, 0, 15);
    this.cameras.main.setDeadzone(90, 46);
    this.controller = new InputController(this);
    this.input.keyboard?.addCapture(['SPACE', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'SHIFT']);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.removeCapture(['SPACE', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'SHIFT']));
  }
  update(_time: number, delta: number): void {
    const input = this.controller.read();
    if (input.pause) { this.onPauseRequested(); return; }
    if (input.controller !== this.controllerConnected) { this.controllerConnected = input.controller; this.onControllerState(input.controller); }
    const grounded = this.body.blocked.down || this.body.touching.down;
    const movement = stepMovement({ ...this.motion, xVelocity: this.body.velocity.x, yVelocity: this.body.velocity.y }, input.move, grounded, Math.min(delta, 50));
    this.motion = movement.next;
    this.body.setVelocityX(movement.next.xVelocity);
    if (movement.jumped) this.body.setVelocityY(movement.next.yVelocity);
    if (movement.releaseCut && this.body.velocity.y < -95) this.body.setVelocityY(-95);
    this.actor.setFillStyle(movement.next.dashMs > 0 ? 0xf1ab85 : 0xe7dfce);
    this.actor.setAngle(movement.next.dashMs > 0 ? -7 * movement.next.facing : 0);
    this.groundContact = grounded;
    this.lastTelemetry += delta;
    if (this.lastTelemetry > 200) { this.lastTelemetry = 0; window.dispatchEvent(new CustomEvent('crownflare:tick')); }
  }
  resetTransientInput(): void { this.controller?.resetTransientState(); }
  snapshot(): ChamberSnapshot | null {
    if (!this.actor || !this.body) return null;
    return { x: Number(this.actor.x.toFixed(1)), y: Number(this.actor.y.toFixed(1)), grounded: this.groundContact, facing: this.motion.facing, dashActive: this.motion.dashMs > 0, cameraX: Math.round(this.cameras.main.scrollX), controller: this.controllerConnected };
  }
}
