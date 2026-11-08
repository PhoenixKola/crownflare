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

  constructor(onPauseRequested: () => void, onControllerState: (active: boolean) => void, seed?: number) {
    super(onPauseRequested, onControllerState, { ionaPreview: true, b03Combat: true, b04: true, b05: true, b06: true, b07: true });
    const querySeed = Number(new URLSearchParams(window.location.search).get('seed'));
    this.worldSeed = seed ?? (Number.isFinite(querySeed) && querySeed !== 0 ? Math.trunc(querySeed) >>> 0 : 20261108);
    this.route = initialB07Route(this.worldSeed);
    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
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
  }

  override create(): void {
    super.create();
    this.createHud();
    this.input.keyboard?.on('keydown', () => this.unlockAudio());
    this.input.on(Phaser.Input.Events.POINTER_DOWN, () => this.unlockAudio());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdownRoom());
    this.loadCurrentRoom();
    this.emitState();
  }

  override update(time: number, delta: number): void {
    super.update(time, delta);
    if (this.menu || this.resultSent || !this.room || this.combat === null) return;
    const dt = Math.min(50, Math.max(0, delta));
    this.combat = this.combatSnapshot();
    if (!this.combat) return;
    this.runElapsedMs += dt;
    this.roomElapsedMs += dt;
    if (this.combat.playerHp < this.lastPlayerHp) this.damageTaken += this.lastPlayerHp - this.combat.playerHp;
    this.lastPlayerHp = this.combat.playerHp;
    this.stepHazards(dt);
    this.stepEnemies(dt);
    this.syncEnemyPresentation();
    this.syncProjectiles();
    this.updateRoomPrompts();
    this.drawHud();
    if (this.combat.playerHp <= 0) this.finish('defeat');
    this.emitState();
  }

  protected override handleExclusiveInput(input: ReturnType<InputController['read']>): boolean {
    if (!this.menu) return false;
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
    this.route = advanceB07Room(this.route);
    this.logEvent({ type: 'room-cleared', roomId: this.room.id, routeIndex: this.route.roomIndex, choices: this.route.choices });
    if (this.route.complete) { this.finish('victory'); return true; }
    this.loadCurrentRoom();
    return true;
  }

  protected override b06CombatTargets(): readonly B06CombatTarget[] {
    const player = this.getB06PlayerFrame();
    return this.director.enemies.map((enemy) => {
      const profile = B06_ENEMY_PROFILES[enemy.archetype];
      const guarding = b06EnemyIsGuarding(enemy, player.x, 'light-1', player.y + player.height / 2);
      return { id: enemy.id, archetype: enemy.archetype, x: enemy.x, y: enemy.y, width: profile.width, height: profile.height, hp: enemy.hp, alive: enemy.hp > 0, guarding, guardBreakable: enemy.archetype === 'pressure-bastion' && guarding };
    });
  }

  protected override onB06ContactResult(target: B06CombatTarget, result: MoveContactResult, move: B03MoveDefinition, event: CombatEvent, guardBreak: boolean): void {
    const enemy = this.director.enemies.find((candidate) => candidate.id === target.id);
    if (!enemy) return;
    if (result !== 'hit') {
      if (result === 'blocked') this.playCue('bastion-block');
      this.logEvent({ type: result, targetId: target.id, move: move.id, atMs: event.atMs });
      return;
    }
    const wasThreatening = enemy.phase === 'telegraph' || enemy.phase === 'commit';
    const contactKind = guardBreak ? 'guard-break' : wasThreatening ? 'interrupt' : move.knockbackY < -55 ? 'stagger' : 'hit';
    const updated = applyB06EnemyContact(enemy, contactKind, move.damage + (guardBreak ? 1 : 0), this.getB06PlayerFrame().facing * move.knockbackX);
    this.director = { ...this.director, enemies: this.director.enemies.map((candidate) => candidate.id === enemy.id ? updated : candidate) };
    this.spawnFx(guardBreak ? 'bastion-guard-break' : enemy.archetype === 'orbit-wisp' ? 'wisp-impact' : 'runner-impact', enemy.x, enemy.y, 64, 50, 220);
    if (updated.phase === 'ko') this.playCue('enemy-ko');
    this.logEvent({ type: updated.phase === 'ko' ? 'enemy-ko' : contactKind, targetId: enemy.id, archetype: enemy.archetype, move: move.id, damage: move.damage + (guardBreak ? 1 : 0), hp: updated.hp, atMs: event.atMs });
  }

  protected override onB06ThreatEvent(event: { readonly sourceId: string; readonly result: 'hit' | 'dodged' | 'invulnerable'; readonly damage: number }): void {
    this.logEvent({ type: `player-${event.result}`, sourceId: event.sourceId, damage: event.damage, hp: this.combatSnapshot()?.playerHp ?? 0 });
  }

  override setLabAudioPaused(paused: boolean): void {
    super.setLabAudioPaused(paused);
    if (paused) { this.ambience?.stop(); if (this.vesperGain && this.vesperContext) void this.vesperGain.gain.setTargetAtTime(0, this.vesperContext.currentTime, .04); }
    else { this.startRegionAmbience(); if (this.vesperGain && this.vesperContext) void this.vesperGain.gain.setTargetAtTime(.018, this.vesperContext.currentTime, .18); }
  }

  b07Snapshot(): {
    seed: number; roomId: string | null; region: string | null; roomIndex: number; routeLength: number; choices: B07RouteState['choices'];
    visited: readonly string[]; repairCharges: number; resonance: number; playerHp: number; enemies: readonly { id: string; archetype: string; x: number; y: number; hp: number; phase: string }[];
    hazards: readonly { id: string; phase: string; progress: number }[]; menu: B07ChoiceId | null; rewardClaimed: boolean; reducedMotion: boolean;
      loadedTextures: number; missingTextures: string[]; result: 'victory' | 'defeat' | null; lastAudioCue: string; events: readonly Record<string, unknown>[];
  } {
    const expected = ['b07-sg-horizon', 'b07-sg-architecture', 'b07-vesper-horizon', 'b07-vesper-platform-long', 'b07-shardrunner-idle', 'b07-orbit-wisp-idle', 'b07-pressure-bastion-idle', 'b07-cantor-idle'];
    const missingTextures = expected.filter((key) => !this.textures.exists(key));
    return {
      seed: this.route.seed, roomId: this.room?.id ?? null, region: this.room?.region ?? null, roomIndex: this.route.roomIndex + (this.route.complete ? 0 : 1), routeLength: this.route.rooms.length,
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
      loadedTextures: expected.length - missingTextures.length, missingTextures, result: this.resultSent ? (this.route.complete ? 'victory' : 'defeat') : null, lastAudioCue: this.lastB07AudioCue, events: [...this.eventLog],
    };
  }

  b07EventLog(): readonly Record<string, unknown>[] { return this.eventLog; }

  resetB07Run(seed = this.worldSeed): void {
    this.resultSent = false;
    this.damageTaken = 0;
    this.runElapsedMs = 0;
    this.eventLog = [];
    this.route = initialB07Route(seed);
    this.resetB03Encounter();
    this.setLabAudioPaused(false);
    this.loadCurrentRoom();
    this.emitState();
  }

  private loadCurrentRoom(): void {
    this.destroyRoom();
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
    this.playCue('shard-reward');
    this.showBanner(health > 0 && resonance > 0 ? `REPAIR +${health}  /  RESONANCE +${resonance}` : health > 0 ? `FIELD REPAIR +${health}` : `RESONANCE +${resonance}`);
    this.logEvent({ type: 'reward-claimed', roomId: this.room.id, repair: health, resonance, repairCharges: this.route.repairCharges, totalResonance: this.route.resonance });
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
      let outcome: ContactResult | 'dodged' | 'invulnerable' = result;
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
    this.roomLabel?.setText(`${region}  /  ${this.room.id.toUpperCase()}`);
    this.routeLabel?.setText(`ROOM ${routeNumber}/${this.route.rooms.length}  ·  SEED ${this.route.seed.toString(16).toUpperCase()}  ·  ${this.dawnrushSnapshot()?.form.toUpperCase() ?? 'BASE'}`);
    this.vitalsLabel?.setText(`IONA ${this.combat.playerHp}/5  ·  RESONANCE ${Math.floor(this.combat.resonance)}  ·  FIELD REPAIRS ${this.route.repairCharges}`);
    const enemiesRemaining = this.director.enemies.filter((enemy) => enemy.hp > 0).length;
    this.objectiveLabel?.setText(this.room.id === 'vl-night-side-threshold' ? 'B08 THRESHOLD  /  NO BOSS IN THIS BUILD' : enemiesRemaining ? `${enemiesRemaining} ENEMY SIGNAL${enemiesRemaining === 1 ? '' : 'S'}` : this.room.reward.kind !== 'none' && !this.route.rewarded.includes(this.room.id) ? 'FIELD REWARD AVAILABLE' : 'EXIT THREAD OPEN');
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
  }

  private playCue(name: string): void {
    this.lastB07AudioCue = name;
    if (!this.audioUnlocked || this.sound.locked || !this.cache.audio.exists(`b07-audio-${name}`)) return;
    this.sound.play(`b07-audio-${name}`, { volume: .55 });
  }

  private showBanner(text: string): void {
    this.bannerLabel?.setText(text).setAlpha(1);
    if (!this.reducedMotion && this.bannerLabel) this.tweens.add({ targets: this.bannerLabel, alpha: .78, duration: 600, yoyo: true, repeat: 1 });
  }

  private finish(result: 'victory' | 'defeat'): void {
    if (this.resultSent) return;
    this.resultSent = true;
    this.ambience?.stop();
    window.dispatchEvent(new CustomEvent('crownflare:b07-result', { detail: {
      result, elapsedMs: this.runElapsedMs, damageTaken: this.damageTaken, repairCharges: this.route.repairCharges,
      resonance: this.route.resonance, visited: this.route.visited, choices: this.route.choices, seed: this.route.seed,
      b08BossBuilt: false,
    } }));
    this.logEvent({ type: 'result', result, runElapsedMs: this.runElapsedMs, damageTaken: this.damageTaken, choices: this.route.choices });
    this.emitState();
  }

  private emitState(): void { window.dispatchEvent(new CustomEvent('crownflare:b07-state', { detail: this.b07Snapshot() })); }
  private logEvent(event: Record<string, unknown>): void { this.eventLog.push({ ...event, elapsedMs: Math.round(this.runElapsedMs) }); if (this.eventLog.length > 180) this.eventLog.splice(0, this.eventLog.length - 180); }

  private trackRoom<T extends Phaser.GameObjects.GameObject>(object: T): T { this.roomObjects.push(object); return object; }
  private trackEnvironment<T extends Phaser.GameObjects.GameObject>(object: T): T { this.roomObjects.push(object); return object; }

  private destroyRoom(): void {
    for (const collider of this.roomColliders) collider.destroy();
    this.roomColliders = [];
    this.sound.stopAll();
    for (const object of this.roomObjects) { this.tweens.killTweensOf(object); object.destroy(); }
    this.roomObjects = [];
    this.platforms.clear(); this.enemyVisuals.clear(); this.projectileVisuals.clear(); this.tellVisuals.clear(); this.hazardVisuals.clear(); this.roomHazardFrame.clear();
    this.roomReward = undefined; this.roomExit = undefined;
    this.director = createB06Director();
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
