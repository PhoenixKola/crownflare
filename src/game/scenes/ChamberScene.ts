import * as Phaser from 'phaser';
import { InputController } from '../input/InputController';
import { initialMoveState, stepMovement, type MoveState } from '../movement/motion';
import { animationAssetKey, frameAt, IONA_ATTACK_FRAMES, IONA_CLIPS, type IonaFacing, type IonaLocomotion } from '../animation/ionaAnimation';
import { beginAction, idleClock, stepAction, type ActionDef, type CombatClock, type CombatEvent } from '../combat/sim';

export type ChamberSnapshot = { x: number; y: number; grounded: boolean; facing: number; dashActive: boolean; cameraX: number; controller: boolean };
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
const IONA_FRAME_IDS = [...new Set(Object.values(IONA_CLIPS).flatMap((clip) => clip.map((frame) => frame.id)).concat(Object.values(IONA_ATTACK_FRAMES)))];
const LIGHT_HIT: ActionDef = {
  id:'iona-light-hit', moveId:'iona-base-jab', sourceId:'iona-player', targetId:'training-dummy',
  startupMs:130, activeMs:100, recoveryMs:260, events:[{id:'contact',atMs:162}],
};
export type AnimationLabSnapshot = { mode:string; frame:string; facing:IonaFacing; attackPhase:string; targetHealth:number; targetX:number; lastCombatEvent:string; assetCount:number; missingAssets:string[]; reviewVisible:boolean; contrast:ArtReviewContrast; reviewScale:48|60|72 };

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
  private reviewView: ArtReviewView = 'base';
  private reviewContrast: ArtReviewContrast = 'calm';
  private silhouetteHeight: 48 | 60 | 72 = 60;
  private reviewGrid = false;
  private reviewKeys!: { view: Phaser.Input.Keyboard.Key; contrast: Phaser.Input.Keyboard.Key; grid: Phaser.Input.Keyboard.Key; size48: Phaser.Input.Keyboard.Key; size60: Phaser.Input.Keyboard.Key; size72: Phaser.Input.Keyboard.Key };
  private reviewObjects: Phaser.GameObjects.GameObject[] = [];
  private backgroundLayers!: Record<ArtReviewContrast, Phaser.GameObjects.Graphics>;
  private busyLayer!: Phaser.GameObjects.Graphics;
  private labSprite?: Phaser.GameObjects.Image;
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
  private attackClock: CombatClock = idleClock;
  private attackBufferMs = 0;
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
      for (const id of IONA_FRAME_IDS) for (const side of ['right','left']) this.load.image(`iona-${id}-${side}`, `./assets/characters/iona/overnight/${id}-${side}.png`);
      for (const side of ['right','left']) this.load.image(`iona-dawnrush-silhouette-${side}`, `./assets/characters/iona/overnight/dawnrush-silhouette-${side}.png`);
      this.load.image('iona-review-before','./assets/characters/iona/b01a/base-60.png');
      this.load.image('iona-review-after','./assets/characters/iona/overnight/idle-0-right.png');
      this.load.image('iona-review-left','./assets/characters/iona/overnight/idle-0-left.png');
      this.load.image('iona-review-dawnrush','./assets/characters/iona/overnight/dawnrush-silhouette-right.png');
      this.load.image('iona-review-stormhalo','./assets/characters/iona/b01a/stormhalo-60-silhouette.png');
      this.load.image('iona-review-eclipse','./assets/characters/iona/b01a/eclipse-warden-60-silhouette.png');
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
    if (!this.artReview) {
      add.text(27, 205, 'SECTOR 00 Â· SIMULATION CHAMBER', { fontFamily: 'monospace', fontSize: '8px', color: this.reviewContrast === 'light' ? '#263940' : '#cce5d9' });
      add.text(1057, 205, 'DASH BARRIER', { fontFamily: 'monospace', fontSize: '8px', color: '#edab91' });
      add.text(1270, 127, 'BEYOND THE BROKEN DAY', { fontFamily: 'monospace', fontSize: '8px', color: this.reviewContrast === 'light' ? '#314852' : '#85c3bd' });
    }
    add.text(472, 258, this.artReview ? 'B01A CANDIDATE ART / OWNER REVIEW PENDING' : this.animationLab ? 'B01 OVERNIGHT / PROVISIONAL OWNER REVIEW' : 'TEMPORARY / TEST CHAMBER', { fontFamily: 'monospace', fontSize: this.artReview || this.animationLab ? '6px' : '7px', color: this.artReview || this.animationLab ? '#ffcfaa' : '#edab91' }).setOrigin(1, 1).setScrollFactor(0);

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
      this.labSprite = add.image(this.actor.x,this.body.bottom,'iona-idle-0-right').setOrigin(.5,1).setDepth(12);
      this.labHud = add.text(6,5,'B01 PROVISIONAL  |  IDLE  |  J HIT  |  R REVIEW  |  C BG', {fontFamily:'monospace',fontSize:'6px',color:'#fff1d2',backgroundColor:'#171b2c',padding:{x:3,y:2}}).setScrollFactor(0).setDepth(40);
      this.input.keyboard?.on('keydown-R',(event:KeyboardEvent)=>{if(!event.repeat)this.labReviewRequested=true;});
      this.input.keyboard?.on('keydown-C',(event:KeyboardEvent)=>{if(!event.repeat)this.labContrastRequested=true;});
      this.input.keyboard?.on('keydown',(event:KeyboardEvent)=>{
        if(event.code==='Digit1')this.labReviewScaleRequested=48;
        else if(event.code==='Digit2')this.labReviewScaleRequested=60;
        else if(event.code==='Digit3')this.labReviewScaleRequested=72;
      });
      this.createTrainingTarget();
      this.createAnimationReview();
      this.updateAnimationReviewVisibility();
      this.input.keyboard?.addCapture(['J','R','C']);
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
      if(this.labReviewScaleRequested!==null){
        this.labReviewScale=this.labReviewScaleRequested;
        this.labReviewScaleRequested=null;
        for(const image of this.labReviewImages)image.setDisplaySize(this.labReviewScale+4,this.labReviewScale+4);
        this.labReviewSub?.setText('BASE TEST HEIGHT: '+this.labReviewScale+' PX  /  1-2-3 SCALE  /  R CLOSES  /  C CYCLES CALM-LIGHT-BUSY');
      }
      const moving = Math.abs(movement.next.xVelocity) > 12 && movement.next.dashMs === 0;
      if (moving && !wasMoving) this.startMs = 70;
      if (!moving && wasMoving) this.stopMs = 85;
      if (oldFacing !== movement.next.facing) this.turnMs = 90;
      if (wasDashing && movement.next.dashMs === 0) this.dashRecoverMs = 100;
      this.updateCombat(this.controller.readAttackPressed(), grounded, dt);
      this.updateLabAnimation(grounded,moving,dt);
      this.labSprite?.setPosition(this.actor.x,this.body.bottom);
      this.updateAnimationReviewVisibility();
      if (this.labHud) this.labHud.setText('B01 PROVISIONAL  |  ' + this.labMode.toUpperCase() + ' / ' + this.labFrame + '  |  J HIT  |  R REVIEW  |  C BG');
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
    this.labReviewRequested=false; this.labContrastRequested=false; this.labReviewScaleRequested=null;
  }

  snapshot(): ChamberSnapshot | null {
    if (!this.actor || !this.body) return null;
    return { x: Number(this.actor.x.toFixed(1)), y: Number(this.actor.y.toFixed(1)), grounded: this.groundContact, facing: this.motion.facing, dashActive: this.motion.dashMs > 0, cameraX: Math.round(this.cameras.main.scrollX), controller: this.controllerConnected };
  }

  animationSnapshot(): AnimationLabSnapshot | null {
    if (!this.animationLab || !this.labSprite) return null;
    const all = IONA_FRAME_IDS.flatMap((id) => [-1,1].map((facing) => animationAssetKey(id,facing as IonaFacing)))
      .concat([-1,1].map((facing)=>animationAssetKey('dawnrush-silhouette',facing as IonaFacing)));
    const missingAssets = all.filter((key) => !this.textures.exists(key));
    return { mode:this.labMode, frame:this.labFrame, facing:this.motion.facing, attackPhase:this.attackClock.phase, targetHealth:this.targetHealth, targetX:this.targetX, lastCombatEvent:this.lastCombatEvent, assetCount:all.length-missingAssets.length, missingAssets, reviewVisible:this.labReviewVisible, contrast:this.reviewContrast, reviewScale:this.labReviewScale };
  }

  reviewSnapshot(): ArtReviewSnapshot | null {
    if (!this.artReview) return null;
    const missingAssets = ART_REVIEW_ASSET_KEYS.filter((key) => !this.textures.exists(key));
    return { view: this.reviewView, contrast: this.reviewContrast, silhouetteHeight: this.silhouetteHeight, pixelGrid: this.reviewGrid, loadedAssets: ART_REVIEW_ASSET_KEYS.length - missingAssets.length, totalAssets: ART_REVIEW_ASSET_KEYS.length, missingAssets };
  }

  private createTrainingTarget(): void {
    this.targetVisual = this.add.graphics().setDepth(9);
    this.targetLabel = this.add.text(this.targetX,GROUND_TOP-42,'TRAINING DUMMY / 3', {fontFamily:'monospace',fontSize:'6px',color:'#f0cda8',align:'center',backgroundColor:'#171b2c',padding:{x:2,y:1}}).setOrigin(.5,1).setDepth(20);
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

  private resolveCombatEvent(event: CombatEvent): void {
    if (event.eventId!=='contact' || event.moveId!=='iona-base-jab' || event.sourceId!=='iona-player' || event.targetId!=='training-dummy') return;
    const offset=this.targetX-this.actor.x;
    const hit=Math.abs(offset)<=42 && Math.sign(offset)===this.motion.facing && this.targetHealth>0;
    if (hit) {
      this.targetHealth=Math.max(0,this.targetHealth-1);
      this.hitFlashMs=90;
      this.playImpactSound();
      const burst=this.add.graphics().setDepth(24).setPosition(this.targetX,GROUND_TOP-21);
      burst.lineStyle(2,0xffd890,1).lineBetween(-7,0,7,0).lineBetween(0,-7,0,7).lineBetween(-5,-5,5,5).lineBetween(-5,5,5,-5);
      this.tweens.add({targets:burst,alpha:0,scale:1.8,duration:150,onComplete:()=>burst.destroy()});
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

  private createAnimationReview(): void {
    const addPanel=(x:number,y:number,w:number,h:number):void=>{
      const bg=this.add.rectangle(x,y,w,h,0x0b1220,.96).setStrokeStyle(1,0xa9cdbf,.9).setScrollFactor(0).setDepth(49);
      this.labReviewPanel=bg;
      this.labReviewObjects.push(bg);
    };
    addPanel(240,135,464,230);
      const title=this.add.text(240,25,'OVERNIGHT PIXEL REVIEW / PROVISIONAL OWNER REVIEW', {fontFamily:'monospace',fontSize:'7px',color:'#ffe0ba',align:'center'}).setOrigin(.5,0).setScrollFactor(0).setDepth(55);
      this.labReviewObjects.push(title);
      const sub=this.add.text(240,36,'BASE TEST HEIGHT: 60 PX  /  1-2-3 SCALE  /  R CLOSES  /  C BACKGROUNDS', {fontFamily:'monospace',fontSize:'5px',color:'#c4d5d1',align:'center'}).setOrigin(.5,0).setScrollFactor(0).setDepth(55);
      this.labReviewSub=sub;
      this.labReviewObjects.push(sub);
      const topCards=[
        {key:'iona-review-before',label:'BEFORE / B01A',x:112},
        {key:'iona-review-after',label:'AFTER / RIGHT',x:240},
        {key:'iona-review-left',label:'AFTER / LEFT',x:368},
      ];
      for(const card of topCards){
        const image=this.add.image(card.x,145,card.key).setOrigin(.5,1).setDisplaySize(64,64).setScrollFactor(0).setDepth(52);
        this.labReviewImages.push(image);
        this.labReviewObjects.push(image);
        const label=this.add.text(card.x,57,card.label,{fontFamily:'monospace',fontSize:'6px',color:'#e9eee5',align:'center'}).setOrigin(.5,0).setScrollFactor(0).setDepth(55);
        this.labReviewObjects.push(label);
      }
      const body=this.add.rectangle(240,130,15,30,0,0).setStrokeStyle(1,0xffa17f,1).setScrollFactor(0).setDepth(54);
      this.labReviewObjects.push(body);
      const bodyLabel=this.add.text(240,146,'B00 BODY 15 x 30 / GROUND ANCHOR',{fontFamily:'monospace',fontSize:'4px',color:'#ffb99c',backgroundColor:'#171b2c',padding:{x:1,y:1},align:'center'}).setOrigin(.5,0).setScrollFactor(0).setDepth(55);
      this.labReviewObjects.push(bodyLabel);
      const forms=[
        {key:'iona-review-after',label:'BASE',x:58,tint:0x10131c},
        {key:'iona-review-dawnrush',label:'DAWNRUSH',x:179,tint:0x10131c},
        {key:'iona-review-stormhalo',label:'STORMHALO',x:300,tint:0xffffff},
        {key:'iona-review-eclipse',label:'ECLIPSE',x:421,tint:0xffffff},
      ];
      const formsTitle=this.add.text(240,158,'VFX OFF / FORM SILHOUETTE COMPARISON',{fontFamily:'monospace',fontSize:'6px',color:'#e9eee5',align:'center'}).setOrigin(.5,0).setScrollFactor(0).setDepth(55);
      this.labReviewObjects.push(formsTitle);
      for(const form of forms){
        const image=this.add.image(form.x,235,form.key).setOrigin(.5,1).setDisplaySize(52,52).setTint(form.tint).setTintMode(Phaser.TintModes.FILL).setScrollFactor(0).setDepth(52);
        const label=this.add.text(form.x,181,form.label,{fontFamily:'monospace',fontSize:'5px',color:'#e9eee5',align:'center'}).setOrigin(.5,0).setScrollFactor(0).setDepth(55);
        this.labReviewObjects.push(image,label);
        this.labReviewSilhouettes.push(image);
      }
  }

  private updateAnimationReviewVisibility(): void {
    for (const item of this.labReviewObjects) item.setVisible(this.labReviewVisible);
    if(this.labReviewPanel){
      const colors:Record<ArtReviewContrast,number>={calm:0x101a2b,light:0xe5ded0,busy:0x29233c};
      this.labReviewPanel.setFillStyle(colors[this.reviewContrast],.97);
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
