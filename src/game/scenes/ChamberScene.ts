import * as Phaser from 'phaser';
import { InputController } from '../input/InputController';
import { initialMoveState, stepMovement, type MoveState } from '../movement/motion';
import { animationAssetKey, frameAt, IONA_ATTACK_FRAMES, IONA_CLIPS, type IonaFacing, type IonaLocomotion } from '../animation/ionaAnimation';
import { IONA_RECOVERY_CLIPS, IONA_RECOVERY_FRAME_IDS, IONA_RECOVERY_JAB, recoveryAssetKey, recoveryFrameAt } from '../animation/ionaRecoveryAnimation';
import { IONA_B01C_TEXTURES, ionaB01CAnimationKey, ionaB01CAssetKey, registerIonaB01CAnimations, validateIonaB01CTextures } from '../animation/ionaB01cAnimation';
import { IONA_B01D_TEXTURES, ionaB01DAnimationKey, ionaB01DAssetKey, registerIonaB01DAnimations, validateIonaB01DTextures } from '../animation/ionaB01dAnimation';
import { ionaCandidateFrameBounds } from '../animation/ionaCandidateFrameMetrics';
import { beginAction, idleClock, stepAction, type ActionDef, type CombatClock, type CombatEvent } from '../combat/sim';

export type ChamberSnapshot = { x: number; y: number; grounded: boolean; facing: number; dashActive: boolean; cameraX: number; controller: boolean; bodySize: { width: number; height: number } };
export type ArtReviewView = 'base' | 'forms' | 'silhouette' | 'direction' | 'materials';
export type ArtReviewContrast = 'calm' | 'light' | 'busy';
export type ArtReviewSnapshot = { view: ArtReviewView; contrast: ArtReviewContrast; silhouetteHeight: 48 | 60 | 72; pixelGrid: boolean; loadedAssets: number; totalAssets: number; missingAssets: string[] };
const WORLD_WIDTH = 1560;
const WORLD_HEIGHT = 270;
const GROUND_TOP = 241;
const FORM_KEYS = ['base', 'dawnrush', 'stormhalo', 'eclipse-warden'] as const;
const ART_REVIEW_ASSET_KEYS = FORM_KEYS.flatMap((form) => [48, 60, 72].flatMap((height) => [
  `b01a-${form}-${height}`,
  `b01a-${form}-${height}-silhouette`,
])).concat(['b01a-base-left-60', 'b01a-base-left-60-silhouette']);
const LEGACY_IONA_FRAME_IDS = [...new Set(Object.values(IONA_CLIPS).flatMap((clip) => clip.map((frame) => frame.id)).concat(Object.values(IONA_ATTACK_FRAMES)))];
const LIGHT_HIT: ActionDef = {
  id:'iona-light-hit', moveId:'iona-base-jab', sourceId:'iona-player', targetId:'training-dummy',
  startupMs:IONA_RECOVERY_JAB.startupMs, activeMs:IONA_RECOVERY_JAB.activeMs, recoveryMs:IONA_RECOVERY_JAB.recoveryMs, events:[{id:'contact',atMs:IONA_RECOVERY_JAB.contactEventMs}],
};
const B01C_COMBO_ACTIONS: ActionDef[] = [
  { id:'iona-base-combo-1', moveId:'iona-base-combo-1', sourceId:'iona-player', targetId:'training-dummy', startupMs:90, activeMs:80, recoveryMs:170, events:[{id:'contact',atMs:112}] },
  { id:'iona-base-combo-2', moveId:'iona-base-combo-2', sourceId:'iona-player', targetId:'training-dummy', startupMs:110, activeMs:90, recoveryMs:170, events:[{id:'contact',atMs:138}] },
  { id:'iona-base-combo-3', moveId:'iona-base-combo-3', sourceId:'iona-player', targetId:'training-dummy', startupMs:140, activeMs:100, recoveryMs:220, events:[{id:'contact',atMs:165}] },
];
export type AnimationLabSnapshot = { mode:string; frame:string; facing:IonaFacing; attackPhase:string; comboStep:number; targetHealth:number; targetX:number; lastCombatEvent:string; artSource:'generated-imagegen'|'rejected-svg'|'b01c-native'|'b01d-candidate'; assetCount:number; missingAssets:string[]; reviewVisible:boolean; contrast:ArtReviewContrast; reviewScale:48|60|72; spriteScale:number; visibleHeightPx:number; diagnosticsVisible:boolean; b01cComparison:boolean; vfxEnabled:boolean };

