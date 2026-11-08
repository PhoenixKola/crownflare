import * as Phaser from 'phaser';
import { combatantRect, isBlockedByRect, overlaps, type B03MoveDefinition, type CombatRect, type ContactResult } from '../combat/b03Moves';
import {
  applyB06EnemyContact, b06EnemyIsGuarding, B06_ENEMY_PROFILES, createB06Director, createB06Enemy,
  spawnB06Projectile, stepB06Director,
  type B06Archetype, type B06DirectorEvent, type B06DirectorState, type B06EnemyRuntime,
} from '../enemies/b06EnemyModel';
import { B07_CHOICE_OPTIONS, advanceB07Room, chooseB07Route, collectB07Reward, currentB07Choice, initialB07Route, instantiateB07Room } from '../rooms/b07RouteAssembly';
import { B07_ROOM_BY_ID, enemyWorldForRoom } from '../rooms/b07RoomLibrary';
import { stepB07Hazard, type B07HazardFrame } from '../rooms/b07Hazards';
import type { B07BranchChoice, B07ChoiceId, B07HazardDefinition, B07RoomTemplate, B07RouteState } from '../rooms/roomTypes';
import { ChamberScene, type B03CombatSnapshot, type B06CombatTarget } from './ChamberScene';
import type { ContactResult as MoveContactResult } from '../combat/b03Moves';
import type { CombatEvent } from '../combat/sim';
import type { InputController } from '../input/InputController';
import { B08_BOSS_PROFILES, createB08Boss } from '../bosses/b08BossProfiles.ts';
import { b08BossAttackRects, b08BossContactKey, b08BossIsVulnerable, damageB08Boss, stepB08Boss } from '../bosses/b08BossDirector.ts';
import type { B08BossEvent, B08BossId, B08BossPatternId, B08BossRuntime, B08BossRect } from '../bosses/b08BossTypes.ts';
import { bossForB08Room } from '../bosses/b08BossRoutes.ts';
import { createB09CombatRuntime, createRunBuild, effectiveModifiers, fieldRecyclerRepair, generateUpgradeOffer, resolveB09Contact, resolveB09Dodge, resolveB09Threat, selectUpgradeChoice, type B09CombatRuntime, type RunBuildState, type UpgradeChoiceId, type UpgradeOffer, type UpgradeChoiceSource } from '../roguelite/b09RunBuild.ts';
import type { B10RunCheckpoint } from '../persistence/save.ts';

const AUDIO_CUES = ['runner-tell', 'runner-slash', 'wisp-charge', 'wisp-shot', 'wisp-impact', 'bastion-tell', 'bastion-block', 'bastion-break', 'cantor-sweep', 'cantor-pulse', 'enemy-ko', 'shard-reward', 'wave-clear'] as const;
const ENEMY_STATES: Readonly<Record<B06Archetype, readonly string[]>> = {
  'spindle-sentry': [],
  shardrunner: ['idle', 'move', 'attack', 'telegraph', 'recovery', 'hurt', 'ko'],
  'orbit-wisp': ['idle', 'move', 'attack', 'telegraph', 'recovery', 'hurt', 'stagger', 'ko'],
  'pressure-bastion': ['idle', 'move', 'guard', 'attack', 'telegraph', 'recovery', 'guard-break', 'ko'],
  cantor: ['intro', 'idle', 'move', 'sweep-telegraph', 'sweep-attack', 'sweep-recovery', 'pulse-telegraph', 'pulse-attack', 'vulnerable', 'hurt', 'ko', 'disperse'],
};

type PlatformRuntime = { readonly id: string; readonly source: Phaser.GameObjects.Rectangle; readonly visual: Phaser.GameObjects.GameObject; readonly moving: boolean; readonly top: number };
type EnemyVisual = { readonly sprite: Phaser.GameObjects.Image; readonly label: Phaser.GameObjects.Text; readonly bar: Phaser.GameObjects.Graphics; pose: string };
type HazardVisual = { readonly definition: B07HazardDefinition; readonly image: Phaser.GameObjects.Image; readonly cue: Phaser.GameObjects.Text; readonly hitPhases: Set<number> };
type B07Menu = { readonly choice: B07ChoiceId; readonly options: readonly (typeof B07_CHOICE_OPTIONS[B07ChoiceId][number])[] };

/** Dev-gated two-region route assembled from the authored B07 room library. */
export class B07ExpeditionScene extends ChamberScene {
  private route: B07RouteState;
  private room?: B07RoomTemplate;
  private variation = 0;
  private world?: ReturnType<typeof enemyWorldForRoom>;
  private director: B06DirectorState = createB06Director();
  private b09Launches = new Map<string, { readonly startY: number; readonly launchVelocity: number; elapsedMs: number }>();
  private combat: B03CombatSnapshot | null = null;
  private menu: B07Menu | null = null;
  private menuIndex = 0;
  private priorMenuAxis = 0;
  private priorMenuAccept = false;
  private resultSent = false;
  private roomElapsedMs = 0;
  private runElapsedMs = 0;
  private damageTaken = 0;
  private lastPlayerHp = 5;
  private audioUnlocked = false;
  private ambience?: Phaser.Sound.BaseSound;
  private vesperContext?: AudioContext;
  private vesperGain?: GainNode;
  private vesperOscillators: OscillatorNode[] = [];
  private reducedMotion = false;
  private roomObjects: Phaser.GameObjects.GameObject[] = [];
  private roomColliders: Phaser.Physics.Arcade.Collider[] = [];
  private platforms = new Map<string, PlatformRuntime>();
  private enemyVisuals = new Map<string, EnemyVisual>();
  private projectileVisuals = new Map<string, Phaser.GameObjects.Image>();
  private tellVisuals = new Map<string, Phaser.GameObjects.Image>();
  private hazardVisuals = new Map<string, HazardVisual>();
  private roomHazardFrame = new Map<string, B07HazardFrame>();
  private roomReward?: Phaser.GameObjects.Image;
  private roomExit?: Phaser.GameObjects.Image;
  private roomLabel?: Phaser.GameObjects.Text;
  private routeLabel?: Phaser.GameObjects.Text;
  private objectiveLabel?: Phaser.GameObjects.Text;
  private buildLabel?: Phaser.GameObjects.Text;
  private vitalsLabel?: Phaser.GameObjects.Text;
  private promptLabel?: Phaser.GameObjects.Text;
  private bannerLabel?: Phaser.GameObjects.Text;
  private choicePanel?: Phaser.GameObjects.Rectangle;
  private choiceHeading?: Phaser.GameObjects.Text;
  private choiceHint?: Phaser.GameObjects.Text;
  private choiceButtons: Phaser.GameObjects.Text[] = [];
  private eventLog: Array<Record<string, unknown>> = [];
  private lastB07AudioCue = 'none';
  private readonly worldSeed: number;
  private readonly b08Mode: boolean;
  private readonly b09Mode: boolean;
  private readonly b10Mode: boolean;
  private readonly runId: string;
  private readonly resumeCheckpoint: B10RunCheckpoint | null;
  private restoringCheckpoint = false;
  private b10VesperBeatSent = false;
  private runBuild: RunBuildState;
  private b09Runtime: B09CombatRuntime = createB09CombatRuntime();
  private pendingB09Offer: UpgradeOffer | null = null;
  private readonly practiceBoss: B08BossId | null;
  private activeBoss: B08BossRuntime | null = null;
  private bossSourceRoom = '';
  private bossCleared: B08BossId[] = [];
  private bossOutcome: 'victory' | 'defeat' | null = null;
  private bossPostKoMs = 0;
  private bossSprite?: Phaser.GameObjects.Image;
  private bossEffectSprite?: Phaser.GameObjects.Image;
  private bossHud?: Phaser.GameObjects.Text;
  private bossBar?: Phaser.GameObjects.Graphics;
  private bossTell?: Phaser.GameObjects.Graphics;
  private bossOverlay?: Phaser.GameObjects.Graphics;
  private bossAudio?: Phaser.Sound.BaseSound;
  private bossLastFrame = '';
  private bossLastCue = 'none';
  private bossDamageIds = new Set<string>();
  private bossActiveRects: readonly B08BossRect[] = [];
  private bossVfxEnabled = true;

