import * as Phaser from 'phaser';
import { InputController } from '../input/InputController';
import { initialMoveState, stepMovement, type MoveState } from '../movement/motion';
import { animationAssetKey, frameAt, IONA_ATTACK_FRAMES, IONA_CLIPS, type IonaFacing, type IonaLocomotion } from '../animation/ionaAnimation';
import { IONA_RECOVERY_CLIPS, IONA_RECOVERY_FRAME_IDS, IONA_RECOVERY_JAB, recoveryAssetKey, recoveryFrameAt } from '../animation/ionaRecoveryAnimation';
import { IONA_B01C_TEXTURES, ionaB01CAnimationKey, ionaB01CAssetKey, registerIonaB01CAnimations, validateIonaB01CTextures } from '../animation/ionaB01cAnimation';
import { IONA_B01D_TEXTURES, ionaB01DAnimationKey, ionaB01DAssetKey, registerIonaB01DAnimations, validateIonaB01DTextures } from '../animation/ionaB01dAnimation';
import { IONA_B01E_TEXTURES, ionaB01EAnimationKey, ionaB01EAssetKey, nextIonaLabCandidate, registerIonaB01EAnimations, validateIonaB01ETextures } from '../animation/ionaB01eAnimation';
import { ionaB01EFrameBounds } from '../animation/ionaB01eFrameMetrics';
import { ionaCandidateFrameBounds } from '../animation/ionaCandidateFrameMetrics';
import { IonaPlayerPresentation } from '../animation/ionaPlayerPresentation';
import { IONA_B01E_AUDIO_CUES, IonaB01eAudioEventGate, isIonaRunContactFrame, ionaB01eResolutionCue, ionaB01eWhooshForMove, type IonaB01eAudioCue } from '../audio/ionaB01eAudio';
import { beginAction, idleClock, stepAction, type ActionDef, type CombatClock, type CombatEvent } from '../combat/sim';
import { B03_MOVES, canCancelIntoCombo, isBlockedByRect, moveHitbox, overlaps, combatantRect, resolveMoveContact, type B03MoveDefinition, type B03MoveId, type CombatRect } from '../combat/b03Moves';
import { DAWNRUSH_MOVES } from '../combat/dawnrushMoves';
import { resolveB06MoveTargets, type B06PlayerThreatFrame } from '../enemies/b06EnemyModel';
import type { ContactResult } from '../combat/b03Moves';
import { beginDawnrushReversion, canSwitchDawnrushForm, canUseDawnrushFinisher, DAWNRUSH_FINISHER_REQUIREMENTS, dawnrushActivationPhases, stepDawnrushForm, type DawnrushActivationMode, type DawnrushFormState } from '../combat/dawnrushLifecycle.ts';
import { dawnrushLocomotionFrame, dawnrushMoveFrame, DAWNRUSH_AURA_FRAME_GROUPS, DAWNRUSH_AURA_FRAMES, DAWNRUSH_COMBAT_FRAMES, DAWNRUSH_LOCOMOTION_FRAMES, DAWNRUSH_REVERSION_FRAMES, DAWNRUSH_TRANSFORM_FRAMES, DAWNRUSH_VFX_FRAMES } from '../animation/dawnrushAnimation';
import { IONA_B03_ENEMY_STATES, IONA_B03_POSES, IONA_B03_VFX_FRAMES, ionaB03EnemyTexture, ionaB03PoseTexture, type IonaB03EnemyState, type IonaB03Pose } from '../animation/ionaB03Art';
import type { RebindableAction, ControlSettings } from '../input/controlSettings';

export type ChamberSnapshot = { x: number; y: number; grounded: boolean; facing: number; dashActive: boolean; cameraX: number; controller: boolean; bodySize: { width: number; height: number } };
export type ArtReviewView = 'base' | 'forms' | 'silhouette' | 'direction' | 'materials';
export type ArtReviewContrast = 'calm' | 'light' | 'busy';
export type ArtReviewSnapshot = { view: ArtReviewView; contrast: ArtReviewContrast; silhouetteHeight: 48 | 60 | 72; pixelGrid: boolean; loadedAssets: number; totalAssets: number; missingAssets: string[] };
export type IonaPreviewSnapshot = { playerX:number; playerY:number; physicsAnchor:{x:number;y:number}; grounded:boolean; facing:IonaFacing; bodySize:{width:number;height:number}; action:string; frame:string; attackPhase:string; comboStep:number; targetX:number; targetHealth:number; lastCombatEvent:string; reviewScale:48|60|72; spriteScale:number; spriteOrigin:{x:number;y:number}; spritePosition:{x:number;y:number}; vfxEnabled:boolean; background:'calm'; audioEnabled:boolean; audioUnlocked:boolean; audioAssetsLoaded:number; audioVolume:number; audioStatus:string; controller:boolean; loadedTextures:number; missingTextures:string[] };
export type B03CombatSnapshot = { playerX:number; playerY:number; playerHp:number; playerVelocity:{x:number;y:number}; playerInvulnerableMs:number; enemyX:number; enemyY:number; enemyHp:number; resonance:number; specialCooldownMs:number; move:string; phase:string; elapsedMs:number; bufferedMove:string|null; facing:IonaFacing; enemyState:string; frame:string; controllerIndex:number; lastResult:string; bodySize:{width:number;height:number}; spriteScale:number; vfxEnabled:boolean; vfxActive:boolean; background:ArtReviewContrast; reducedMotion:boolean; errors:string[]; grounded:boolean; dashActive:boolean; dashCooldownMs:number; hurtMs:number; resonanceCost:number };
export type B06CombatTarget = { readonly id: string; readonly archetype?: string; readonly x: number; readonly y: number; readonly width: number; readonly height: number; readonly hp: number; readonly alive: boolean; readonly invulnerableMs?: number; readonly guarding?: boolean; readonly guardBreakable?: boolean };
export type B06PlayerCombatFrame = B06PlayerThreatFrame & { readonly resonance: number; readonly facing: IonaFacing; readonly velocityX: number; readonly velocityY: number; readonly dawnrush: string; readonly grounded: boolean };
export type PhysicsRegistrationDebug = {
  readonly body: { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number };
  readonly sprite: { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number; readonly alpha: { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number } | null; readonly texture: string } | null;
  readonly hipY: number;
  readonly feetY: number;
  readonly attack: CombatRect | null;
  readonly cameraX: number;
};
const WORLD_WIDTH = 1560;
const WORLD_HEIGHT = 270;
const GROUND_TOP = 241;
const B04_SENTINEL_WAKE_DISTANCE = 60;
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
const ALPHA_BOUNDS_CACHE = new Map<string, readonly [number, number, number, number] | null>();