/** B00 collision-test chamber; geometry remains programmer art and is never treated as production art. */
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
  private readonly artReview: boolean;
  private readonly animationLab: boolean;
  private readonly oldRejectedArt: boolean;
  private readonly b01cMode: boolean;
  private readonly b01dMode: boolean;
  private labCompareB01c = false;
  private labDiagnosticsVisible = false;
  private labVfxEnabled = false;
  private labABRequested = false;
  private labVfxRequested = false;
  private labDiagnosticsRequested = false;
  private labDiagnosticsGraphic?: Phaser.GameObjects.Graphics;
  private reviewView: ArtReviewView = 'base';
  private reviewContrast: ArtReviewContrast = 'calm';
  private silhouetteHeight: 48 | 60 | 72 = 60;
  private reviewGrid = false;
  private reviewKeys!: { view: Phaser.Input.Keyboard.Key; contrast: Phaser.Input.Keyboard.Key; grid: Phaser.Input.Keyboard.Key; size48: Phaser.Input.Keyboard.Key; size60: Phaser.Input.Keyboard.Key; size72: Phaser.Input.Keyboard.Key };
  private reviewObjects: Phaser.GameObjects.GameObject[] = [];
  private backgroundLayers!: Record<ArtReviewContrast, Phaser.GameObjects.Graphics>;
  private busyLayer!: Phaser.GameObjects.Graphics;
  private labSprite?: Phaser.GameObjects.Sprite;
  private labClipKey = '';
  private labFrame = 'idle-0';
  private labMode: IonaLocomotion | 'attack' = 'idle';
  private labElapsed = 0;
  private wasMoving = false;
  private wasGrounded = false;
  private landingMs = 0;
  private startMs = 0;
  private stopMs = 0;
  private turnMs = 0;
  private dashRecoverMs = 0;
  private jumpTakeoffMs = 0;
  private turnFromFacing: IonaFacing = 1;
  private attackClock: CombatClock = idleClock;
  private attackBufferMs = 0;
  private attackComboIndex = 0;
  private attackFacing: IonaFacing = 1;
  private targetHealth = 3;
  private lastCombatEvent = 'none';
  private readonly targetX = 151;
  private targetVisual?: Phaser.GameObjects.Graphics;
  private targetLabel?: Phaser.GameObjects.Text;
  private hitFlashMs = 0;
  private labHud?: Phaser.GameObjects.Text;
  private labReviewVisible = false;
  private labReviewScale:48|60|72=60;
  private labReviewScaleRequested:48|60|72|null=null;
  private labReviewSub?:Phaser.GameObjects.Text;
  private labReviewImages:Phaser.GameObjects.Image[]=[];
  private labReviewObjects: Array<Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image | Phaser.GameObjects.Text> = [];
  private labReviewSilhouettes: Phaser.GameObjects.Image[] = [];
  private labReviewPanel?: Phaser.GameObjects.Rectangle;
  private labReviewRequested = false;
  private labContrastRequested = false;
  private impactAudio?: AudioContext;

  constructor(onPauseRequested: () => void, onControllerState: (active: boolean) => void, options: { artReview?: boolean; animationLab?: boolean } = {}) {
    super({ key: 'Chamber' });
    this.onPauseRequested = onPauseRequested;
    this.onControllerState = onControllerState;
    this.artReview = options.artReview === true;
    this.animationLab = options.animationLab === true && !this.artReview;
    const params = new URLSearchParams(window.location.search);
    this.oldRejectedArt = this.animationLab && params.get('oldRejectedArt') === '1';
    this.b01cMode = this.animationLab && params.get('b01c') === '1' && params.get('b01d') !== '1' && !this.oldRejectedArt;
    this.b01dMode = this.animationLab && params.get('b01d') === '1' && !this.oldRejectedArt;
    const view = params.get('view');
    const contrast = params.get('contrast');
    const height = Number(params.get('size'));
    this.reviewGrid = params.get('grid') === '1';
    if (view === 'base' || view === 'forms' || view === 'silhouette' || view === 'direction' || view === 'materials') this.reviewView = view;
    if (contrast === 'calm' || contrast === 'light' || contrast === 'busy') this.reviewContrast = contrast;
    if (height === 48 || height === 60 || height === 72) this.silhouetteHeight = height;
    this.labReviewVisible = this.animationLab && params.get('review') === '1';
  }

  preload(): void {
    if (this.artReview) {
      for (const form of FORM_KEYS) for (const height of [48, 60, 72]) {
        const filename = `${form}-${height}`;
        this.load.image(`b01a-${filename}`, `./assets/characters/iona/b01a/${filename}.png`);
        this.load.image(`b01a-${filename}-silhouette`, `./assets/characters/iona/b01a/${filename}-silhouette.png`);
      }
      this.load.image('b01a-base-left-60', './assets/characters/iona/b01a/base-left-60.png');
      this.load.image('b01a-base-left-60-silhouette', './assets/characters/iona/b01a/base-left-60-silhouette.png');
    }
    if (this.animationLab) {
      if (this.b01cMode) {
        for (const { id, facing } of IONA_B01C_TEXTURES) {
          this.load.image(ionaB01CAssetKey(id, facing), `./assets/characters/iona/b01c/${id}-${facing}.png`);
        }
        this.load.image('iona-b01c-method-nearest-right','./assets/characters/iona/b01-recovery/run-0-right.png');
        this.load.image('iona-b01c-method-grid-right','./assets/characters/iona/b01c/method-grid-right.png');
        this.load.image('iona-b01c-method-native-right','./assets/characters/iona/b01c/method-native-edit-right.png');
      } else if (this.b01dMode) {
        for (const { id, facing } of IONA_B01D_TEXTURES) this.load.image(ionaB01DAssetKey(id, facing), `./assets/characters/iona/b01d/${id}-${facing}.png`);
        for (const { id, facing } of IONA_B01C_TEXTURES) this.load.image(ionaB01CAssetKey(id, facing), `./assets/characters/iona/b01c/${id}-${facing}.png`);
        this.load.image('iona-b01d-b01a-base','./assets/characters/iona/b01a/base-60-silhouette.png');
        this.load.image('iona-b01d-dawnrush','./assets/characters/iona/b01a/dawnrush-60-silhouette.png');
        this.load.image('iona-b01d-stormhalo','./assets/characters/iona/b01a/stormhalo-60-silhouette.png');
        this.load.image('iona-b01d-eclipse','./assets/characters/iona/b01a/eclipse-warden-60-silhouette.png');
        this.load.image('iona-b01d-base-silhouette','./assets/characters/iona/b01a/base-60-silhouette.png');
      } else {
        for (const id of IONA_RECOVERY_FRAME_IDS) for (const facing of [-1, 1] as const) {
          const side = facing < 0 ? 'left' : 'right';
          this.load.image(recoveryAssetKey(id, facing), `./assets/characters/iona/b01-recovery/${id}-${side}.png`);
        }
        this.load.image('iona-rejected-idle-right','./assets/characters/iona/overnight/idle-0-right.png');
        this.load.image('iona-rejected-idle-left','./assets/characters/iona/overnight/idle-0-left.png');
        if (this.oldRejectedArt) {
          for (const id of LEGACY_IONA_FRAME_IDS) for (const side of ['right','left']) this.load.image(`iona-${id}-${side}`, `./assets/characters/iona/overnight/${id}-${side}.png`);
          for (const side of ['right','left']) this.load.image(`iona-dawnrush-silhouette-${side}`, `./assets/characters/iona/overnight/dawnrush-silhouette-${side}.png`);
        }
        this.load.image('iona-review-b01a','./assets/characters/iona/b01a/base-60.png');
        this.load.image('iona-review-dawnrush','./assets/characters/iona/overnight/dawnrush-silhouette-right.png');
        this.load.image('iona-review-stormhalo','./assets/characters/iona/b01a/stormhalo-60-silhouette.png');
        this.load.image('iona-review-eclipse','./assets/characters/iona/b01a/eclipse-warden-60-silhouette.png');
        this.load.image('iona-recovery-silhouette','./assets/characters/iona/b01-recovery/base-60-silhouette.png');
      }
    }
  }

  create(): void {
    const add = this.add;
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.backgroundLayers = {
      calm: add.graphics().setScrollFactor(0),
      light: add.graphics().setScrollFactor(0),
      busy: add.graphics().setScrollFactor(0),
    };
    this.backgroundLayers.calm.fillGradientStyle(0x0c1727, 0x11283c, 0x162a32, 0x101b2c, 1).fillRect(0, 0, 480, 270);
    this.backgroundLayers.light.fillGradientStyle(0xd9d6c9, 0xb5ccc7, 0xc2c7b4, 0xe3d7c1, 1).fillRect(0, 0, 480, 270);
    this.backgroundLayers.busy.fillGradientStyle(0x281e3b, 0x17344a, 0x513a51, 0x182838, 1).fillRect(0, 0, 480, 270);
    this.busyLayer = add.graphics().setScrollFactor(.18);
    for (let i = 0; i < 22; i++) {
      const x = i * 23 + 2, y = 24 + ((i * 37) % 133), width = 8 + ((i * 11) % 19), height = 3 + ((i * 7) % 15);
      const colors = [0xf087a2, 0xe2a55e, 0x8a7ddb, 0x5ac1b5];
      this.busyLayer.fillStyle(colors[i % colors.length]!, .33).fillRect(x, y, width, height);
    }
    this.applyReviewContrast();

    for (let i = 0; i < 32; i++) {
      const x = i * 52 + 5, y = 32 + ((i * 41) % 118);
      add.rectangle(x, y, 2, 2, this.reviewContrast === 'light' ? 0x435e64 : 0xb1dcdf, this.reviewContrast === 'light' ? .24 : .18).setScrollFactor(.13);
    }
    for (let i = 0; i < 22; i++) {
      const x = i * 98; const h = 28 + (i % 4) * 16;
      add.rectangle(x, GROUND_TOP - h / 2 + 4, 40, h, this.reviewContrast === 'light' ? 0x60777a : 0x172e3c, .75).setScrollFactor(.36);
      add.rectangle(x + 8, GROUND_TOP - h + 6, 4, 3, 0x83c1c3, .25).setScrollFactor(.36);
    }
    for (let i = 0; i < 26; i++) {
      const x = i * 64 + 12;
      add.rectangle(x, 229, 3, 20, 0x66bbc2, .25);
    }
    const platforms: Phaser.GameObjects.Rectangle[] = [];
    const tile = (x: number, top: number, width: number, height: number, color = 0x354f54): void => {
      const block = add.rectangle(x, top + height / 2, width, height, color);
      block.setStrokeStyle(1, this.reviewContrast === 'light' ? 0x536e6b : 0x79b8ad, .75);
      add.rectangle(x, top + 1, width, 2, this.reviewContrast === 'light' ? 0xf0ead7 : 0x9adcd0, .7);
      this.physics.add.existing(block, true);
      platforms.push(block);
    };
    tile(780, GROUND_TOP, WORLD_WIDTH, 29, this.reviewContrast === 'light' ? 0x465552 : 0x34464b);
    tile(220, 196, 96, 11);
    tile(390, 165, 82, 11);
    tile(560, 195, 82, 11);
    tile(780, 178, 94, 11);
    tile(965, 196, 95, 11);
    tile(1150, 167, 110, 11);
    tile(1380, 192, 120, 11);
    tile(1120, 217, 14, 24, 0x624f50); // dash collision test barrier
    if (!this.artReview && !this.animationLab) {
      add.text(27, 205, 'SECTOR 00 Â· SIMULATION CHAMBER', { fontFamily: 'monospace', fontSize: '8px', color: this.reviewContrast === 'light' ? '#263940' : '#cce5d9' });
      add.text(1057, 205, 'DASH BARRIER', { fontFamily: 'monospace', fontSize: '8px', color: '#edab91' });
      add.text(1270, 127, 'BEYOND THE BROKEN DAY', { fontFamily: 'monospace', fontSize: '8px', color: this.reviewContrast === 'light' ? '#314852' : '#85c3bd' });
    }
    add.text(472, 258, this.artReview ? 'B01A CANDIDATE ART / OWNER REVIEW PENDING' : this.animationLab ? (this.oldRejectedArt ? 'REJECTED OVERNIGHT VECTOR ART / COMPARISON ONLY' : this.b01cMode ? 'B01C NATIVE PIXEL MOTION PILOT / OWNER REVIEW PENDING' : 'B01 RECOVERY / IMAGEGEN PIXELS / OWNER REVIEW PENDING') : 'TEMPORARY / TEST CHAMBER', { fontFamily: 'monospace', fontSize: this.artReview || this.animationLab ? '6px' : '7px', color: this.artReview || this.animationLab ? '#ffcfaa' : '#edab91' }).setOrigin(1, 1).setScrollFactor(0);

    if (this.artReview) {
      this.createArtReview();
      return;
    }

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
    if (this.animationLab) {
      this.actor.setAlpha(0);
      if (this.b01cMode || this.b01dMode) registerIonaB01CAnimations(this);
      if (this.b01dMode) registerIonaB01DAnimations(this);
      const initialKey = this.oldRejectedArt ? animationAssetKey('idle-0',1) : this.b01dMode ? ionaB01DAssetKey('idle-0','right') : this.b01cMode ? ionaB01CAssetKey('idle-0','right') : recoveryAssetKey('idle-0',1);
      this.labSprite = add.sprite(this.actor.x,this.body.bottom,initialKey).setOrigin(.5,1).setDepth(12);
      this.labHud = add.text(6,5,this.b01dMode ? 'B01D CANDIDATE / OWNER PENDING | A/D MOVE | SPACE JUMP | SHIFT DASH | J COMBO | T A/B | 1-3 SCALE | C BG | V VFX | G DIAG' : this.oldRejectedArt ? 'REJECTED ART COMPARISON ONLY  |  J HIT  |  R A/B' : this.b01cMode ? 'B01C / PHASER SPRITES  |  A/D MOVE  |  SPACE JUMP  |  SHIFT DASH  |  J COMBO  |  R REVIEW' : 'B01 RECOVERY / GENERATED PIXELS  |  J HIT  |  R A/B  |  C BG', {fontFamily:'monospace',fontSize:this.b01dMode?'5px':'6px',color:'#fff1d2',backgroundColor:'#171b2c',padding:{x:3,y:2}}).setScrollFactor(0).setDepth(40);
      this.input.keyboard?.on('keydown-R',(event:KeyboardEvent)=>{if(!event.repeat)this.labReviewRequested=true;});
      this.input.keyboard?.on('keydown-C',(event:KeyboardEvent)=>{if(!event.repeat)this.labContrastRequested=true;});
      this.input.keyboard?.on('keydown-T',(event:KeyboardEvent)=>{if(!event.repeat&&this.b01dMode)this.labABRequested=true;});
      this.input.keyboard?.on('keydown-V',(event:KeyboardEvent)=>{if(!event.repeat&&this.b01dMode)this.labVfxRequested=true;});
      this.input.keyboard?.on('keydown-G',(event:KeyboardEvent)=>{if(!event.repeat&&this.b01dMode)this.labDiagnosticsRequested=true;});
      this.input.keyboard?.on('keydown',(event:KeyboardEvent)=>{
        if(event.code==='Digit1')this.labReviewScaleRequested=48;
        else if(event.code==='Digit2')this.labReviewScaleRequested=60;
        else if(event.code==='Digit3')this.labReviewScaleRequested=72;
      });
      if(this.b01dMode)this.labDiagnosticsGraphic=add.graphics().setDepth(39);
      this.createTrainingTarget();
      this.createAnimationReview();
      this.updateAnimationReviewVisibility();
      this.input.keyboard?.addCapture(['J','R','C','T','V','G']);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{void this.impactAudio?.close();this.impactAudio=undefined;});
    }
    this.input.keyboard?.addCapture(['SPACE', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'SHIFT']);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.removeCapture(['SPACE', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'SHIFT']));
  }

  update(_time: number, delta: number): void {
    if (this.artReview) { this.updateArtReview(); return; }
    const input = this.controller.read();
    if (input.pause) { this.onPauseRequested(); return; }
    if (input.controller !== this.controllerConnected) { this.controllerConnected = input.controller; this.onControllerState(input.controller); }
    const grounded = this.body.blocked.down || this.body.touching.down;
    const oldFacing = this.motion.facing;
    const wasDashing = this.motion.dashMs > 0;
    const wasMoving = this.wasMoving;
    const dt = Math.min(delta, 50);
    const movement = stepMovement({ ...this.motion, xVelocity: this.body.velocity.x, yVelocity: this.body.velocity.y }, input.move, grounded, dt);
    this.motion = movement.next;
    this.body.setVelocityX(movement.next.xVelocity);
    if (movement.jumped) this.body.setVelocityY(movement.next.yVelocity);
    if (movement.releaseCut && this.body.velocity.y < -95) this.body.setVelocityY(-95);
    this.actor.setFillStyle(movement.next.dashMs > 0 ? 0xf1ab85 : 0xe7dfce);
    this.actor.setAngle(movement.next.dashMs > 0 ? -7 * movement.next.facing : 0);
    this.groundContact = grounded;
    if (this.animationLab) {
      if (this.labReviewRequested) { this.labReviewVisible=!this.labReviewVisible; this.labReviewRequested=false; }
      if (this.labContrastRequested) {
        this.labContrastRequested=false;
        const contrasts: ArtReviewContrast[] = ['calm','light','busy'];
        this.reviewContrast = contrasts[(contrasts.indexOf(this.reviewContrast)+1)%contrasts.length]!;
        this.applyReviewContrast();
      }
      if(this.labABRequested){
        this.labABRequested=false;
        this.labCompareB01c=!this.labCompareB01c;
        this.labClipKey='';
      }
      if(this.labVfxRequested){this.labVfxRequested=false;this.labVfxEnabled=!this.labVfxEnabled;}
      if(this.labDiagnosticsRequested){this.labDiagnosticsRequested=false;this.labDiagnosticsVisible=!this.labDiagnosticsVisible;}
      if(this.labReviewScaleRequested!==null){
        this.labReviewScale=this.labReviewScaleRequested;
        this.labReviewScaleRequested=null;
        for(const image of this.labReviewImages)image.setScale(this.labReviewScale/60);
        this.fitB01dSpriteToRequestedHeight();
        this.labReviewSub?.setText('VISIBLE HEIGHT '+this.labReviewScale+' PX / B00 BODY 15x30 / 1-2-3 SCALE / R CLOSES / C CYCLES BG');
      }
      const moving = Math.abs(movement.next.xVelocity) > 12 && movement.next.dashMs === 0;
      if (moving && !wasMoving) this.startMs = this.b01cMode||this.b01dMode ? 140 : 70;
      if (!moving && wasMoving) this.stopMs = this.b01cMode||this.b01dMode ? 140 : 85;
      if (oldFacing !== movement.next.facing) { this.turnMs = 90; this.turnFromFacing = oldFacing as IonaFacing; }
      if (movement.jumped) this.jumpTakeoffMs = this.b01cMode||this.b01dMode ? 80 : 0;
      if (movement.next.dashMs > 0) { this.startMs = 0; this.stopMs = 0; }
      if (wasDashing && movement.next.dashMs === 0) this.dashRecoverMs = 100;
      const attackPressed=this.controller.readAttackPressed();
      if(this.b01cMode||this.b01dMode)this.updateB01CCombat(attackPressed,grounded,dt);
      else this.updateCombat(attackPressed,grounded,dt);
      this.updateLabAnimation(grounded,moving,dt);
      this.labSprite?.setPosition(this.actor.x,this.body.bottom);
      this.drawAnimationDiagnostics();
      this.updateAnimationReviewVisibility();
      if (this.labHud) this.labHud.setText(this.b01dMode ? `B01D CANDIDATE ${this.labCompareB01c?'SHOWING B01C':'SHOWING B01D'} / OWNER PENDING | ${this.labMode.toUpperCase()} ${this.labFrame} | SIZE ${this.labReviewScale} | C BG | T A/B | VFX ${this.labVfxEnabled?'ON':'OFF'} | G DIAG` : (this.oldRejectedArt?'REJECTED SVG COMPARE  |  ':this.b01cMode?'B01C NATIVE PIXEL PILOT  |  ':'B01 RECOVERY / GENERATED PIXELS  |  ') + this.labMode.toUpperCase() + ' / ' + this.labFrame + '  |  '+(this.b01cMode?'J COMBO':'J HIT')+'  |  R REVIEW  |  C BG');
      this.wasMoving = moving;
      this.wasGrounded = grounded;
      this.hitFlashMs = Math.max(0,this.hitFlashMs-dt);
      this.drawTrainingTarget();
    }
    this.lastTelemetry += delta;
    if (this.lastTelemetry > 200) { this.lastTelemetry = 0; window.dispatchEvent(new CustomEvent('crownflare:tick')); }
  }

  resetTransientInput(): void {
    this.controller?.resetTransientState();
    this.labReviewRequested=false; this.labContrastRequested=false; this.labReviewScaleRequested=null; this.labABRequested=false; this.labVfxRequested=false; this.labDiagnosticsRequested=false;
  }

  snapshot(): ChamberSnapshot | null {
    if (!this.actor || !this.body) return null;
    return { x: Number(this.actor.x.toFixed(1)), y: Number(this.actor.y.toFixed(1)), grounded: this.groundContact, facing: this.motion.facing, dashActive: this.motion.dashMs > 0, cameraX: Math.round(this.cameras.main.scrollX), controller: this.controllerConnected, bodySize: { width: this.body.width, height: this.body.height } };
  }

  animationSnapshot(): AnimationLabSnapshot | null {
    if (!this.animationLab || !this.labSprite) return null;
    const all = this.b01dMode
      ? [...IONA_B01D_TEXTURES.map(({id,facing})=>ionaB01DAssetKey(id,facing)),...IONA_B01C_TEXTURES.map(({id,facing})=>ionaB01CAssetKey(id,facing))]
      : this.b01cMode
      ? IONA_B01C_TEXTURES.map(({ id, facing }) => ionaB01CAssetKey(id, facing))
      : this.oldRejectedArt
      ? LEGACY_IONA_FRAME_IDS.flatMap((id) => [-1,1].map((facing) => animationAssetKey(id,facing as IonaFacing)))
        .concat([-1,1].map((facing)=>animationAssetKey('dawnrush-silhouette',facing as IonaFacing)))
      : IONA_RECOVERY_FRAME_IDS.flatMap((id) => [-1,1].map((facing) => recoveryAssetKey(id,facing as IonaFacing)));
    const missingAssets = this.b01dMode
      ? [...validateIonaB01DTextures(all.filter((key)=>this.textures.exists(key))),...validateIonaB01CTextures(all.filter((key)=>this.textures.exists(key)))]
      : this.b01cMode
      ? validateIonaB01CTextures(all.filter((key) => this.textures.exists(key)))
      : all.filter((key) => !this.textures.exists(key));
    const currentFrame = (this.b01cMode||this.b01dMode) ? this.labSprite.texture.key.match(/^iona-b01[cd]-(.*)-(left|right)$/)?.[1] ?? this.labFrame : this.labFrame;
    const showingB01C=this.b01cMode||(this.b01dMode&&this.labCompareB01c);
    return { mode:this.labMode, frame:currentFrame, facing:this.motion.facing, attackPhase:this.attackClock.phase, comboStep:(this.b01cMode||this.b01dMode)&&this.attackClock.phase!=='idle'?this.attackComboIndex+1:0, targetHealth:this.targetHealth, targetX:this.targetX, lastCombatEvent:this.lastCombatEvent, artSource:this.oldRejectedArt?'rejected-svg':showingB01C?'b01c-native':this.b01dMode?'b01d-candidate':'generated-imagegen', assetCount:all.length-missingAssets.length, missingAssets, reviewVisible:this.labReviewVisible, contrast:this.reviewContrast, reviewScale:this.labReviewScale, spriteScale:Number(this.labSprite.scaleX.toFixed(3)), visibleHeightPx:Number(this.getLabVisibleHeightPx().toFixed(2)), diagnosticsVisible:this.labDiagnosticsVisible, b01cComparison:this.labCompareB01c, vfxEnabled:this.labVfxEnabled };
  }

  reviewSnapshot(): ArtReviewSnapshot | null {
    if (!this.artReview) return null;
    const missingAssets = ART_REVIEW_ASSET_KEYS.filter((key) => !this.textures.exists(key));
    return { view: this.reviewView, contrast: this.reviewContrast, silhouetteHeight: this.silhouetteHeight, pixelGrid: this.reviewGrid, loadedAssets: ART_REVIEW_ASSET_KEYS.length - missingAssets.length, totalAssets: ART_REVIEW_ASSET_KEYS.length, missingAssets };
  }

  private createTrainingTarget(): void {
    this.targetVisual = this.add.graphics().setDepth(9);
    this.targetLabel = this.add.text(this.targetX,GROUND_TOP-72,'TRAINING DUMMY / 3', {fontFamily:'monospace',fontSize:'6px',color:'#f0cda8',align:'center',backgroundColor:'#171b2c',padding:{x:2,y:1}}).setOrigin(.5,1).setDepth(20);
    this.drawTrainingTarget();
  }

  private drawTrainingTarget(): void {
    if (!this.targetVisual) return;
    const x=this.targetX, top=GROUND_TOP-31;
    this.targetVisual.clear();
    this.targetVisual.fillStyle(this.hitFlashMs>0?0xffd888:0x8c6c68,1).fillRect(x-8,top,16,27);
    this.targetVisual.fillStyle(0x302a3b,1).fillRect(x-11,top+4,22,4);
    this.targetVisual.fillStyle(0xe4d7d0,1).fillRect(x-4,top+7,8,3);
    this.targetVisual.fillStyle(0x35aeb0,1).fillRect(x-3,top+8,2,2);
    this.targetVisual.fillStyle(0xa8694e,1).fillRect(x-10,top+14,20,4);
    this.targetVisual.fillStyle(0x282743,1).fillRect(x-5,GROUND_TOP-4,10,4);
    this.targetLabel?.setText('TRAINING DUMMY / '+this.targetHealth+' HP');
  }

  private updateCombat(pressed: boolean, grounded: boolean, deltaMs: number): void {
    if (this.attackBufferMs>0) this.attackBufferMs=Math.max(0,this.attackBufferMs-deltaMs);
    if (pressed) {
      if (this.attackClock.phase==='idle' && grounded && this.motion.dashMs===0) this.attackClock=beginAction(LIGHT_HIT);
      else if (this.attackClock.phase!=='idle') this.attackBufferMs=650;
    }
    if (this.attackClock.phase!=='idle') {
      const result=stepAction(this.attackClock,LIGHT_HIT,deltaMs);
      this.attackClock=result.clock;
      for (const event of result.events) this.resolveCombatEvent(event);
    }
    if (this.attackClock.phase==='idle' && this.attackBufferMs>0 && grounded && this.motion.dashMs===0) {
      this.attackBufferMs=0;
      this.attackClock=beginAction(LIGHT_HIT);
    }
  }

  private updateB01CCombat(pressed: boolean, grounded: boolean, deltaMs: number): void {
    if(this.attackBufferMs>0)this.attackBufferMs=Math.max(0,this.attackBufferMs-deltaMs);
    if(pressed){
      if(this.attackClock.phase==='idle'&&grounded&&this.motion.dashMs===0){
        this.attackComboIndex=0;
        this.attackFacing=this.motion.facing;
        this.attackClock=beginAction(B01C_COMBO_ACTIONS[0]!);
      }else if(this.attackClock.phase!=='idle'&&this.attackComboIndex<2){
        this.attackBufferMs=650;
      }
    }
    if(this.attackClock.phase!=='idle'){
      const action=B01C_COMBO_ACTIONS[this.attackComboIndex]!;
      const result=stepAction(this.attackClock,action,deltaMs);
      this.attackClock=result.clock;
      for(const event of result.events)this.resolveCombatEvent(event);
    }
    if(this.attackClock.phase==='idle'){
      if(this.attackBufferMs>0&&this.attackComboIndex<2&&grounded&&this.motion.dashMs===0){
        this.attackComboIndex+=1;
        this.attackBufferMs=0;
        this.attackClock=beginAction(B01C_COMBO_ACTIONS[this.attackComboIndex]!);
      }else if(this.attackBufferMs===0||this.attackComboIndex>=2){
        this.attackBufferMs=0;
        this.attackComboIndex=0;
      }
    }
  }

  private resolveCombatEvent(event: CombatEvent): void {
    const isExtendedCombo=(this.b01cMode||this.b01dMode)&&B01C_COMBO_ACTIONS.some((action)=>action.moveId===event.moveId);
    if (event.eventId!=='contact' || (event.moveId!=='iona-base-jab'&&!isExtendedCombo) || event.sourceId!=='iona-player' || event.targetId!=='training-dummy') return;
    const offset=this.targetX-this.actor.x;
    const facing=isExtendedCombo?this.attackFacing:this.motion.facing;
    const hit=Math.abs(offset)<=42 && Math.sign(offset)===facing && this.targetHealth>0;
    if (hit) {
      this.targetHealth=Math.max(0,this.targetHealth-1);
      if(!this.b01dMode||this.labVfxEnabled){
        this.hitFlashMs=90;
        const burst=this.add.graphics().setDepth(24).setPosition(this.targetX,GROUND_TOP-21);
        burst.lineStyle(2,0xffd890,1).lineBetween(-7,0,7,0).lineBetween(0,-7,0,7).lineBetween(-5,-5,5,5).lineBetween(-5,5,5,-5);
        this.tweens.add({targets:burst,alpha:0,scale:1.8,duration:150,onComplete:()=>burst.destroy()});
      }
      if(!this.b01dMode)this.playImpactSound();
      this.lastCombatEvent='HIT / '+event.moveId+' -> '+event.targetId;
    } else this.lastCombatEvent='MISS / '+event.moveId+' -> '+event.targetId;
    window.dispatchEvent(new CustomEvent('crownflare:combat-event',{detail:{...event,result:hit?'hit':'miss',targetHealth:this.targetHealth}}));
  }

  private playImpactSound(): void {
    const AudioCtor=window.AudioContext;
    if(!AudioCtor)return;
    this.impactAudio??=new AudioCtor();
    const context=this.impactAudio;
    if(context.state==='suspended')void context.resume();
    const now=context.currentTime;
    const oscillator=context.createOscillator();
    const gain=context.createGain();
    oscillator.type='triangle';
    oscillator.frequency.setValueAtTime(142,now);
    oscillator.frequency.exponentialRampToValueAtTime(68,now+.075);
    gain.gain.setValueAtTime(.12,now);
    gain.gain.exponentialRampToValueAtTime(.001,now+.09);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now+.095);
  }

  private updateLabAnimation(grounded: boolean, moving: boolean, deltaMs: number): void {
    if (this.oldRejectedArt) this.updateRejectedArtAnimation(grounded,moving,deltaMs);
    else if (this.b01cMode||this.b01dMode) this.updateB01CAnimation(grounded,moving,deltaMs);
    else this.updateRecoveryAnimation(grounded,moving,deltaMs);
  }

  private updateB01CAnimation(grounded: boolean, moving: boolean, deltaMs: number): void {
    const sprite=this.labSprite;
    if(!sprite)return;
    const useB01DFrames=this.b01dMode&&!this.labCompareB01c;
    if(grounded&&!this.wasGrounded)this.landingMs=110;
    else this.landingMs=Math.max(0,this.landingMs-deltaMs);
    this.startMs=Math.max(0,this.startMs-deltaMs);
    this.stopMs=Math.max(0,this.stopMs-deltaMs);
    this.turnMs=Math.max(0,this.turnMs-deltaMs);
    this.dashRecoverMs=Math.max(0,this.dashRecoverMs-deltaMs);
    this.jumpTakeoffMs=Math.max(0,this.jumpTakeoffMs-deltaMs);

    let next:IonaLocomotion|'attack';
    let clip:string;
    if(this.attackClock.phase!=='idle'){
      next='attack';
      const phase=this.attackClock.phase==='startup'?'windup':this.attackClock.phase==='active'?'contact':'recovery';
      const frame=`combo-${this.attackComboIndex+1}-${phase}`;
      const facing=this.attackFacing<0?'left':'right';
      const key=useB01DFrames?ionaB01DAssetKey(frame,facing):ionaB01CAssetKey(frame,facing);
      sprite.anims.stop();
      this.labClipKey='';
      if(sprite.texture.key!==key)sprite.setTexture(key);
      this.labFrame=frame;
    }else{
      const side=this.motion.facing<0?'left':'right';
      if(this.motion.dashMs>0){next='dash';clip=`dash-${side}`;}
      else if(!grounded){
        if(this.jumpTakeoffMs>0){next='jumpRise';clip=`jump-takeoff-${side}`;}
        else if(this.body.velocity.y<-130){next='jumpRise';clip=`jump-rise-${side}`;}
        else if(this.body.velocity.y<45){next='jumpApex';clip=`jump-apex-${side}`;}
        else{next='fall';clip=`jump-fall-${side}`;}
      }else if(this.landingMs>0){next='land';clip=`jump-land-${side}`;}
      else if(this.dashRecoverMs>0){next='dashRecover';clip=`dash-recover-${side}`;}
      else if(this.turnMs>0){
        next='turn';
        clip=this.turnFromFacing>0?'turn-right-to-left':'turn-left-to-right';
      }else if(moving&&this.startMs>0){next='start';clip=`start-${side}`;}
      else if(moving){next='run';clip=`run-${side}`;}
      else if(this.stopMs>0){next='stop';clip=`stop-${side}`;}
      else{next='idle';clip=`idle-${side}`;}

      this.labMode=next;
      const clipKey=useB01DFrames?ionaB01DAnimationKey(clip):ionaB01CAnimationKey(clip);
      if(this.labClipKey!==clipKey){
        sprite.play(clipKey);
        this.labClipKey=clipKey;
      }
      const frameMatch=sprite.texture.key.match(/^iona-b01[cd]-(.*)-(left|right)$/);
      this.labFrame=frameMatch?.[1]??this.labFrame;
    }
    this.labMode=next;
    sprite.setPosition(this.actor.x,this.body.bottom);
    sprite.setFlipX(false);
    sprite.setAlpha(1);
    this.fitB01dSpriteToRequestedHeight();
  }

  private getLabFrameBounds(): readonly number[] {
    const sprite=this.labSprite;
    const match=sprite?.texture.key.match(/^iona-b01[cd]-(.*)-(left|right)$/);
    if(!match)return [0,0,128,80];
    const side=match[2] as 'left'|'right';
    const candidate=this.labCompareB01c?'b01c':'b01d';
    return ionaCandidateFrameBounds(candidate,match[1]!,side);
  }

  private getLabVisibleHeightPx(): number {
    if(!this.b01dMode||!this.labSprite)return this.labSprite?.displayHeight??0;
    const bounds=this.getLabFrameBounds();
    return (bounds[3]!-bounds[1]!)*this.labSprite.scaleY;
  }

  private fitB01dSpriteToRequestedHeight(): void {
    if(!this.b01dMode||!this.labSprite)return;
    const bounds=this.getLabFrameBounds();
    const visibleHeight=bounds[3]!-bounds[1]!;
    if(visibleHeight>0)this.labSprite.setScale(this.labReviewScale/visibleHeight);
  }

  private drawAnimationDiagnostics(): void {
    const graphics=this.labDiagnosticsGraphic;
    const sprite=this.labSprite;
    if(!graphics)return;
    graphics.clear();
    if(!this.b01dMode||!this.labDiagnosticsVisible||!sprite)return;
    const bodyTop=this.body.bottom-this.body.height;
    const scale=sprite.scaleX;
    const bounds=this.getLabFrameBounds();
    const frameLeft=sprite.x-64*scale;
    const frameTop=sprite.y-80*scale;
    graphics.lineStyle(1,0x67e0c7,.95).strokeRect(this.actor.x-7.5,bodyTop,15,30);
    graphics.lineBetween(this.actor.x-11,this.body.bottom,this.actor.x+11,this.body.bottom);
    graphics.lineStyle(1,0xf4c06c,.8).strokeRect(frameLeft,frameTop,128*scale,80*scale);
    graphics.lineStyle(1,0xff73b8,.95).strokeRect(frameLeft+bounds[0]!*scale,frameTop+bounds[1]!*scale,(bounds[2]!-bounds[0]!)*scale,(bounds[3]!-bounds[1]!)*scale);
    graphics.lineBetween(sprite.x-4,sprite.y,sprite.x+4,sprite.y);
    graphics.lineBetween(sprite.x,sprite.y-4,sprite.x,sprite.y+4);
  }

  private updateRejectedArtAnimation(grounded: boolean, moving: boolean, deltaMs: number): void {
    if (!this.labSprite) return;
    if (grounded && !this.wasGrounded) this.landingMs=175;
    else this.landingMs=Math.max(0,this.landingMs-deltaMs);
    this.startMs=Math.max(0,this.startMs-deltaMs);
    this.stopMs=Math.max(0,this.stopMs-deltaMs);
    this.turnMs=Math.max(0,this.turnMs-deltaMs);
    this.dashRecoverMs=Math.max(0,this.dashRecoverMs-deltaMs);
    let next: IonaLocomotion | 'attack';
    let frame: string;
    if (this.attackClock.phase!=='idle') {
      next='attack';
      frame=this.attackClock.phase==='startup'?IONA_ATTACK_FRAMES.windup:this.attackClock.phase==='active'?IONA_ATTACK_FRAMES.contact:IONA_ATTACK_FRAMES.recovery;
    } else if (this.motion.dashMs>0) {
      next='dash'; frame=frameAt(IONA_CLIPS.dash,125-this.motion.dashMs);
    } else if (!grounded) {
      if (this.motion.yVelocity < -65) next='jumpRise';
      else if (this.motion.yVelocity < 62) next='jumpApex';
      else next='fall';
      frame=IONA_CLIPS[next][0]!.id;
    } else if (this.landingMs>0) {
      next='land'; frame=frameAt(IONA_CLIPS.land,175-this.landingMs);
    } else if (this.dashRecoverMs>0) {
      next='dashRecover'; frame=IONA_CLIPS.dashRecover[0]!.id;
    } else if (this.turnMs>0) {
      next='turn'; frame=IONA_CLIPS.turn[0]!.id;
    } else if (moving && this.startMs>0) {
      next='start'; frame=IONA_CLIPS.start[0]!.id;
    } else if (moving) {
      next='run'; frame=frameAt(IONA_CLIPS.run,this.labElapsed);
    } else if (this.stopMs>0) {
      next='stop'; frame=IONA_CLIPS.stop[0]!.id;
    } else {
      next='idle'; frame=frameAt(IONA_CLIPS.idle,this.labElapsed);
    }
    if (next!==this.labMode) this.labElapsed=0;
    else {
      const speed=Math.abs(this.body.velocity.x);
      const cadence=next==='run'?0.45+0.55*Math.min(1,speed/155):1;
      this.labElapsed+=deltaMs*cadence;
      if (next==='run') frame=frameAt(IONA_CLIPS.run,this.labElapsed);
      if (next==='idle') frame=frameAt(IONA_CLIPS.idle,this.labElapsed);
    }
    this.labMode=next;
    this.labFrame=frame;
    this.labSprite.setTexture(animationAssetKey(frame,this.motion.facing));
    this.labSprite.setFlipX(false);
    this.labSprite.setPosition(this.actor.x,this.body.bottom);
    this.labSprite.setAlpha(1);
  }

  private updateRecoveryAnimation(grounded: boolean, moving: boolean, deltaMs: number): void {
    if (!this.labSprite) return;
    if (grounded && !this.wasGrounded) this.landingMs=175;
    else this.landingMs=Math.max(0,this.landingMs-deltaMs);
    this.startMs=Math.max(0,this.startMs-deltaMs);
    this.stopMs=Math.max(0,this.stopMs-deltaMs);
    this.turnMs=Math.max(0,this.turnMs-deltaMs);
    this.dashRecoverMs=Math.max(0,this.dashRecoverMs-deltaMs);

    let next: IonaLocomotion | 'attack';
    let frame: string;
    if (this.attackClock.phase!=='idle') {
      next='attack';
      frame=IONA_RECOVERY_JAB.frameAtElapsed(this.attackClock.elapsedMs);
    } else if (this.motion.dashMs>0) {
      next='dash';
      frame=recoveryFrameAt(IONA_RECOVERY_CLIPS.run,125-this.motion.dashMs);
    } else if (!grounded) {
      if (this.motion.yVelocity < -65) next='jumpRise';
      else if (this.motion.yVelocity < 62) next='jumpApex';
      else next='fall';
      frame='run-2'; // generated airborne run pose; no dedicated jump art is claimed in this batch.
    } else if (this.landingMs>0) {
      next='land'; frame=this.landingMs>95?'idle-2':'idle-3';
    } else if (this.dashRecoverMs>0) {
      next='dashRecover'; frame='idle-1';
    } else if (this.turnMs>0) {
      next='turn'; frame='idle-0';
    } else if (moving && this.startMs>0) {
      next='start'; frame='run-0';
    } else if (moving) {
      next='run'; frame=recoveryFrameAt(IONA_RECOVERY_CLIPS.run,this.labElapsed);
    } else if (this.stopMs>0) {
      next='stop'; frame='idle-2';
    } else {
      next='idle'; frame=recoveryFrameAt(IONA_RECOVERY_CLIPS.idle,this.labElapsed);
    }

    if (next!==this.labMode) {
      this.labElapsed=0;
      if (next==='run') frame=IONA_RECOVERY_CLIPS.run[0]!.id;
      if (next==='idle') frame=IONA_RECOVERY_CLIPS.idle[0]!.id;
    } else if (next==='run' || next==='idle') {
      const speed=Math.abs(this.body.velocity.x);
      const cadence=next==='run'?0.45+0.55*Math.min(1,speed/155):1;
      this.labElapsed+=deltaMs*cadence;
      frame=next==='run'
        ? recoveryFrameAt(IONA_RECOVERY_CLIPS.run,this.labElapsed)
        : recoveryFrameAt(IONA_RECOVERY_CLIPS.idle,this.labElapsed);
    }
    this.labMode=next;
    this.labFrame=frame;
    this.labSprite.setTexture(recoveryAssetKey(frame,this.motion.facing));
    this.labSprite.setFlipX(false);
    this.labSprite.setPosition(this.actor.x,this.body.bottom);
    this.labSprite.setAlpha(1);
  }

  private createAnimationReview(): void {
    const addPanel=(x:number,y:number,w:number,h:number):void=>{
      const bg=this.add.rectangle(x,y,w,h,0x0b1220,1).setStrokeStyle(1,0xa9cdbf,.9).setScrollFactor(0).setDepth(49);
      this.labReviewPanel=bg;
      this.labReviewObjects.push(bg);
    };
    if(this.b01dMode){
      addPanel(240,135,464,230);
      const title=this.add.text(240,22,'B01C → B01D / RUN LOOP COMPARISON',{fontFamily:'monospace',fontSize:'7px',color:'#ffe0ba',align:'center'}).setOrigin(.5,0).setScrollFactor(0).setDepth(55);
      const sub=this.add.text(240,34,'VFX OFF / A-D ARE INDEPENDENT SOURCES / 1-2-3 SCALE / R CLOSES / C BACKGROUND',{fontFamily:'monospace',fontSize:'5px',color:'#c4d5d1',align:'center'}).setOrigin(.5,0).setScrollFactor(0).setDepth(55);
      this.labReviewSub=sub;
      this.labReviewObjects.push(title,sub);
      const comparisons=[
        {key:ionaB01CAssetKey('run-0','left'),label:'B01C RUN LEFT',x:83},
        {key:ionaB01DAssetKey('run-0','left'),label:'B01D RUN LEFT',x:190},
        {key:ionaB01CAssetKey('run-0','right'),label:'B01C RUN RIGHT',x:290},
        {key:ionaB01DAssetKey('run-0','right'),label:'B01D RUN RIGHT',x:397},
      ];
      for(const item of comparisons){
        const image=this.add.image(item.x,133,item.key).setOrigin(.5,1).setScrollFactor(0).setDepth(52);
        const label=this.add.text(item.x,48,item.label,{fontFamily:'monospace',fontSize:'5px',color:'#e9eee5',align:'center'}).setOrigin(.5,0).setScrollFactor(0).setDepth(55);
        this.labReviewImages.push(image);
        this.labReviewObjects.push(image,label);
      }
      const formTitle=this.add.text(240,150,'VFX OFF / FORM REFERENCES RETAINED FROM B01A — NOT APPROVED',{fontFamily:'monospace',fontSize:'5px',color:'#e9eee5',align:'center'}).setOrigin(.5,0).setScrollFactor(0).setDepth(55);
      this.labReviewObjects.push(formTitle);
      const forms=[
        {key:'iona-b01d-b01a-base',label:'BASE / B01A SILHOUETTE',x:58,tint:0xd8e2dc},
        {key:'iona-b01d-dawnrush',label:'DAWNRUSH / B01A',x:179,tint:0xd8e2dc},
        {key:'iona-b01d-stormhalo',label:'STORMHALO / B01A',x:300,tint:0xd8e2dc},
        {key:'iona-b01d-eclipse',label:'ECLIPSE / B01A',x:421,tint:0xd8e2dc},
      ];
      for(const form of forms){
        const image=this.add.image(form.x,239,form.key).setOrigin(.5,1).setScale(48/60).setTint(form.tint).setTintMode(Phaser.TintModes.FILL).setScrollFactor(0).setDepth(52);
        const label=this.add.text(form.x,182,form.label,{fontFamily:'monospace',fontSize:'4px',color:'#e9eee5',align:'center'}).setOrigin(.5,0).setScrollFactor(0).setDepth(55);
        this.labReviewObjects.push(image,label);
        this.labReviewSilhouettes.push(image);
      }
      return;
    }
    if(this.b01cMode){
      addPanel(240,135,464,230);
      const title=this.add.text(240,24,'B01C PIXEL METHOD / OWNER REVIEW PENDING',{fontFamily:'monospace',fontSize:'7px',color:'#ffe0ba',align:'center'}).setOrigin(.5,0).setScrollFactor(0).setDepth(55);
      const sub=this.add.text(240,36,'SAME SOURCE POSE / 60PX VISIBLE HEIGHT / 1-2-3 SCALE / R CLOSES / C BG',{fontFamily:'monospace',fontSize:'5px',color:'#c4d5d1',align:'center'}).setOrigin(.5,0).setScrollFactor(0).setDepth(55);
      this.labReviewSub=sub;
      this.labReviewObjects.push(title,sub);
      const methods=[
        {key:'iona-b01c-method-nearest-right',label:'EXISTING NEAREST',x:80},
        {key:'iona-b01c-method-grid-right',label:'SHARED GRID + PALETTE',x:240},
        {key:'iona-b01c-method-native-right',label:'NATIVE EDIT + CLEANUP',x:400},
      ];
      for(const method of methods){
        const image=this.add.image(method.x,145,method.key).setOrigin(.5,1).setScale(this.labReviewScale/60).setScrollFactor(0).setDepth(52);
        const label=this.add.text(method.x,57,method.label,{fontFamily:'monospace',fontSize:'5px',color:'#e9eee5',align:'center'}).setOrigin(.5,0).setScrollFactor(0).setDepth(55);
        this.labReviewImages.push(image);
        this.labReviewObjects.push(image,label);
      }
      const samples=[
        {id:'run-0',side:'left' as const,x:62,label:'RUN LEFT'},
        {id:'run-0',side:'right' as const,x:176,label:'RUN RIGHT'},
        {id:'jump-3',side:'right' as const,x:304,label:'JUMP APEX'},
        {id:'dash-2',side:'left' as const,x:418,label:'DASH LEFT'},
      ];
      for(const sample of samples){
        const image=this.add.image(sample.x,236,ionaB01CAssetKey(sample.id,sample.side)).setOrigin(.5,1).setScale(.72).setScrollFactor(0).setDepth(52);
        const label=this.add.text(sample.x,185,sample.label,{fontFamily:'monospace',fontSize:'5px',color:'#e9eee5',align:'center'}).setOrigin(.5,0).setScrollFactor(0).setDepth(55);
        this.labReviewObjects.push(image,label);
      }
      return;
    }
    addPanel(240,135,464,230);
      const title=this.add.text(240,25,'B01 RECOVERY A/B / OWNER REVIEW PENDING', {fontFamily:'monospace',fontSize:'7px',color:'#ffe0ba',align:'center'}).setOrigin(.5,0).setScrollFactor(0).setDepth(55);
      this.labReviewObjects.push(title);
      const sub=this.add.text(240,36,'VISIBLE HEIGHT 60 PX / B00 BODY 15x30 / 1-2-3 SCALE / R CLOSES / C BACKGROUNDS', {fontFamily:'monospace',fontSize:'5px',color:'#c4d5d1',align:'center'}).setOrigin(.5,0).setScrollFactor(0).setDepth(55);
      this.labReviewSub=sub;
      this.labReviewObjects.push(sub);
      const topCards=[
        {key:'iona-review-b01a',label:'B01A MASTER',x:62},
        {key:'iona-rejected-idle-right',label:'REJECTED SVG',x:181},
        {key:recoveryAssetKey('idle-0',1),label:'RECOVERY RIGHT',x:300},
        {key:recoveryAssetKey('idle-0',-1),label:'RECOVERY LEFT',x:419},
      ];
      for(const card of topCards){
        const image=this.add.image(card.x,147,card.key).setOrigin(.5,1).setScrollFactor(0).setDepth(52);
        this.labReviewImages.push(image);
        this.labReviewObjects.push(image);
        const label=this.add.text(card.x,57,card.label,{fontFamily:'monospace',fontSize:'6px',color:'#e9eee5',align:'center'}).setOrigin(.5,0).setScrollFactor(0).setDepth(55);
        this.labReviewObjects.push(label);
      }
      const forms=[
        {key:'iona-recovery-silhouette',label:'RECOVERY BASE',x:58,tint:0x10131c},
        {key:'iona-review-dawnrush',label:'DAWNRUSH STUDY',x:179,tint:0x10131c},
        {key:'iona-review-stormhalo',label:'STORMHALO STUDY',x:300,tint:0xffffff},
        {key:'iona-review-eclipse',label:'ECLIPSE STUDY',x:421,tint:0xffffff},
      ];
      const formsTitle=this.add.text(240,158,'VFX OFF / EARLIER FORM STUDIES — NOT APPROVED',{fontFamily:'monospace',fontSize:'5px',color:'#e9eee5',align:'center'}).setOrigin(.5,0).setScrollFactor(0).setDepth(55);
      this.labReviewObjects.push(formsTitle);
      for(const form of forms){
        const image=this.add.image(form.x,235,form.key).setOrigin(.5,1).setScale(52/60).setTint(form.tint).setTintMode(Phaser.TintModes.FILL).setScrollFactor(0).setDepth(52);
        const label=this.add.text(form.x,181,form.label,{fontFamily:'monospace',fontSize:'5px',color:'#e9eee5',align:'center'}).setOrigin(.5,0).setScrollFactor(0).setDepth(55);
        this.labReviewObjects.push(image,label);
        this.labReviewSilhouettes.push(image);
      }
  }

  private updateAnimationReviewVisibility(): void {
    for (const item of this.labReviewObjects) item.setVisible(this.labReviewVisible);
    if(this.labReviewPanel){
      const colors:Record<ArtReviewContrast,number>={calm:0x101a2b,light:0xe5ded0,busy:0x29233c};
      this.labReviewPanel.setFillStyle(colors[this.reviewContrast],1);
      const silhouetteTint=this.reviewContrast==='light'?0x202330:this.reviewContrast==='busy'?0xffdab0:0xd8e2dc;
      for(const image of this.labReviewSilhouettes)image.setTint(silhouetteTint).setTintMode(Phaser.TintModes.FILL);
      const textColor=this.reviewContrast==='light'?'#222536':'#eef0e8';
      for(const item of this.labReviewObjects)if(item instanceof Phaser.GameObjects.Text)item.setColor(textColor);
    }
  }

  private createArtReview(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input missing for art review');
    this.reviewKeys = {
      view: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.V),
      contrast: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C),
      grid: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.G),
      size48: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      size60: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      size72: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
    };
    this.drawArtReview();
  }

  private updateArtReview(): void {
    if (!this.reviewKeys) return;
    let changed = false;
    if (Phaser.Input.Keyboard.JustDown(this.reviewKeys.view)) {
      const views: ArtReviewView[] = ['base', 'forms', 'silhouette', 'direction', 'materials'];
      this.reviewView = views[(views.indexOf(this.reviewView) + 1) % views.length]!;
      changed = true;
    }
    if (Phaser.Input.Keyboard.JustDown(this.reviewKeys.contrast)) {
      const contrasts: ArtReviewContrast[] = ['calm', 'light', 'busy'];
      this.reviewContrast = contrasts[(contrasts.indexOf(this.reviewContrast) + 1) % contrasts.length]!;
      this.applyReviewContrast();
      changed = true;
    }
    if (Phaser.Input.Keyboard.JustDown(this.reviewKeys.grid)) { this.reviewGrid = !this.reviewGrid; changed = true; }
    if (Phaser.Input.Keyboard.JustDown(this.reviewKeys.size48)) { this.silhouetteHeight = 48; changed = true; }
    if (Phaser.Input.Keyboard.JustDown(this.reviewKeys.size60)) { this.silhouetteHeight = 60; changed = true; }
    if (Phaser.Input.Keyboard.JustDown(this.reviewKeys.size72)) { this.silhouetteHeight = 72; changed = true; }
    if (changed) this.drawArtReview();
  }

  private applyReviewContrast(): void {
    if (!this.backgroundLayers) return;
    for (const [name, layer] of Object.entries(this.backgroundLayers) as [ArtReviewContrast, Phaser.GameObjects.Graphics][]) layer.setVisible(name === this.reviewContrast);
    this.busyLayer?.setVisible(this.reviewContrast === 'busy');
  }

  private drawArtReview(): void {
    for (const object of this.reviewObjects) object.destroy();
    this.reviewObjects = [];
    const addText = (x: number, y: number, text: string, color = '#f4eee1', size = '7px'): Phaser.GameObjects.Text => {
      const object = this.add.text(x, y, text, { fontFamily: 'monospace', fontSize: size, color, align: 'center', stroke: '#0a1019', strokeThickness: 2 }).setOrigin(.5, 0).setScrollFactor(0).setDepth(20);
      this.reviewObjects.push(object);
      return object;
    };
    const addGuide = (): void => {
      const guide = this.add.graphics().setScrollFactor(0).setDepth(8);
      guide.lineStyle(1, this.reviewContrast === 'light' ? 0x30464a : 0x9dd8cb, .85).lineBetween(8, GROUND_TOP, 472, GROUND_TOP);
      this.reviewObjects.push(guide);
    };
    const addPreview = (key: string, label: string, centerX: number, height: number, showCollision: boolean): void => {
      const y = GROUND_TOP;
      if (!this.textures.exists(key)) { addText(centerX, y - height / 2, `MISSING PNG\n${key}`, '#ff7e75', '6px'); return; }
      const image = this.add.image(centerX, y, key).setOrigin(.5, 1).setDepth(10);
      this.reviewObjects.push(image);
      if (this.reviewGrid) {
        const grid = this.add.graphics().setScrollFactor(0).setDepth(11);
        const left = Math.round(centerX - image.width / 2), top = GROUND_TOP - image.height;
        grid.lineStyle(1, this.reviewContrast === 'light' ? 0x19232d : 0xe9fff2, .075);
        for (let x = left; x <= left + image.width; x++) grid.lineBetween(x, top, x, GROUND_TOP);
        for (let y = top; y <= GROUND_TOP; y++) grid.lineBetween(left, y, left + image.width, y);
        grid.lineStyle(1, this.reviewContrast === 'light' ? 0x19232d : 0xe9fff2, .22);
        for (let x = left; x <= left + image.width; x += 4) grid.lineBetween(x, top, x, GROUND_TOP);
        for (let y = top; y <= GROUND_TOP; y += 4) grid.lineBetween(left, y, left + image.width, y);
        this.reviewObjects.push(grid);
      }
      const labelText = addText(centerX, y - height - 11, `${label} / ${height}px`, this.reviewContrast === 'light' ? '#182a30' : '#fff1d2', '7px');
      labelText.setDepth(20);
      if (showCollision) {
        const box = this.add.rectangle(centerX, y - 15, 15, 30, 0, 0).setStrokeStyle(1, 0xff957f, .95).setDepth(12);
        this.reviewObjects.push(box);
      }
    };

    addText(240, 4, 'B01A / GENERATED CHARACTER CANDIDATES / OWNER APPROVAL PENDING', '#ffcfaa', '7px');
    const heading = this.reviewView === 'base' ? 'BASE SCALE TEST / RECOMMENDED HEIGHT 60 PX'
      : this.reviewView === 'forms' ? 'FOUR COLOR DIRECTIONS / ECLIPSE TARGET 72 PX'
      : this.reviewView === 'silhouette' ? `VFX-OFF SOLID SILHOUETTES / ${this.silhouetteHeight} PX HEIGHT TEST`
      : this.reviewView === 'direction' ? 'BASE HANDEDNESS / RE-AUTHORED LEFT AND RIGHT'
      : 'BASE MATERIAL STRIP / PROPORTION AND COLLISION REFERENCE';
    addText(240, 15, heading, '#d9ece5', '7px');
    addText(240, 26, 'V VIEW  |  C CONTRAST  |  G PIXEL GRID  |  1/2/3 SILHOUETTE HEIGHT  |  ESC EXIT', '#b7c8c9', '6px');
    addGuide();

    if (this.reviewView === 'base') {
      addPreview('b01a-base-48', 'BASE', 74, 48, true);
      addPreview('b01a-base-60', 'BASE', 318, 60, true);
      addPreview('b01a-base-72', 'BASE', 426, 72, true);
    } else if (this.reviewView === 'forms') {
      addPreview('b01a-base-60', 'BASE', 48, 60, true);
      addPreview('b01a-dawnrush-60', 'DAWNRUSH', 150, 60, true);
      addPreview('b01a-stormhalo-60', 'STORMHALO', 330, 60, true);
      addPreview('b01a-eclipse-warden-72', 'ECLIPSE WARDEN', 432, 72, true);
    } else if (this.reviewView === 'silhouette') {
      addPreview(`b01a-base-${this.silhouetteHeight}-silhouette`, 'BASE', 48, this.silhouetteHeight, true);
      addPreview(`b01a-dawnrush-${this.silhouetteHeight}-silhouette`, 'DAWNRUSH', 150, this.silhouetteHeight, true);
      addPreview(`b01a-stormhalo-${this.silhouetteHeight}-silhouette`, 'STORMHALO', 330, this.silhouetteHeight, true);
      addPreview(`b01a-eclipse-warden-${this.silhouetteHeight}-silhouette`, 'ECLIPSE WARDEN', 432, this.silhouetteHeight, true);
    } else if (this.reviewView === 'direction') {
      addPreview('b01a-base-left-60', 'BASE LEFT', 145, 60, true);
      addPreview('b01a-base-60', 'BASE RIGHT', 335, 60, true);
    } else {
      addPreview('b01a-base-60', 'BASE / 60 PX', 76, 60, true);
      const palette = [
        { color: 0xe4d7d0, label: 'PEARL', hex: '#E4D7D0' }, { color: 0x282743, label: 'NAVY', hex: '#282743' },
        { color: 0x68657b, label: 'SLATE', hex: '#68657B' }, { color: 0x35aeb0, label: 'TEAL', hex: '#35AEB0' },
        { color: 0xa8694e, label: 'COPPER', hex: '#A8694E' }, { color: 0xe9a480, label: 'SKIN', hex: '#E9A480' },
      ];
      palette.forEach((swatch, index) => {
        const x = 178 + (index % 3) * 98, y = 62 + Math.floor(index / 3) * 39;
        const square = this.add.rectangle(x, y + 5, 13, 12, swatch.color).setStrokeStyle(1, 0xf1ebdf, .65).setDepth(10);
        this.reviewObjects.push(square);
        const label = this.add.text(x + 11, y, `${swatch.label}\n${swatch.hex}`, { fontFamily: 'monospace', fontSize: '6px', color: '#edf1e8', align: 'left', lineSpacing: 1 }).setOrigin(0, 0).setScrollFactor(0).setDepth(20);
        this.reviewObjects.push(label);
      });
      addText(280, 181, 'SUGGESTED PROPORTIONS / ~60 PX', '#d9ece5', '6px').setOrigin(0, 0);
      const proportions = ['HEAD + HAIR 15 PX / 25%', 'TORSO + ARMS 18 PX / 30%', 'BELT + SASH  7 PX / 12%', 'LEGS        13 PX / 22%', 'BOOTS        7 PX / 11%'];
      proportions.forEach((line, index) => {
        const label = this.add.text(280, 191 + index * 10, line, { fontFamily: 'monospace', fontSize: '6px', color: '#e7e0d5', align: 'left' }).setOrigin(0, 0).setScrollFactor(0).setDepth(20);
        this.reviewObjects.push(label);
      });
    }
  }
}