  constructor(onPauseRequested: () => void, onControllerState: (active: boolean) => void, seed?: number, b08 = false, b09 = false, b10 = false, checkpoint: B10RunCheckpoint | null = null, runId?: string, reduceMotion?: boolean) {
    super(onPauseRequested, onControllerState, { ionaPreview: true, b03Combat: true, b04: true, b05: true, b06: true, b07: true, reduceMotion });
    const querySeed = Number(new URLSearchParams(window.location.search).get('seed'));
    this.worldSeed = checkpoint?.seed ?? seed ?? (Number.isFinite(querySeed) && querySeed !== 0 ? Math.trunc(querySeed) >>> 0 : 20261108);
    this.b08Mode = b08 || b09;
    this.b09Mode = b09;
    this.b10Mode = b10;
    this.resumeCheckpoint = checkpoint;
    this.runId = checkpoint?.runId ?? runId ?? `run-${this.worldSeed.toString(16)}`;
    const practice = new URLSearchParams(window.location.search).get('boss');
    this.practiceBoss = b08 && (practice === 'sundial-custodian' || practice === 'spoolheart-regent' || practice === 'broken-meridian') ? practice : null;
    this.route = checkpoint?.route ?? initialB07Route(this.worldSeed);
    this.runBuild = checkpoint?.build ?? createRunBuild(this.worldSeed);
    this.bossCleared = checkpoint?.bossesCleared as B08BossId[] ?? [];
    this.runElapsedMs = checkpoint?.elapsedMs ?? 0;
    this.damageTaken = checkpoint?.damageTaken ?? 0;
    this.reducedMotion = reduceMotion ?? (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
    this.bossVfxEnabled = !this.reducedMotion;
  }

  override preload(): void {
    super.preload();
    for (const file of ['horizon', 'architecture', 'platform-long', 'platform-short', 'conduit-tile', 'entry-beacon', 'reward-shard', 'exit-gate']) {
      this.load.image(`b07-sg-${file}`, `./assets/environments/b04/${file}.png`);
    }
    for (const file of ['vesper-horizon', 'vesper-engineering', 'vesper-foreground', 'vesper-platform-long', 'vesper-platform-thread', 'vesper-platform-lift', 'vesper-thread-press', 'vesper-threshold-gate', 'vesper-conduit']) {
      this.load.image(`b07-${file}`, `./assets/environments/b07/${file}.png`);
    }
    for (const [archetype, states] of Object.entries(ENEMY_STATES)) for (const state of states) {
      this.load.image(`b07-${archetype}-${state}`, `./assets/enemies/b06/${archetype}-${state}.png`);
    }
    for (const effect of ['runner-dash', 'runner-impact', 'wisp-charge', 'wisp-projectile', 'wisp-impact', 'bastion-shockfront', 'bastion-guard-break', 'cantor-ring-sweep']) {
      this.load.image(`b07-fx-${effect}`, `./assets/enemies/b06/fx-${effect}.png`);
    }
    for (const cue of AUDIO_CUES) this.load.audio(`b07-audio-${cue}`, `./assets/audio/b06/${cue}.wav`);
    this.load.audio('b07-audio-sunderglass', './assets/audio/b04/sunderglass-ambience.wav');
    if (this.b08Mode) {
      const bossFiles: Readonly<Record<B08BossId, readonly string[]>> = {
        'sundial-custodian': ['canonical-master', 'idle', 'ready', 'sweep-telegraph', 'sweep', 'stamp-telegraph', 'stamp', 'phase-2', 'hurt', 'ko', 'vfx-glassline-sweep', 'vfx-zenith-stamp', 'vfx-aperture-pulse'],
        'spoolheart-regent': ['canonical-master', 'idle', 'ready', 'lash-telegraph', 'lash', 'thread-telegraph', 'thread-drop', 'rewind', 'phase-2', 'ko', 'vfx-loom-lash', 'vfx-thread-drop', 'vfx-spindle-rewind'],
        'broken-meridian': ['canonical-master', 'idle', 'cleave-telegraph', 'cleave', 'afterglow', 'core-exposed', 'phase-change', 'phase-2', 'hurt', 'ko', 'vfx-meridian-cleave', 'vfx-daybreak-afterglow', 'vfx-core-exposure'],
      };
      for (const [boss, files] of Object.entries(bossFiles) as [B08BossId, readonly string[]][]) {
        for (const file of files) this.load.image(`b08-${boss}-${file}`, `./assets/bosses/b08/${boss}/${file}.png`);
        this.load.image(`b08-${boss}-arena`, `./assets/bosses/b08/${boss}/arena.png`);
        for (const cue of ['loop', 'tell', 'strike', 'phase', 'ko']) this.load.audio(`b08-${boss}-${cue}`, `./assets/audio/bosses/b08/${boss}/${cue}.wav`);
      }
    }
  }

  override create(): void {
    super.create();
    this.createHud();
    this.input.keyboard?.on('keydown', () => this.unlockAudio());
    this.input.on(Phaser.Input.Events.POINTER_DOWN, () => this.unlockAudio());
    this.input.keyboard?.on('keydown-V', (event: KeyboardEvent) => {
      if (!this.b08Mode || event.repeat) return;
      this.bossVfxEnabled = !this.bossVfxEnabled && !this.reducedMotion;
      this.emitState();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdownRoom());
    const chooseB09 = (event: Event) => {
      const selectedDetail = (event as CustomEvent<{ sourceId: string; choiceId: UpgradeChoiceId }>).detail;
      const choiceId = selectedDetail?.choiceId;
      if (!this.pendingB09Offer || !choiceId || selectedDetail.sourceId !== this.pendingB09Offer.sourceId) return;
      const offer = this.pendingB09Offer;
      const selected = selectUpgradeChoice(this.runBuild, offer, choiceId);
      if (!selected.ok) return;
      this.runBuild = selected.build;
      this.pendingB09Offer = null;
      if (selected.choice.id === 'field-repair') this.route = { ...this.route, repairCharges: this.route.repairCharges + 1 };
      else if (selected.choice.id === 'resonance-cache') this.grantB09CombatResonance(12);
      else if (selected.choice.id === 'solar-cell') this.grantB09DawnrushEnergy(12);
      this.logEvent({ type: 'upgrade-selected', sourceId: offer.sourceId, choiceId: selected.choice.id, rank: selected.choice.nextRank ?? 0, ranks: this.runBuild.ranks });
      this.emitB10Checkpoint();
      this.emitState();
      window.dispatchEvent(new CustomEvent('crownflare:b09-choice-completed', { detail: { sourceId: offer.sourceId, choiceId: selected.choice.id } }));
    };
    window.addEventListener('crownflare:b09-choice-selected', chooseB09);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => window.removeEventListener('crownflare:b09-choice-selected', chooseB09));
    if (this.resumeCheckpoint) this.restoringCheckpoint = true;
    if (this.practiceBoss) this.startBoss(this.practiceBoss, true);
    else this.loadCurrentRoom();
    if (this.resumeCheckpoint) {
      this.restoreB10CheckpointState({ hp: this.resumeCheckpoint.playerHp, resonance: this.resumeCheckpoint.resonance, dawnrushEnergy: this.resumeCheckpoint.dawnrushEnergy, dawnrushActive: this.resumeCheckpoint.dawnrushActive });
      this.combat = this.combatSnapshot(); this.lastPlayerHp = this.combat?.playerHp ?? this.lastPlayerHp;
      this.restoringCheckpoint = false; this.drawHud(); this.emitB10Checkpoint();
    }
    this.emitState();
  }

  override update(time: number, delta: number): void {
    super.update(time, delta);
    if (this.menu || this.resultSent || (!this.room && !this.activeBoss) || this.combat === null) return;
    const dt = Math.min(50, Math.max(0, delta));
    this.combat = this.combatSnapshot();
    if (!this.combat) return;
    this.runElapsedMs += dt;
    this.roomElapsedMs += dt;
    if (this.combat.playerHp < this.lastPlayerHp) this.damageTaken += this.lastPlayerHp - this.combat.playerHp;
    this.lastPlayerHp = this.combat.playerHp;
    if (this.activeBoss) {
      this.stepBoss(dt);
      this.syncBossPresentation();
      this.drawBossHud();
      if (this.combat.playerHp <= 0) this.finish('defeat');
      this.emitState();
      return;
    }
    this.stepHazards(dt);
    this.stepEnemies(dt);
    this.stepB09Launches(dt);
    this.syncEnemyPresentation();
    this.syncProjectiles();
    this.updateRoomPrompts();
    this.drawHud();
    if (this.combat.playerHp <= 0) this.finish('defeat');
    this.emitState();
  }

  protected override additionalDashInvulnerabilityMs(): number { return this.b09Mode ? effectiveModifiers(this.runBuild).dashInvulnerabilityMs : 0; }

  protected override adjustB06ThreatDamage(sourceId: string, damage: number, playerHp: number): { readonly damage: number; readonly blocked: boolean } {
    if (!this.b09Mode) return { damage, blocked: false };
    const outcome = resolveB09Threat(this.runBuild, this.b09Runtime, { nowMs: this.runElapsedMs, hp: playerHp, damage, resonance: this.combatSnapshot()?.resonance ?? 0 });
    this.b09Runtime = outcome.runtime;
    if (outcome.blockedBy) {
      if (outcome.resonanceCost) this.spendB09CombatResonance(outcome.resonanceCost);
      this.logEvent({ type: 'upgrade-threat-block', upgrade: outcome.blockedBy, sourceId, hp: playerHp, resonanceCost: outcome.resonanceCost });
      this.showBanner(outcome.blockedBy === 'last-orbit' ? 'LAST ORBIT  /  1 HP SAVED' : 'GROUNDING COIL  /  STRIKE GROUNDED');
    }
    return { damage: outcome.damage, blocked: outcome.blockedBy === 'grounding-coil' || outcome.blockedBy === 'last-orbit' && outcome.damage === 0 };
  }

  protected override handleExclusiveInput(input: ReturnType<InputController['read']>): boolean {
    if (!this.menu) {
      if (this.b08Mode && this.activeBoss && input.actions.interact) {
        const hpBefore = this.combat?.playerHp ?? 0;
        if (this.route.repairCharges > 0 && hpBefore > 0 && hpBefore < 5) {
          const restored = this.restorePlayerHealth(1);
          if (restored > 0) {
            this.route = { ...this.route, repairCharges: this.route.repairCharges - 1 };
            this.combat = this.combatSnapshot();
            this.playCue('shard-reward');
            this.showBanner('FIELD REPAIR  +1 HP');
            this.logEvent({ type: 'boss-repair-used', bossId: this.activeBoss.id, hpBefore, hpAfter: hpBefore + restored, repairCharges: this.route.repairCharges });
            this.drawBossHud(); this.emitState();
          }
        } else this.showBanner(this.route.repairCharges <= 0 ? 'NO FIELD REPAIRS' : 'IONA ALREADY AT FULL HEALTH');
        return true;
      }
      return false;
    }
    const axis = input.move.axis;
    if (Math.abs(axis) > .35 && this.priorMenuAxis === 0) this.menuIndex = (this.menuIndex + (axis < 0 ? -1 : 1) + this.menu.options.length) % this.menu.options.length;
    this.priorMenuAxis = Math.abs(axis) <= .2 ? 0 : Math.sign(axis);
    const accept = Boolean(input.actions.interact);
    if (accept && !this.priorMenuAccept) this.confirmChoice();
    this.priorMenuAccept = accept;
    this.renderChoiceMenu();
    return true;
  }

  protected override handleB04Interact(): boolean {
    if (!this.room || !this.combat || this.resultSent) return true;
    const x = this.combat.playerX;
    if (this.room.reward.kind !== 'none' && !this.route.rewarded.includes(this.room.id) && Math.abs(x - this.room.reward.x) <= 54) {
      this.claimRoomReward();
      return true;
    }
    if (Math.abs(x - this.room.exit.x) > this.room.exit.safeRadius || !this.roomCanExit()) {
      this.showBanner(!this.roomCanExit() ? 'CLEAR THE ROOM AND CLAIM ITS SHARD' : 'MOVE CLOSER TO THE THREAD GATE');
      return true;
    }
    const insertedBoss = this.b08Mode ? bossForB08Room(this.room.id) : null;
    if (insertedBoss) {
      const clearedRoomId = this.room.id;
      this.route = advanceB07Room(this.route);
      this.logEvent({ type: 'room-cleared', roomId: clearedRoomId, routeIndex: this.route.roomIndex, choices: this.route.choices });
      this.startBoss(insertedBoss);
      return true;
    }
    this.route = advanceB07Room(this.route);
    this.logEvent({ type: 'room-cleared', roomId: this.room.id, routeIndex: this.route.roomIndex, choices: this.route.choices });
    if (this.route.complete) { this.finish('victory'); return true; }
    this.loadCurrentRoom();
    return true;
  }

  protected override b06CombatTargets(): readonly B06CombatTarget[] {
    const player = this.getB06PlayerFrame();
    const enemies = this.director.enemies.map((enemy) => {
      const profile = B06_ENEMY_PROFILES[enemy.archetype];
      const guarding = b06EnemyIsGuarding(enemy, player.x, 'light-1', player.y + player.height / 2);
      return { id: enemy.id, archetype: enemy.archetype, x: enemy.x, y: enemy.y, width: profile.width, height: profile.height, hp: enemy.hp, alive: enemy.hp > 0, guarding, guardBreakable: enemy.archetype === 'pressure-bastion' && guarding };
    });
    if (!this.activeBoss) return enemies;
    const profile = B08_BOSS_PROFILES[this.activeBoss.id];
    return [...enemies, {
      id: `b08-boss:${this.activeBoss.id}`, archetype: 'b08-boss', x: this.activeBoss.x, y: this.activeBoss.y,
      width: profile.width, height: profile.height, hp: this.activeBoss.hp, alive: this.activeBoss.hp > 0,
      guarding: !b08BossIsVulnerable(this.activeBoss),
    }];
  }

  protected override onB06ContactResult(target: B06CombatTarget, result: MoveContactResult, move: B03MoveDefinition, event: CombatEvent, guardBreak: boolean): void {
    if (target.id.startsWith('b08-boss:') && this.activeBoss) {
      const duplicateKey = b08BossContactKey(this.activeAudioSequence, event.actionId, event.eventId, this.activeBoss.id);
      if (this.bossDamageIds.has(duplicateKey)) return;
    }
    const enemyForEffects = target.id.startsWith('b08-boss:') ? null : this.director.enemies.find((candidate) => candidate.id === target.id);
    const contactEffect = this.b09Mode ? resolveB09Contact(this.runBuild, this.b09Runtime, {
      nowMs: this.runElapsedMs, actionId: event.actionId, targetId: target.id, moveId: move.id, moveDamage: move.damage,
      knockbackY: move.knockbackY, result, guardBreak, interrupted: enemyForEffects?.phase === 'telegraph' || enemyForEffects?.phase === 'commit',
      closeRange: Math.abs((this.combat?.playerX ?? 0) - target.x) <= 56,
      targetAirborne: enemyForEffects ? enemyForEffects.y < (this.world?.groundTop ?? 241) - 28 : target.id.startsWith('b08-boss:'),
      dawnrush: this.getB06PlayerFrame().dawnrush !== 'base',
    }) : null;
    if (contactEffect) {
      this.b09Runtime = contactEffect.runtime;
      if (contactEffect.resonanceGain) this.grantB09CombatResonance(contactEffect.resonanceGain);
      if (contactEffect.dawnrushEnergy) this.grantB09DawnrushEnergy(contactEffect.dawnrushEnergy);
      if (contactEffect.shieldPrimed) this.showBanner('GROUNDING COIL  /  PUNISH SHIELD READY');
    }
    if (target.id.startsWith('b08-boss:')) {
      if (!this.activeBoss) return;
      const contactKey = b08BossContactKey(this.activeAudioSequence, event.actionId, event.eventId, this.activeBoss.id);
      if (this.bossDamageIds.has(contactKey)) return;
      if (result !== 'hit') {
        this.logEvent({ type: result === 'blocked' ? 'boss-armored' : result, bossId: this.activeBoss.id, move: move.id, atMs: event.atMs });
        return;
      }
      this.bossDamageIds.add(contactKey);
      const priorPhase = this.activeBoss.phase;
      const actualDamage = move.damage + (contactEffect?.bonusDamage ?? 0);
      this.activeBoss = damageB08Boss(this.activeBoss, actualDamage);
      this.playBossCue('strike');
      this.logEvent({ type: this.activeBoss.phase === 'ko' ? 'boss-ko' : this.activeBoss.phase === 'phase-change' ? 'boss-phase-change' : 'boss-hit', bossId: this.activeBoss.id, move: move.id, damage: actualDamage, upgradeBonus: contactEffect?.bonusDamage ?? 0, resonanceGain: contactEffect?.resonanceGain ?? 0, dawnrushEnergyEffect: contactEffect?.dawnrushEnergy ?? 0, hp: this.activeBoss.hp, phase: this.activeBoss.phase, priorPhase, atMs: event.atMs });
      if (this.activeBoss.phase === 'phase-change') this.playBossCue('phase');
      if (this.activeBoss.phase === 'ko' && !this.bossCleared.includes(this.activeBoss.id)) {
        this.bossCleared.push(this.activeBoss.id);
        this.bossPostKoMs = 0;
        this.route = { ...this.route, repairCharges: this.route.repairCharges + 1, resonance: this.route.resonance + 16 };
        this.grantB06Reward(1, 16, 18);
        this.playBossCue('ko');
        if (this.b09Mode && !this.practiceBoss && (this.activeBoss.id === 'sundial-custodian' || this.activeBoss.id === 'spoolheart-regent')) this.openB09Offer(`boss:${this.activeBoss.id}`);
      }
      return;
    }
    const enemy = this.director.enemies.find((candidate) => candidate.id === target.id);
    if (!enemy) return;
    if (result !== 'hit') {
      if (result === 'blocked') this.playCue('bastion-block');
      this.logEvent({ type: result, targetId: target.id, move: move.id, atMs: event.atMs });
      return;
    }
    const wasThreatening = enemy.phase === 'telegraph' || enemy.phase === 'commit';
    const contactKind = guardBreak ? 'guard-break' : wasThreatening ? 'interrupt' : move.knockbackY < -55 ? 'stagger' : 'hit';
    const actualDamage = move.damage + (guardBreak ? 1 : 0) + (contactEffect?.bonusDamage ?? 0);
    const knockback = Math.round(this.getB06PlayerFrame().facing * move.knockbackX * (contactEffect?.knockbackMultiplier ?? 1));
    const updated = applyB06EnemyContact(enemy, contactKind, actualDamage, knockback);
    this.director = { ...this.director, enemies: this.director.enemies.map((candidate) => candidate.id === enemy.id ? updated : candidate) };
    if (this.b09Mode && move.knockbackY < -55 && updated.hp > 0 && enemy.y >= (this.world?.groundTop ?? 241) - 30) this.b09Launches.set(enemy.id, { startY: enemy.y, launchVelocity: move.knockbackY, elapsedMs: 0 });
    this.spawnFx(guardBreak ? 'bastion-guard-break' : enemy.archetype === 'orbit-wisp' ? 'wisp-impact' : 'runner-impact', enemy.x, enemy.y, 64, 50, 220);
    if (updated.phase === 'ko') this.playCue('enemy-ko');
    this.logEvent({ type: updated.phase === 'ko' ? 'enemy-ko' : contactKind, targetId: enemy.id, archetype: enemy.archetype, move: move.id, damage: actualDamage, upgradeBonus: contactEffect?.bonusDamage ?? 0, resonanceGain: contactEffect?.resonanceGain ?? 0, dawnrushEnergyEffect: contactEffect?.dawnrushEnergy ?? 0, hp: updated.hp, atMs: event.atMs });
  }

  protected override onB06ThreatEvent(event: { readonly sourceId: string; readonly result: 'hit' | 'dodged' | 'invulnerable' | 'blocked'; readonly damage: number }): void {
    if (this.b09Mode && event.result === 'dodged') this.b09Runtime = resolveB09Dodge(this.runBuild, this.b09Runtime, this.runElapsedMs);
    this.logEvent({ type: `player-${event.result}`, sourceId: event.sourceId, damage: event.damage, hp: this.combatSnapshot()?.playerHp ?? 0 });
  }

  override setLabAudioPaused(paused: boolean): void {
    super.setLabAudioPaused(paused);
    if (paused) { this.ambience?.stop(); this.bossAudio?.pause(); if (this.vesperGain && this.vesperContext) void this.vesperGain.gain.setTargetAtTime(0, this.vesperContext.currentTime, .04); }
    else { this.startRegionAmbience(); if (this.activeBoss && this.bossAudio && !this.bossAudio.isPlaying && !this.sound.locked) this.bossAudio.play(); else this.bossAudio?.resume(); if (this.vesperGain && this.vesperContext) void this.vesperGain.gain.setTargetAtTime(.018, this.vesperContext.currentTime, .18); }
  }

  b07Snapshot(): {
    seed: number; roomId: string | null; region: string | null; roomIndex: number; routeLength: number; runElapsedMs: number; roomElapsedMs: number; choices: B07RouteState['choices'];
    visited: readonly string[]; repairCharges: number; resonance: number; playerHp: number; enemies: readonly { id: string; archetype: string; x: number; y: number; hp: number; phase: string }[];
    hazards: readonly { id: string; phase: string; progress: number }[]; menu: B07ChoiceId | null; rewardClaimed: boolean; reducedMotion: boolean;
    loadedTextures: number; missingTextures: string[]; result: 'victory' | 'defeat' | null; lastAudioCue: string; events: readonly Record<string, unknown>[];
    b08: { enabled: boolean; practice: boolean; practiceBoss: B08BossId | null; activeBoss: B08BossId | null; hp: number; maxHp: number; phase: string | null; phaseMs: number; postKoMs: number; phaseNumber: number; pattern: B08BossPatternId | null; attackId: string | null; targetX: number | null; safeX: number | null; bossX: number | null; bossY: number | null; bossFrame: string; vulnerable: boolean; bossesCleared: readonly B08BossId[]; outcome: 'victory' | 'defeat' | null; lastAudioCue: string; vfxEnabled: boolean; loadedAssets: number; missingAssets: string[]; audioAssetsLoaded: number };
    b09: { enabled: boolean; version: number; build: RunBuildState; pendingSource: UpgradeChoiceSource | null };
  } {
    const expected = ['b07-sg-horizon', 'b07-sg-architecture', 'b07-vesper-horizon', 'b07-vesper-platform-long', 'b07-shardrunner-idle', 'b07-orbit-wisp-idle', 'b07-pressure-bastion-idle', 'b07-cantor-idle'];
    const missingTextures = expected.filter((key) => !this.textures.exists(key));
    const bossAssets: Readonly<Record<B08BossId, readonly string[]>> = {
      'sundial-custodian': ['canonical-master', 'idle', 'ready', 'sweep-telegraph', 'sweep', 'stamp-telegraph', 'stamp', 'phase-2', 'hurt', 'ko', 'vfx-glassline-sweep', 'vfx-zenith-stamp', 'vfx-aperture-pulse', 'arena'],
      'spoolheart-regent': ['canonical-master', 'idle', 'ready', 'lash-telegraph', 'lash', 'thread-telegraph', 'thread-drop', 'rewind', 'phase-2', 'ko', 'vfx-loom-lash', 'vfx-thread-drop', 'vfx-spindle-rewind', 'arena'],
      'broken-meridian': ['canonical-master', 'idle', 'cleave-telegraph', 'cleave', 'afterglow', 'core-exposed', 'phase-change', 'phase-2', 'hurt', 'ko', 'vfx-meridian-cleave', 'vfx-daybreak-afterglow', 'vfx-core-exposure', 'arena'],
    };
    const bossKeys = this.b08Mode ? (Object.keys(bossAssets) as B08BossId[]).flatMap((id) => bossAssets[id].map((pose) => `b08-${id}-${pose}`)) : [];
    const missingBossAssets = bossKeys.filter((key) => !this.textures.exists(key));
    const bossAudioKeys = this.b08Mode ? (Object.keys(bossAssets) as B08BossId[]).flatMap((id) => ['loop', 'tell', 'strike', 'phase', 'ko'].map((cue) => `b08-${id}-${cue}`)) : [];
    const missingBossAudio = bossAudioKeys.filter((key) => !this.cache.audio.exists(key));
    return {
      seed: this.route.seed, roomId: this.room?.id ?? null, region: this.room?.region ?? null, roomIndex: this.route.roomIndex + (this.route.complete ? 0 : 1), routeLength: this.route.rooms.length, runElapsedMs: this.runElapsedMs, roomElapsedMs: this.roomElapsedMs,
      choices: this.route.choices, visited: [...this.route.visited], repairCharges: this.route.repairCharges, resonance: this.route.resonance,
      playerHp: this.combat?.playerHp ?? 0, enemies: this.director.enemies.map(({ id, archetype, x, y, hp, phase }) => ({ id, archetype, x: Math.round(x), y: Math.round(y), hp, phase })),
      hazards: [...this.roomHazardFrame].map(([id, frame]) => ({
        id,
        phase: frame.phase,
        progress: Number(frame.progress.toFixed(2)),
        ...(frame.x === undefined ? {} : { x: Number(frame.x.toFixed(1)) }),
        ...(frame.y === undefined ? {} : { y: Number(frame.y.toFixed(1)) }),
      })),
      menu: this.menu?.choice ?? null, rewardClaimed: this.room ? this.route.rewarded.includes(this.room.id) : false, reducedMotion: this.reducedMotion,
      loadedTextures: expected.length - missingTextures.length, missingTextures, result: this.resultSent ? (this.b08Mode ? this.bossOutcome ?? 'defeat' : this.route.complete ? 'victory' : 'defeat') : null, lastAudioCue: this.lastB07AudioCue, events: [...this.eventLog],
      b08: { enabled: this.b08Mode, practice: this.practiceBoss !== null, practiceBoss: this.practiceBoss, activeBoss: this.activeBoss?.id ?? null, hp: this.activeBoss?.hp ?? 0, maxHp: this.activeBoss?.maxHp ?? 0, phase: this.activeBoss?.phase ?? null, phaseMs: this.activeBoss?.phaseMs ?? 0, postKoMs: this.bossPostKoMs, phaseNumber: this.activeBoss?.phaseNumber ?? 0, pattern: this.activeBoss?.pattern ?? null, attackId: this.activeBoss?.attackId ?? null, targetX: this.activeBoss?.targetX ?? null, safeX: this.activeBoss?.safeX ?? null, bossX: this.activeBoss?.x ?? null, bossY: this.activeBoss?.y ?? null, bossFrame: this.bossLastFrame, vulnerable: this.activeBoss ? b08BossIsVulnerable(this.activeBoss) : false, bossesCleared: [...this.bossCleared], outcome: this.bossOutcome, lastAudioCue: this.bossLastCue, vfxEnabled: this.bossVfxEnabled, loadedAssets: bossKeys.length - missingBossAssets.length, missingAssets: missingBossAssets, audioAssetsLoaded: bossAudioKeys.length - missingBossAudio.length },
      b09: { enabled: this.b09Mode, version: this.runBuild.version, build: this.runBuild, pendingSource: this.pendingB09Offer?.sourceId ?? null },
    };
  }

  b07EventLog(): readonly Record<string, unknown>[] { return this.eventLog; }

  resetB07Run(seed = this.worldSeed): void {
    this.resultSent = false;
    this.damageTaken = 0;
    this.runElapsedMs = 0;
    this.eventLog = [];
    this.runBuild = createRunBuild(seed);
    this.b09Runtime = createB09CombatRuntime();
    this.pendingB09Offer = null;
    this.activeBoss = null; this.bossCleared = []; this.bossOutcome = null; this.bossPostKoMs = 0; this.bossDamageIds.clear();
    this.route = initialB07Route(seed);
    this.resetB03Encounter();
    this.setLabAudioPaused(false);
    if (this.practiceBoss) this.startBoss(this.practiceBoss, true);
    else this.loadCurrentRoom();
    this.emitState();
  }

  private loadCurrentRoom(): void {
    this.destroyRoom();
    this.roomLabel?.setVisible(true); this.routeLabel?.setVisible(true); this.vitalsLabel?.setVisible(true); this.objectiveLabel?.setVisible(true);
    this.menu = null;
    this.room = undefined;
    this.combat = null;
    const choice = currentB07Choice(this.route);
    if (choice) {
      this.showChoiceMenu(choice);
      return;
    }
    const roomId = this.route.rooms[this.route.roomIndex];
    const room = roomId ? B07_ROOM_BY_ID.get(roomId) : undefined;
    if (!room) { this.finish('victory'); return; }
    this.room = room;
    this.roomElapsedMs = 0;
    this.variation += 1;
    const instance = instantiateB07Room(room, this.route.seed, this.variation);
    this.world = enemyWorldForRoom(room);
    this.setRoomWorldBounds(room.world.width, room.world.height);
    this.createEnvironment(room);
    this.createGeometry(room);
    this.placePlayerOnSurface(room.playerSpawn.x, room.world.groundTop);
    this.combat = this.combatSnapshot();
    this.lastPlayerHp = this.combat?.playerHp ?? this.lastPlayerHp;
    this.cameras.main.setScroll(0, 0);
    const enemies = instance.enemySpawns.map((spawn) => createB06Enemy(`${room.id}:${spawn.id}`, spawn.archetype, spawn.x, this.world!, spawn.surfaceId));
    this.director = createB06Director(enemies, this.world);
    this.createEnemyVisuals();
    this.createHazards(instance.hazards);
    this.createRoomLandmarks(room);
    this.createReward(room);
    this.createExit(room);
    this.startRegionAmbience();
    this.logEvent({ type: 'room-entered', roomId: room.id, region: room.region, seed: this.route.seed, variant: instance.variant });
    this.drawHud();
    this.emitState();
    if (this.b10Mode && room.region === 'vesper-loomworks' && !this.b10VesperBeatSent) {
      this.b10VesperBeatSent = true;
      window.dispatchEvent(new CustomEvent('crownflare:b10-story-beat', { detail: { id: 'vesper-arrival', region: room.region } }));
    }
    this.emitB10Checkpoint();
  }

  private createEnvironment(room: B07RoomTemplate): void {
    const { width, height } = room.world;
    const vesper = room.region === 'vesper-loomworks';
    const horizonKey = vesper ? 'b07-vesper-horizon' : 'b07-sg-horizon';
    const architectureKey = vesper ? 'b07-vesper-engineering' : 'b07-sg-architecture';
    const foregroundKey = vesper ? 'b07-vesper-foreground' : 'b07-sg-conduit-tile';
    const horizon = this.add.tileSprite(width / 2, 0, width, height, horizonKey).setOrigin(.5, 0).setDepth(-34).setScrollFactor(.055, 0);
    const midground = this.add.tileSprite(width / 2, 0, width, height, architectureKey).setOrigin(.5, 0).setAlpha(vesper ? .26 : .9).setDepth(-23).setScrollFactor(.22, 0);
    const foreground = this.add.tileSprite(width / 2, height - 16, width, 90, foregroundKey).setOrigin(.5, 1).setAlpha(vesper ? .18 : .44).setDepth(-10).setScrollFactor(.48, 0);
    for (const object of [horizon, midground, foreground]) this.trackEnvironment(object);
    if (vesper) {
      const gear = this.add.image(width * .27, 126, 'b07-vesper-engineering').setDisplaySize(118, 114).setAlpha(.16).setDepth(-22).setScrollFactor(.18, 0);
      const loom = this.add.image(width * .78, 132, 'b07-vesper-engineering').setDisplaySize(148, 142).setAlpha(.19).setDepth(-21).setScrollFactor(.24, 0);
      this.trackEnvironment(gear); this.trackEnvironment(loom);
    }
  }

  private createGeometry(room: B07RoomTemplate): void {
    const blockers: CombatRect[] = [];
    for (const platform of room.platforms) {
      const moving = room.hazards.some((hazard) => hazard.kind === 'moving-lift' && hazard.platformId === platform.id);
      const bodyObject = this.add.rectangle(platform.left + platform.width / 2, platform.top + platform.height / 2, platform.width, platform.height, 0x000000, 0).setVisible(false);
      this.trackRoom(bodyObject);
      this.physics.add.existing(bodyObject, !moving);
      const body = bodyObject.body as Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody;
      if (moving) {
        const dynamic = body as Phaser.Physics.Arcade.Body;
        dynamic.setAllowGravity(false).setImmovable(true).setVelocity(0, 0);
      }
      if (platform.oneWay && 'checkCollision' in body) {
        body.checkCollision.up = true;
        body.checkCollision.down = false;
        body.checkCollision.left = false;
        body.checkCollision.right = false;
      }
      this.roomColliders.push(this.addPlayerCollider(bodyObject));
      const artKey = this.platformTexture(room, platform.art);
      let visual: Phaser.GameObjects.GameObject;
      if (room.region === 'sunderglass-reach') {
        visual = this.add.tileSprite(platform.left + platform.width / 2, platform.top, platform.width, Math.max(24, platform.height + 14), artKey).setOrigin(.5, 0).setDepth(6);
      } else {
        const image = this.add.image(platform.left + platform.width / 2, platform.top + 4, artKey).setOrigin(.5, 0).setDisplaySize(platform.width, Math.max(28, platform.height + 20)).setDepth(6);
        visual = image;
      }
      this.trackRoom(visual);
      this.platforms.set(platform.id, { id: platform.id, source: bodyObject, visual, moving, top: platform.top });
      if (platform.top < room.world.groundTop - 6 && platform.projectileBlocker !== false) blockers.push({ left: platform.left, right: platform.left + platform.width, top: platform.top, bottom: platform.top + platform.height });
    }
    this.setCombatBlockers(blockers);
  }

  private createRoomLandmarks(room: B07RoomTemplate): void {
    if (room.role === 'entry') {
      const key = room.region === 'vesper-loomworks' ? 'b07-vesper-threshold-gate' : 'b07-sg-entry-beacon';
      const beacon = this.add.image(48, room.world.groundTop, key).setOrigin(.5, 1).setDisplaySize(82, 106).setDepth(8);
      this.trackRoom(beacon);
    }
    if (room.role === 'transition') {
      const gate = this.add.image(500, room.world.groundTop, 'b07-sg-exit-gate').setOrigin(.5, 1).setDisplaySize(112, 146).setDepth(8);
      this.trackRoom(gate);
    }
    if (room.id === 'vl-night-side-threshold') {
      const threshold = this.add.image(604, room.world.groundTop, 'b07-vesper-threshold-gate').setOrigin(.5, 1).setDisplaySize(208, 206).setDepth(8);
      this.trackRoom(threshold);
      const honest = this.add.text(604, 66, 'B08 / BOSS NOT BUILT', { fontFamily: 'monospace', fontSize: '6px', color: '#fff0ca', backgroundColor: '#08131ddd', padding: { x: 3, y: 2 } }).setOrigin(.5).setDepth(10);
      this.trackRoom(honest);
    }
  }

  private createReward(room: B07RoomTemplate): void {
    if (room.reward.kind === 'none' || this.route.rewarded.includes(room.id)) return;
    const key = room.region === 'vesper-loomworks' ? 'b07-vesper-conduit' : 'b07-sg-reward-shard';
    this.roomReward = this.add.image(room.reward.x, room.world.groundTop - 5, key).setOrigin(.5, 1).setDisplaySize(28, 34).setDepth(10);
    this.trackRoom(this.roomReward);
  }

  private createExit(room: B07RoomTemplate): void {
    const key = room.region === 'vesper-loomworks' ? 'b07-vesper-threshold-gate' : 'b07-sg-exit-gate';
    this.roomExit = this.add.image(room.exit.x, room.world.groundTop, key).setOrigin(.5, 1).setDisplaySize(room.role === 'exit' ? 128 : 74, room.role === 'exit' ? 136 : 100).setDepth(8).setAlpha(.84);
    this.trackRoom(this.roomExit);
  }

  private createHazards(hazards: readonly B07HazardDefinition[]): void {
    this.hazardVisuals.clear(); this.roomHazardFrame.clear();
    for (const definition of hazards) {
      if (definition.kind === 'moving-lift') continue;
      const texture = definition.kind === 'thread-press' ? 'b07-vesper-thread-press' : this.room?.region === 'vesper-loomworks' ? 'b07-vesper-conduit' : 'b07-sg-conduit-tile';
      const x = definition.kind === 'thread-press' ? (definition.rail.left + definition.rail.right) / 2 : (definition.bounds.left + definition.bounds.right) / 2;
      const width = definition.kind === 'thread-press' ? definition.width : definition.bounds.right - definition.bounds.left;
      const height = definition.kind === 'thread-press' ? definition.height : definition.bounds.bottom - definition.bounds.top;
      const imageY = definition.kind === 'thread-press' ? definition.rail.y + height / 2 : definition.bounds.bottom;
      const image = this.add.image(x, imageY, texture).setDisplaySize(width, height + (definition.kind === 'thread-press' ? 0 : 14)).setOrigin(.5, definition.kind === 'thread-press' ? .5 : 1).setDepth(14).setAlpha(.28);
      const cueY = definition.kind === 'thread-press' ? definition.rail.y - 7 : imageY - height / 2 - 7;
      const cue = this.add.text(x, cueY, 'THREAD / IDLE', { fontFamily: 'monospace', fontSize: '5px', color: '#e9f2dd', backgroundColor: '#09141ccc', padding: { x: 2, y: 1 } }).setOrigin(.5).setDepth(22);
      this.trackRoom(image); this.trackRoom(cue);
      this.hazardVisuals.set(definition.id, { definition, image, cue, hitPhases: new Set() });
    }
  }

  private createEnemyVisuals(): void {
    this.enemyVisuals.clear();
    for (const enemy of this.director.enemies) {
      const texture = this.enemyTexture(enemy);
      const profile = B06_ENEMY_PROFILES[enemy.archetype];
      const footY = enemy.archetype === 'orbit-wisp' ? enemy.y : enemy.y + profile.height / 2;
      const sprite = this.add.image(enemy.x, footY, texture).setOrigin(.5, enemy.archetype === 'orbit-wisp' ? .5 : 1).setDepth(17);
      sprite.setDisplaySize(enemy.archetype === 'spindle-sentry' ? 70 : enemy.archetype === 'orbit-wisp' ? 54 : 82, enemy.archetype === 'orbit-wisp' ? 54 : 78);
      const label = this.add.text(enemy.x, footY - 82, '', { fontFamily: 'monospace', fontSize: '5px', color: '#f4ead2', stroke: '#08111e', strokeThickness: 2, align: 'center' }).setOrigin(.5, 1).setDepth(20);
      const bar = this.add.graphics().setDepth(21);
      this.trackRoom(sprite); this.trackRoom(label); this.trackRoom(bar);
      this.enemyVisuals.set(enemy.id, { sprite, label, bar, pose: texture });
    }
  }

  private createHud(): void {
    const style = { fontFamily: 'monospace', fontSize: '6px', color: '#f4ead2', stroke: '#08111e', strokeThickness: 2 };
    this.add.rectangle(240, 14, 480, 28, 0x07131d, .82).setScrollFactor(0).setDepth(45);
    this.roomLabel = this.add.text(8, 8, '', { ...style, fontSize: '7px', color: '#f0d1a8' }).setScrollFactor(0).setDepth(46);
    this.routeLabel = this.add.text(472, 8, '', { ...style, align: 'right', fontSize: '5px' }).setOrigin(1, 0).setScrollFactor(0).setDepth(46);
    this.vitalsLabel = this.add.text(8, 23, '', style).setScrollFactor(0).setDepth(46);
    this.objectiveLabel = this.add.text(472, 23, '', { ...style, align: 'right' }).setOrigin(1, 0).setScrollFactor(0).setDepth(46);
    this.buildLabel = this.add.text(8, 39, '', { ...style, fontSize: '5px', color: '#a9d7c9' }).setScrollFactor(0).setDepth(46).setVisible(this.b09Mode);
    this.promptLabel = this.add.text(240, 236, '', { ...style, fontSize: '6px', backgroundColor: '#07131de8', padding: { x: 4, y: 3 }, align: 'center' }).setOrigin(.5).setScrollFactor(0).setDepth(48);
    this.bannerLabel = this.add.text(240, 46, '', { ...style, color: '#fff1c8', backgroundColor: '#07131de8', padding: { x: 4, y: 3 }, align: 'center' }).setOrigin(.5, 0).setScrollFactor(0).setDepth(49).setAlpha(0);
  }

  private showChoiceMenu(choice: B07ChoiceId): void {
    this.menu = { choice, options: B07_CHOICE_OPTIONS[choice] };
    this.menuIndex = 0; this.priorMenuAxis = 0; this.priorMenuAccept = false;
    this.choicePanel = this.add.rectangle(240, 135, 408, 176, 0x08131d, .97).setStrokeStyle(1, choice === 'reach' ? 0xd8ae77 : 0x9adcd0, .95).setScrollFactor(0).setDepth(70);
    this.choiceHeading = this.add.text(240, 66, choice === 'reach' ? 'ROUTE CHOICE / SUNDERGLASS REACH' : 'ROUTE CHOICE / VESPER LOOMWORKS', { fontFamily: 'monospace', fontSize: '8px', color: '#fff1d3', align: 'center' }).setOrigin(.5).setScrollFactor(0).setDepth(72);
    this.choiceHint = this.add.text(240, 210, 'LEFT / RIGHT OR D-PAD SELECT  ·  E / SOUTH CONFIRM', { fontFamily: 'monospace', fontSize: '5px', color: '#bdcbc7', align: 'center' }).setOrigin(.5).setScrollFactor(0).setDepth(72);
    this.choiceButtons = this.menu.options.map((_option, index) => {
      const text = this.add.text(240, 112 + index * 50, '', { fontFamily: 'monospace', fontSize: '6px', color: '#e7eee5', align: 'center', lineSpacing: 2, backgroundColor: '#10202c', padding: { x: 5, y: 4 }, fixedWidth: 368 }).setOrigin(.5).setScrollFactor(0).setDepth(72).setInteractive({ useHandCursor: true });
      text.on('pointerover', () => { this.menuIndex = index; this.renderChoiceMenu(); });
      text.on('pointerdown', () => { this.menuIndex = index; this.confirmChoice(); });
      return text;
    });
    this.renderChoiceMenu();
    this.logEvent({ type: 'route-choice-open', choice, seed: this.route.seed });
  }

  private renderChoiceMenu(): void {
    if (!this.menu) return;
    this.menu.options.forEach((option, index) => {
      const marker = index === this.menuIndex ? '▶ ' : '  ';
      this.choiceButtons[index]?.setText(`${marker}${option.title}  /  ${option.risk}\n${option.focus}  ·  ${option.reward}  ·  ${option.destination}`)
        .setColor(index === this.menuIndex ? '#fff0c7' : '#cfdbd7')
        .setBackgroundColor(index === this.menuIndex ? '#18313b' : '#10202c');
    });
  }

  private confirmChoice(): void {
    if (!this.menu) return;
    const choice = this.menu.options[this.menuIndex]?.id;
    if (!choice) return;
    const menuType = this.menu.choice;
    this.route = chooseB07Route(this.route, choice as B07BranchChoice);
    this.logEvent({ type: 'route-choice', menu: menuType, choice, seed: this.route.seed });
    this.closeChoiceMenu();
    this.loadCurrentRoom();
  }

  private closeChoiceMenu(): void {
    this.choicePanel?.destroy(); this.choiceHeading?.destroy(); this.choiceHint?.destroy();
    this.choiceButtons.forEach((button) => button.destroy());
    this.choicePanel = undefined; this.choiceHeading = undefined; this.choiceHint = undefined; this.choiceButtons = []; this.menu = null;
  }

  private claimRoomReward(): void {
    if (!this.room || !this.combat) return;
    const reward = this.room.reward;
    const health = reward.kind === 'repair' || reward.kind === 'repair-and-resonance' ? reward.amount : 0;
    const resonance = reward.kind === 'resonance' || reward.kind === 'repair-and-resonance' ? reward.amount : 0;
    this.route = collectB07Reward(this.route);
    this.roomReward?.setVisible(false);
    this.grantB06Reward(health, resonance, Math.min(28, resonance));
    if (this.b09Mode) this.route = { ...this.route, repairCharges: this.route.repairCharges + fieldRecyclerRepair(this.runBuild, this.room.id) };
    this.playCue('shard-reward');
    this.showBanner(health > 0 && resonance > 0 ? `REPAIR +${health}  /  RESONANCE +${resonance}` : health > 0 ? `FIELD REPAIR +${health}` : `RESONANCE +${resonance}`);
    this.logEvent({ type: 'reward-claimed', roomId: this.room.id, repair: health, resonance, repairCharges: this.route.repairCharges, totalResonance: this.route.resonance });
    if (this.b09Mode && (this.room.id === 'sg-copper-causeway' || this.room.id === 'sg-conduit-annex')) this.openB09Offer(`room:${this.room.id}`);
    if (!this.pendingB09Offer) this.emitB10Checkpoint();
  }

  private openB09Offer(sourceId: UpgradeChoiceSource): void {
    if (!this.b09Mode || this.practiceBoss || this.pendingB09Offer || this.runBuild.ledger.claimedSourceIds.includes(sourceId)) return;
    this.pendingB09Offer = generateUpgradeOffer(this.runBuild, sourceId);
    this.logEvent({ type: 'upgrade-offer-open', sourceId, drawIndex: this.pendingB09Offer.drawIndex, choices: this.pendingB09Offer.choices.map(({ id }) => id) });
    window.dispatchEvent(new CustomEvent('crownflare:b09-choice-open', { detail: { offer: this.pendingB09Offer, build: this.runBuild } }));
    this.emitState();
  }

  private roomCanExit(): boolean {
    if (!this.room) return false;
    const combatClear = this.director.enemies.every((enemy) => enemy.hp <= 0);
    const rewardClear = this.room.reward.kind === 'none' || this.route.rewarded.includes(this.room.id);
    return combatClear && rewardClear;
  }

  private updateRoomPrompts(): void {
    if (!this.room || !this.combat || !this.promptLabel) return;
    const x = this.combat.playerX;
    this.roomExit?.setAlpha(this.roomCanExit() ? 1 : .38);
    if (this.room.reward.kind !== 'none' && !this.route.rewarded.includes(this.room.id) && Math.abs(x - this.room.reward.x) <= 72) {
      this.promptLabel.setText(this.combat.controllerIndex >= 0 ? 'SOUTH / CLAIM FIELD REWARD' : 'E / CLAIM FIELD REWARD').setVisible(true);
    } else if (Math.abs(x - this.room.exit.x) <= this.room.exit.safeRadius + 42) {
      this.promptLabel.setText(this.roomCanExit() ? (this.combat.controllerIndex >= 0 ? 'SOUTH / CONTINUE' : 'E / CONTINUE') : 'CLEAR ENEMIES + CLAIM THE SHARD').setVisible(true);
    } else this.promptLabel.setVisible(false);
  }

  private startBoss(id: B08BossId, practice = false): void {
    if (!this.b08Mode) return;
    this.bossSourceRoom = this.room?.id ?? (practice ? 'practice-shortcut' : 'unknown');
    this.bossAudio?.stop(); this.bossAudio = undefined;
    this.destroyRoom();
    this.room = undefined; this.menu = null; this.activeBoss = createB08Boss(id);
    this.bossPostKoMs = 0; this.bossOutcome = null;
    this.bossActiveRects = []; this.bossDamageIds.clear(); this.bossLastFrame = '';
    this.setRoomWorldBounds(960, 270);
    this.cameras.main.setBounds(0, 0, 960, 270);
    this.cameras.main.setScroll(0, 0);
    this.setCombatBlockers([]);
    const arena = this.add.tileSprite(480, 135, 960, 270, `b08-${id}-arena`).setOrigin(.5).setDepth(-34);
    this.trackRoom(arena);
    const floor = this.add.rectangle(480, 255, 960, 30, 0x000000, 0).setVisible(false);
    this.trackRoom(floor); this.physics.add.existing(floor, true); this.roomColliders.push(this.addPlayerCollider(floor));
    const floorKey = id === 'sundial-custodian' ? 'b07-sg-conduit-tile' : 'b07-vesper-conduit';
    const floorArt = this.add.tileSprite(480, 255, 960, 36, floorKey).setDepth(6).setAlpha(.94);
    this.trackRoom(floorArt);
    this.placePlayerOnSurface(650, 240);
    this.combat = this.combatSnapshot();
    if (this.combat) this.lastPlayerHp = this.combat.playerHp;
    this.roomLabel?.setVisible(false); this.routeLabel?.setVisible(false); this.vitalsLabel?.setVisible(false); this.objectiveLabel?.setVisible(false);
    this.trackRoom(this.add.rectangle(240, 15, 480, 30, 0x07131d, .9).setScrollFactor(0).setDepth(50));
    this.bossSprite = this.add.image(this.activeBoss.x, this.activeBoss.y, `b08-${id}-idle`).setDisplaySize(144, 144).setDepth(10);
    this.trackRoom(this.bossSprite);
    this.bossEffectSprite = this.add.image(this.activeBoss.x, this.activeBoss.y, `b08-${id}-${id === 'sundial-custodian' ? 'vfx-aperture-pulse' : id === 'spoolheart-regent' ? 'vfx-spindle-rewind' : 'vfx-core-exposure'}`).setDisplaySize(128, 128).setDepth(15).setVisible(false);
    this.trackRoom(this.bossEffectSprite);
    this.bossTell = this.add.graphics().setDepth(16); this.trackRoom(this.bossTell);
    this.bossOverlay = this.add.graphics().setDepth(9); this.trackRoom(this.bossOverlay);
    this.bossBar = this.trackRoom(this.add.graphics().setScrollFactor(0).setDepth(57));
    this.bossHud = this.trackRoom(this.add.text(240, 3, '', { fontFamily: 'monospace', fontSize: '5px', color: '#f8ead0', align: 'center', lineSpacing: 2 }).setOrigin(.5, 0).setScrollFactor(0).setDepth(56));
    this.bossBar.setScrollFactor(0); this.bossHud.setScrollFactor(0);
    this.roomLabel?.setText(`${id === 'sundial-custodian' ? 'SUNDERGLASS REACH' : id === 'spoolheart-regent' ? 'VESPER LOOMWORKS' : 'SPINDLE CORE'}  /  ${B08_BOSS_PROFILES[id].name}`);
    this.routeLabel?.setText(`${practice ? 'PRACTICE' : `B08 ROOM ${Math.min(this.route.roomIndex + 1, this.route.rooms.length)}/${this.route.rooms.length}`}  ·  SEED ${this.route.seed.toString(16).toUpperCase()}  ·  ${this.dawnrushSnapshot()?.form.toUpperCase() ?? 'BASE'}`);
    this.promptLabel?.setVisible(false);
    this.logEvent({ type: 'boss-intro', bossId: id, practice, sourceRoom: this.bossSourceRoom, seed: this.route.seed, hp: this.activeBoss.hp });
    this.playBossCue('loop');
    this.drawBossHud(); this.emitState();
  }

  private stepBoss(dt: number): void {
    if (!this.activeBoss || !this.combat) return;
    if (this.activeBoss.phase === 'ko') {
      this.bossPostKoMs += dt;
      if (this.bossPostKoMs >= 1750) {
        const defeated = this.activeBoss.id;
        this.bossAudio?.stop(); this.bossAudio = undefined;
        if (this.practiceBoss || defeated === 'broken-meridian') {
          this.bossOutcome = 'victory'; this.finish('victory'); return;
        }
        this.activeBoss = null;
        this.loadCurrentRoom();
      }
      return;
    }
    const player = this.getB06PlayerFrame();
    const previousPhase = this.activeBoss.phase;
    const stepped = stepB08Boss(this.activeBoss, {
      x: player.x, y: player.y, width: player.width, height: player.height, hp: player.hp,
      invulnerableMs: player.invulnerableMs, dashInvulnerableMs: player.dashInvulnerableMs,
    }, dt);
    this.activeBoss = stepped.boss;
    if (this.activeBoss.phase !== previousPhase) {
      if (this.activeBoss.phase === 'phase-change') {
        this.playBossCue('phase'); this.logEvent({ type: 'boss-phase-change', bossId: this.activeBoss.id, phaseNumber: this.activeBoss.phaseNumber });
      }
    }
    for (const event of stepped.events) this.handleBossEvent(event);
  }

  private handleBossEvent(event: B08BossEvent): void {
    if (event.type === 'telegraph') {
      this.bossActiveRects = [];
      this.playBossCue('tell');
      this.logEvent({ type: 'boss-telegraph', bossId: event.bossId, attackId: event.attackId, pattern: event.pattern, phaseNumber: event.phaseNumber, safeX: event.safeX });
    } else if (event.type === 'strike') {
      this.bossActiveRects = event.rects;
      this.playBossCue('strike');
      this.logEvent({ type: 'boss-strike', bossId: event.bossId, attackId: event.attackId, pattern: event.pattern, rects: event.rects, safeX: event.safeX });
    } else if (event.type === 'recovery') {
      this.bossActiveRects = [];
      this.logEvent({ type: 'boss-recovery', bossId: event.bossId, attackId: event.attackId, pattern: event.pattern });
    } else if (event.type === 'player-hit') {
      const player = this.getB06PlayerFrame();
      const result = this.applyB06PlayerThreat(event.attackId, event.damage, player.x < (this.activeBoss?.x ?? 0) ? -1 : 1);
      this.logEvent({ type: 'boss-player-contact', bossId: event.bossId, attackId: event.attackId, pattern: event.pattern, result, damage: result === 'hit' ? event.damage : 0, hp: this.combat?.playerHp ?? 0, playerX: event.playerX, playerY: event.playerY, rects: event.rects });
      if (result === 'hit' && this.bossVfxEnabled) this.spawnFx('wisp-impact', player.x, player.y, 46, 38, this.reducedMotion ? 80 : 160);
    }
  }

  private bossPose(boss: B08BossRuntime): string {
    if (boss.phase === 'ko') return 'ko';
    if (boss.phase === 'phase-change') return boss.id === 'broken-meridian' ? 'phase-change' : 'phase-2';
    if (boss.phaseNumber === 2 && boss.phase === 'recovery') return 'phase-2';
    if (boss.hurtMs > 0) return boss.id === 'spoolheart-regent' ? 'rewind' : 'hurt';
    if (boss.phase === 'intro') return boss.phaseMs > 300 ? 'ready' : 'idle';
    if (boss.phase === 'telegraph') {
      if (boss.id === 'sundial-custodian') return boss.pattern === 'zenith-stamp' ? 'stamp-telegraph' : 'sweep-telegraph';
      if (boss.id === 'spoolheart-regent') return boss.pattern === 'thread-drop' ? 'thread-telegraph' : 'lash-telegraph';
      return 'cleave-telegraph';
    }
    if (boss.phase === 'commit') {
      if (boss.id === 'sundial-custodian') return boss.pattern === 'zenith-stamp' ? 'stamp' : 'sweep';
      if (boss.id === 'spoolheart-regent') return boss.pattern === 'thread-drop' ? 'thread-drop' : boss.pattern === 'spindle-rewind' ? 'rewind' : 'lash';
      return boss.pattern === 'daybreak-afterglow' ? 'afterglow' : 'cleave';
    }
    if (boss.id === 'broken-meridian') return 'core-exposed';
    if (boss.id === 'spoolheart-regent' && boss.pattern === 'spindle-rewind') return 'rewind';
    if (boss.id === 'sundial-custodian' && boss.pattern === 'zenith-stamp') return 'stamp';
    return 'ready';
  }

  private syncBossPresentation(): void {
    const boss = this.activeBoss;
    if (!boss || !this.bossSprite || !this.bossTell || !this.bossOverlay || !this.bossEffectSprite) return;
    const pose = this.bossPose(boss);
    const key = `b08-${boss.id}-${pose}`;
    if (this.textures.exists(key) && this.bossLastFrame !== key) { this.bossSprite.setTexture(key); this.bossLastFrame = key; }
    this.bossSprite.setPosition(boss.x, boss.y).setFlipX(boss.facing < 0).setAlpha(boss.phase === 'phase-change' && !this.reducedMotion ? .82 : 1);
    this.syncBossEffect(boss);
    this.bossTell.clear(); this.bossOverlay.clear();
    if (boss.phase === 'telegraph' && boss.pattern) {
      const rects = b08BossAttackRects(boss, boss.pattern);
      const fill = boss.id === 'sundial-custodian' ? 0xf04e58 : boss.id === 'spoolheart-regent' ? 0x22e6cf : 0xffd45e;
      this.bossTell.fillStyle(fill, .5);
      for (const rect of rects) {
        this.bossTell.fillRect(rect.left, rect.top, Math.max(0, rect.right - rect.left), rect.bottom - rect.top);
        this.bossTell.lineStyle(2, fill, .98);
        this.bossTell.strokeRect(rect.left, rect.top, Math.max(0, rect.right - rect.left), rect.bottom - rect.top);
      }
      this.bossTell.fillStyle(0x81ffe0, .15).fillRect(boss.safeX - 30, 170, 60, 71);
      this.bossTell.lineStyle(2, 0x81ffe0, .98);
      this.bossTell.lineBetween(boss.safeX, 166, boss.safeX, 241);
      this.bossTell.lineBetween(boss.safeX - 30, 166, boss.safeX - 30, 241);
      this.bossTell.lineBetween(boss.safeX + 30, 166, boss.safeX + 30, 241);
      if (this.bossVfxEnabled) {
        this.bossOverlay.lineStyle(1, fill, .7);
        this.bossOverlay.strokeCircle(boss.x, boss.y, 52 + (this.reducedMotion ? 0 : Math.sin(boss.phaseMs / 80) * 4));
      }
    } else if (boss.phase === 'commit') {
      this.bossTell.fillStyle(0xff705e, .32);
      for (const rect of this.bossActiveRects) this.bossTell.fillRect(rect.left, rect.top, Math.max(0, rect.right - rect.left), rect.bottom - rect.top);
      if (this.bossVfxEnabled && !this.reducedMotion) {
        this.bossOverlay.fillStyle(0xffca72, .2); this.bossOverlay.fillCircle(boss.x, boss.y, 44);
      }
    } else if (b08BossIsVulnerable(boss)) {
      this.bossTell.lineStyle(2, boss.id === 'sundial-custodian' ? 0xffd17d : boss.id === 'spoolheart-regent' ? 0x83ffeb : 0xffeba0, .9);
      this.bossTell.strokeCircle(boss.x, boss.y, 44);
    }
  }

  private syncBossEffect(boss: B08BossRuntime): void {
    const effect = this.bossEffectSprite;
    if (!effect) return;
    let pose: string | null = null;
    if (boss.phase === 'recovery') {
      pose = boss.id === 'sundial-custodian' ? 'vfx-aperture-pulse'
        : boss.id === 'broken-meridian' ? 'vfx-core-exposure'
          : boss.pattern === 'thread-drop' ? 'vfx-thread-drop' : boss.pattern === 'spindle-rewind' ? 'vfx-spindle-rewind' : 'vfx-loom-lash';
    } else if (boss.pattern === 'zenith-stamp') pose = 'vfx-zenith-stamp';
    else if (boss.pattern === 'thread-drop') pose = 'vfx-thread-drop';
    else if (boss.pattern === 'loom-lash') pose = 'vfx-loom-lash';
    else if (boss.pattern === 'spindle-rewind') pose = 'vfx-spindle-rewind';
    else if (boss.pattern === 'daybreak-afterglow') pose = 'vfx-daybreak-afterglow';
    else if (boss.id === 'sundial-custodian' && boss.pattern === 'glassline-sweep') pose = 'vfx-glassline-sweep';
    else if (boss.id === 'broken-meridian' && boss.pattern === 'meridian-cleave') pose = 'vfx-meridian-cleave';
    const visiblePhase = boss.phase === 'telegraph' || boss.phase === 'commit' || boss.phase === 'recovery';
    const key = pose ? `b08-${boss.id}-${pose}` : '';
    const visible = !!pose && visiblePhase && this.bossVfxEnabled && !this.reducedMotion && this.textures.exists(key);
    if (!visible) { effect.setVisible(false); return; }
    if (effect.texture.key !== key) effect.setTexture(key);
    const horizontal = pose === 'vfx-glassline-sweep' || pose === 'vfx-loom-lash' || pose === 'vfx-meridian-cleave' || pose === 'vfx-daybreak-afterglow';
    const width = horizontal ? (pose === 'vfx-daybreak-afterglow' ? 350 : pose === 'vfx-meridian-cleave' ? 300 : 250) : pose === 'vfx-zenith-stamp' || pose === 'vfx-thread-drop' ? 112 : 128;
    const height = horizontal ? 84 : pose === 'vfx-zenith-stamp' || pose === 'vfx-thread-drop' ? 150 : 128;
    const x = horizontal ? 480 : pose === 'vfx-zenith-stamp' || pose === 'vfx-thread-drop' ? boss.targetX : boss.x;
    const y = horizontal ? 211 : pose === 'vfx-zenith-stamp' || pose === 'vfx-thread-drop' ? 207 : boss.y;
    const alpha = boss.phase === 'telegraph' ? .36 : boss.phase === 'recovery' ? .56 : .78;
    effect.setPosition(x, y).setDisplaySize(width, height).setAlpha(alpha).setVisible(true);
  }

  private drawBossHud(): void {
    const boss = this.activeBoss;
    if (!boss || !this.bossBar || !this.bossHud) return;
    const profile = B08_BOSS_PROFILES[boss.id];
    this.bossBar.clear();
    this.bossBar.fillStyle(0x09101b, .9); this.bossBar.fillRect(106, 22, 268, 6);
    this.bossBar.fillStyle(boss.id === 'sundial-custodian' ? 0xf0a257 : boss.id === 'spoolheart-regent' ? 0x56d8c7 : 0xf0d18a, .95);
    this.bossBar.fillRect(107, 23, Math.max(0, 266 * boss.hp / boss.maxHp), 4);
    this.bossBar.lineStyle(1, 0xf1e7d0, .72); this.bossBar.strokeRect(106, 22, 268, 6);
    const playerHp = this.combat?.playerHp ?? 0;
    const phaseName = boss.phase === 'telegraph' ? `TELEGRAPH / ${boss.pattern?.replaceAll('-', ' ').toUpperCase()} / READ THE TELL`
      : boss.phase === 'commit' ? 'ATTACK COMMITTED / EVADE'
        : boss.phase === 'recovery' ? 'CORE EXPOSED / COUNTERATTACK'
          : boss.phase === 'phase-change' ? 'REGULATOR FAILURE / PHASE TWO'
            : boss.phase === 'ko' ? 'MECHANISM FALLING SILENT' : 'OBSERVATORY ARMING';
    const repairs = this.route.repairCharges > 0 && playerHp > 0 && playerHp < 5 ? ` / INTERACT: REPAIR +1 HP ×${this.route.repairCharges}` : ` / FIELD REPAIRS ×${this.route.repairCharges}`;
    this.bossHud.setText(`${profile.name} / ${profile.epithet}\n${phaseName} / BOSS ${boss.hp}/${boss.maxHp} / IONA ${playerHp}/5 / VFX ${this.bossVfxEnabled ? 'ON' : 'OFF'}${repairs}${this.practiceBoss ? ' / PRACTICE' : ''}`);
  }
  private playBossCue(cue: 'loop' | 'tell' | 'strike' | 'phase' | 'ko'): void {
    const id = this.activeBoss?.id;
    if (!id) return;
    this.bossLastCue = `${id}:${cue}`;
    if (cue === 'loop') {
      this.bossAudio?.stop();
      this.bossAudio = this.sound.add(`b08-${id}-loop`, { loop: true, volume: .12 });
      if (this.audioUnlocked && !this.sound.locked) this.bossAudio.play();
      return;
    }
    if (this.audioUnlocked && !this.sound.locked && this.cache.audio.exists(`b08-${id}-${cue}`)) this.sound.play(`b08-${id}-${cue}`, { volume: cue === 'strike' ? .62 : .5 });
  }

  private stepHazards(dt: number): void {
    if (!this.room) return;
    const player = this.getB06PlayerFrame();
    const playerRect = combatantRect({ x: player.x, footY: player.y + player.height / 2, width: player.width, height: player.height, hp: player.hp });
    for (const hazard of this.room.hazards) {
      const frame = stepB07Hazard(hazard, this.roomElapsedMs);
      if (!frame) continue;
      this.roomHazardFrame.set(hazard.id, frame);
      if (hazard.kind === 'moving-lift') {
        const platform = this.platforms.get(hazard.platformId);
        if (!platform || frame.y === undefined) continue;
        const body = platform.source.body as Phaser.Physics.Arcade.Body;
        const targetY = frame.y + (platform.source.height / 2);
        body.setVelocityY(dt > 0 ? (targetY - body.center.y) * 1000 / dt : 0);
        (platform.visual as Phaser.GameObjects.Image).setY(frame.y + 4);
        continue;
      }
      const visual = this.hazardVisuals.get(hazard.id);
      if (!visual) continue;
      if (hazard.kind === 'thread-press') {
        const travel = Math.max(1, hazard.rail.right - hazard.rail.left - hazard.width);
        visual.image.x = hazard.rail.left + hazard.width / 2 + frame.progress * travel;
        visual.cue.x = visual.image.x;
      }
      const active = frame.phase === 'active';
      const alpha = frame.phase === 'warning' ? (this.reducedMotion ? .68 : .38 + .2 * Math.sin(this.roomElapsedMs / 75)) : active ? .98 : .2;
      visual.image.setAlpha(alpha);
      visual.cue.setText(frame.phase === 'warning' ? 'WARNING / MOVE' : active ? 'LIVE / DODGE OR JUMP' : 'RECOVERY / SAFE').setColor(frame.phase === 'active' ? '#ffcfab' : '#eaf2df');
      const threat = hazard.kind === 'thread-press'
        ? { left: visual.image.x - hazard.width / 2, right: visual.image.x + hazard.width / 2, top: hazard.rail.y, bottom: hazard.rail.y + hazard.height }
        : hazard.bounds;
      const cycle = Math.floor((this.roomElapsedMs + (hazard.phaseOffsetMs ?? 0)) / hazard.cycleMs);
      if (frame.phase === 'recovery') visual.hitPhases.clear();
      if (active && !visual.hitPhases.has(cycle) && overlaps(threat, playerRect)) {
        visual.hitPhases.add(cycle);
        const result = this.applyB06PlayerThreat(hazard.id, hazard.damage, this.combat!.playerX < visual.image.x ? -1 : 1);
        this.spawnFx('wisp-impact', player.x, player.y, 40, 32, this.reducedMotion ? 80 : 150);
        this.logEvent({ type: 'hazard-contact', hazardId: hazard.id, phase: frame.phase, result, damage: result === 'hit' ? hazard.damage : 0 });
      }
    }
  }

  private stepEnemies(dt: number): void {
    if (!this.room || !this.combat || this.director.enemies.length === 0) return;
    const player = this.getB06PlayerFrame();
    const result = stepB06Director(this.director, player, this.b06HitstopActive ? 0 : dt, this.getB06Blockers());
    this.director = result.state;
    for (const event of result.events) this.handleEnemyEvent(event, player);
  }

  private handleEnemyEvent(event: B06DirectorEvent, player: ReturnType<ChamberScene['getB06PlayerFrame']>): void {
    const enemy = this.director.enemies.find((candidate) => candidate.id === ('enemyId' in event ? event.enemyId : ''));
    if (event.type === 'telegraph' && enemy) {
      this.showEnemyTell(enemy);
      const cue = enemy.archetype === 'orbit-wisp' ? 'wisp-charge' : enemy.archetype === 'pressure-bastion' ? 'bastion-tell' : enemy.archetype === 'cantor' ? event.action === 'cantor-pulse' ? 'cantor-pulse' : 'cantor-sweep' : 'runner-tell';
      this.playCue(cue);
      this.logEvent({ type: 'enemy-telegraph', enemyId: enemy.id, archetype: enemy.archetype, action: event.action });
      return;
    }
    if (event.type === 'projectile-fired' && enemy) {
      this.director = spawnB06Projectile(this.director, enemy, player);
      this.playCue('wisp-shot');
      this.logEvent({ type: 'projectile-fired', enemyId: enemy.id, projectileId: event.projectileId });
      return;
    }
    if (event.type === 'projectile-hit') {
      const result = this.applyB06PlayerThreat(event.enemyId, 1, player.x < (enemy?.x ?? 0) ? -1 : 1);
      this.playCue('wisp-impact');
      this.logEvent({ type: 'projectile-hit', enemyId: event.enemyId, result });
      return;
    }
    if (event.type === 'projectile-blocked') { this.logEvent({ type: 'projectile-blocked', projectileId: event.projectileId }); return; }
    if (event.type === 'strike' && enemy) {
      const attack = this.enemyAttackRect(enemy, event.action, event.facing);
      const playerRect = combatantRect({ x: player.x, footY: player.y + player.height / 2, width: player.width, height: player.height, hp: player.hp });
      let result: ContactResult = isBlockedByRect(enemy.x, player.x, attack, this.getB06Blockers()) ? 'obstructed' : overlaps(attack, playerRect) ? 'hit' : 'miss';
      this.showEnemyStrike(enemy, event.action, event.facing);
      let outcome: ContactResult | 'dodged' | 'invulnerable' | 'blocked' = result;
      if (outcome === 'hit') outcome = this.applyB06PlayerThreat(enemy.id, enemy.archetype === 'cantor' || enemy.archetype === 'pressure-bastion' ? 2 : 1, event.facing === 1 ? -1 : 1);
      const cue = enemy.archetype === 'cantor' ? 'cantor-sweep' : enemy.archetype === 'pressure-bastion' ? 'bastion-block' : 'runner-slash';
      if (outcome !== 'hit') this.playCue(cue);
      this.logEvent({ type: 'enemy-strike', enemyId: enemy.id, archetype: enemy.archetype, action: event.action, sequence: event.sequence, result: outcome, rect: attack });
    }
  }

  private enemyAttackRect(enemy: B06EnemyRuntime, action: NonNullable<B06EnemyRuntime['action']>, facing: -1 | 1): CombatRect {
    const height = B06_ENEMY_PROFILES[enemy.archetype].height;
    if (action === 'cantor-pulse') return { left: enemy.x - 112, right: enemy.x + 112, top: enemy.y - 66, bottom: enemy.y + 66 };
    if (action === 'cantor-sweep') {
      const left = facing > 0 ? enemy.x + 10 : enemy.x - 145;
      return { left, right: left + 135, top: enemy.y - height / 2 - 1, bottom: enemy.y + 16 };
    }
    if (action === 'bastion-overhead') {
      const left = facing > 0 ? enemy.x + 2 : enemy.x - 70;
      return { left, right: left + 68, top: enemy.y - height + 1, bottom: enemy.y + height / 2 - 4 };
    }
    const reach = action === 'sentry-lunge' ? 38 : 54;
    const left = facing > 0 ? enemy.x + 3 : enemy.x - reach - 3;
    return { left, right: left + reach, top: enemy.y - 13, bottom: enemy.y + 23 };
  }

  private showEnemyTell(enemy: B06EnemyRuntime): void {
    const old = this.tellVisuals.get(enemy.id); old?.destroy();
    const name = enemy.archetype === 'orbit-wisp' ? 'wisp-charge' : enemy.archetype === 'pressure-bastion' ? 'bastion-shockfront' : enemy.archetype === 'cantor' ? 'cantor-ring-sweep' : 'runner-dash';
    const tell = this.add.image(enemy.x, enemy.y, `b07-fx-${name}`).setDisplaySize(64, 42).setAlpha(.32).setDepth(25);
    this.tellVisuals.set(enemy.id, tell); this.trackRoom(tell);
  }

  private showEnemyStrike(enemy: B06EnemyRuntime, action: NonNullable<B06EnemyRuntime['action']>, facing: -1 | 1): void {
    const name = action === 'wisp-shot' ? 'wisp-projectile' : action.startsWith('cantor') ? 'cantor-ring-sweep' : action === 'bastion-overhead' ? 'bastion-shockfront' : action === 'runner-dash' ? 'runner-dash' : 'runner-impact';
    const effect = this.add.image(enemy.x + facing * 26, enemy.y, `b07-fx-${name}`).setDisplaySize(action.startsWith('cantor') ? 142 : 90, action.startsWith('cantor') ? 60 : 42).setFlipX(facing < 0).setDepth(27);
    this.trackRoom(effect);
    this.tweens.add({ targets: effect, alpha: 0, duration: this.reducedMotion ? 110 : 230, onComplete: () => effect.destroy() });
  }

  private spawnFx(name: string, x: number, y: number, width: number, height: number, duration: number): void {
    if (this.reducedMotion) return;
    const key = `b07-fx-${name}`;
    if (!this.textures.exists(key)) return;
    const effect = this.add.image(x, y, key).setDisplaySize(width, height).setDepth(28);
    this.trackRoom(effect);
    this.tweens.add({ targets: effect, alpha: 0, duration, onComplete: () => effect.destroy() });
  }

  private syncEnemyPresentation(): void {
    for (const enemy of this.director.enemies) {
      const visual = this.enemyVisuals.get(enemy.id);
      if (!visual) continue;
      const profile = B06_ENEMY_PROFILES[enemy.archetype];
      const pose = this.enemyTexture(enemy);
      const feet = enemy.archetype === 'orbit-wisp' ? enemy.y : enemy.y + profile.height / 2;
      visual.sprite.setPosition(enemy.x, feet).setFlipX(enemy.facing < 0);
      visual.label.setPosition(enemy.x, feet - (enemy.archetype === 'orbit-wisp' ? 44 : 82)).setText(`${enemy.archetype.toUpperCase()}  ${enemy.hp}/${enemy.maxHp}`);
      if (pose !== visual.pose && this.textures.exists(pose)) { visual.sprite.setTexture(pose); visual.pose = pose; }
      visual.bar.clear().fillStyle(0x07111b, .92).fillRect(enemy.x - 22, feet - (enemy.archetype === 'orbit-wisp' ? 50 : 84), 44, 3)
        .fillStyle(enemy.archetype === 'cantor' ? 0xd3a7e7 : enemy.archetype === 'pressure-bastion' ? 0xe8b15d : 0x91dfd3, .96)
        .fillRect(enemy.x - 22, feet - (enemy.archetype === 'orbit-wisp' ? 50 : 84), 44 * Math.max(0, enemy.hp / enemy.maxHp), 3);
      const tell = this.tellVisuals.get(enemy.id);
      if (tell && enemy.phase !== 'telegraph') { tell.destroy(); this.tellVisuals.delete(enemy.id); }
    }
  }

  private stepB09Launches(deltaMs: number): void {
    if (!this.b09Mode || this.b09Launches.size === 0) return;
    const gravity = 820;
    const launched = new Map(this.b09Launches);
    this.director = { ...this.director, enemies: this.director.enemies.map((enemy) => {
      const flight = launched.get(enemy.id);
      if (!flight || enemy.hp <= 0) { launched.delete(enemy.id); return enemy; }
      flight.elapsedMs += deltaMs;
      const seconds = flight.elapsedMs / 1000;
      const y = flight.startY + flight.launchVelocity * seconds + .5 * gravity * seconds * seconds;
      if (seconds > .05 && y >= flight.startY) { launched.delete(enemy.id); return { ...enemy, y: flight.startY }; }
      return { ...enemy, y };
    }) };
    this.b09Launches = launched;
  }

  private enemyTexture(enemy: B06EnemyRuntime): string {
    const arch = enemy.archetype;
    if (arch === 'spindle-sentry') {
      const state = enemy.phase === 'ko' ? 'ko' : enemy.phase === 'telegraph' ? 'telegraph' : enemy.phase === 'commit' ? 'lunge' : enemy.phase === 'hurt' ? 'hurt' : enemy.phase === 'vulnerable' ? 'stagger' : 'idle';
      return `iona-b03-sentry-${state}`;
    }
    if (enemy.phase === 'ko') return `b07-${arch}-ko`;
    if (arch === 'cantor') {
      if (enemy.phase === 'intro') return 'b07-cantor-intro';
      if (enemy.phase === 'telegraph') return `b07-cantor-${enemy.action === 'cantor-pulse' ? 'pulse-telegraph' : 'sweep-telegraph'}`;
      if (enemy.phase === 'commit') return `b07-cantor-${enemy.action === 'cantor-pulse' ? 'pulse-attack' : 'sweep-attack'}`;
      return enemy.phase === 'recover' ? 'b07-cantor-sweep-recovery' : enemy.phase === 'vulnerable' ? 'b07-cantor-vulnerable' : enemy.phase === 'hurt' ? 'b07-cantor-hurt' : enemy.phase === 'approach' ? 'b07-cantor-move' : 'b07-cantor-idle';
    }
    if (arch === 'pressure-bastion') return enemy.phase === 'telegraph' ? 'b07-pressure-bastion-telegraph' : enemy.phase === 'commit' ? 'b07-pressure-bastion-attack' : enemy.phase === 'recover' ? 'b07-pressure-bastion-recovery' : enemy.phase === 'hurt' || enemy.phase === 'stagger' ? 'b07-pressure-bastion-guard-break' : enemy.phase === 'approach' ? 'b07-pressure-bastion-move' : enemy.phase === 'guard' ? 'b07-pressure-bastion-guard' : 'b07-pressure-bastion-idle';
    const state = enemy.phase === 'telegraph' ? 'telegraph' : enemy.phase === 'commit' ? 'attack' : enemy.phase === 'recover' || enemy.phase === 'vulnerable' ? 'recovery' : enemy.phase === 'stagger' ? 'stagger' : enemy.phase === 'hurt' ? 'hurt' : enemy.phase === 'approach' ? 'move' : 'idle';
    return `b07-${arch}-${state}`;
  }

  private syncProjectiles(): void {
    const alive = new Set(this.director.projectiles.map((projectile) => projectile.id));
    for (const [id, visual] of this.projectileVisuals) if (!alive.has(id)) { visual.destroy(); this.projectileVisuals.delete(id); }
    for (const projectile of this.director.projectiles) {
      let visual = this.projectileVisuals.get(projectile.id);
      if (!visual) {
        visual = this.add.image(projectile.x, projectile.y, 'b07-fx-wisp-projectile').setDisplaySize(26, 26).setDepth(23);
        this.projectileVisuals.set(projectile.id, visual); this.trackRoom(visual);
      }
      visual.setPosition(projectile.x, projectile.y);
    }
  }

  private drawHud(): void {
    if (!this.room || !this.combat) return;
    const region = this.room.region === 'sunderglass-reach' ? 'SUNDERGLASS REACH' : 'VESPER LOOMWORKS';
    const routeNumber = Math.min(this.route.roomIndex + 1, this.route.rooms.length);
    this.drawBuildSummary();
    this.roomLabel?.setText(`${region}  /  ${this.room.id.toUpperCase()}`);
    this.routeLabel?.setText(`ROOM ${routeNumber}/${this.route.rooms.length}  ·  SEED ${this.route.seed.toString(16).toUpperCase()}  ·  ${this.dawnrushSnapshot()?.form.toUpperCase() ?? 'BASE'}`);
    this.vitalsLabel?.setText(`IONA ${this.combat.playerHp}/5  ·  RESONANCE ${Math.floor(this.combat.resonance)}  ·  FIELD REPAIRS ${this.route.repairCharges}`);
    const enemiesRemaining = this.director.enemies.filter((enemy) => enemy.hp > 0).length;
    this.objectiveLabel?.setText(this.room.id === 'vl-night-side-threshold' ? this.b08Mode ? 'FINAL CONFRONTATION  /  BROKEN MERIDIAN' : 'B08 THRESHOLD  /  NO BOSS IN THIS BUILD' : enemiesRemaining ? `${enemiesRemaining} ENEMY SIGNAL${enemiesRemaining === 1 ? '' : 'S'}` : this.room.reward.kind !== 'none' && !this.route.rewarded.includes(this.room.id) ? 'FIELD REWARD AVAILABLE' : 'EXIT THREAD OPEN');
  }

  private platformTexture(room: B07RoomTemplate, art: B07RoomTemplate['platforms'][number]['art']): string {
    if (room.region === 'sunderglass-reach') return art === 'sunderglass-short' ? 'b07-sg-platform-short' : art === 'sunderglass-conduit' ? 'b07-sg-conduit-tile' : 'b07-sg-platform-long';
    return art === 'vesper-thread' ? 'b07-vesper-platform-thread' : art === 'vesper-lift' ? 'b07-vesper-platform-lift' : 'b07-vesper-platform-long';
  }

  private startRegionAmbience(): void {
    if (!this.audioUnlocked || this.sound.locked || !this.room) return;
    this.ambience?.stop(); this.ambience = undefined;
    if (this.room.region === 'sunderglass-reach') {
      this.ambience = this.sound.add('b07-audio-sunderglass', { loop: true, volume: .14 });
      this.ambience.play();
    } else this.startVesperDrone();
  }

  private startVesperDrone(): void {
    try {
      const context = this.vesperContext ?? new AudioContext();
      this.vesperContext = context;
      if (context.state === 'suspended') void context.resume();
      if (this.vesperOscillators.length) return;
      const master = context.createGain(); master.gain.value = .018;
      const filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 220; filter.Q.value = .7;
      master.connect(filter); filter.connect(context.destination); this.vesperGain = master;
      for (const [frequency, detune] of [[55, -3], [82.4, 4], [110, 0]] as const) {
        const oscillator = context.createOscillator(); oscillator.type = 'triangle'; oscillator.frequency.value = frequency; oscillator.detune.value = detune;
        oscillator.connect(master); oscillator.start(); this.vesperOscillators.push(oscillator);
      }
    } catch { this.logEvent({ type: 'audio-unavailable', region: 'vesper-loomworks' }); }
  }

  private unlockAudio(): void {
    this.audioUnlocked = true;
    void this.vesperContext?.resume();
    if (this.vesperGain && this.vesperContext) void this.vesperGain.gain.setTargetAtTime(.018, this.vesperContext.currentTime, .18);
    this.startRegionAmbience();
    if (this.activeBoss && this.bossAudio && !this.bossAudio.isPlaying && !this.sound.locked) this.bossAudio.play();
  }

  private playCue(name: string): void {
    this.lastB07AudioCue = name;
    if (!this.audioUnlocked || this.sound.locked || !this.cache.audio.exists(`b07-audio-${name}`)) return;
    this.sound.play(`b07-audio-${name}`, { volume: .55 });
  }

  private showBanner(text: string): void {
    if (!this.bannerLabel) return;
    this.tweens.killTweensOf(this.bannerLabel);
    this.bannerLabel.setText(text).setVisible(true).setAlpha(1);
    if (this.reducedMotion) {
      this.time.delayedCall(1400, () => this.bannerLabel?.setVisible(false));
    } else {
      this.tweens.add({ targets: this.bannerLabel, alpha: 0, duration: 1200, onComplete: () => this.bannerLabel?.setVisible(false) });
    }
  }

  private drawBuildSummary(): void {
    if (!this.b09Mode || !this.buildLabel) return;
    const active = Object.entries(this.runBuild.ranks).filter((entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] > 0);
    const text = active.map(([id, rank]) => `${id.toUpperCase().replaceAll('-', ' ')} ${rank}`).join(' / ');
    this.buildLabel.setText(text ? `RUN BUILD  /  ${text}` : 'RUN BUILD  /  NO ATTUNEMENTS YET').setVisible(true);
  }

  private finish(result: 'victory' | 'defeat'): void {
    if (this.resultSent) return;
    this.resultSent = true;
    if (this.b08Mode) this.bossOutcome = result;
    this.ambience?.stop();
    window.dispatchEvent(new CustomEvent('crownflare:b07-result', { detail: {
      result, elapsedMs: this.runElapsedMs, damageTaken: this.damageTaken, repairCharges: this.route.repairCharges,
      resonance: this.route.resonance, visited: this.route.visited, choices: this.route.choices, seed: this.route.seed,
      b08BossBuilt: this.b08Mode, b08BossesCleared: [...this.bossCleared], b08Practice: this.practiceBoss !== null,
      b09Enabled: this.b09Mode, b09Build: this.runBuild, b10Enabled: this.b10Mode, runId: this.runId,
    } }));
    this.logEvent({ type: 'result', result, runElapsedMs: this.runElapsedMs, damageTaken: this.damageTaken, choices: this.route.choices });
    this.emitState();
  }

  private emitState(): void { this.drawBuildSummary(); window.dispatchEvent(new CustomEvent('crownflare:b07-state', { detail: this.b07Snapshot() })); }
  private emitB10Checkpoint(): void {
    if (!this.b10Mode || this.restoringCheckpoint || this.resultSent) return;
    const durable = this.combatSnapshot();
    if (!durable) return;
    const form = this.dawnrushSnapshot();
    const checkpoint: B10RunCheckpoint = {
      runId: this.runId, seed: this.route.seed, route: this.route, build: this.runBuild,
      playerHp: Math.max(1, durable.playerHp), resonance: durable.resonance,
      dawnrushEnergy: form?.energy ?? 70, dawnrushActive: form?.form === 'Dawnrush',
      bossesCleared: [...this.bossCleared], elapsedMs: Math.round(this.runElapsedMs), damageTaken: this.damageTaken,
      checkpointId: `${this.route.seed}:${this.route.roomIndex}:${this.route.rooms[this.route.roomIndex] ?? 'route-choice'}:${this.bossCleared.join(',')}`,
    };
    window.dispatchEvent(new CustomEvent('crownflare:b10-checkpoint', { detail: checkpoint }));
  }
  private logEvent(event: Record<string, unknown>): void { this.eventLog.push({ ...event, elapsedMs: Math.round(this.runElapsedMs) }); if (this.eventLog.length > 180) this.eventLog.splice(0, this.eventLog.length - 180); }

  private trackRoom<T extends Phaser.GameObjects.GameObject>(object: T): T { this.roomObjects.push(object); return object; }
  private trackEnvironment<T extends Phaser.GameObjects.GameObject>(object: T): T { this.roomObjects.push(object); return object; }

  private destroyRoom(): void {
    for (const collider of this.roomColliders) collider.destroy();
    this.roomColliders = [];
    this.sound.stopAll();
    this.bossAudio?.stop(); this.bossAudio = undefined;
    for (const object of this.roomObjects) { this.tweens.killTweensOf(object); object.destroy(); }
    this.roomObjects = [];
    this.platforms.clear(); this.enemyVisuals.clear(); this.projectileVisuals.clear(); this.tellVisuals.clear(); this.hazardVisuals.clear(); this.roomHazardFrame.clear();
    this.roomReward = undefined; this.roomExit = undefined;
    this.bossSprite = undefined; this.bossEffectSprite = undefined; this.bossHud = undefined; this.bossBar = undefined; this.bossTell = undefined; this.bossOverlay = undefined;
    this.bossLastFrame = ''; this.bossActiveRects = [];
    this.director = createB06Director();
    this.b09Launches.clear();
    this.setCombatBlockers([]);
  }

  private shutdownRoom(): void {
    this.ambience?.stop(); this.sound.stopAll();
    for (const oscillator of this.vesperOscillators) { try { oscillator.stop(); oscillator.disconnect(); } catch { /* already stopped during shutdown */ } }
    this.vesperOscillators = [];
    this.vesperGain?.disconnect(); this.vesperGain = undefined;
    void this.vesperContext?.close(); this.vesperContext = undefined;
    this.destroyRoom();
  }
}