function textureAlphaBounds(scene: Phaser.Scene, key: string): readonly [number, number, number, number] | null {
  if (ALPHA_BOUNDS_CACHE.has(key)) return ALPHA_BOUNDS_CACHE.get(key) ?? null;
  try {
    const source = scene.textures.get(key).getSourceImage() as CanvasImageSource & { width: number; height: number };
    const canvas = document.createElement('canvas'); canvas.width = source.width; canvas.height = source.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context || !source.width || !source.height) { ALPHA_BOUNDS_CACHE.set(key, null); return null; }
    context.drawImage(source, 0, 0);
    const pixels = context.getImageData(0, 0, source.width, source.height).data;
    let left = source.width, top = source.height, right = 0, bottom = 0;
    for (let y = 0; y < source.height; y += 1) for (let x = 0; x < source.width; x += 1) {
      if (pixels[(y * source.width + x) * 4 + 3]! < 16) continue;
      left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1);
    }
    const bounds = right > left && bottom > top ? [left, top, right, bottom] as const : null;
    ALPHA_BOUNDS_CACHE.set(key, bounds);
    return bounds;
  } catch {
    ALPHA_BOUNDS_CACHE.set(key, null);
    return null;
  }
}
export type AnimationLabSnapshot = { mode:string; frame:string; facing:IonaFacing; attackPhase:string; comboStep:number; targetHealth:number; targetX:number; lastCombatEvent:string; artSource:'generated-imagegen'|'rejected-svg'|'b01c-native'|'b01d-candidate'|'b01e-candidate'; candidateVersion:'B01C'|'B01D'|'B01E'; assetCount:number; missingAssets:string[]; reviewVisible:boolean; contrast:ArtReviewContrast; reviewScale:48|60|72; spriteScale:number; visibleHeightPx:number; diagnosticsVisible:boolean; b01cComparison:boolean; vfxEnabled:boolean; audioEnabled:boolean; audioUnlocked:boolean; audioAssetsLoaded:number; audioVolume:number; audioPaused:boolean; lastAudioCue:string };

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
  private readonly previewMode: boolean;
  private readonly oldRejectedArt: boolean;
  private readonly b01cMode: boolean;
  private readonly b01dMode: boolean;
  private readonly b01eMode: boolean;
  private readonly b03Mode: boolean;
  private readonly b04Mode: boolean;
  private readonly b05Mode: boolean;
  private readonly b06Mode: boolean;
  private readonly b07Mode: boolean;
  private readonly b02Diagnostics: boolean;
  private readonly playerPresentation = new IonaPlayerPresentation();
  private labCompareB01c = false;
  private labCompareCandidate: 'b01c' | 'b01d' | 'b01e' = 'b01e';
  private labDiagnosticsVisible = false;
  private labVfxEnabled = false;
  private labABRequested = false;
  private labVfxRequested = false;
  private labDiagnosticsRequested = false;
  private labDiagnosticsGraphic?: Phaser.GameObjects.Graphics;
  private labDiagnosticLabel?: Phaser.GameObjects.Text;
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
  private targetX = 151;
  private previewElapsedMs = 0;
  private previewResetRequested = false;
  private targetVisual?: Phaser.GameObjects.Graphics;
  private targetLabel?: Phaser.GameObjects.Text;
  private enemySprite?: Phaser.GameObjects.Image;
  private enemyTell?: Phaser.GameObjects.Graphics;
  private enemyVisualState: IonaB03EnemyState = 'idle';
  private enemyFacing: IonaFacing = -1;
  private enemyTimerMs = 0;
  private enemyAttackHit = false;
  private enemyHitstunMs = 0;
  private enemyKnockbackX = 0;
  private enemyAirOffset = 0;
  private enemyAirVelocity = 0;
  private playerHp = 5;
  private readonly playerMaxHp = 5;
  private readonly enemyMaxHp = 8;
  private resonance = 55;
  private specialCooldownMs = 0;
  private playerHurtMs = 0;
  private playerInvulnerableMs = 0;
  private dashInvulnerabilityMs = 0;
  private b03Move: B03MoveId | null = null;
  private activeMoveDefinition: B03MoveDefinition | null = null;
  private b03BufferedMove: B03MoveId | null = null;
  private readonly b03HitTargets = new Set<string>();
  private b03Status = 'READY / MOVE INTO RANGE';
  private b03LastResult = 'none';
  private specialVfx?: Phaser.GameObjects.Image;
  private specialVfxElapsed = 0;
  private specialVfxFacing: IonaFacing = 1;
  private b03FixedAccumulator = 0;
  private b03InputQueue: Record<RebindableAction, boolean> = { jump:false, light:false, heavy:false, dash:false, special:false, interact:false, transform:false, finisher:false };
  private combatHitstopMs = 0;
  private specialVfxDistance = 62;
  private finisherCooldownMs = 0;
  private dawnrushTransformBufferMs = 0;
  private dawnrushRecoveryMs = 0;
  private b05AuraPressure?: Phaser.GameObjects.Image;
  private b05AuraOrbit?: Phaser.GameObjects.Image;
  private b05AuraSpeed?: Phaser.GameObjects.Image;
  private b05AuraElapsedMs = 0;
  private b05FinisherFx?: Phaser.GameObjects.Image;
  private b05FinisherFxElapsedMs = 0;
  private b03LastControllerIndex = -1;
  private combatBlockers: CombatRect[] = [];
  private b03DebugVisible = false;
  private b03DebugGraphic?: Phaser.GameObjects.Graphics;
  private b03DebugLabel?: Phaser.GameObjects.Text;
  private b03VfxEnabled = true;
  private b03ReducedMotion = false;
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
  private readonly audioGate = new IonaB01eAudioEventGate();
  private audioSequence = 0;
  protected activeAudioSequence = 0;
  private lastFootfallFrame = '';
  private footfallSide: 0 | 1 = 0;
  private labAudioEnabled = true;
  private labAudioVolume = .68;
  private labAudioPaused = false;
  private lastAudioCue = 'none';
  private impactAudio?: AudioContext;
  private dawnrushState: DawnrushFormState = 'base';
  private dawnrushPhaseMs = 0;
  private dawnrushEnergy = 70;
  private dawnrushLocomotionElapsed = 0;
  private dawnrushActivationMode: DawnrushActivationMode = 'showcase';
  private dawnrushShowcaseUsed = false;

  constructor(onPauseRequested: () => void, onControllerState: (active: boolean) => void, options: { artReview?: boolean; animationLab?: boolean; ionaPreview?: boolean; b03Combat?: boolean; b04?: boolean; b05?: boolean; b06?: boolean; b07?: boolean; reduceMotion?: boolean } = {}) {
    super({ key: 'Chamber' });
    this.onPauseRequested = onPauseRequested;
    this.onControllerState = onControllerState;
    this.artReview = options.artReview === true;
    this.animationLab = options.animationLab === true && !this.artReview;
    this.previewMode = options.ionaPreview === true && !this.artReview && !this.animationLab;
    this.b03Mode = this.previewMode && options.b03Combat === true;
    this.b04Mode = this.b03Mode && options.b04 === true;
    this.b05Mode = this.b04Mode && (options.b05 === true || options.b07 === true);
    this.b06Mode = this.b05Mode && options.b06 === true;
    this.b07Mode = options.b07 === true;
    const params = new URLSearchParams(window.location.search);
    this.b02Diagnostics = this.previewMode && params.get('b02diag') === '1';
    this.b03DebugVisible = this.b03Mode && params.get('b03diag') === '1';
    this.b03VfxEnabled = this.b03Mode && params.get('b03vfx') !== '0';
    this.b03ReducedMotion = this.b03Mode && (options.reduceMotion ?? (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false));
    if (this.b03ReducedMotion) this.b03VfxEnabled = false;
    this.oldRejectedArt = this.animationLab && params.get('oldRejectedArt') === '1';
    this.b01eMode = this.animationLab && params.get('b01e') === '1' && !this.oldRejectedArt;
    this.b01cMode = this.animationLab && params.get('b01c') === '1' && params.get('b01d') !== '1' && !this.b01eMode && !this.oldRejectedArt;
    this.b01dMode = this.animationLab && params.get('b01d') === '1' && !this.b01eMode && !this.oldRejectedArt;
    if (this.b01eMode) this.labCompareCandidate = 'b01e';
    const view = params.get('view');
    const contrast = params.get('contrast');
    const height = Number(params.get('size'));
    this.reviewGrid = params.get('grid') === '1';
    if (view === 'base' || view === 'forms' || view === 'silhouette' || view === 'direction' || view === 'materials') this.reviewView = view;
    if (contrast === 'calm' || contrast === 'light' || contrast === 'busy') this.reviewContrast = contrast;
    if (height === 48 || height === 60 || height === 72) this.silhouetteHeight = height;
    this.labReviewVisible = this.animationLab && params.get('review') === '1';
    if (this.b03Mode) { this.targetHealth = this.enemyMaxHp; this.targetX = 285; }
  }

  private get b01eRuntime(): boolean { return this.b01eMode || this.previewMode; }

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
      } else if (this.b01dMode || this.b01eMode) {
        for (const { id, facing } of IONA_B01D_TEXTURES) this.load.image(ionaB01DAssetKey(id, facing), `./assets/characters/iona/b01d/${id}-${facing}.png`);
        for (const { id, facing } of IONA_B01C_TEXTURES) this.load.image(ionaB01CAssetKey(id, facing), `./assets/characters/iona/b01c/${id}-${facing}.png`);
        this.load.image('iona-b01d-b01a-base','./assets/characters/iona/b01a/base-60-silhouette.png');
        this.load.image('iona-b01d-dawnrush','./assets/characters/iona/b01a/dawnrush-60-silhouette.png');
        this.load.image('iona-b01d-stormhalo','./assets/characters/iona/b01a/stormhalo-60-silhouette.png');
        this.load.image('iona-b01d-eclipse','./assets/characters/iona/b01a/eclipse-warden-60-silhouette.png');
        this.load.image('iona-b01d-base-silhouette','./assets/characters/iona/b01a/base-60-silhouette.png');
        if (this.b01eMode) {
          for (const { id, facing } of IONA_B01E_TEXTURES) this.load.image(ionaB01EAssetKey(id, facing), `./assets/characters/iona/b01e/${id}-${facing}.png`);
          for (const cue of IONA_B01E_AUDIO_CUES) this.load.audio(cue, `./assets/characters/iona/b01e/audio/${cue}.wav`);
        }
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
    if (this.previewMode) {
      for (const { id, facing } of IONA_B01E_TEXTURES) this.load.image(ionaB01EAssetKey(id, facing), `./assets/characters/iona/b01e/${id}-${facing}.png`);
      for (const cue of IONA_B01E_AUDIO_CUES) this.load.audio(cue, `./assets/characters/iona/b01e/audio/${cue}.wav`);
    }
    if (this.b03Mode) {
      for (const pose of IONA_B03_POSES) for (const facing of ['left', 'right'] as const) {
        this.load.image(ionaB03PoseTexture(pose, facing), `./assets/characters/iona/b03/${pose}-${facing}.png`);
      }
      for (const state of IONA_B03_ENEMY_STATES) this.load.image(ionaB03EnemyTexture(state), `./assets/enemies/spindle-sentry/${state}.png`);
      for (const frame of IONA_B03_VFX_FRAMES) this.load.image(`iona-b03-${frame}`, `./assets/vfx/b03/${frame}.png`);
    }
    if (this.b05Mode) {
      const bodyFrames = new Set<string>([...DAWNRUSH_LOCOMOTION_FRAMES, ...DAWNRUSH_COMBAT_FRAMES]);
      for (const frame of bodyFrames) for (const facing of ['left', 'right'] as const) {
        this.load.image(`iona-b05-${frame}-${facing}`, `./assets/characters/iona/b05/${frame}-${facing}.png`);
      }
      for (const frame of DAWNRUSH_TRANSFORM_FRAMES) this.load.image(`iona-b05-${frame}`, `./assets/characters/iona/b05/${frame}.png`);
      for (const frame of DAWNRUSH_REVERSION_FRAMES) for (const facing of ['left', 'right'] as const) {
        this.load.image(`iona-b05-${frame}-${facing}`, `./assets/characters/iona/b05/${frame}-${facing}.png`);
      }
      for (const frame of DAWNRUSH_VFX_FRAMES) this.load.image(`iona-b05-${frame}`, `./assets/characters/iona/b05/${frame}.png`);
      for (const frame of DAWNRUSH_AURA_FRAMES) this.load.image(`iona-b05-${frame}`, `./assets/characters/iona/b05/${frame}.png`);
      for (const cue of ['transform-charge', 'transform-ignition', 'transform-revert', 'dawnrush-hurt', 'dash', 'light', 'heavy', 'aerial', 'solar-drive', 'impact', 'finisher']) {
        this.load.audio(`b05-${cue}`, `./assets/audio/b05/${cue}.wav`);
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
    if (!this.b04Mode) {
      this.backgroundLayers.calm.fillGradientStyle(0x0c1727, 0x11283c, 0x162a32, 0x101b2c, 1).fillRect(0, 0, 480, 270);
      this.backgroundLayers.light.fillGradientStyle(0xd9d6c9, 0xb5ccc7, 0xc2c7b4, 0xe3d7c1, 1).fillRect(0, 0, 480, 270);
      this.backgroundLayers.busy.fillGradientStyle(0x281e3b, 0x17344a, 0x513a51, 0x182838, 1).fillRect(0, 0, 480, 270);
    } else {
      for (const layer of Object.values(this.backgroundLayers)) layer.setVisible(false);
    }
    this.busyLayer = add.graphics().setScrollFactor(.18);
    if (this.b04Mode) this.busyLayer.setVisible(false);
    for (let i = 0; i < 22 && !this.b04Mode; i++) {
      const x = i * 23 + 2, y = 24 + ((i * 37) % 133), width = 8 + ((i * 11) % 19), height = 3 + ((i * 7) % 15);
      const colors = [0xf087a2, 0xe2a55e, 0x8a7ddb, 0x5ac1b5];
      this.busyLayer.fillStyle(colors[i % colors.length]!, .33).fillRect(x, y, width, height);
    }
    if (!this.b04Mode) this.applyReviewContrast();

    for (let i = 0; i < 32 && !this.b04Mode; i++) {
      const x = i * 52 + 5, y = 32 + ((i * 41) % 118);
      add.rectangle(x, y, 2, 2, this.reviewContrast === 'light' ? 0x435e64 : 0xb1dcdf, this.reviewContrast === 'light' ? .24 : .18).setScrollFactor(.13);
    }
    for (let i = 0; i < 22 && !this.b04Mode; i++) {
      const x = i * 98; const h = 28 + (i % 4) * 16;
      add.rectangle(x, GROUND_TOP - h / 2 + 4, 40, h, this.reviewContrast === 'light' ? 0x60777a : 0x172e3c, .75).setScrollFactor(.36);
      add.rectangle(x + 8, GROUND_TOP - h + 6, 4, 3, 0x83c1c3, .25).setScrollFactor(.36);
    }
    for (let i = 0; i < 26 && !this.b04Mode; i++) {
      const x = i * 64 + 12;
      add.rectangle(x, 229, 3, 20, 0x66bbc2, .25);
    }
    const platforms: Phaser.GameObjects.Rectangle[] = [];
    const tile = (x: number, top: number, width: number, height: number, color = 0x354f54): Phaser.GameObjects.Rectangle => {
      const block = add.rectangle(x, top + height / 2, width, height, color);
      if (this.b04Mode) block.setAlpha(0);
      else {
        block.setStrokeStyle(1, this.reviewContrast === 'light' ? 0x536e6b : 0x79b8ad, .75);
        add.rectangle(x, top + 1, width, 2, this.reviewContrast === 'light' ? 0xf0ead7 : 0x9adcd0, .7);
      }
      this.physics.add.existing(block, true);
      platforms.push(block);
      return block;
    };
    if (!this.b07Mode) {
      tile(780, GROUND_TOP, WORLD_WIDTH, 29, this.reviewContrast === 'light' ? 0x465552 : 0x34464b);
      tile(220, 196, 96, 11);
      tile(390, 165, 82, 11);
      tile(560, 195, 82, 11);
      tile(780, 178, 94, 11);
      tile(965, 196, 95, 11);
      tile(1150, 167, 110, 11);
      tile(1380, 192, 120, 11);
      if (!this.b04Mode) tile(1120, 217, 14, 24, 0x624f50); // B00 dash collision test barrier
    }
    this.combatBlockers = platforms.map((platform) => {
      const bounds = platform.getBounds();
      return { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom };
    }).filter((bounds) => bounds.top < GROUND_TOP);
    if (!this.artReview && !this.animationLab && !this.previewMode && !this.b07Mode) {
      add.text(27, 205, 'SECTOR 00 Â· SIMULATION CHAMBER', { fontFamily: 'monospace', fontSize: '8px', color: this.reviewContrast === 'light' ? '#263940' : '#cce5d9' });
      add.text(1057, 205, 'DASH BARRIER', { fontFamily: 'monospace', fontSize: '8px', color: '#edab91' });
      add.text(1270, 127, 'BEYOND THE BROKEN DAY', { fontFamily: 'monospace', fontSize: '8px', color: this.reviewContrast === 'light' ? '#314852' : '#85c3bd' });
    }
    if (!this.previewMode) add.text(472, 258, this.artReview ? 'B01A CANDIDATE ART / OWNER REVIEW PENDING' : this.previewMode ? 'PROVISIONAL IONA / DEVELOPMENT PREVIEW / NOT APPROVED' : this.animationLab ? (this.oldRejectedArt ? 'REJECTED OVERNIGHT VECTOR ART / COMPARISON ONLY' : this.b01cMode ? 'B01C NATIVE PIXEL MOTION PILOT / OWNER REVIEW PENDING' : 'B01 RECOVERY / IMAGEGEN PIXELS / OWNER REVIEW PENDING') : 'TEMPORARY / TEST CHAMBER', { fontFamily: 'monospace', fontSize: this.artReview || this.animationLab || this.previewMode ? '6px' : '7px', color: this.artReview || this.animationLab || this.previewMode ? '#ffcfaa' : '#edab91' }).setOrigin(1, 1).setScrollFactor(0);

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
    // startFollow defaults roundPixels back to false. Keep the 480x270 art on
    // integer camera coordinates so pixel textures don't shimmer between frames.
    this.cameras.main.startFollow(this.actor, true, .12, .12, 0, 15);
    this.cameras.main.setDeadzone(90, 46);
    this.controller = new InputController(this);
    if (this.animationLab || this.previewMode) {
      this.actor.setAlpha(0);
      if (this.b01cMode || this.b01dMode || this.b01eMode) registerIonaB01CAnimations(this);
      if (this.b01dMode || this.b01eMode) registerIonaB01DAnimations(this);
      if (this.b01eRuntime) registerIonaB01EAnimations(this);
      const initialKey = this.previewMode ? ionaB01EAssetKey('idle-0','right') : this.oldRejectedArt ? animationAssetKey('idle-0',1) : this.b01eMode ? ionaB01EAssetKey('idle-0','right') : this.b01dMode ? ionaB01DAssetKey('idle-0','right') : this.b01cMode ? ionaB01CAssetKey('idle-0','right') : recoveryAssetKey('idle-0',1);
      this.labSprite = add.sprite(this.actor.x,this.body.bottom,initialKey).setDepth(12);
      this.playerPresentation.attach(this.labSprite);
      if (this.b01eRuntime) this.sound.setVolume(this.labAudioVolume);
      if (this.animationLab) this.labHud = add.text(6,5,this.b01eMode ? 'B01E / C-D-E A/B | A/D MOVE | SPACE JUMP | SHIFT DASH | J COMBO | CLICK/J ENABLE AUDIO | M MUTE | [ ] VOLUME | T VERSION | 1-3 SCALE | C BG | V VFX | R REVIEW | ESC PAUSE' : this.b01dMode ? 'B01D CANDIDATE / OWNER PENDING | A/D MOVE | SPACE JUMP | SHIFT DASH | J COMBO | T A/B | 1-2-3 SCALE | C BG | V VFX | G DIAG' : this.oldRejectedArt ? 'REJECTED OVERNIGHT ART COMPARE | J HIT | R REVIEW' : this.b01cMode ? 'B01C / PHASER SPRITES | A/D MOVE | SPACE JUMP | SHIFT DASH | J COMBO | R REVIEW' : 'B01 RECOVERY / GENERATED PIXELS | J HIT | R REVIEW', {fontFamily:'monospace',fontSize:this.b01dMode||this.b01eMode?'5px':'6px',color:'#fff1d2',backgroundColor:'#171b2c',padding:{x:3,y:2}}).setScrollFactor(0).setDepth(40);
      this.input.keyboard?.on('keydown-R',(event:KeyboardEvent)=>{if(!event.repeat){if(this.previewMode&&!this.b04Mode)this.previewResetRequested=true;else if(this.animationLab)this.labReviewRequested=true;}});
      this.input.keyboard?.on('keydown-C',(event:KeyboardEvent)=>{if(!event.repeat&&!this.b04Mode)this.labContrastRequested=true;});
      this.input.keyboard?.on('keydown-T',(event:KeyboardEvent)=>{if(!event.repeat&&(this.b01dMode||this.b01eMode))this.labABRequested=true;});
      this.input.keyboard?.on('keydown-V',(event:KeyboardEvent)=>{if(!event.repeat&&(this.b01dMode||this.b01eMode||this.b03Mode))this.labVfxRequested=true;});
      this.input.keyboard?.on('keydown-G',(event:KeyboardEvent)=>{if(!event.repeat&&this.b01dMode)this.labDiagnosticsRequested=true;});
      this.input.keyboard?.on('keydown-G',(event:KeyboardEvent)=>{if(!event.repeat&&this.b05Mode){this.dawnrushEnergy=100;this.b03Status='DAWNRUSH CHARGED / R OR LB';this.emitB05State(true);}});
      this.input.keyboard?.on('keydown-M',(event:KeyboardEvent)=>{if(!event.repeat&&this.b01eRuntime)this.setPreviewAudioEnabled(!this.labAudioEnabled);});
      this.input.keyboard?.on('keydown',(event:KeyboardEvent)=>{
        if(!this.b01eRuntime||event.repeat)return;
        if(event.code==='BracketLeft')this.setPreviewAudioVolume(this.labAudioVolume-.08);
        else if(event.code==='BracketRight')this.setPreviewAudioVolume(this.labAudioVolume+.08);
      });
      this.input.keyboard?.on('keydown',(event:KeyboardEvent)=>{
        if(event.code==='Digit1')this.labReviewScaleRequested=48;
        else if(event.code==='Digit2')this.labReviewScaleRequested=60;
        else if(event.code==='Digit3')this.labReviewScaleRequested=72;
        if(this.b01eRuntime)this.unlockLabAudio();
      });
      if(this.b01dMode||this.b01eMode||this.b02Diagnostics)this.labDiagnosticsGraphic=add.graphics().setDepth(39);
      if(this.b02Diagnostics)this.labDiagnosticLabel=add.text(this.actor.x,this.body.bottom-84,'',{fontFamily:'monospace',fontSize:'5px',color:'#b9fff0',backgroundColor:'#09111c',padding:{x:2,y:1}}).setOrigin(.5,1).setDepth(40);
      if(this.b01eRuntime)this.input.on(Phaser.Input.Events.POINTER_DOWN,()=>this.unlockLabAudio());
      if (this.animationLab || (this.previewMode && !this.b07Mode)) this.createTrainingTarget();
      if (this.b05Mode) this.createB05AuraLayers();
      if (this.animationLab) {
        this.createAnimationReview();
        this.updateAnimationReviewVisibility();
      }
      this.input.keyboard?.addCapture(['J','R','C','T','V','G','M']);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.sound.stopAll();this.labAudioPaused=true;void this.impactAudio?.close();this.impactAudio=undefined;});
    }
    this.input.keyboard?.addCapture(['SPACE', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'SHIFT']);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.removeCapture(['SPACE', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'SHIFT']));
  }

  update(_time: number, delta: number): void {
    if (this.artReview) { this.updateArtReview(); return; }
    let input = this.controller.read();
    if (input.pause) { this.setLabAudioPaused(true); this.onPauseRequested(); return; }
    if (this.handleExclusiveInput(input)) { this.body.setVelocity(0, 0); this.actor.setAngle(0); return; }
    if (this.previewMode && !this.b04Mode && this.previewResetRequested) {
      this.previewResetRequested = false;
      this.resetPreview();
      input = this.controller.read();
    }
    if (input.controller !== this.controllerConnected) { this.controllerConnected = input.controller; this.onControllerState(input.controller); }
    const grounded = this.body.blocked.down || this.body.touching.down;
    const oldFacing = this.motion.facing;
    const wasDashing = this.motion.dashMs > 0;
    const wasMoving = this.wasMoving;
    const dt = Math.min(delta, 50);
    if (this.previewMode && !this.b03Mode) {
      this.previewElapsedMs += dt;
      this.targetX = 228 + Math.sin(this.previewElapsedMs / 6500) * 66;
    }
    const movementInput = this.b03Mode && (this.playerHp <= 0 || this.combatHitstopMs > 0)
      ? { axis: 0, jumpPressed: false, jumpHeld: false, dashPressed: false }
      : input.move;
    const movement = stepMovement({ ...this.motion, xVelocity: this.body.velocity.x, yVelocity: this.body.velocity.y }, movementInput, grounded, dt);
    this.motion = movement.next;
    if (movement.dashed && this.b03Mode) {
      this.dashInvulnerabilityMs = Math.min(220, (this.b04Mode ? 150 : 75) + Math.max(0, Math.min(70, this.additionalDashInvulnerabilityMs())));
      if (this.b05Mode && this.dawnrushState === 'dawnrush') {
        this.playB05Cue('dash');
        this.createB05Fx('fx-dash-streak', this.body.center.x, this.body.bottom - 30, 106, 38, this.motion.facing);
      }
    }
    this.body.setVelocityX(movement.next.xVelocity);
    if (movement.jumped) this.body.setVelocityY(movement.next.yVelocity);
    if (movement.releaseCut && this.body.velocity.y < -95) this.body.setVelocityY(-95);
    this.actor.setFillStyle(movement.next.dashMs > 0 ? 0xf1ab85 : 0xe7dfce);
    this.actor.setAngle(movement.next.dashMs > 0 ? -7 * movement.next.facing : 0);
    this.groundContact = grounded;
    if (this.b01eRuntime) {
      if (movement.jumped) this.playB01eCue('jump');
      if (!wasDashing && movement.next.dashMs > 0) this.playB01eCue('dash-start');
      if (wasDashing && movement.next.dashMs === 0) this.playB01eCue('dash-brake');
      if (grounded && !this.wasGrounded) this.playB01eCue('land');
    }
    if (this.animationLab || this.previewMode) {
      if (this.b03Mode) {
        if (this.labContrastRequested && !this.b04Mode) {
          this.labContrastRequested = false;
          const contrasts: ArtReviewContrast[] = ['calm', 'light', 'busy'];
          this.reviewContrast = contrasts[(contrasts.indexOf(this.reviewContrast) + 1) % contrasts.length]!;
          this.applyReviewContrast();
          this.b03Status = `BACKGROUND / ${this.reviewContrast.toUpperCase()}`;
        }
        if (this.labVfxRequested) {
          this.labVfxRequested = false;
          if (this.b03ReducedMotion) this.b03Status = 'VFX HELD OFF / REDUCED MOTION';
          else {
            this.b03VfxEnabled = !this.b03VfxEnabled;
            if (!this.b03VfxEnabled) { this.specialVfx?.destroy(); this.specialVfx = undefined; this.b05FinisherFx?.destroy(); this.b05FinisherFx = undefined; }
            this.b03Status = `COMBAT VFX / ${this.b03VfxEnabled ? 'ON' : 'OFF'}`;
          }
        }
      }
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
          if (this.b01eMode) {
            this.labCompareCandidate=nextIonaLabCandidate(this.labCompareCandidate);
            this.labCompareB01c=this.labCompareCandidate==='b01c';
          } else this.labCompareB01c=!this.labCompareB01c;
          this.labClipKey='';
        }
        if(this.labVfxRequested){this.labVfxRequested=false;this.labVfxEnabled=!this.labVfxEnabled;}
        if(this.labDiagnosticsRequested){this.labDiagnosticsRequested=false;this.labDiagnosticsVisible=!this.labDiagnosticsVisible;}
      }
      if(this.labReviewScaleRequested!==null){
        this.setPreviewScale(this.labReviewScaleRequested);
        this.labReviewScaleRequested=null;
        if (this.animationLab) {
          for(const image of this.labReviewImages)image.setScale(this.labReviewScale/60);
          this.labReviewSub?.setText(`STANDING REFERENCE ${this.labReviewScale} PX / FIXED GLOBAL SCALE ${this.playerPresentation.scale.toFixed(3)} / B00 BODY 15x30 / 1-2-3 SCALE / R CLOSES / C CYCLES BG`);
        }
      }
      const moving = Math.abs(movement.next.xVelocity) > 12 && movement.next.dashMs === 0;
      if (moving && !wasMoving) this.startMs = this.b01cMode||this.b01dMode||this.b01eRuntime ? 140 : 70;
      if (!moving && wasMoving) this.stopMs = this.b01cMode||this.b01dMode||this.b01eRuntime ? 140 : 85;
      if (oldFacing !== movement.next.facing) { this.turnMs = 90; this.turnFromFacing = oldFacing as IonaFacing; }
      if (movement.jumped) this.jumpTakeoffMs = this.b01cMode||this.b01dMode||this.b01eRuntime ? 80 : 0;
      if (movement.next.dashMs > 0) { this.startMs = 0; this.stopMs = 0; }
      if (wasDashing && movement.next.dashMs === 0) this.dashRecoverMs = 100;
      if(this.b03Mode)this.updateB03Combat(input.actions,grounded,dt);
      else if(this.b01cMode||this.b01dMode||this.b01eRuntime)this.updateB01CCombat(input.actions.light,grounded,dt);
      else this.updateCombat(input.actions.light,grounded,dt);
      if (this.b05Mode) { this.updateB05Aura(dt); this.updateB05FinisherFx(dt); }
      this.updateLabAnimation(grounded,moving,dt);
      this.drawAnimationDiagnostics();
      if (this.animationLab) this.updateAnimationReviewVisibility();
      if (this.labHud) this.labHud.setText(this.b01eMode
        ? `B01E 3-WAY / SHOWING ${this.labCompareCandidate.toUpperCase()} / OWNER PENDING | ${this.labMode.toUpperCase()} ${this.labFrame} ${this.motion.facing<0?'LEFT':'RIGHT'} | SIZE ${this.labReviewScale} | VFX ${this.labVfxEnabled?'ON':'OFF'} | AUDIO ${this.audioStatus()} | VOL ${Math.round(this.labAudioVolume*100)}% | T VERSION / [ ] VOLUME / M MUTE`
        : this.b01dMode ? `B01D CANDIDATE ${this.labCompareB01c?'SHOWING B01C':'SHOWING B01D'} / OWNER PENDING | ${this.labMode.toUpperCase()} ${this.labFrame} | SIZE ${this.labReviewScale} | C BG | T A/B | VFX ${this.labVfxEnabled?'ON':'OFF'} | G DIAG` : (this.oldRejectedArt?'REJECTED ART COMPARE  |  ':this.b01cMode?'B01C NATIVE PIXEL PILOT  |  ':'B01 RECOVERY / GENERATED PIXELS  |  ') + this.labMode.toUpperCase() + ' / ' + this.labFrame + '  |  '+(this.b01cMode?'J COMBO':'J HIT')+'  |  R REVIEW  |  C BG');
      this.wasMoving = moving;
      this.wasGrounded = grounded;
      this.hitFlashMs = Math.max(0,this.hitFlashMs-dt);
      if (!this.b07Mode) this.drawTrainingTarget();
      if (this.b03Mode) {
        this.b03LastControllerIndex = input.controllerIndex;
        if (this.b03DebugVisible) this.drawB03Debug();
        window.dispatchEvent(new CustomEvent('crownflare:b03-state', { detail: { playerHp:this.playerHp,playerMaxHp:this.playerMaxHp,enemyHp:this.targetHealth,enemyMaxHp:this.enemyMaxHp,resonance:this.resonance,resonanceMax:100,specialCooldown:this.specialCooldownMs,combo:this.b03Move?.startsWith('light-')?`COMBO ${this.attackComboIndex+1}`:'BASE COMBAT',status:this.b03Status,controllerIndex:input.controllerIndex } }));
        if (this.b05Mode) this.emitB05State();
      }
    }
    this.lastTelemetry += delta;
    if (this.lastTelemetry > 200) { this.lastTelemetry = 0; window.dispatchEvent(new CustomEvent('crownflare:tick')); }
  }

  resetTransientInput(): void {
    this.controller?.resetTransientState();
    this.b03InputQueue = { jump:false, light:false, heavy:false, dash:false, special:false, interact:false, transform:false, finisher:false };
    this.labReviewRequested=false; this.labContrastRequested=false; this.labReviewScaleRequested=null; this.labABRequested=false; this.labVfxRequested=false; this.labDiagnosticsRequested=false;
  }

  setControlSettings(settings: ControlSettings): void {
    this.controller?.setControlSettings(settings);
    this.resetTransientInput();
  }

  snapshot(): ChamberSnapshot | null {
    if (!this.actor || !this.body) return null;
    return { x: Number(this.actor.x.toFixed(1)), y: Number(this.actor.y.toFixed(1)), grounded: this.groundContact, facing: this.motion.facing, dashActive: this.motion.dashMs > 0, cameraX: Math.round(this.cameras.main.scrollX), controller: this.controllerConnected, bodySize: { width: this.body.width, height: this.body.height } };
  }

  animationSnapshot(): AnimationLabSnapshot | null {
    if (!this.animationLab || !this.labSprite) return null;
    const all = this.b01eMode
      ? [...IONA_B01E_TEXTURES.map(({id,facing})=>ionaB01EAssetKey(id,facing)),...IONA_B01D_TEXTURES.map(({id,facing})=>ionaB01DAssetKey(id,facing)),...IONA_B01C_TEXTURES.map(({id,facing})=>ionaB01CAssetKey(id,facing))]
      : this.b01dMode
      ? [...IONA_B01D_TEXTURES.map(({id,facing})=>ionaB01DAssetKey(id,facing)),...IONA_B01C_TEXTURES.map(({id,facing})=>ionaB01CAssetKey(id,facing))]
      : this.b01cMode
      ? IONA_B01C_TEXTURES.map(({ id, facing }) => ionaB01CAssetKey(id, facing))
      : this.oldRejectedArt
      ? LEGACY_IONA_FRAME_IDS.flatMap((id) => [-1,1].map((facing) => animationAssetKey(id,facing as IonaFacing)))
        .concat([-1,1].map((facing)=>animationAssetKey('dawnrush-silhouette',facing as IonaFacing)))
      : IONA_RECOVERY_FRAME_IDS.flatMap((id) => [-1,1].map((facing) => recoveryAssetKey(id,facing as IonaFacing)));
    const missingAssets = this.b01eMode
      ? [...validateIonaB01ETextures(IONA_B01E_TEXTURES.map(({id,facing})=>ionaB01EAssetKey(id,facing)).filter((key)=>this.textures.exists(key))),...validateIonaB01DTextures(IONA_B01D_TEXTURES.map(({id,facing})=>ionaB01DAssetKey(id,facing)).filter((key)=>this.textures.exists(key))),...validateIonaB01CTextures(IONA_B01C_TEXTURES.map(({id,facing})=>ionaB01CAssetKey(id,facing)).filter((key)=>this.textures.exists(key)))]
      : this.b01dMode
      ? [...validateIonaB01DTextures(all.filter((key)=>this.textures.exists(key))),...validateIonaB01CTextures(all.filter((key)=>this.textures.exists(key)))]
      : this.b01cMode
      ? validateIonaB01CTextures(all.filter((key) => this.textures.exists(key)))
      : all.filter((key) => !this.textures.exists(key));
    const currentFrame = (this.b01cMode||this.b01dMode||this.b01eMode) ? this.labSprite.texture.key.match(/^iona-b01[cde]-(.*)-(left|right)$/)?.[1] ?? this.labFrame : this.labFrame;
    const candidate=this.selectedLabCandidate();
    const artSource=this.oldRejectedArt?'rejected-svg':this.b01eMode?candidate==='b01e'?'b01e-candidate':candidate==='b01d'?'b01d-candidate':'b01c-native':this.b01dMode?candidate==='b01c'?'b01c-native':'b01d-candidate':this.b01cMode?'b01c-native':'generated-imagegen';
    return { mode:this.labMode, frame:currentFrame, facing:this.motion.facing, attackPhase:this.attackClock.phase, comboStep:(this.b01cMode||this.b01dMode||this.b01eMode)&&this.attackClock.phase!=='idle'?this.attackComboIndex+1:0, targetHealth:this.targetHealth, targetX:this.targetX, lastCombatEvent:this.lastCombatEvent, artSource, candidateVersion:candidate.toUpperCase() as 'B01C'|'B01D'|'B01E', assetCount:all.length-missingAssets.length, missingAssets, reviewVisible:this.labReviewVisible, contrast:this.reviewContrast, reviewScale:this.labReviewScale, spriteScale:Number(this.labSprite.scaleX.toFixed(3)), visibleHeightPx:Number(this.getLabVisibleHeightPx().toFixed(2)), diagnosticsVisible:this.labDiagnosticsVisible, b01cComparison:this.b01eMode?candidate==='b01c':this.b01dMode&&this.labCompareB01c, vfxEnabled:this.labVfxEnabled, audioEnabled:this.labAudioEnabled, audioUnlocked:!this.sound.locked, audioAssetsLoaded:this.b01eMode?IONA_B01E_AUDIO_CUES.filter((cue)=>this.cache.audio.exists(cue)).length:0, audioVolume:this.labAudioVolume, audioPaused:this.labAudioPaused, lastAudioCue:this.lastAudioCue };
  }

  previewSnapshot(): IonaPreviewSnapshot | null {
    if (!this.previewMode || !this.labSprite) return null;
    const expected=IONA_B01E_TEXTURES.map(({id,facing})=>ionaB01EAssetKey(id,facing));
    const missingTextures=expected.filter((key)=>!this.textures.exists(key));
    return {
      playerX:Number(this.actor.x.toFixed(2)),playerY:Number(this.actor.y.toFixed(2)),physicsAnchor:{x:Number(this.body.center.x.toFixed(2)),y:Number(this.body.bottom.toFixed(2))},grounded:this.groundContact,
      facing:this.motion.facing,bodySize:{width:this.body.width,height:this.body.height},action:this.labMode,frame:this.labFrame,
      attackPhase:this.attackClock.phase,comboStep:this.attackClock.phase==='idle'?0:this.attackComboIndex+1,
      targetX:Number(this.targetX.toFixed(2)),targetHealth:this.targetHealth,lastCombatEvent:this.lastCombatEvent,
      reviewScale:this.labReviewScale,spriteScale:Number(this.labSprite.scaleX.toFixed(6)),spriteOrigin:{x:this.labSprite.originX,y:this.labSprite.originY},spritePosition:{x:Number(this.labSprite.x.toFixed(2)),y:Number(this.labSprite.y.toFixed(2))},vfxEnabled:this.labVfxEnabled,background:'calm',audioEnabled:this.labAudioEnabled,audioUnlocked:!this.sound.locked,
      audioAssetsLoaded:IONA_B01E_AUDIO_CUES.filter((cue)=>this.cache.audio.exists(cue)).length,audioVolume:this.labAudioVolume,
      audioStatus:this.audioStatus(),controller:this.controllerConnected,loadedTextures:expected.length-missingTextures.length,missingTextures,
    };
  }

  combatSnapshot(): B03CombatSnapshot | null {
    if (!this.b03Mode || !this.labSprite || !this.body) return null;
    const expected = [
      ...IONA_B03_POSES.flatMap((pose) => ['left','right'].map((facing) => ionaB03PoseTexture(pose, facing as 'left'|'right'))),
      ...IONA_B03_ENEMY_STATES.map(ionaB03EnemyTexture),
      ...IONA_B03_VFX_FRAMES.map((frame) => `iona-b03-${frame}`),
    ];
    return {
      playerX:Number(this.body.center.x.toFixed(2)), playerY:Number(this.body.center.y.toFixed(2)), playerHp:this.playerHp,
      playerVelocity:{ x:Number(this.body.velocity.x.toFixed(2)), y:Number(this.body.velocity.y.toFixed(2)) }, playerInvulnerableMs:Number(this.playerInvulnerableMs.toFixed(1)),
      enemyX:Number(this.targetX.toFixed(2)), enemyY:Number((GROUND_TOP + this.enemyAirOffset).toFixed(2)), enemyHp:this.targetHealth,
      resonance:Number(this.resonance.toFixed(1)), specialCooldownMs:Number(this.specialCooldownMs.toFixed(1)),
      move:this.b03Move ?? 'none', phase:this.attackClock.phase, elapsedMs:this.attackClock.elapsedMs, bufferedMove:this.b03BufferedMove, facing:this.motion.facing, enemyState:this.enemyVisualState,
      grounded:!!(this.body.blocked.down || this.body.touching.down), dashActive:this.motion.dashMs > 0, dashCooldownMs:Math.round(this.motion.dashCooldownMs), hurtMs:Math.round(this.playerHurtMs), resonanceCost:this.moveDefinition('resonance').resonanceCost,
      frame:this.labSprite.texture.key, controllerIndex:this.b03LastControllerIndex, lastResult:this.b03LastResult,
      bodySize:{ width:this.body.width, height:this.body.height }, spriteScale:Number(this.labSprite.scaleX.toFixed(4)),
      vfxEnabled:this.b03VfxEnabled, vfxActive:!!this.specialVfx, background:this.reviewContrast, reducedMotion:this.b03ReducedMotion,
      errors:expected.filter((key) => !this.textures.exists(key)),
    };
  }

  protected handleB04Interact(): boolean { return false; }
  protected handleExclusiveInput(_input: ReturnType<InputController['read']>): boolean { return false; }

  protected b06CombatTargets(): readonly B06CombatTarget[] { return []; }
  protected onB06ContactResult(_target: B06CombatTarget, _result: ContactResult, _move: B03MoveDefinition, _event: CombatEvent, _guardBreak: boolean): void {}
  protected onB06ThreatEvent(_event: { readonly sourceId: string; readonly result: 'hit' | 'dodged' | 'invulnerable' | 'blocked'; readonly damage: number }): void {}
  protected additionalDashInvulnerabilityMs(): number { return 0; }
  protected adjustB06ThreatDamage(_sourceId: string, damage: number, _playerHp: number): { readonly damage: number; readonly blocked: boolean } { return { damage, blocked: false }; }

  protected getB06PlayerFrame(): B06PlayerCombatFrame {
    return {
      x: this.body.center.x, y: this.body.center.y, width: this.body.width, height: this.body.height, hp: this.playerHp,
      invulnerableMs: this.playerInvulnerableMs, dashInvulnerableMs: this.dashInvulnerabilityMs, resonance: this.resonance,
      facing: this.motion.facing, velocityX: this.body.velocity.x, velocityY: this.body.velocity.y,
      dawnrush: this.dawnrushState, grounded: this.body.blocked.down || this.body.touching.down,
    };
  }

  protected getB06Blockers(): readonly CombatRect[] { return this.combatBlockers; }
  protected setCombatBlockers(blockers: readonly CombatRect[]): void { this.combatBlockers = [...blockers]; }
  protected physicsRegistrationDebug(): PhysicsRegistrationDebug {
    // The QA snapshot can be polled between scene construction and create();
    // keep that short startup window safe without pretending it has live bounds.
    const liveBody = this.body;
    if (!liveBody) return { body: { left: 0, right: 0, top: 0, bottom: 0 }, sprite: null, hipY: 0, feetY: 0, attack: null, cameraX: this.cameras?.main?.scrollX ?? 0 };
    const body = { left: liveBody.left, right: liveBody.right, top: liveBody.top, bottom: liveBody.bottom };
    const sprite = this.labSprite;
    let spriteBounds: PhysicsRegistrationDebug['sprite'] = null;
    if (sprite) {
      const key = sprite.texture.key;
      const source = this.textures.get(key).getSourceImage() as CanvasImageSource & { width: number; height: number };
      const alpha = textureAlphaBounds(this, key);
      let alphaWorld: PhysicsRegistrationDebug['sprite'] extends infer _T ? { left: number; right: number; top: number; bottom: number } | null : never = null;
      if (alpha) {
        const [x0, y0, x1, y1] = alpha;
        const leftX = sprite.flipX ? source.width - x1 : x0;
        const rightX = sprite.flipX ? source.width - x0 : x1;
        alphaWorld = {
          left: sprite.x + (leftX - source.width * sprite.originX) * sprite.scaleX,
          right: sprite.x + (rightX - source.width * sprite.originX) * sprite.scaleX,
          top: sprite.y + (y0 - source.height * sprite.originY) * sprite.scaleY,
          bottom: sprite.y + (y1 - source.height * sprite.originY) * sprite.scaleY,
        };
      }
      const bounds = sprite.getBounds();
      spriteBounds = { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom, alpha: alphaWorld, texture: key };
    }
    const attack = this.b03Move ? moveHitbox(this.activeMoveDefinition ?? this.moveDefinition(this.b03Move), this.body.center.x, this.body.bottom, this.attackFacing) : null;
    return { body, sprite: spriteBounds, hipY: this.body.top + this.body.height * .5, feetY: this.body.bottom, attack, cameraX: this.cameras.main.scrollX };
  }
  protected setRoomWorldBounds(width: number, height = WORLD_HEIGHT): void {
    this.cameras.main.setBounds(0, 0, width, height);
    this.physics.world.setBounds(0, 0, width, height);
    this.body.setCollideWorldBounds(true);
  }
  protected getPlayerActor(): Phaser.GameObjects.Rectangle { return this.actor; }
  protected addPlayerCollider(object: Phaser.GameObjects.GameObject): Phaser.Physics.Arcade.Collider { return this.physics.add.collider(this.actor, object); }
  protected placePlayerOnSurface(x: number, surfaceTop: number): void {
    this.actor.setPosition(x, surfaceTop - this.body.height / 2).setAngle(0);
    this.body.reset(x, surfaceTop - this.body.height / 2);
    this.body.setVelocity(0, 0);
    this.playerPresentation.present({ textureKey: ionaB01EAssetKey('idle-0', 'right'), x, footY: surfaceTop });
    this.groundContact = true;
    this.wasGrounded = true;
  }
  protected get b06HitstopActive(): boolean { return this.combatHitstopMs > 0; }
  protected get b06AudioPermitted(): boolean { return this.labAudioEnabled && !this.labAudioPaused && !this.sound.locked; }

  protected applyB06PlayerThreat(sourceId: string, damage: number, knockback: -1 | 1): 'hit' | 'dodged' | 'invulnerable' | 'blocked' {
    if (this.playerHp <= 0) return 'invulnerable';
    if (this.dashInvulnerabilityMs > 0) {
      this.resonance = Math.min(100, this.resonance + 6);
      this.b03Status = 'DODGED / +6 RESONANCE';
      this.playCombatTone('dodge');
      this.controller.requestRumble(.1, 32);
      this.onB06ThreatEvent({ sourceId, result: 'dodged', damage: 0 });
      return 'dodged';
    }
    if (this.playerInvulnerableMs > 0) {
      this.b03Status = 'HURT WINDOW / NO DAMAGE';
      this.onB06ThreatEvent({ sourceId, result: 'invulnerable', damage: 0 });
      return 'invulnerable';
    }
    const adjusted = this.adjustB06ThreatDamage(sourceId, damage, this.playerHp);
    if (adjusted.blocked || adjusted.damage <= 0) {
      this.b03Status = 'UPGRADE SHIELD / HIT BLOCKED';
      this.onB06ThreatEvent({ sourceId, result: 'blocked', damage: 0 });
      return 'blocked';
    }
    const actualDamage = Math.max(1, Math.round(adjusted.damage));
    this.playerHp = Math.max(0, this.playerHp - actualDamage);
    this.playerHurtMs = this.playerHp <= 0 ? 999999 : 430;
    this.playerInvulnerableMs = 700;
    this.body.setVelocityX(knockback * 82);
    this.b03Status = this.playerHp <= 0 ? 'IONA DOWN' : `IONA HIT / ${this.playerHp} HP`;
    if (this.b05Mode && this.dawnrushState !== 'base') this.playB05Cue('dawnrush-hurt');
    else this.playCombatTone(this.playerHp <= 0 ? 'ko' : 'hurt');
    if (this.playerHp <= 0) { this.b03Move = null; this.activeMoveDefinition = null; this.b03BufferedMove = null; this.attackClock = idleClock; }
    this.controller.requestRumble(this.playerHp <= 0 ? .25 : .16);
    window.dispatchEvent(new CustomEvent('crownflare:player-damage', { detail: { hp: this.playerHp, source: sourceId } }));
    this.onB06ThreatEvent({ sourceId, result: 'hit', damage: actualDamage });
    return 'hit';
  }

  protected grantB06Reward(health: number, resonance: number, dawnrushEnergy: number): void {
    this.playerHp = Phaser.Math.Clamp(this.playerHp + Math.max(0, Math.round(health)), 1, this.playerMaxHp);
    this.resonance = Math.min(100, this.resonance + Math.max(0, resonance));
    if (this.b05Mode) this.dawnrushEnergy = Math.min(100, this.dawnrushEnergy + Math.max(0, dawnrushEnergy));
    this.playerHurtMs = 0;
    this.playerInvulnerableMs = 0;
    this.dashInvulnerabilityMs = 0;
  }

  protected grantB09CombatResonance(amount: number): void { this.resonance = Phaser.Math.Clamp(this.resonance + Math.max(0, Math.round(amount)), 0, 100); }
  protected spendB09CombatResonance(amount: number): void { this.resonance = Math.max(0, this.resonance - Math.max(0, Math.round(amount))); }
  protected grantB09DawnrushEnergy(amount: number): void { if (this.b05Mode) this.dawnrushEnergy = Phaser.Math.Clamp(this.dawnrushEnergy + Math.max(0, Math.round(amount)), 0, 100); }

  /** Restore only durable B10 resources at an authored room boundary; combat timers and input are reset. */
  protected restoreB10CheckpointState(state: { hp: number; resonance: number; dawnrushEnergy: number; dawnrushActive: boolean }): void {
    this.playerHp = Phaser.Math.Clamp(Math.round(state.hp), 1, this.playerMaxHp);
    this.resonance = Phaser.Math.Clamp(Math.round(state.resonance), 0, 100);
    this.dawnrushEnergy = Phaser.Math.Clamp(Math.round(state.dawnrushEnergy), 0, 100);
    this.dawnrushState = state.dawnrushActive && this.dawnrushEnergy > 0 ? 'dawnrush' : 'base';
    this.dawnrushPhaseMs = 0;
    this.playerHurtMs = 0; this.playerInvulnerableMs = 0; this.dashInvulnerabilityMs = 0;
    this.finisherCooldownMs = 0; this.dawnrushRecoveryMs = 0;
    this.resetTransientInput();
  }

  protected restorePlayerHealth(amount: number): number {
    if (this.playerHp <= 0) return 0;
    const before = this.playerHp;
    this.playerHp = Phaser.Math.Clamp(this.playerHp + Math.max(0, Math.round(amount)), 0, this.playerMaxHp);
    return this.playerHp - before;
  }

  /** B04 consumes contextual interaction before the B03 practice retry behavior. */
  protected setB04Target(x: number, hp = this.enemyMaxHp): void {
    if (!this.b04Mode) return;
    this.targetHealth = Math.max(0, Math.min(this.enemyMaxHp, Math.round(hp)));
    this.targetX = Phaser.Math.Clamp(x, 120, WORLD_WIDTH - 70);
    this.enemyVisualState = this.targetHealth > 0 ? 'idle' : 'ko';
    this.enemyFacing = this.body.center.x < this.targetX ? -1 : 1;
    this.enemyTimerMs = 0;
    this.enemyAttackHit = false;
    this.enemyHitstunMs = 0;
    this.enemyKnockbackX = 0;
    this.enemyAirOffset = 0;
    this.enemyAirVelocity = 0;
    if (!this.b07Mode) this.drawTrainingTarget();
  }

  protected setB04PlayerHealth(hp: number): void {
    if (!this.b04Mode) return;
    this.playerHp = Phaser.Math.Clamp(Math.round(hp), 1, this.playerMaxHp);
    this.playerHurtMs = 0;
    this.playerInvulnerableMs = 0;
    this.dashInvulnerabilityMs = 0;
  }

  protected resetB04Combat(startX = 80): void {
    if (!this.b04Mode) return;
    this.resetB03Encounter();
    this.actor.setPosition(startX, GROUND_TOP - 15);
    this.body.reset(startX, GROUND_TOP - 15);
    this.playerPresentation.present({ textureKey: ionaB01EAssetKey('idle-0', 'right'), x: startX, footY: GROUND_TOP });
    this.cameras.main.setScroll(0, 0);
  }

  protected setB04StartPosition(startX: number): void {
    if (!this.b04Mode) return;
    this.actor.setPosition(startX, GROUND_TOP - 15);
    this.body.reset(startX, GROUND_TOP - 15);
    this.body.setVelocity(0, 0);
    this.playerPresentation.present({ textureKey: ionaB01EAssetKey('idle-0', 'right'), x: startX, footY: GROUND_TOP });
    this.cameras.main.setScroll(0, 0);
  }

  setPreviewScale(scale:48|60|72): void {
    if (![48,60,72].includes(scale) || !this.labSprite) return;
    this.labReviewScale=scale;
    this.playerPresentation.setReviewSize(scale);
  }

  setPreviewAudioEnabled(enabled:boolean): void {
    if (!this.b01eRuntime) return;
    this.labAudioEnabled=enabled;
    if (!enabled) this.sound.stopAll();
  }

  setPreviewAudioVolume(volume:number): void {
    if (!this.b01eRuntime || !Number.isFinite(volume)) return;
    this.labAudioVolume=Math.max(0,Math.min(1,Number(volume.toFixed(2))));
    this.sound.setVolume(this.labAudioVolume);
  }

  playPreviewCue(value:string): void {
    if (!this.previewMode || !IONA_B01E_AUDIO_CUES.includes(value as IonaB01eAudioCue)) return;
    const cue=value as IonaB01eAudioCue;
    this.unlockLabAudio();
    if (this.sound.locked) {
      this.lastAudioCue=`LOCKED:${cue}`;
      return;
    }
    this.playB01eCue(cue);
  }

  private resetPreview(): void {
    if (this.b03Mode) { this.resetB03Encounter(); this.body.reset(80,GROUND_TOP-15); this.groundContact=true; this.cameras.main.setScroll(0,0); this.sound.stopAll(); return; }
    this.controller.resetTransientState();
    this.motion=initialMoveState();
    this.actor.setPosition(80,GROUND_TOP-15).setAngle(0);
    this.body.reset(80,GROUND_TOP-15);
    this.body.setVelocity(0,0);
    this.groundContact=true;
    this.wasGrounded=true;
    this.wasMoving=false;
    this.attackClock=idleClock;
    this.attackBufferMs=0;
    this.attackComboIndex=0;
    this.attackFacing=1;
    this.targetHealth=3;
    this.targetX=228;
    this.previewElapsedMs=0;
    this.lastCombatEvent='RESET / TARGET READY';
    this.hitFlashMs=0;
    this.startMs=0;this.stopMs=0;this.turnMs=0;this.dashRecoverMs=0;this.jumpTakeoffMs=0;this.landingMs=0;
    this.lastFootfallFrame='';this.footfallSide=0;
    this.labMode='idle';this.labFrame='idle-0';this.labClipKey='';
    this.labSprite?.anims.stop();
    this.playerPresentation.present({textureKey:ionaB01EAssetKey('idle-0','right'),x:80,footY:GROUND_TOP});
    this.sound.stopAll();
    this.cameras.main.setScroll(0,0);
    if (!this.b07Mode) this.drawTrainingTarget();
  }

  reviewSnapshot(): ArtReviewSnapshot | null {
    if (!this.artReview) return null;
    const missingAssets = ART_REVIEW_ASSET_KEYS.filter((key) => !this.textures.exists(key));
    return { view: this.reviewView, contrast: this.reviewContrast, silhouetteHeight: this.silhouetteHeight, pixelGrid: this.reviewGrid, loadedAssets: ART_REVIEW_ASSET_KEYS.length - missingAssets.length, totalAssets: ART_REVIEW_ASSET_KEYS.length, missingAssets };
  }

  private createTrainingTarget(): void {
    if (this.b06Mode) return;
    if (this.b03Mode) {
      this.enemySprite = this.add.image(this.targetX, GROUND_TOP, ionaB03EnemyTexture('idle')).setOrigin(.5, 1).setDepth(13);
      this.enemyTell = this.add.graphics().setDepth(11);
      this.targetLabel = this.add.text(this.targetX, GROUND_TOP - 61, 'FRACTURED SPINDLE SENTRY / 8 HP', { fontFamily: 'monospace', fontSize: '6px', color: '#f0cda8', align: 'center', backgroundColor: '#171b2c', padding: { x: 2, y: 1 } }).setOrigin(.5, 1).setDepth(20);
      if (this.b04Mode) this.targetLabel.setVisible(false);
      return;
    }
    this.targetVisual = this.add.graphics().setDepth(9);
    this.targetLabel = this.add.text(this.targetX,GROUND_TOP-72,this.previewMode?'MOVING PRACTICE TARGET / 3 HP':'TRAINING DUMMY / 3', {fontFamily:'monospace',fontSize:'6px',color:'#f0cda8',align:'center',backgroundColor:'#171b2c',padding:{x:2,y:1}}).setOrigin(.5,1).setDepth(20);
    if (!this.b07Mode) this.drawTrainingTarget();
  }

  private drawTrainingTarget(): void {
    if (this.b03Mode) {
      if (!this.enemySprite) return;
      this.enemySprite.setTexture(ionaB03EnemyTexture(this.enemyVisualState)).setFlipX(this.enemyFacing < 0).setPosition(this.targetX, GROUND_TOP + this.enemyAirOffset);
      this.targetLabel?.setPosition(this.targetX, GROUND_TOP - this.enemyAirOffset - 61).setText(this.targetHealth <= 0 ? 'SENTRY DEFEATED / E INTERACT OR R RETRY' : `FRACTURED SENTRY / ${this.targetHealth} HP`);
      this.enemyTell?.clear();
      if (this.enemyVisualState === 'telegraph' && !this.b04Mode) {
        const x = this.targetX + this.enemyFacing * 7;
        this.enemyTell?.lineStyle(2, 0xf6a879, .9).lineBetween(x, GROUND_TOP - 22, x + this.enemyFacing * 45, GROUND_TOP - 22);
        this.enemyTell?.fillStyle(0xffbd8c, .9).fillTriangle(x + this.enemyFacing * 49, GROUND_TOP - 26, x + this.enemyFacing * 49, GROUND_TOP - 18, x + this.enemyFacing * 55, GROUND_TOP - 22);
      }
      return;
    }
    if (!this.targetVisual) return;
    const x=this.targetX, top=GROUND_TOP-31;
    this.targetVisual.clear();
    this.targetVisual.fillStyle(this.hitFlashMs>0?0xffd888:0x8c6c68,1).fillRect(x-8,top,16,27);
    this.targetVisual.fillStyle(0x302a3b,1).fillRect(x-11,top+4,22,4);
    this.targetVisual.fillStyle(0xe4d7d0,1).fillRect(x-4,top+7,8,3);
    this.targetVisual.fillStyle(0x35aeb0,1).fillRect(x-3,top+8,2,2);
    this.targetVisual.fillStyle(0xa8694e,1).fillRect(x-10,top+14,20,4);
    this.targetVisual.fillStyle(0x282743,1).fillRect(x-5,GROUND_TOP-4,10,4);
    this.targetLabel?.setPosition(x,GROUND_TOP-72).setText((this.previewMode?'PRACTICE TARGET / ':'TRAINING DUMMY / ')+this.targetHealth+' HP');
  }

  private updateB03Combat(actions: Readonly<Record<RebindableAction, boolean>>, grounded: boolean, deltaMs: number): void {
    for (const action of Object.keys(this.b03InputQueue) as RebindableAction[]) this.b03InputQueue[action] ||= actions[action];
    this.b03FixedAccumulator = Math.min(100, this.b03FixedAccumulator + deltaMs);
    const fixedStepMs = 1000 / 60;
    let steps = 0;
    while (this.b03FixedAccumulator >= fixedStepMs && steps < 6) {
      this.b03FixedAccumulator -= fixedStepMs;
      steps += 1;
      const queued = this.b03InputQueue;
      this.b03InputQueue = { jump:false, light:false, heavy:false, dash:false, special:false, interact:false, transform:false, finisher:false };
      this.stepB03CombatTick(queued, grounded, fixedStepMs);
    }
  }

  private stepB03CombatTick(input: Readonly<Record<RebindableAction, boolean>>, grounded: boolean, deltaMs: number): void {
    this.specialCooldownMs = Math.max(0, this.specialCooldownMs - deltaMs);
    this.finisherCooldownMs = Math.max(0, this.finisherCooldownMs - deltaMs);
    const previousHurtMs = this.playerHurtMs;
    this.playerHurtMs = Math.max(0, this.playerHurtMs - deltaMs);
    this.dawnrushRecoveryMs = Math.max(0, this.dawnrushRecoveryMs - deltaMs);
    if (previousHurtMs > 0 && this.playerHurtMs === 0 && this.b05Mode && this.dawnrushState === 'dawnrush' && this.playerHp > 0) this.dawnrushRecoveryMs = 160;
    this.playerInvulnerableMs = Math.max(0, this.playerInvulnerableMs - deltaMs);
    this.dashInvulnerabilityMs = Math.max(0, this.dashInvulnerabilityMs - deltaMs);
    if (input.transform && this.b05Mode) this.dawnrushTransformBufferMs = 900;
    if (this.combatHitstopMs > 0) {
      this.combatHitstopMs = Math.max(0, this.combatHitstopMs - deltaMs);
      this.updateB03Vfx(deltaMs);
      return;
    }
    this.updateB05Transform(deltaMs);
    const formSwitchReady = this.b05Mode && canSwitchDawnrushForm({ state: this.dawnrushState, phaseMs: this.dawnrushPhaseMs,
      playerHp: this.playerHp, hurtMs: this.playerHurtMs, dashMs: this.motion.dashMs, moveActive: !!this.b03Move });
    if (this.dawnrushTransformBufferMs > 0 && formSwitchReady) {
      this.dawnrushTransformBufferMs = 0;
      this.toggleB05Transform();
    } else this.dawnrushTransformBufferMs = Math.max(0, this.dawnrushTransformBufferMs - deltaMs);
    if (input.interact && this.b04Mode && this.handleB04Interact()) return;
    if (!this.b06Mode && input.interact && (this.playerHp <= 0 || this.targetHealth <= 0)) {
      this.resetB03Encounter();
      return;
    }
    if (!this.b06Mode && input.interact && this.playerHp > 0 && this.targetHealth > 0) this.b03Status = 'NO INTERACTABLE / MOVE INTO THE SENTRY';
    const b05CanAct = !this.b05Mode || this.dawnrushState === 'base' || this.dawnrushState === 'dawnrush' && this.dawnrushPhaseMs <= 0;
    if (this.playerHp > 0 && (this.b06Mode || this.targetHealth > 0) && this.playerHurtMs <= 0 && this.motion.dashMs === 0 && b05CanAct && !input.transform) {
      if (this.b03Move && input.light && this.b03Move.startsWith('light-')) {
        const current = this.activeMoveDefinition ?? this.moveDefinition(this.b03Move);
        if (this.attackComboIndex < 2 && canCancelIntoCombo(current, this.attackClock.elapsedMs)) {
          this.b03BufferedMove = (`light-${this.attackComboIndex + 2}`) as B03MoveId;
          this.b03Status = 'COMBO BUFFERED';
        } else if (this.attackComboIndex === 2) this.b03Status = 'COMBO END / RECOVER';
      } else if (this.b03Move && input.finisher && this.b05Mode && this.dawnrushState === 'dawnrush') {
        const current = this.activeMoveDefinition ?? this.moveDefinition(this.b03Move);
        if (this.canStartDawnrushFinisher() && canCancelIntoCombo(current, this.attackClock.elapsedMs)) {
          this.b03BufferedMove = 'finisher';
          this.b03Status = 'DAWNFALL BREAKER BUFFERED';
        } else this.b03Status = 'FINISHER BUFFERED ONLY IN RECOVERY / EARN 60 RESONANCE';
      } else if (!this.b03Move) {
        if (input.special) this.tryStartB03Move('resonance', grounded);
        else if (input.finisher && this.b05Mode && this.dawnrushState === 'dawnrush') this.tryStartB03Move('finisher', grounded);
        else if (input.heavy) this.tryStartB03Move('heavy', grounded);
        else if (input.light) this.tryStartB03Move(grounded ? 'light-1' : 'air-light', grounded);
      }
    }
    if (this.b03Move && this.attackClock.phase !== 'idle') {
      const move = this.activeMoveDefinition ?? this.moveDefinition(this.b03Move);
      const result = stepAction(this.attackClock, move.action, deltaMs);
      this.attackClock = result.clock;
      for (const event of result.events) this.resolveB03CombatEvent(move, event);
    }
    if (this.b03Move && this.attackClock.phase === 'idle') {
      const next = this.b03BufferedMove;
      this.b03BufferedMove = null;
      this.b03Move = null;
      this.activeMoveDefinition = null;
      if (next && this.playerHp > 0 && (this.b06Mode || this.targetHealth > 0) && grounded) this.tryStartB03Move(next, grounded);
      else { this.attackComboIndex = 0; this.b03Status = this.targetHealth <= 0 ? 'SENTRY KO / E INTERACT OR R RETRY' : 'RECOVER / DODGE REMAINS AVAILABLE'; }
    }
    if (!this.b06Mode) this.updateB03Enemy(deltaMs);
    this.updateB03Vfx(deltaMs);
  }

  private tryStartB03Move(id: B03MoveId, grounded: boolean): void {
    const move = this.moveDefinition(id);
    if (move.grounded && !grounded || move.airborne && grounded) { this.b03Status = move.airborne ? 'AIR STRIKE / JUMP FIRST' : 'GROUND MOVE / LAND FIRST'; return; }
    if (id === 'resonance' && this.specialCooldownMs > 0) { this.b03Status = `SPECIAL COOLDOWN / ${Math.ceil(this.specialCooldownMs / 100) / 10}s`; return; }
    if (id === 'finisher' && !this.b05Mode) { this.b03Status = 'DAWNFALL BREAKER IS DAWNRUSH ONLY'; return; }
    if (id === 'finisher' && this.finisherCooldownMs > 0) { this.b03Status = `FINISHER COOLDOWN / ${Math.ceil(this.finisherCooldownMs / 100) / 10}s`; return; }
    if (id === 'finisher' && this.dawnrushEnergy < (move.dawnrushEnergyCost ?? 0)) { this.b03Status = `FINISHER NEEDS ${DAWNRUSH_FINISHER_REQUIREMENTS.energy} DAWNRUSH`; return; }
    if (this.resonance < move.resonanceCost) { this.b03Status = `NEED ${move.resonanceCost} RESONANCE`; return; }
    this.resonance = Math.max(0, this.resonance - move.resonanceCost);
    if (id === 'finisher') {
      this.dawnrushEnergy = Math.max(0, this.dawnrushEnergy - (move.dawnrushEnergyCost ?? 0));
      this.finisherCooldownMs = move.cooldownMs;
    }
    if (id === 'resonance') this.specialCooldownMs = move.cooldownMs;
    this.b03Move = id;
    this.activeMoveDefinition = move;
    this.b03BufferedMove = null;
    this.attackComboIndex = id === 'light-1' ? 0 : id === 'light-2' ? 1 : id === 'light-3' ? 2 : this.attackComboIndex;
    this.attackFacing = this.motion.facing;
    this.attackClock = beginAction(move.action);
    this.b03HitTargets.clear();
    this.activeAudioSequence = ++this.audioSequence;
    const whoosh: IonaB01eAudioCue = id === 'light-1' ? 'palm-whoosh' : id === 'light-2' || id === 'air-light' ? 'kick-whoosh' : 'forearm-whoosh';
    if (this.b05Mode && this.dawnrushState === 'dawnrush') {
      const lunge = id === 'resonance' ? 92 : id === 'finisher' ? 118 : 62;
      this.body.setVelocityX(Phaser.Math.Clamp(this.body.velocity.x + this.attackFacing * lunge, -330, 330));
      this.motion = { ...this.motion, xVelocity: this.body.velocity.x };
      this.playB05Cue(id === 'resonance' ? 'solar-drive' : id === 'finisher' ? 'finisher' : id === 'heavy' ? 'heavy' : id === 'air-light' ? 'aerial' : 'light');
    } else this.playB01eCue(whoosh, `b03:${this.activeAudioSequence}:startup`);
    if (id === 'heavy') this.playCombatTone('heavy-charge');
    else if (id === 'air-light') this.playCombatTone('air-swing');
    else if (id === 'resonance') this.playCombatTone('resonance-charge');
    this.b03Status = id === 'resonance' ? 'RESONANCE IMPRINT / RELEASE' : id === 'heavy' ? 'HEAVY LAUNCHER / COMMIT' : id === 'air-light' ? 'AERIAL STRIKE' : `LIGHT ${this.attackComboIndex + 1} / CHAIN IN RECOVERY`;
    if (this.b05Mode && this.dawnrushState === 'dawnrush') this.b03Status = id === 'resonance' ? 'SOLAR DRIVE / PRESSURE WAVE' : id === 'finisher' ? 'DAWNFALL BREAKER / RELEASE' : `DAWNRUSH ${id.toUpperCase()} / FORWARD PRESSURE`;
    window.dispatchEvent(new CustomEvent('crownflare:b03-move-start', { detail: { move:id, facing:this.attackFacing, at:performance.now() } }));
  }

  private moveDefinition(id: B03MoveId): B03MoveDefinition {
    return this.b05Mode && this.dawnrushState === 'dawnrush' ? DAWNRUSH_MOVES[id] : B03_MOVES[id];
  }

  private canStartDawnrushFinisher(): boolean {
    return this.b05Mode && canUseDawnrushFinisher({ state: this.dawnrushState, phaseMs: this.dawnrushPhaseMs, energy: this.dawnrushEnergy, resonance: this.resonance, cooldownMs: this.finisherCooldownMs });
  }

  private toggleB05Transform(): void {
    if (!this.b05Mode) return;
    if (this.dawnrushState === 'dawnrush') {
      const reversion = beginDawnrushReversion(this.dawnrushState, this.dawnrushEnergy);
      this.dawnrushState = reversion.state;
      this.dawnrushPhaseMs = reversion.phaseMs;
      this.b03Status = 'DAWNRUSH RELEASE / RETURNING TO BASE';
      this.playB05Cue('transform-revert');
      this.createB05Fx('fx-orbit-1', this.body.center.x, this.body.bottom - 30, 92, 58);
      this.emitB05State();
      return;
    }
    if (this.dawnrushState !== 'base') return;
    if (this.dawnrushEnergy < 20) {
      this.b03Status = `DAWNRUSH NEEDS 20 / ${Math.floor(this.dawnrushEnergy)} STORED`;
      this.emitB05State();
      return;
    }
    this.dawnrushEnergy -= 20;
    const safeForShowcase = this.targetHealth <= 0 || Math.abs(this.targetX - this.body.center.x) > 120;
    this.dawnrushActivationMode = safeForShowcase && !this.dawnrushShowcaseUsed ? 'showcase' : 'combat';
    if (this.dawnrushActivationMode === 'showcase') this.dawnrushShowcaseUsed = true;
    this.dawnrushState = 'anticipation';
    this.dawnrushPhaseMs = dawnrushActivationPhases(this.dawnrushActivationMode)[0];
    this.b03Status = 'DAWNRUSH / IGNITION';
    this.playB05Cue('transform-charge');
    this.createB05Fx('fx-transform-ring', this.body.center.x, this.body.bottom - 30, 92, 58);
    if (!this.b03ReducedMotion) this.cameras.main.shake(125, .0015);
    this.emitB05State();
  }

  private updateB05Transform(deltaMs: number): void {
    if (!this.b05Mode) return;
    const step = stepDawnrushForm({ state: this.dawnrushState, phaseMs: this.dawnrushPhaseMs, energy: this.dawnrushEnergy, transitions: [] }, deltaMs, this.dawnrushActivationMode);
    this.dawnrushState = step.state;
    this.dawnrushPhaseMs = step.phaseMs;
    this.dawnrushEnergy = step.energy;
    for (const state of step.transitions) {
      if (state === 'ignition') {
        this.playB05Cue('transform-ignition');
        this.createB05Fx('fx-silhouette-burst', this.body.center.x, this.body.bottom - 32, 100, 62);
      } else if (state === 'silhouette') {
        this.createB05Fx('fx-orbit-filaments', this.body.center.x, this.body.bottom - 31, 96, 58);
      } else if (state === 'dawnrush') {
        this.dawnrushLocomotionElapsed = 0;
        this.b03Status = 'DAWNRUSH / F DAWNFALL BREAKER (60 RESONANCE + 25 FORM)';
      } else if (state === 'reverting-contract') {
        this.playB05Cue('transform-revert');
        this.createB05Fx('fx-orbit-1', this.body.center.x, this.body.bottom - 30, 92, 58);
        this.b03Status = this.dawnrushEnergy === 0 ? 'DAWNRUSH SPENT / RETURNING TO BASE' : 'DAWNRUSH RELEASE / RETURNING TO BASE';
      } else if (state === 'base') {
        this.b03Status = 'BASE RESTORED / BUILD DAWNRUSH THROUGH HITS';
      }
    }
    if (step.transitions.length > 0) this.emitB05State();
  }

  private createB05Fx(frame: string, x: number, y: number, width: number, height: number, direction: IonaFacing = 1): void {
    if (!this.b05Mode || !this.b03VfxEnabled || this.b03ReducedMotion || !this.textures.exists(`iona-b05-${frame}`)) return;
    const image = this.add.image(x, y, `iona-b05-${frame}`).setDisplaySize(width, height).setDepth(25).setFlipX(direction < 0);
    window.dispatchEvent(new CustomEvent('crownflare:b05-vfx', { detail: { kind: frame, x: Number(x.toFixed(1)), y: Number(y.toFixed(1)), facing: direction } }));
    this.tweens.add({ targets: image, x: x + direction * 10, alpha: 0, scaleX: image.scaleX * 1.08, scaleY: image.scaleY * 1.08, duration: 190, ease: 'Quad.out', onComplete: () => image.destroy() });
  }

  private createB05AuraLayers(): void {
    if (!this.b05Mode || !this.labSprite) return;
    const x = this.body.center.x;
    const y = this.body.bottom - 30;
    this.b05AuraPressure = this.add.image(x, y, `iona-b05-${DAWNRUSH_AURA_FRAME_GROUPS.pressure[0]}`).setDisplaySize(72, 58).setDepth(10).setAlpha(.34);
    this.b05AuraSpeed = this.add.image(x, y, `iona-b05-${DAWNRUSH_AURA_FRAME_GROUPS.speed[0]}`).setDisplaySize(102, 42).setDepth(11).setAlpha(.28).setVisible(false);
    this.b05AuraOrbit = this.add.image(x, y, `iona-b05-${DAWNRUSH_AURA_FRAME_GROUPS.orbit[0]}`).setDisplaySize(92, 64).setDepth(13).setAlpha(.28);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.b05AuraPressure?.destroy(); this.b05AuraOrbit?.destroy(); this.b05AuraSpeed?.destroy(); this.b05FinisherFx?.destroy();
    });
  }

  private updateB05Aura(deltaMs: number): void {
    if (!this.b05AuraPressure || !this.b05AuraOrbit || !this.b05AuraSpeed) return;
    this.b05AuraElapsedMs += deltaMs;
    const enabled = this.dawnrushState === 'dawnrush' && this.b03VfxEnabled && !this.b03ReducedMotion;
    for (const layer of [this.b05AuraPressure, this.b05AuraOrbit, this.b05AuraSpeed]) layer.setVisible(enabled);
    if (!enabled) return;
    const x = this.body.center.x;
    const y = this.body.bottom - 30;
    const phase = Math.floor(this.b05AuraElapsedMs / 116) % 4;
    this.b05AuraPressure.setTexture(`iona-b05-${DAWNRUSH_AURA_FRAME_GROUPS.pressure[phase]}`).setPosition(x, y)
      .setAlpha(this.playerHurtMs > 0 ? .21 : .30 + (phase % 2) * .035);
    this.b05AuraOrbit.setTexture(`iona-b05-${DAWNRUSH_AURA_FRAME_GROUPS.orbit[(phase + 1) % 4]}`).setPosition(x, y)
      .setRotation(Math.sin(this.b05AuraElapsedMs / 760) * .045).setAlpha(.23 + (phase % 2) * .035);
    const movingFast = this.motion.dashMs > 0 || Math.abs(this.body.velocity.x) > 135;
    this.b05AuraSpeed.setVisible(movingFast).setTexture(`iona-b05-${DAWNRUSH_AURA_FRAME_GROUPS.speed[phase]}`)
      .setPosition(x - this.motion.facing * 8, y + 10).setFlipX(this.motion.facing < 0).setAlpha(.25);
  }

  private createB05FinisherFx(facing: IonaFacing): void {
    if (!this.b03VfxEnabled || this.b03ReducedMotion) return;
    this.b05FinisherFx?.destroy();
    this.b05FinisherFxElapsedMs = 0;
    const frame = DAWNRUSH_AURA_FRAME_GROUPS.finisher[0];
    this.b05FinisherFx = this.add.image(this.body.center.x + facing * 34, this.body.bottom - 31, `iona-b05-${frame}`)
      .setDisplaySize(110, 58).setDepth(26).setFlipX(facing < 0);
    window.dispatchEvent(new CustomEvent('crownflare:b05-vfx', { detail: { kind: 'dawnfall-breaker', facing, x: Number(this.b05FinisherFx.x.toFixed(1)), y: Number(this.b05FinisherFx.y.toFixed(1)) } }));
  }

  private updateB05FinisherFx(deltaMs: number): void {
    if (!this.b05FinisherFx?.active) return;
    this.b05FinisherFxElapsedMs += deltaMs;
    const frameIndex = Math.min(3, Math.floor(this.b05FinisherFxElapsedMs / 54));
    this.b05FinisherFx.setTexture(`iona-b05-${DAWNRUSH_AURA_FRAME_GROUPS.finisher[frameIndex]}`)
      .setAlpha(Math.max(.2, 1 - this.b05FinisherFxElapsedMs / 260));
    if (this.b05FinisherFxElapsedMs >= 216) { this.b05FinisherFx.destroy(); this.b05FinisherFx = undefined; }
  }

  private playB05Cue(cue: string): void {
    const key = `b05-${cue}`;
    if (!this.b05Mode || this.sound.locked || !this.cache.audio.exists(key)) return;
    this.sound.play(key, { volume: .58 });
    window.dispatchEvent(new CustomEvent('crownflare:audio-event', { detail: { cue, source: 'original-procedural-wav', scene: 'b05' } }));
  }

  private emitB05State(debugFill = false): void {
    if (!this.b05Mode) return;
    const state = this.dawnrushSnapshot();
    if (state) window.dispatchEvent(new CustomEvent('crownflare:b05-state', { detail: { ...state, debugFill } }));
  }

  dawnrushSnapshot(): { state: string; energy: number; phaseMs: number; move: string; form: 'Base' | 'Dawnrush'; loadedFrames: number; missingFrames: string[]; activeMove: string; finisherCooldownMs: number; finisherReady: boolean; finisherStatus: string; transformReady: boolean } | null {
    if (!this.b05Mode || !this.labSprite) return null;
    const bodyFrames = [...new Set([...DAWNRUSH_LOCOMOTION_FRAMES, ...DAWNRUSH_COMBAT_FRAMES])].flatMap((frame) => ['left', 'right'].map((facing) => `iona-b05-${frame}-${facing}`));
    const expected = [...bodyFrames, ...DAWNRUSH_TRANSFORM_FRAMES.map((frame) => `iona-b05-${frame}`), ...DAWNRUSH_REVERSION_FRAMES.flatMap((frame) => ['left', 'right'].map((facing) => `iona-b05-${frame}-${facing}`)), ...DAWNRUSH_VFX_FRAMES.map((frame) => `iona-b05-${frame}`), ...DAWNRUSH_AURA_FRAMES.map((frame) => `iona-b05-${frame}`)];
    const missingFrames = expected.filter((key) => !this.textures.exists(key));
    const transformReady = canSwitchDawnrushForm({ state: this.dawnrushState, phaseMs: this.dawnrushPhaseMs, playerHp: this.playerHp, hurtMs: this.playerHurtMs, dashMs: this.motion.dashMs, moveActive: !!this.b03Move });
    return { state: this.dawnrushState, energy: Number(this.dawnrushEnergy.toFixed(1)), phaseMs: Number(this.dawnrushPhaseMs.toFixed(1)), move: this.labFrame,
      form: this.dawnrushState === 'base' ? 'Base' : 'Dawnrush', loadedFrames: expected.length - missingFrames.length, missingFrames,
      activeMove: this.activeMoveDefinition?.action.id ?? 'none', finisherCooldownMs: Math.round(this.finisherCooldownMs), finisherReady: this.canStartDawnrushFinisher(), finisherStatus: this.dawnrushFinisherStatus(), transformReady };
  }

  setReducedMotion(enabled: boolean): void { this.b03ReducedMotion = enabled; }

  private dawnrushFinisherStatus(): string {
    if (this.dawnrushState !== 'dawnrush' || this.dawnrushPhaseMs > 0) return 'FORM REQUIRED';
    if (this.finisherCooldownMs > 0) return `COOLDOWN ${(this.finisherCooldownMs / 1000).toFixed(1)}s`;
    if (this.dawnrushEnergy < DAWNRUSH_FINISHER_REQUIREMENTS.energy) return `NEED ${DAWNRUSH_FINISHER_REQUIREMENTS.energy} FORM`;
    if (this.resonance < DAWNRUSH_FINISHER_REQUIREMENTS.resonance) return `NEED ${DAWNRUSH_FINISHER_REQUIREMENTS.resonance} RES`;
    return 'READY';
  }

  private resolveB03CombatEvent(move: B03MoveDefinition, event: CombatEvent): void {
    if (this.b06Mode) { this.resolveB06CombatEvent(move, event); return; }
    if (event.eventId !== 'contact' || this.b03HitTargets.has('spindle-sentry')) return;
    this.b03HitTargets.add('spindle-sentry');
    const result = resolveMoveContact(move, { x:this.body.center.x, footY:this.body.bottom, facing:this.attackFacing }, {
      x:this.targetX, footY:GROUND_TOP + this.enemyAirOffset, width:24, height:42, hp:this.targetHealth,
      alive:this.targetHealth > 0,
    }, this.combatBlockers);
    this.b03LastResult = result.toUpperCase();
    this.lastCombatEvent = `${result.toUpperCase()} / ${move.id} @ ${event.atMs}ms`;
    window.dispatchEvent(new CustomEvent('crownflare:combat-event', { detail:{ ...event, result, targetHealth:this.targetHealth } }));
    if (move.id === 'resonance') this.playCombatTone('resonance-release');
    if (result === 'hit') {
      this.targetHealth = Math.max(0, this.targetHealth - move.damage);
      this.resonance = Math.min(100, this.resonance + (move.id === 'resonance' ? 0 : 7 + move.damage * 2));
      if (this.b05Mode && this.dawnrushState === 'dawnrush') {
        this.dawnrushEnergy = Math.min(100, this.dawnrushEnergy + 8 + move.damage * 2);
        if (move.id === 'finisher') this.createB05FinisherFx(this.attackFacing);
        else this.createB05Fx(move.id === 'resonance' ? 'fx-solar-pressure-wave' : move.id === 'heavy' ? 'fx-impact-star' : move.id === 'air-light' || move.id === 'light-3' ? 'fx-combo-arc' : 'fx-palm-arc', this.targetX, GROUND_TOP - 32, move.id === 'resonance' ? 104 : 78, 50, this.attackFacing);
        this.playB05Cue('impact');
      }
      this.enemyVisualState = move.knockbackY < 0 ? 'stagger' : 'hurt';
      this.enemyHitstunMs = move.knockbackY < 0 ? 280 : 190;
      this.enemyKnockbackX = this.attackFacing * move.knockbackX;
      if (move.knockbackY < 0) this.enemyAirVelocity = move.knockbackY;
      this.hitFlashMs = 100;
      this.combatHitstopMs = Math.max(this.combatHitstopMs, move.hitstopMs);
      this.b03Status = this.targetHealth <= 0 ? 'SENTRY KO / E INTERACT OR R RETRY' : `${move.id.toUpperCase()} HIT / ${move.damage} DAMAGE`;
      if ((move.id === 'heavy' || move.id === 'light-3') && !this.b03ReducedMotion) this.cameras.main.shake(38, .0012);
      if (this.b03Mode) this.controller.requestRumble(move.id === 'heavy' ? .25 : .15);
      const hitCue: IonaB01eAudioCue = move.id === 'light-1' ? 'palm-hit' : move.id === 'light-2' || move.id === 'air-light' ? 'kick-hit' : 'forearm-hit';
      if (!this.b05Mode) this.playB01eCue(hitCue, `b03:${this.activeAudioSequence}:contact`);
      if (move.id === 'heavy') this.playCombatTone('heavy-impact');
      this.createB03Impact(move);
      if (this.targetHealth <= 0) { this.enemyVisualState = 'ko'; this.enemyHitstunMs = 0; this.enemyAirOffset = 0; this.b03BufferedMove = null; }
    } else {
      this.b03Status = result === 'obstructed' ? 'PRESSURE WAVE BLOCKED' : result === 'blocked' ? 'STRIKE GUARDED' : result === 'invulnerable' ? 'TARGET INVULNERABLE' : result === 'ko' ? 'TARGET DOWN' : 'MISS / REPOSITION';
      this.playB01eCue('miss', `b03:${this.activeAudioSequence}:contact`);
      if (move.id === 'resonance') this.createB03SpecialWave(result);
    }
  }

  private resolveB06CombatEvent(move: B03MoveDefinition, event: CombatEvent): void {
    if (event.eventId !== 'contact') return;
    const attacker = { x: this.body.center.x, footY: this.body.bottom, facing: this.attackFacing };
    const targets = this.b06CombatTargets();
    const resolution = resolveB06MoveTargets(move, attacker, targets, this.b03HitTargets, this.combatBlockers);
    for (const id of resolution.hitTargets) this.b03HitTargets.add(id);
    let firstResult: ContactResult = 'miss';
    let firstHit: B06CombatTarget | undefined;
    let hitCount = 0;
    for (const { target, result, guardBreak } of resolution.contacts) {
      if (firstResult === 'miss') firstResult = result;
      if (result === 'hit') {
        hitCount += 1;
        firstHit ??= target;
        if (this.b05Mode && this.dawnrushState === 'dawnrush' && hitCount === 1) {
          this.dawnrushEnergy = Math.min(100, this.dawnrushEnergy + 8 + move.damage * 2);
          if (move.id === 'finisher') this.createB05FinisherFx(this.attackFacing);
          else this.createB05Fx(move.id === 'resonance' ? 'fx-solar-pressure-wave' : move.id === 'heavy' ? 'fx-impact-star' : move.id === 'air-light' || move.id === 'light-3' ? 'fx-combo-arc' : 'fx-palm-arc', target.x, target.y, move.id === 'resonance' ? 104 : 78, 50, this.attackFacing);
          this.playB05Cue('impact');
        }
        this.combatHitstopMs = Math.max(this.combatHitstopMs, move.hitstopMs);
        if ((move.id === 'heavy' || move.id === 'light-3') && !this.b03ReducedMotion) this.cameras.main.shake(38, .0012);
        this.controller.requestRumble(move.id === 'heavy' ? .25 : .15);
      }
      this.onB06ContactResult(target, result, move, { ...event, targetId: target.id }, guardBreak);
      window.dispatchEvent(new CustomEvent('crownflare:b06-combat-event', { detail: { ...event, targetId: target.id, archetype: target.archetype ?? 'unknown', result, damage: result === 'hit' ? move.damage : 0, guardBreak } }));
      this.lastCombatEvent = `${result.toUpperCase()} / ${move.id} → ${target.id} @ ${event.atMs}ms`;
    }
    if (hitCount > 0) {
      this.resonance = Math.min(100, this.resonance + (move.id === 'resonance' ? 0 : 7 + move.damage * 2));
      if (move.id === 'resonance') this.playCombatTone('resonance-release');
      this.b03Status = `${move.id.toUpperCase()} / ${hitCount} ${hitCount === 1 ? 'HIT' : 'HITS'}`;
      this.b03LastResult = 'HIT';
      if (!this.b05Mode) {
        const hitCue: IonaB01eAudioCue = move.id === 'light-1' ? 'palm-hit' : move.id === 'light-2' || move.id === 'air-light' ? 'kick-hit' : 'forearm-hit';
        this.playB01eCue(hitCue, `b06:${this.activeAudioSequence}:contact`);
      }
      if (move.id === 'heavy') this.playCombatTone('heavy-impact');
    } else {
      this.b03LastResult = firstResult.toUpperCase();
      this.b03Status = firstResult === 'obstructed' ? 'PRESSURE WAVE BLOCKED' : firstResult === 'blocked' ? 'BASTION SHIELD HOLDS / BREAK ITS GUARD' : firstResult === 'invulnerable' ? 'TARGET INTERRUPT WINDOW' : 'MISS / REPOSITION';
      this.playB01eCue('miss', `b06:${this.activeAudioSequence}:contact`);
    }
    if (targets.length === 0) {
      this.lastCombatEvent = `MISS / ${move.id} / NO ACTIVE TARGETS @ ${event.atMs}ms`;
      window.dispatchEvent(new CustomEvent('crownflare:b06-combat-event', { detail: { ...event, result: 'miss', targetId: null, damage: 0 } }));
    }
    if (firstHit && move.id === 'resonance' && this.b05Mode && this.dawnrushState === 'base') this.createB03SpecialWave('hit');
  }

  private updateB03Enemy(deltaMs: number): void {
    if (this.targetHealth <= 0) { this.enemyVisualState = 'ko'; this.enemyHitstunMs = 0; return; }
    const dt = deltaMs / 1000;
    if (this.enemyAirOffset < 0 || this.enemyAirVelocity < 0) {
      this.enemyAirVelocity += 760 * dt;
      this.enemyAirOffset += this.enemyAirVelocity * dt;
      if (this.enemyAirOffset >= 0) { this.enemyAirOffset = 0; this.enemyAirVelocity = 0; }
    }
    if (this.enemyHitstunMs > 0) {
      this.enemyHitstunMs = Math.max(0, this.enemyHitstunMs - deltaMs);
      this.targetX = Phaser.Math.Clamp(this.targetX + this.enemyKnockbackX * dt, 120, WORLD_WIDTH - 70);
      if (this.enemyHitstunMs === 0) { this.enemyKnockbackX = 0; this.enemyVisualState = 'idle'; this.enemyTimerMs = 0; }
      return;
    }
    const playerX = this.body.center.x;
    const towardPlayer = playerX - this.targetX;
    const attackDirectionLocked = this.b04Mode && (this.enemyVisualState === 'telegraph' || this.enemyVisualState === 'lunge');
    if (!attackDirectionLocked) this.enemyFacing = towardPlayer < 0 ? -1 : 1;
    // B04 traversal stays safe until Iona enters the encounter. Once awake, the inherited B03 telegraph/lunge clock is unchanged.
    if (this.b04Mode && this.enemyVisualState === 'idle' && Math.abs(towardPlayer) > B04_SENTINEL_WAKE_DISTANCE) {
      this.enemyTimerMs = 0;
      return;
    }
    if (this.enemyVisualState === 'telegraph') {
      this.enemyTimerMs += deltaMs;
      if (this.enemyTimerMs >= 440) { this.enemyVisualState = 'lunge'; this.enemyTimerMs = 0; this.enemyAttackHit = false; }
      return;
    }
    if (this.enemyVisualState === 'lunge') {
      this.targetX = Phaser.Math.Clamp(this.targetX + this.enemyFacing * 200 * dt, 120, WORLD_WIDTH - 70);
      this.enemyTimerMs += deltaMs;
      if (this.enemyTimerMs >= 88 && !this.enemyAttackHit) { this.enemyAttackHit = true; this.resolveB03EnemyAttack(); }
      if (this.enemyTimerMs >= 200) { this.enemyVisualState = 'idle'; this.enemyTimerMs = 0; }
      return;
    }
    if (this.enemyVisualState === 'idle' && this.enemyTimerMs < 440) this.enemyVisualState = 'idle';
    const distance = Math.abs(playerX - this.targetX);
    if (distance > 82) {
      this.enemyVisualState = 'idle';
      this.targetX = Phaser.Math.Clamp(this.targetX + Math.sign(towardPlayer) * 48 * dt, 120, WORLD_WIDTH - 70);
      this.enemyTimerMs = 0;
    } else {
      this.enemyTimerMs += deltaMs;
      if (this.enemyTimerMs >= 500) {
        this.enemyVisualState = 'telegraph';
        this.enemyTimerMs = 0;
        this.b03Status = 'SENTRY TELEGRAPH / SHIFT DODGE';
        this.playCombatTone('telegraph');
      }
    }
  }

  private resolveB03EnemyAttack(): void {
    const left = this.enemyFacing > 0 ? this.targetX + 3 : this.targetX - 35;
    const attack: CombatRect = { left, right:left + 32, top:GROUND_TOP - 33 + this.enemyAirOffset, bottom:GROUND_TOP - 7 + this.enemyAirOffset };
    const player = combatantRect({ x:this.body.center.x, footY:this.body.bottom, width:this.body.width, height:this.body.height, hp:this.playerHp });
    if (isBlockedByRect(this.targetX, this.body.center.x, attack, this.combatBlockers)) { this.b03Status = 'SENTRY LUNGE BLOCKED'; return; }
    if (!overlaps(attack, player)) { this.b03Status = 'SENTRY LUNGE MISSED'; return; }
    if (this.dashInvulnerabilityMs > 0) {
      this.resonance = Math.min(100, this.resonance + 6);
      this.b03Status = 'DODGED / +6 RESONANCE';
      this.playCombatTone('dodge');
      this.controller.requestRumble(.1, 32);
      return;
    }
    if (this.playerInvulnerableMs > 0) { this.b03Status = 'HURT WINDOW / NO DAMAGE'; return; }
    this.playerHp = Math.max(0, this.playerHp - 1);
    this.playerHurtMs = this.playerHp <= 0 ? 999999 : 430;
    this.playerInvulnerableMs = 700;
    this.body.setVelocityX(-this.enemyFacing * 82);
    this.b03Status = this.playerHp <= 0 ? 'IONA DOWN / E INTERACT OR R RETRY' : `IONA HIT / ${this.playerHp} HP`;
    if (this.b05Mode && this.dawnrushState !== 'base') this.playB05Cue('dawnrush-hurt');
    else this.playCombatTone(this.playerHp <= 0 ? 'ko' : 'hurt');
    if (this.playerHp <= 0) {
      this.b03Move = null;
      this.activeMoveDefinition = null;
      this.b03BufferedMove = null;
      this.attackClock = idleClock;
    }
    this.controller.requestRumble(this.playerHp <= 0 ? .25 : .16);
    window.dispatchEvent(new CustomEvent('crownflare:player-damage', { detail:{ hp:this.playerHp, source:'spindle-sentry-lunge' } }));
  }

  private createB03Impact(move: typeof B03_MOVES[B03MoveId]): void {
    if (!this.b03VfxEnabled || this.b04Mode) return;
    if (move.id === 'resonance') { this.createB03SpecialWave('hit'); return; }
    const burst = this.add.graphics().setDepth(24).setPosition(this.targetX, GROUND_TOP - 22 + this.enemyAirOffset);
    const color = move.id === 'heavy' || move.id === 'light-3' ? 0xffbf91 : 0xb5f4e2;
    burst.lineStyle(2, color, .95).lineBetween(-6,0,6,0).lineBetween(0,-6,0,6);
    burst.lineStyle(1, 0xfff2d2, .8).lineBetween(-4,-3,4,3).lineBetween(-4,3,4,-3);
    this.tweens.add({ targets:burst, alpha:0, scale:1.4, duration:120, onComplete:()=>burst.destroy() });
  }

  private createB03SpecialWave(result: string): void {
    if (!this.b03VfxEnabled) return;
    this.specialVfx?.destroy();
    this.specialVfxElapsed = 0;
    this.specialVfxFacing = this.attackFacing;
    const startX = this.body.center.x + this.attackFacing * 14;
    this.specialVfxDistance = Math.min(68, Math.max(20, Math.abs(this.targetX - startX)));
    if (result === 'obstructed') this.specialVfxDistance = Math.min(this.specialVfxDistance, 28);
    this.specialVfx = this.add.image(startX, this.body.center.y - 10, `iona-b03-${IONA_B03_VFX_FRAMES[0]}`).setDepth(22).setFlipX(this.attackFacing < 0);
  }

  private updateB03Vfx(deltaMs: number): void {
    if (!this.specialVfx) return;
    this.specialVfxElapsed += deltaMs;
    const frame = Math.min(3, Math.floor(this.specialVfxElapsed / 42));
    this.specialVfx.setTexture(`iona-b03-${IONA_B03_VFX_FRAMES[frame]}`);
    this.specialVfx.x += this.specialVfxFacing * this.specialVfxDistance * (deltaMs / 210);
    this.specialVfx.setAlpha(Math.max(.25, 1 - this.specialVfxElapsed / 210));
    if (this.specialVfxElapsed >= 210) { this.specialVfx.destroy(); this.specialVfx = undefined; }
  }

  private playCombatTone(kind: 'telegraph' | 'hurt' | 'ko' | 'dodge' | 'heavy-charge' | 'heavy-impact' | 'air-swing' | 'resonance-charge' | 'resonance-release'): void {
    const AudioCtor = window.AudioContext;
    if (!AudioCtor || this.labAudioPaused || !this.labAudioEnabled) return;
    this.impactAudio ??= new AudioCtor();
    const context = this.impactAudio;
    if (context.state === 'suspended') void context.resume();
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = ({ telegraph:380, dodge:620, ko:90, hurt:180, 'heavy-charge':124, 'heavy-impact':82, 'air-swing':460, 'resonance-charge':236, 'resonance-release':318 } as const)[kind];
    const duration = kind === 'telegraph' || kind === 'resonance-charge' ? .13 : kind === 'heavy-charge' ? .16 : kind === 'resonance-release' ? .19 : .095;
    const peak = kind === 'telegraph' ? .035 : kind === 'resonance-charge' || kind === 'resonance-release' ? .045 : .065;
    oscillator.type = kind === 'telegraph' || kind.startsWith('resonance-') ? 'sine' : kind === 'air-swing' ? 'triangle' : 'triangle';
    oscillator.frequency.setValueAtTime(start, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(48, start * (kind === 'resonance-release' ? .32 : .45)), now + duration);
    gain.gain.setValueAtTime(peak, now);
    gain.gain.exponentialRampToValueAtTime(.001, now + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + .005);
    window.dispatchEvent(new CustomEvent('crownflare:audio-event', { detail:{ cue:`b03-${kind}`, token:`b03:${this.audioSequence}:${kind}`, volume:1, source:'procedural-web-audio' } }));
  }

  private drawB03Debug(): void {
    this.b03DebugGraphic ??= this.add.graphics().setDepth(50);
    this.b03DebugGraphic.clear();
    if (this.b03Move) {
      const move = this.activeMoveDefinition ?? this.moveDefinition(this.b03Move);
      const box = moveHitbox(move, this.body.center.x, this.body.bottom, this.attackFacing);
      this.b03DebugGraphic.lineStyle(1, 0x9cf0d8, .95).strokeRect(box.left, box.top, box.right - box.left, box.bottom - box.top);
    }
    this.b03DebugGraphic.lineStyle(1, 0xffb38a, .95).strokeRect(this.targetX - 12, GROUND_TOP + this.enemyAirOffset - 42, 24, 42);
    this.b03DebugLabel ??= this.add.text(6, 54, '', { fontFamily:'monospace', fontSize:'5px', color:'#baf5e7', backgroundColor:'#08131ddd', padding:{ x:3, y:2 } }).setScrollFactor(0).setDepth(51);
    const move = this.b03Move ?? 'none';
    this.b03DebugLabel.setText(`MOVE ${move} / PHASE ${this.attackClock.phase} / POSE ${this.labFrame} / RESULT ${this.b03LastResult}`);
  }

  protected resetB03Encounter(): void {
    this.attackClock = idleClock;
    this.attackComboIndex = 0;
    this.attackBufferMs = 0;
    this.b03Move = null;
    this.activeMoveDefinition = null;
    this.b03BufferedMove = null;
      this.b03InputQueue = { jump:false, light:false, heavy:false, dash:false, special:false, interact:false, transform:false, finisher:false };
    this.b03HitTargets.clear();
    this.targetHealth = this.enemyMaxHp;
    this.targetX = 285;
    this.enemyVisualState = 'idle';
    this.enemyFacing = -1;
    this.enemyTimerMs = 0;
    this.enemyAttackHit = false;
    this.enemyHitstunMs = 0;
    this.enemyKnockbackX = 0;
    this.enemyAirOffset = 0;
    this.enemyAirVelocity = 0;
    this.playerHp = this.playerMaxHp;
    this.resonance = 55;
    this.dawnrushState = 'base';
    this.dawnrushPhaseMs = 0;
    this.dawnrushEnergy = 70;
    this.dawnrushLocomotionElapsed = 0;
    this.dawnrushActivationMode = 'showcase';
    this.dawnrushShowcaseUsed = false;
    this.dawnrushTransformBufferMs = 0;
    this.dawnrushRecoveryMs = 0;
    this.finisherCooldownMs = 0;
    this.specialCooldownMs = 0;
    this.playerHurtMs = 0;
    this.playerInvulnerableMs = 0;
    this.dashInvulnerabilityMs = 0;
    this.combatHitstopMs = 0;
    this.motion = initialMoveState();
    this.wasGrounded = true;
    this.wasMoving = false;
    this.b03FixedAccumulator = 0;
    this.attackFacing = 1;
    this.body.setVelocity(0, 0);
    this.actor.setPosition(80, GROUND_TOP - 15);
    this.body.reset(80, GROUND_TOP - 15);
    this.playerPresentation.present({ textureKey:ionaB01EAssetKey('idle-0','right'),x:80,footY:GROUND_TOP });
    this.specialVfx?.destroy();
    this.specialVfx = undefined;
    this.b05FinisherFx?.destroy();
    this.b05FinisherFx = undefined;
    this.b03Status = 'ENCOUNTER RESET / MOVE INTO RANGE';
    this.b03LastResult = 'RESET';
    if (!this.b07Mode) this.drawTrainingTarget();
    this.controller?.resetTransientState();
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
        this.beginLabComboStep(0);
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
        this.beginLabComboStep(this.attackComboIndex);
      }else if(this.attackBufferMs===0||this.attackComboIndex>=2){
        this.attackBufferMs=0;
        this.attackComboIndex=0;
      }
    }
  }

  private beginLabComboStep(index: number): void {
    const action=B01C_COMBO_ACTIONS[index]!;
    this.attackClock=beginAction(action);
    if(this.b01eRuntime){
      this.activeAudioSequence=++this.audioSequence;
      const cue=ionaB01eWhooshForMove(action.moveId??'');
      if(cue)this.playB01eCue(cue,`combat:${this.activeAudioSequence}:whoosh`);
    }
  }

  private resolveCombatEvent(event: CombatEvent): void {
    const isExtendedCombo=(this.b01cMode||this.b01dMode||this.b01eRuntime)&&B01C_COMBO_ACTIONS.some((action)=>action.moveId===event.moveId);
    if (event.eventId!=='contact' || (event.moveId!=='iona-base-jab'&&!isExtendedCombo) || event.sourceId!=='iona-player' || event.targetId!=='training-dummy') return;
    const offset=this.targetX-this.actor.x;
    const facing=isExtendedCombo?this.attackFacing:this.motion.facing;
    const hit=Math.abs(offset)<=42 && Math.sign(offset)===facing && this.targetHealth>0;
    if (hit) {
      this.targetHealth=Math.max(0,this.targetHealth-1);
      if((!this.b01dMode&&!this.b01eRuntime)||this.labVfxEnabled){
        this.hitFlashMs=90;
        const burst=this.add.graphics().setDepth(24).setPosition(this.targetX,GROUND_TOP-21);
        burst.lineStyle(2,0xffd890,1).lineBetween(-7,0,7,0).lineBetween(0,-7,0,7).lineBetween(-5,-5,5,5).lineBetween(-5,5,5,-5);
        this.tweens.add({targets:burst,alpha:0,scale:1.8,duration:150,onComplete:()=>burst.destroy()});
      }
      if(!this.b01dMode&&!this.b01eRuntime)this.playImpactSound();
      this.lastCombatEvent='HIT / '+event.moveId+' -> '+event.targetId;
    } else this.lastCombatEvent='MISS / '+event.moveId+' -> '+event.targetId;
    if(this.b01eRuntime)this.playB01eCue(ionaB01eResolutionCue(event.moveId??'',hit?'hit':'miss'),`combat:${this.activeAudioSequence}:contact`);
    window.dispatchEvent(new CustomEvent('crownflare:combat-event',{detail:{...event,result:hit?'hit':'miss',targetHealth:this.targetHealth}}));
  }

  private unlockLabAudio(): void {
    if(!this.b01eRuntime)return;
    if(this.sound.locked)this.sound.unlock();
  }

  private audioStatus(): string {
    if(!this.labAudioEnabled)return 'MUTED';
    if(this.labAudioPaused)return 'PAUSED';
    return this.sound.locked?'CLICK/KEY':'ON';
  }

  private playB01eCue(cue: IonaB01eAudioCue, token?: string): void {
    if(!this.b01eRuntime)return;
    if(!this.labAudioEnabled){this.lastAudioCue=`MUTED:${cue}`;return;}
    if(this.labAudioPaused){this.lastAudioCue=`PAUSED:${cue}`;return;}
    if(this.sound.locked){this.lastAudioCue=`LOCKED:${cue}`;return;}
    if(!this.cache.audio.exists(cue)){this.lastAudioCue=`MISSING:${cue}`;return;}
    const eventToken=token??`local:${++this.audioSequence}`;
    if(!this.audioGate.accept(eventToken))return;
    if(this.sound.play(cue,{volume:.82})){
      this.lastAudioCue=cue;
      window.dispatchEvent(new CustomEvent('crownflare:audio-event',{detail:{cue,token:eventToken,volume:this.labAudioVolume}}));
    }else this.lastAudioCue=`BLOCKED:${cue}`;
  }

  setLabAudioPaused(paused: boolean): void {
    if(!this.b01eRuntime)return;
    this.labAudioPaused=paused;
    if(paused)this.sound.stopAll();
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
    else if (this.b03Mode) this.updateB03Animation(grounded,moving,deltaMs);
    else if (this.b01cMode||this.b01dMode||this.b01eRuntime) this.updateB01CAnimation(grounded,moving,deltaMs);
    else this.updateRecoveryAnimation(grounded,moving,deltaMs);
  }

  private selectedLabCandidate(): 'b01c'|'b01d'|'b01e' {
    if(this.previewMode)return 'b01e';
    if(this.b01eMode)return this.labCompareCandidate;
    if(this.b01dMode)return this.labCompareB01c?'b01c':'b01d';
    return 'b01c';
  }

  private candidateAssetKey(id:string,facing:'left'|'right'):string {
    const candidate=this.selectedLabCandidate();
    return candidate==='b01c'?ionaB01CAssetKey(id,facing):candidate==='b01d'?ionaB01DAssetKey(id,facing):ionaB01EAssetKey(id,facing);
  }

  private updateB03Animation(grounded: boolean, moving: boolean, deltaMs: number): void {
    const sprite = this.labSprite;
    if (!sprite) return;
    const facing = this.motion.facing < 0 ? 'left' : 'right';
    if (this.b05Mode && this.dawnrushState !== 'base') {
      let textureKey: string;
      let frame: string;
      let authoredFacing = false;
      if (this.playerHp <= 0) {
        frame = 'hurt-ko';
        textureKey = `iona-b05-${frame}-${facing}`;
        authoredFacing = true;
      } else if (this.playerHurtMs > 0) {
        frame = Math.abs(this.body.velocity.x) > 145 ? 'hurt-stagger' : 'hurt-flinch';
        textureKey = `iona-b05-${frame}-${facing}`;
        authoredFacing = true;
      } else if (this.dawnrushState === 'reverting-contract' || this.dawnrushState === 'reverting-release' || this.dawnrushState === 'reverting-handoff') {
        frame = this.dawnrushState === 'reverting-contract' ? 'revert-contract' : this.dawnrushState === 'reverting-release' ? 'revert-release' : 'revert-handoff';
        textureKey = `iona-b05-${frame}-${facing}`;
        authoredFacing = true;
      } else if (this.dawnrushState === 'anticipation' || this.dawnrushState === 'ignition' || this.dawnrushState === 'silhouette') {
        const transformIndex = this.dawnrushState === 'anticipation' ? 0 : this.dawnrushState === 'ignition' ? 1 : 2;
        frame = DAWNRUSH_TRANSFORM_FRAMES[transformIndex]!;
        textureKey = `iona-b05-${frame}`;
      } else if (this.dawnrushPhaseMs > 0) {
        frame = 'transform-ready';
        textureKey = 'iona-b05-transform-ready';
      } else if (this.b03Move && this.attackClock.phase !== 'idle') {
        const phase = this.attackClock.phase === 'startup' ? 'startup' : this.attackClock.phase === 'active' ? 'active' : 'recovery';
        frame = dawnrushMoveFrame(this.b03Move, phase, this.attackClock.elapsedMs);
        const attackFacing = this.attackFacing < 0 ? 'left' : 'right';
        textureKey = `iona-b05-${frame}-${attackFacing}`;
        authoredFacing = true;
      } else if (this.dawnrushRecoveryMs > 0) {
        frame = 'hurt-recovery';
        textureKey = `iona-b05-${frame}-${facing}`;
        authoredFacing = true;
      } else {
        if (grounded && !this.wasGrounded) this.landingMs = 110;
        else this.landingMs = Math.max(0, this.landingMs - deltaMs);
        this.startMs = Math.max(0, this.startMs - deltaMs);
        this.stopMs = Math.max(0, this.stopMs - deltaMs);
        this.turnMs = Math.max(0, this.turnMs - deltaMs);
        this.dashRecoverMs = Math.max(0, this.dashRecoverMs - deltaMs);
        this.jumpTakeoffMs = Math.max(0, this.jumpTakeoffMs - deltaMs);
        let state: 'idle' | 'run' | 'start' | 'turn' | 'rise' | 'apex' | 'fall' | 'land' | 'dash' | 'dash-recovery';
        if (this.motion.dashMs > 0) state = 'dash';
        else if (!grounded) state = this.jumpTakeoffMs > 0 || this.body.velocity.y < -130 ? 'rise' : this.body.velocity.y < 45 ? 'apex' : 'fall';
        else if (this.landingMs > 0) state = 'land';
        else if (this.dashRecoverMs > 0) state = 'dash-recovery';
        else if (this.turnMs > 0) state = 'turn';
        else if (moving && this.startMs > 0) state = 'start';
        else state = moving ? 'run' : 'idle';
        this.dawnrushLocomotionElapsed += deltaMs;
        frame = dawnrushLocomotionFrame(state, this.dawnrushLocomotionElapsed);
        textureKey = `iona-b05-${frame}-${facing}`;
      }
      sprite.anims.stop();
      this.labClipKey = '';
      sprite.setFlipX(!authoredFacing && facing === 'left');
      this.labMode = this.b03Move && this.attackClock.phase !== 'idle' ? 'attack' : 'idle';
      this.labFrame = frame;
      this.playerPresentation.present({ textureKey, x: this.body.center.x, footY: this.body.bottom });
      return;
    }
    let textureKey: string;
    let frame: string;
    let mode: IonaLocomotion | 'attack' = 'attack';
    sprite.setFlipX(false);
    if (this.playerHp <= 0 || this.playerHurtMs > 0) {
      frame = this.playerHp <= 0 ? 'hurt-ko' : this.playerHurtMs > 240 ? 'hurt-flinch' : 'hurt-stagger';
      textureKey = ionaB03PoseTexture(frame as IonaB03Pose, facing);
      sprite.anims.stop();
      this.labClipKey = '';
    } else if (this.b03Move && this.attackClock.phase !== 'idle') {
      const phase = this.attackClock.phase === 'startup' ? 'startup' : this.attackClock.phase === 'active' ? 'contact' : 'recovery';
      frame = (this.activeMoveDefinition ?? B03_MOVES[this.b03Move]).animation[phase];
      const attackFacing = this.attackFacing < 0 ? 'left' : 'right';
      textureKey = this.b03Move.startsWith('light-')
        ? ionaB01EAssetKey(frame, attackFacing)
        : ionaB03PoseTexture(frame as IonaB03Pose, attackFacing);
      sprite.anims.stop();
      this.labClipKey = '';
    } else {
      if (grounded && !this.wasGrounded) this.landingMs = 110;
      else this.landingMs = Math.max(0, this.landingMs - deltaMs);
      this.startMs = Math.max(0, this.startMs - deltaMs);
      this.stopMs = Math.max(0, this.stopMs - deltaMs);
      this.turnMs = Math.max(0, this.turnMs - deltaMs);
      this.dashRecoverMs = Math.max(0, this.dashRecoverMs - deltaMs);
      this.jumpTakeoffMs = Math.max(0, this.jumpTakeoffMs - deltaMs);
      let clip: string;
      if (this.motion.dashMs > 0) { mode = 'dash'; clip = `dash-${facing}`; }
      else if (!grounded) {
        if (this.jumpTakeoffMs > 0 || this.body.velocity.y < -130) { mode = 'jumpRise'; clip = `jump-rise-${facing}`; }
        else if (this.body.velocity.y < 45) { mode = 'jumpApex'; clip = `jump-apex-${facing}`; }
        else { mode = 'fall'; clip = `jump-fall-${facing}`; }
      } else if (this.landingMs > 0) { mode = 'land'; clip = `jump-land-${facing}`; }
      else if (this.dashRecoverMs > 0) { mode = 'dashRecover'; clip = `dash-recover-${facing}`; }
      else if (this.turnMs > 0) { mode = 'turn'; clip = this.turnFromFacing > 0 ? 'turn-right-to-left' : 'turn-left-to-right'; }
      else if (moving && this.startMs > 0) { mode = 'start'; clip = `start-${facing}`; }
      else if (moving) { mode = 'run'; clip = `run-${facing}`; }
      else if (this.stopMs > 0) { mode = 'stop'; clip = `stop-${facing}`; }
      else { mode = 'idle'; clip = `idle-${facing}`; }
      const clipKey = ionaB01EAnimationKey(clip);
      if (this.labClipKey !== clipKey) { sprite.play(clipKey); this.labClipKey = clipKey; }
      textureKey = sprite.texture.key;
      frame = textureKey.match(/^iona-b01e-(.*)-(left|right)$/)?.[1] ?? clip;
      if (mode !== 'run') this.lastFootfallFrame = '';
      else if (isIonaRunContactFrame(frame) && frame !== this.lastFootfallFrame) {
        this.playB01eCue(this.footfallSide === 0 ? 'step-a' : 'step-b');
        this.footfallSide = this.footfallSide === 0 ? 1 : 0;
        this.lastFootfallFrame = frame;
      }
    }
    this.labMode = mode;
    this.labFrame = frame;
    this.playerPresentation.present({ textureKey, x: this.body.center.x, footY: this.body.bottom });
  }

  private updateB01CAnimation(grounded: boolean, moving: boolean, deltaMs: number): void {
    const sprite=this.labSprite;
    if(!sprite)return;
    const candidate=this.selectedLabCandidate();
    if(grounded&&!this.wasGrounded)this.landingMs=110;
    else this.landingMs=Math.max(0,this.landingMs-deltaMs);
    this.startMs=Math.max(0,this.startMs-deltaMs);
    this.stopMs=Math.max(0,this.stopMs-deltaMs);
    this.turnMs=Math.max(0,this.turnMs-deltaMs);
    this.dashRecoverMs=Math.max(0,this.dashRecoverMs-deltaMs);
    this.jumpTakeoffMs=Math.max(0,this.jumpTakeoffMs-deltaMs);

    let next:IonaLocomotion|'attack';
    let clip:string;
    let textureKey:string|undefined;
    if(this.attackClock.phase!=='idle'){
      next='attack';
      const phase=this.attackClock.phase==='startup'?'windup':this.attackClock.phase==='active'?'contact':'recovery';
      let frame=`combo-${this.attackComboIndex+1}-${phase}`;
      if(this.b01eRuntime&&candidate==='b01e'&&this.attackComboIndex===1&&phase==='windup'&&this.attackClock.elapsedMs>=55)frame='combo-2-windup-1';
      const facing=this.attackFacing<0?'left':'right';
      const key=this.candidateAssetKey(frame,facing);
      sprite.anims.stop();
      this.labClipKey='';
      textureKey=key;
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
      const clipKey=candidate==='b01c'?ionaB01CAnimationKey(clip):candidate==='b01d'?ionaB01DAnimationKey(clip):ionaB01EAnimationKey(clip);
      if(this.labClipKey!==clipKey){
        sprite.play(clipKey);
        this.labClipKey=clipKey;
      }
      const frameMatch=sprite.texture.key.match(/^iona-b01[cde]-(.*)-(left|right)$/);
      this.labFrame=frameMatch?.[1]??this.labFrame;
      if(this.b01eRuntime&&candidate==='b01e'&&next==='run'&&isIonaRunContactFrame(this.labFrame)&&this.labFrame!==this.lastFootfallFrame){
        this.playB01eCue(this.footfallSide===0?'step-a':'step-b');
        this.footfallSide=this.footfallSide===0?1:0;
      }
      if(next!=='run')this.lastFootfallFrame='';
      else this.lastFootfallFrame=this.labFrame;
    }
    this.labMode=next;
    this.playerPresentation.present({textureKey,x:this.body.center.x,footY:this.body.bottom});
  }

  private getLabFrameBounds(): readonly number[] {
    const sprite=this.labSprite;
    const match=sprite?.texture.key.match(/^iona-b01[cde]-(.*)-(left|right)$/);
    if(!match)return [0,0,128,80];
    const side=match[2] as 'left'|'right';
    const candidate=this.selectedLabCandidate();
    return candidate==='b01e'?ionaB01EFrameBounds(match[1]!,side):ionaCandidateFrameBounds(candidate,match[1]!,side);
  }

  private getLabVisibleHeightPx(): number {
    if((!this.b01dMode&&!this.b01eMode&&!this.previewMode)||!this.labSprite)return this.labSprite?.displayHeight??0;
    const bounds=this.getLabFrameBounds();
    return (bounds[3]!-bounds[1]!)*this.labSprite.scaleY;
  }

  private drawAnimationDiagnostics(): void {
    const graphics=this.labDiagnosticsGraphic;
    const sprite=this.labSprite;
    if(!graphics)return;
    graphics.clear();
    if((!this.b02Diagnostics&&((!this.b01dMode&&!this.b01eMode)||!this.labDiagnosticsVisible))||!sprite)return;

    const scale=sprite.scaleX;
    const bounds=this.getLabFrameBounds();
    const frameLeft=sprite.x-64*scale;
    const frameTop=sprite.y-80*scale;
    graphics.lineStyle(1,0x67e0c7,.95).strokeRect(this.body.x,this.body.y,this.body.width,this.body.height);
    graphics.lineStyle(1,0x67e0c7,.95).lineBetween(this.body.left-8,this.body.bottom,this.body.right+8,this.body.bottom);
    graphics.lineStyle(1,0xf4c06c,.8).strokeRect(frameLeft,frameTop,128*scale,80*scale);
    graphics.lineStyle(1,0xff73b8,.95).strokeRect(frameLeft+bounds[0]!*scale,frameTop+bounds[1]!*scale,(bounds[2]!-bounds[0]!)*scale,(bounds[3]!-bounds[1]!)*scale);
    graphics.lineBetween(sprite.x-4,sprite.y,sprite.x+4,sprite.y);
    graphics.lineBetween(sprite.x,sprite.y-4,sprite.x,sprite.y+4);
    if(this.b02Diagnostics)this.labDiagnosticLabel?.setText(`REF ${this.playerPresentation.selectedReviewSize}px / SCALE ${scale.toFixed(3)} / BODY 15x30`).setPosition(sprite.x,Math.max(8,frameTop-2));
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
    this.playerPresentation.present({textureKey:animationAssetKey(frame,this.motion.facing),x:this.body.center.x,footY:this.body.bottom});
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
    this.playerPresentation.present({textureKey:recoveryAssetKey(frame,this.motion.facing),x:this.body.center.x,footY:this.body.bottom});
  }

  private createAnimationReview(): void {
    const addPanel=(x:number,y:number,w:number,h:number):void=>{
      const bg=this.add.rectangle(x,y,w,h,0x0b1220,1).setStrokeStyle(1,0xa9cdbf,.9).setScrollFactor(0).setDepth(49);
      this.labReviewPanel=bg;
      this.labReviewObjects.push(bg);
    };
    if(this.b01dMode||this.b01eMode){
      addPanel(240,135,464,230);
      const title=this.add.text(240,22,this.b01eMode?'B01C ↔ B01D ↔ B01E / SIDE-KICK + RUN COMPARISON':'B01C → B01D / RUN LOOP COMPARISON',{fontFamily:'monospace',fontSize:'7px',color:'#ffe0ba',align:'center'}).setOrigin(.5,0).setScrollFactor(0).setDepth(55);
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
      if(this.b01eMode){
        const contactTitle=this.add.text(240,149,'SIDE-KICK CONTACT / MATCHED 60PX GLOBAL SCALE',{fontFamily:'monospace',fontSize:'5px',color:'#e9eee5',align:'center'}).setOrigin(.5,0).setScrollFactor(0).setDepth(55);
        this.labReviewObjects.push(contactTitle);
        const columns=[
          {version:'C',key:(facing:'left'|'right')=>ionaB01CAssetKey('combo-2-contact',facing)},
          {version:'D',key:(facing:'left'|'right')=>ionaB01DAssetKey('combo-2-contact',facing)},
          {version:'E',key:(facing:'left'|'right')=>ionaB01EAssetKey('combo-2-contact',facing)},
        ];
        for(const [row,facing] of (['left','right'] as const).entries()){
          for(const [column,version] of columns.entries()){
            const x=100+column*140;
            const label=this.add.text(x,row===0?159:203,`${version.version} / ${facing.toUpperCase()}`,{fontFamily:'monospace',fontSize:'5px',color:'#e9eee5',align:'center'}).setOrigin(.5,0).setScrollFactor(0).setDepth(55);
            const image=this.add.image(x,row===0?197:241,version.key(facing)).setOrigin(.5,1).setScale(.5).setScrollFactor(0).setDepth(52);
            this.labReviewObjects.push(image,label);
          }
        }
      }else{
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
