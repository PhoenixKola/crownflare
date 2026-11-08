import * as Phaser from 'phaser';
import { overlaps, isBlockedByRect, combatantRect, type ContactResult, type CombatRect } from '../combat/b03Moves';
import { SUNDERGLASS_ATRIUM } from '../rooms/sunderglassAtrium';
import {
  applyB06EnemyContact, b06EnemyIsGuarding, B06_ENEMY_PROFILES, createB06Director, createB06Enemy,
  spawnB06Projectile, stepB06Director,
  type B06Archetype, type B06DirectorEvent, type B06DirectorState, type B06EnemyRuntime,
} from '../enemies/b06EnemyModel';
import { initialB06Encounter, recordB06Damage, recordB06Elapsed, stepB06Encounter, type B06EncounterPhase, type B06EncounterState } from '../enemies/b06EncounterFlow';
import { ChamberScene, type B03CombatSnapshot, type B06CombatTarget } from './ChamberScene';
import type { B03MoveDefinition } from '../combat/b03Moves';
import type { CombatEvent } from '../combat/sim';

const ROOT = './assets/enemies/b06/';
const ENEMY_STATES = {
  'shardrunner': ['idle', 'move', 'turn', 'attack', 'telegraph', 'recovery', 'hurt', 'ko'],
  'orbit-wisp': ['idle', 'move', 'telegraph', 'attack', 'recovery', 'hurt', 'stagger', 'ko'],
  'pressure-bastion': ['idle', 'move', 'guard', 'telegraph', 'attack', 'recovery', 'guard-break', 'ko'],
  'cantor': ['intro', 'idle', 'move', 'sweep-telegraph', 'sweep-attack', 'sweep-recovery', 'pulse-telegraph', 'pulse-attack', 'vulnerable', 'hurt', 'ko', 'disperse'],
} as const;
const EXPECTED_EFFECTS = ['runner-dash', 'runner-impact', 'wisp-charge', 'wisp-projectile', 'wisp-impact', 'bastion-shockfront', 'bastion-guard-break', 'cantor-ring-sweep'] as const;
const EXPECTED_AUDIO = [
  'runner-step', 'runner-tell', 'runner-slash', 'wisp-hover', 'wisp-charge', 'wisp-shot', 'wisp-impact',
  'bastion-step', 'bastion-tell', 'bastion-impact', 'bastion-block', 'bastion-break', 'cantor-intro',
  'cantor-sweep', 'cantor-pulse', 'enemy-ko', 'wave-clear', 'shard-reward',
] as const;
const ENVIRONMENT = [
  'horizon', 'architecture', 'platform-long', 'platform-short', 'conduit-tile',
  'entry-beacon', 'reward-shard', 'exit-gate', 'sentry-telegraph', 'sentry-attack-0', 'sentry-attack-1', 'sentry-attack-2',
  'impact-0', 'impact-1', 'impact-2',
] as const;
const GROUND_TOP = SUNDERGLASS_ATRIUM.world.groundTop;

type EnemyVisual = { readonly sprite: Phaser.GameObjects.Image; readonly label: Phaser.GameObjects.Text; readonly lastPose: string; readonly barX: number };

/** Dev-only B06 encounter route: multi-target enemy behavior while the base/Dawnrush player core stays shared. */
export class B06EnemyGauntletScene extends ChamberScene {
  private flow: B06EncounterState = initialB06Encounter();
  private director: B06DirectorState = createB06Director();
  private waveIds: string[] = [];
  private currentCombat: B03CombatSnapshot | null = null;
  private lastPlayerHp = 5;
  private waveClearDelayMs = 0;
  private resultSent = false;
  private audioUnlocked = false;
  private ambience?: Phaser.Sound.BaseSound;
  private readonly enemyVisuals = new Map<string, EnemyVisual>();
  private readonly projectileVisuals = new Map<string, Phaser.GameObjects.Image>();
  private readonly tellVisuals = new Map<string, Phaser.GameObjects.Image>();
  private readonly transientEffects: Phaser.GameObjects.Image[] = [];
  private hudGraphics?: Phaser.GameObjects.Graphics;
  private hudVitals?: Phaser.GameObjects.Text;
  private hudObjective?: Phaser.GameObjects.Text;
  private hudControls?: Phaser.GameObjects.Text;
  private interactPrompt?: Phaser.GameObjects.Text;
  private rewardShard?: Phaser.GameObjects.Image;
  private exitGate?: Phaser.GameObjects.Image;
  private gatePulse?: Phaser.Tweens.Tween;
  private environment?: Phaser.GameObjects.TileSprite;
  private eventLog: Array<Record<string, unknown>> = [];
  private b06LastAudioCue = 'none';
  private readonly rosterBoardMode: boolean;

  constructor(onPauseRequested: () => void, onControllerState: (active: boolean) => void) {
    super(onPauseRequested, onControllerState, { ionaPreview: true, b03Combat: true, b04: true, b05: true, b06: true });
    this.rosterBoardMode = new URLSearchParams(window.location.search).get('roster') === '1';
  }

  override preload(): void {
    super.preload();
    for (const file of ENVIRONMENT) this.load.image(`b06-env-${file}`, `./assets/environments/b04/${file}.png`);
    for (const [archetype, states] of Object.entries(ENEMY_STATES)) {
      for (const state of states) this.load.image(`b06-${archetype}-${state}`, `${ROOT}${archetype}-${state}.png`);
    }
    for (const effect of EXPECTED_EFFECTS) this.load.image(`b06-fx-${effect}`, `${ROOT}fx-${effect}.png`);
    for (const cue of EXPECTED_AUDIO) this.load.audio(`b06-audio-${cue}`, `./assets/audio/b06/${cue}.wav`);
    this.load.audio('b06-audio-sunderglass-ambience', './assets/audio/b04/sunderglass-ambience.wav');
  }

  override create(): void {
    super.create();
    this.setB04StartPosition(SUNDERGLASS_ATRIUM.entryStartX);
    this.createEnvironment();
    if (this.rosterBoardMode) {
      this.createRosterBoard();
      this.emitState();
      return;
    }
    this.createHud();
    this.spawnWave('familiarization');
    this.rewardShard?.setVisible(false);
    this.exitGate?.setAlpha(.32);
    this.input.keyboard?.on('keydown', () => this.unlockB06Audio());
    this.input.on(Phaser.Input.Events.POINTER_DOWN, () => this.unlockB06Audio());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.sound.stopAll();
      for (const effect of this.transientEffects) effect.destroy();
      this.transientEffects.length = 0;
      this.enemyVisuals.clear();
      this.projectileVisuals.clear();
      this.tellVisuals.clear();
    });
    this.emitState();
  }

  override update(time: number, delta: number): void {
    super.update(time, delta);
    if (this.resultSent) return;
    if (this.rosterBoardMode) {
      this.currentCombat = this.combatSnapshot();
      this.syncEnemyPresentation();
      this.emitState();
      return;
    }
    const dt = Math.min(50, Math.max(0, delta));
    this.flow = recordB06Elapsed(this.flow, dt);
    const combat = this.combatSnapshot();
    this.currentCombat = combat;
    if (!combat) return;
    if (combat.playerHp < this.lastPlayerHp) {
      for (let index = combat.playerHp; index < this.lastPlayerHp; index += 1) this.flow = recordB06Damage(this.flow);
    }
    this.lastPlayerHp = combat.playerHp;
    if (combat.playerHp <= 0 && this.flow.phase !== 'defeat') {
      this.flow = stepB06Encounter(this.flow, 'player-defeated');
      this.emitEvent({ type: 'defeat', phase: this.flow.phase, playerHp: combat.playerHp });
      this.finishResult('defeat');
    } else if (this.isWavePhase(this.flow.phase)) this.stepWave(combat, dt);
    this.updatePresentation(combat);
    this.updateWorldState(combat);
    this.drawHud(combat);
    this.emitState();
  }

  protected override handleB04Interact(): boolean {
    const combat = this.currentCombat ?? this.combatSnapshot();
    if (!combat) return true;
    if (this.flow.phase === 'reward') {
      if (Math.abs(combat.playerX - 1295) > 46) return true;
      this.flow = stepB06Encounter(this.flow, 'claim-reward');
      this.rewardShard?.setVisible(false);
      this.grantB06Reward(2, 34, 24);
      this.exitGate?.setAlpha(1);
      this.gatePulse ??= this.tweens.add({ targets: this.exitGate, scaleX: 1.055, scaleY: 1.055, duration: 720, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.playCue('shard-reward');
      this.showBanner('RESONANCE REPAIRED / THE ATRIUM GATE IS OPEN');
      this.emitEvent({ type: 'reward-claimed', phase: this.flow.phase, healthRestored: 2, resonanceRestored: 34, dawnrushRestored: 24 });
      return true;
    }
    if (this.flow.phase === 'exit') {
      if (Math.abs(combat.playerX - SUNDERGLASS_ATRIUM.exitX) > 52) return true;
      this.flow = stepB06Encounter(this.flow, 'enter-exit');
      this.emitEvent({ type: 'victory', phase: this.flow.phase });
      this.finishResult('victory');
      return true;
    }
    return true;
  }

  protected override b06CombatTargets(): readonly B06CombatTarget[] {
    if (this.rosterBoardMode) return [];
    const player = this.getB06PlayerFrame();
    return this.director.enemies.map((enemy) => {
      const profile = B06_ENEMY_PROFILES[enemy.archetype];
      const guardActive = b06EnemyIsGuarding(enemy, player.x, 'light-1', player.y + player.height / 2);
      return {
        id: enemy.id, archetype: enemy.archetype, x: enemy.x, y: enemy.y, width: profile.width, height: profile.height,
        hp: enemy.hp, alive: enemy.hp > 0, guarding: guardActive,
        guardBreakable: enemy.archetype === 'pressure-bastion' && guardActive,
      };
    });
  }

  protected override getB06Blockers(): readonly CombatRect[] {
    // Thin chamber ledges are one-way traversal surfaces, not walls for the
    // ground enemy navigation model. Keep only the authored full-height barrier.
    return super.getB06Blockers().filter((blocker) => blocker.bottom - blocker.top >= 20);
  }

  protected override onB06ContactResult(target: B06CombatTarget, result: ContactResult, move: B03MoveDefinition, event: CombatEvent, guardBreak: boolean): void {
    const enemy = this.director.enemies.find((candidate) => candidate.id === target.id);
    if (!enemy) return;
    if (result === 'blocked') {
      const presentation = this.enemyVisuals.get(enemy.id);
      presentation?.sprite.setTint(0xf0c47e);
      this.time.delayedCall(85, () => presentation?.sprite.clearTint());
      this.playCue('bastion-block');
      this.emitEvent({ type: 'blocked', targetId: enemy.id, archetype: enemy.archetype, move: move.id, atMs: event.atMs });
      return;
    }
    if (result !== 'hit') {
      this.emitEvent({ type: result, targetId: enemy.id, archetype: enemy.archetype, move: move.id, atMs: event.atMs });
      return;
    }
    const wasThreatening = enemy.phase === 'telegraph' || enemy.phase === 'commit';
    const contactKind = guardBreak ? 'guard-break' : wasThreatening ? 'interrupt' : move.knockbackY < -55 ? 'stagger' : 'hit';
    const damage = move.damage + (guardBreak ? 1 : 0);
    const knockback = (this.getB06PlayerFrame().facing * move.knockbackX) as -1 | 1;
    const updated = applyB06EnemyContact(enemy, contactKind, damage, knockback);
    this.director = { ...this.director, enemies: this.director.enemies.map((candidate) => candidate.id === enemy.id ? updated : candidate) };
    if (guardBreak) {
      this.spawnEffect('bastion-guard-break', enemy.x, enemy.y, 70, 64, 360, enemy.facing);
      this.playCue('bastion-break');
    } else {
      const effect = enemy.archetype === 'orbit-wisp' ? 'wisp-impact' : enemy.archetype === 'cantor' ? 'cantor-ring-sweep' : 'runner-impact';
      this.spawnEffect(effect, enemy.x, enemy.y - 8, 48, 42, 170, enemy.facing);
      if (updated.phase === 'ko') this.playCue('enemy-ko');
    }
    this.emitEvent({ type: updated.phase === 'ko' ? 'enemy-ko' : contactKind, targetId: enemy.id, archetype: enemy.archetype, move: move.id, damage, hp: updated.hp, atMs: event.atMs, moveSequence: event.actionId });
  }

  protected override onB06ThreatEvent(event: { readonly sourceId: string; readonly result: 'hit' | 'dodged' | 'invulnerable' | 'blocked'; readonly damage: number }): void {
    this.emitEvent({ type: `player-${event.result}`, sourceId: event.sourceId, damage: event.damage, hp: this.combatSnapshot()?.playerHp ?? 0 });
  }

  override setLabAudioPaused(paused: boolean): void {
    super.setLabAudioPaused(paused);
    if (paused) this.ambience?.stop();
    else this.startAmbience();
  }

  resetB06Run(): void {
    this.resultSent = false;
    this.flow = initialB06Encounter();
    this.waveClearDelayMs = 0;
    this.lastPlayerHp = 5;
    this.eventLog = [];
    this.destroyEnemyPresentation();
    this.director = createB06Director();
    this.rewardShard?.setVisible(false);
    this.exitGate?.setAlpha(.32).clearTint().setScale(1);
    this.gatePulse?.stop();
    this.gatePulse = undefined;
    this.resetB04Combat(SUNDERGLASS_ATRIUM.entryStartX);
    this.spawnWave('familiarization');
    this.startAmbience();
    this.emitState();
  }

  b06Snapshot(): {
    phase: B06EncounterPhase; wavesCleared: number; rewardClaimed: boolean; damageTaken: number; elapsedMs: number;
    playerHp: number; resonance: number; dawnrush: ReturnType<ChamberScene['dawnrushSnapshot']>;
    enemies: Array<{ id: string; archetype: B06Archetype; x: number; y: number; hp: number; maxHp: number; facing: -1 | 1; phase: string; phaseMs: number; action: string | null; actionFacing: -1 | 1; actionHit: boolean }>;
    projectiles: Array<{ id: string; ownerId: string; x: number; y: number; lifeMs: number; ageMs: number }>;
    audioUnlocked: boolean; audioEnabled: boolean; lastAudioCue: string; vfxEnabled: boolean; reducedMotion: boolean;
    loadedTextures: number; missingTextures: string[]; activeTransientEffects: number; eventCount: number; waveClearDelayMs: number;
  } | null {
    const combat = this.currentCombat ?? this.combatSnapshot();
    if (!combat) return null;
    const expected = this.expectedTextureKeys();
    const missingTextures = expected.filter((key) => !this.textures.exists(key));
    return {
      phase: this.flow.phase, wavesCleared: this.flow.wavesCleared, rewardClaimed: this.flow.rewardClaimed,
      damageTaken: this.flow.damageTaken, elapsedMs: Math.round(this.flow.elapsedMs), playerHp: combat.playerHp,
      resonance: combat.resonance, dawnrush: this.dawnrushSnapshot(),
      enemies: this.director.enemies.map(({ id, archetype, x, y, hp, maxHp, facing, phase, phaseMs, action, actionFacing, actionHit }) => ({ id, archetype, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, hp, maxHp, facing, phase, phaseMs: Math.round(phaseMs), action, actionFacing, actionHit })),
      projectiles: this.director.projectiles.map(({ id, ownerId, x, y, lifeMs, ageMs }) => ({ id, ownerId, x, y, lifeMs, ageMs })),
      audioUnlocked: this.audioUnlocked, audioEnabled: this.b06AudioPermitted, lastAudioCue: this.b06LastAudioCue,
      vfxEnabled: combat.vfxEnabled, reducedMotion: combat.reducedMotion,
      loadedTextures: expected.length - missingTextures.length, missingTextures,
      activeTransientEffects: this.transientEffects.filter((effect) => effect.active).length, eventCount: this.eventLog.length, waveClearDelayMs: Math.round(this.waveClearDelayMs),
    };
  }

  b06EventLog(): readonly Record<string, unknown>[] { return this.eventLog; }

  private stepWave(combat: B03CombatSnapshot, deltaMs: number): void {
    const player = this.getB06PlayerFrame();
    if (this.waveClearDelayMs > 0) {
      this.waveClearDelayMs = Math.max(0, this.waveClearDelayMs - deltaMs);
      if (this.waveClearDelayMs === 0) {
        this.flow = stepB06Encounter(this.flow, 'wave-cleared');
        this.playCue('wave-clear');
        this.emitEvent({ type: 'wave-cleared', phase: this.flow.phase, wavesCleared: this.flow.wavesCleared });
        if (this.flow.phase === 'reward') {
          this.destroyEnemyPresentation();
          this.director = createB06Director();
          this.rewardShard?.setVisible(true);
          this.showBanner('THE CANTOR FALLS / CLAIM THE RESONANCE REPAIR');
        } else this.spawnWave(this.flow.phase);
      }
      return;
    }
    const result = stepB06Director(this.director, player, this.b06HitstopActive ? 0 : deltaMs, this.getB06Blockers());
    this.director = result.state;
    for (const event of result.events) this.handleDirectorEvent(event, player);
    const waveEnemies = this.director.enemies.filter((enemy) => this.waveIds.includes(enemy.id));
    if (waveEnemies.length > 0 && waveEnemies.every((enemy) => enemy.hp <= 0)) this.waveClearDelayMs = 850;
    this.syncProjectiles();
    void combat;
  }

  private spawnWave(phase: B06EncounterPhase): void {
    this.destroyEnemyPresentation();
    const spawns: Array<{ id: string; archetype: B06Archetype; x: number }> = phase === 'familiarization'
      ? [{ id: 'wave-1:shardrunner:1', archetype: 'shardrunner', x: 290 }]
      : phase === 'mixed'
      ? [{ id: 'wave-2:shardrunner:1', archetype: 'shardrunner', x: 502 }, { id: 'wave-2:orbit-wisp:1', archetype: 'orbit-wisp', x: 665 }]
      : phase === 'escalation'
      ? [{ id: 'wave-3:spindle-sentry:1', archetype: 'spindle-sentry', x: 795 }, { id: 'wave-3:pressure-bastion:1', archetype: 'pressure-bastion', x: 894 }]
      : phase === 'elite'
      ? [{ id: 'wave-4:cantor:1', archetype: 'cantor', x: 1130 }]
      : [];
    const enemies = spawns.map(({ id, archetype, x }) => createB06Enemy(id, archetype, x));
    this.waveIds = enemies.map((enemy) => enemy.id);
    this.director = createB06Director(enemies);
    this.emitEvent({ type: 'wave-start', phase, spawns: enemies.map(({ id, archetype }) => ({ id, archetype })) });
    if (phase === 'elite') {
      this.playCue('cantor-intro');
      this.showBanner('THE CANTOR OF THE SPLIT RING');
    } else if (phase === 'mixed') this.showBanner('TWO SIGNALS / CONTROL YOUR SPACE');
    else if (phase === 'escalation') this.showBanner('SENTRY AND BASTION / BREAK THE BRACE');
    this.syncEnemyPresentation();
  }

  private handleDirectorEvent(event: B06DirectorEvent, player: ReturnType<ChamberScene['getB06PlayerFrame']>): void {
    if (event.type === 'telegraph') {
      const enemy = this.director.enemies.find((candidate) => candidate.id === event.enemyId);
      if (!enemy) return;
      this.showTelegraph(enemy, event.action);
      const cue = enemy.archetype === 'orbit-wisp' ? 'wisp-charge' : enemy.archetype === 'pressure-bastion' ? 'bastion-tell' : enemy.archetype === 'cantor' ? event.action === 'cantor-pulse' ? 'cantor-pulse' : 'cantor-sweep' : 'runner-tell';
      this.playCue(cue);
      this.emitEvent({ type: 'enemy-telegraph', enemyId: enemy.id, archetype: enemy.archetype, action: event.action, facing: event.facing });
      return;
    }
    if (event.type === 'projectile-fired') {
      const enemy = this.director.enemies.find((candidate) => candidate.id === event.enemyId);
      if (enemy) this.director = spawnB06Projectile(this.director, enemy, player);
      this.playCue('wisp-shot');
      this.emitEvent({ type: 'projectile-fired', enemyId: event.enemyId, projectileId: event.projectileId, owner: event.enemyId });
      return;
    }
    if (event.type === 'projectile-blocked') {
      this.playCue('bastion-block');
      this.emitEvent({ type: 'projectile-blocked', projectileId: event.projectileId });
      return;
    }
    if (event.type === 'projectile-hit') {
      const result = this.applyB06PlayerThreat(event.enemyId, 1, this.getB06PlayerFrame().x < (this.director.enemies.find((enemy) => enemy.id === event.enemyId)?.x ?? 0) ? -1 : 1);
      this.spawnEffect('wisp-impact', player.x, player.y, 42, 38, 180, player.facing);
      this.playCue('wisp-impact');
      this.emitEvent({ type: 'projectile-hit', projectileId: event.projectileId, ownerId: event.enemyId, result, damage: result === 'hit' ? 1 : 0 });
      return;
    }
    if (event.type === 'strike') {
      const enemy = this.director.enemies.find((candidate) => candidate.id === event.enemyId);
      if (!enemy) return;
      const rect = this.enemyAttackRect(enemy, event.action, event.facing);
      const playerRect = combatantRect({ x: player.x, footY: player.y + player.height / 2, width: player.width, height: player.height, hp: player.hp });
      const blocked = isBlockedByRect(enemy.x, player.x, rect, this.getB06Blockers());
      let result: 'hit' | 'miss' | 'blocked' | 'dodged' | 'invulnerable' = blocked ? 'blocked' : overlaps(rect, playerRect) ? 'hit' : 'miss';
      this.showAttackEffect(enemy, event.action, event.facing);
      if (result === 'hit') {
        const damage = enemy.archetype === 'cantor' || enemy.archetype === 'pressure-bastion' ? 2 : 1;
        result = this.applyB06PlayerThreat(enemy.id, damage, event.facing === 1 ? -1 : 1);
      } else if (result === 'blocked') this.playCue('bastion-block');
      else this.playCue(enemy.archetype === 'pressure-bastion' ? 'bastion-impact' : enemy.archetype === 'cantor' ? 'cantor-sweep' : 'runner-slash');
      this.emitEvent({ type: 'enemy-strike', enemyId: enemy.id, archetype: enemy.archetype, action: event.action, sequence: event.sequence, result, damage: result === 'hit' ? enemy.archetype === 'cantor' || enemy.archetype === 'pressure-bastion' ? 2 : 1 : 0, rect });
    }
  }

  private enemyAttackRect(enemy: B06EnemyRuntime, action: NonNullable<B06EnemyRuntime['action']>, facing: -1 | 1): CombatRect {
    const height = B06_ENEMY_PROFILES[enemy.archetype].height;
    if (action === 'cantor-pulse') {
      return { left: enemy.x - 112, right: enemy.x + 112, top: enemy.y - 66, bottom: enemy.y + 66 };
    }
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
    const top = enemy.y - (action === 'sentry-lunge' ? 10 : 13);
    return { left, right: left + reach, top, bottom: enemy.y + (action === 'sentry-lunge' ? 19 : 24) };
  }

  private showAttackEffect(enemy: B06EnemyRuntime, action: NonNullable<B06EnemyRuntime['action']>, facing: -1 | 1): void {
    if (!this.currentCombat?.vfxEnabled) return;
    if (action === 'runner-dash') {
      this.spawnEffect('runner-dash', enemy.x + facing * 28, GROUND_TOP - 30, 84, 42, 175, facing);
      this.playCue('runner-slash');
    } else if (action === 'sentry-lunge') this.playSentryLungeFx(enemy.x, facing);
    else if (action === 'bastion-overhead') {
      this.spawnEffect('bastion-shockfront', enemy.x + facing * 45, GROUND_TOP - 15, 134, 40, 230, facing);
      this.playCue('bastion-impact');
    } else if (action === 'cantor-sweep') {
      this.spawnEffect('cantor-ring-sweep', enemy.x + facing * 28, GROUND_TOP - 38, 150, 64, 240, facing);
      this.playCue('cantor-sweep');
    } else if (action === 'cantor-pulse') {
      this.spawnEffect('cantor-ring-sweep', enemy.x, enemy.y, 110, 76, 260, facing);
      this.playCue('cantor-pulse');
    }
  }

  private showTelegraph(enemy: B06EnemyRuntime, action: NonNullable<B06EnemyRuntime['action']>): void {
    if (!this.currentCombat?.vfxEnabled) return;
    const key = enemy.archetype === 'orbit-wisp' ? 'wisp-charge'
      : enemy.archetype === 'pressure-bastion' ? 'bastion-shockfront'
      : enemy.archetype === 'cantor' ? 'cantor-ring-sweep'
      : enemy.archetype === 'spindle-sentry' ? '' : 'runner-dash';
    if (enemy.archetype === 'spindle-sentry') {
      const marker = this.add.image(enemy.x + enemy.facing * 22, GROUND_TOP - 30, 'b06-env-sentry-telegraph').setDisplaySize(54, 30).setFlipX(enemy.facing < 0).setAlpha(.74).setDepth(17);
      this.transientEffects.push(marker);
      this.time.delayedCall(420, () => marker.destroy());
      return;
    }
    this.spawnEffect(key, enemy.x + (enemy.archetype === 'cantor' ? enemy.facing * 34 : 0), enemy.archetype === 'orbit-wisp' ? enemy.y : GROUND_TOP - 14,
      enemy.archetype === 'pressure-bastion' ? 146 : enemy.archetype === 'cantor' ? 106 : 62,
      enemy.archetype === 'cantor' ? 54 : 38,
      enemy.archetype === 'orbit-wisp' ? 820 : enemy.archetype === 'cantor' ? 780 : 560, enemy.facing, .26);
    void action;
  }

  private spawnEffect(name: string, x: number, y: number, width: number, height: number, duration: number, facing: -1 | 1, alpha = 1): void {
    if (!this.currentCombat?.vfxEnabled || !this.textures.exists(`b06-fx-${name}`)) return;
    while (this.transientEffects.filter((effect) => effect.active).length >= 10) this.transientEffects.shift()?.destroy();
    const image = this.add.image(x, y, `b06-fx-${name}`).setDisplaySize(width, height).setFlipX(facing < 0).setAlpha(alpha).setDepth(26);
    this.transientEffects.push(image);
    this.tweens.add({ targets: image, alpha: 0, duration: this.currentCombat.reducedMotion ? Math.min(140, duration) : duration, onComplete: () => image.destroy() });
  }

  private playSentryLungeFx(x: number, facing: -1 | 1): void {
    const image = this.add.image(x + facing * 22, GROUND_TOP - 29, 'b06-env-sentry-attack-0').setDisplaySize(90, 42).setFlipX(facing < 0).setDepth(24);
    this.transientEffects.push(image);
    [1, 2].forEach((frame, index) => this.time.delayedCall(55 * (index + 1), () => { if (image.active) image.setTexture(`b06-env-sentry-attack-${frame}`); }));
    this.time.delayedCall(185, () => image.destroy());
  }

  private createEnvironment(): void {
    const world = SUNDERGLASS_ATRIUM.world;
    this.add.tileSprite(world.width / 2, 0, world.width, world.height, 'b06-env-horizon').setOrigin(.5, 0).setDepth(-30).setScrollFactor(.09, 0);
    this.add.tileSprite(world.width / 2, 0, world.width, world.height, 'b06-env-architecture').setOrigin(.5, 0).setAlpha(.94).setDepth(-20).setScrollFactor(.32, 0);
    for (const platform of SUNDERGLASS_ATRIUM.platforms) {
      const texture = platform.art === 'conduit' ? 'b06-env-conduit-tile' : platform.art === 'short' ? 'b06-env-platform-short' : 'b06-env-platform-long';
      this.add.tileSprite(platform.centerX, platform.top - 3, platform.width, platform.id === 'ground' ? 30 : 25, texture).setOrigin(.5, 0).setDepth(4);
    }
    this.environment = this.add.tileSprite(790, GROUND_TOP - 31, 128, 32, 'b06-env-conduit-tile').setOrigin(.5, 0).setDepth(6).setAlpha(.9);
    this.add.image(SUNDERGLASS_ATRIUM.entryX, GROUND_TOP, 'b06-env-entry-beacon').setOrigin(.5, 1).setDepth(7);
    this.rewardShard = this.add.image(1295, GROUND_TOP - 5, 'b06-env-reward-shard').setOrigin(.5, 1).setDepth(9);
    this.exitGate = this.add.image(SUNDERGLASS_ATRIUM.exitX, GROUND_TOP, 'b06-env-exit-gate').setOrigin(.5, 1).setDepth(8);
    if (this.cache.audio.exists('b06-audio-sunderglass-ambience')) this.ambience = this.sound.add('b06-audio-sunderglass-ambience', { loop: true, volume: .2 });
  }

  private createRosterBoard(): void {
    this.cameras.main.stopFollow();
    this.cameras.main.setScroll(0, 0);
    this.setB04StartPosition(40);
    const members = [
      createB06Enemy('roster:sentry', 'spindle-sentry', 120),
      createB06Enemy('roster:shardrunner', 'shardrunner', 200),
      createB06Enemy('roster:wisp', 'orbit-wisp', 280),
      createB06Enemy('roster:bastion', 'pressure-bastion', 360),
      { ...createB06Enemy('roster:cantor', 'cantor', 440), phase: 'idle' as const },
    ];
    this.director = createB06Director(members);
    this.syncEnemyPresentation();
    this.add.rectangle(240, 8, 468, 15, 0x07131d, .9).setDepth(42);
    this.add.text(8, 4, 'ROSTER / 480×270 / SOURCE SCALE / PIXELS AT GAME SIZE', { fontFamily: 'monospace', fontSize: '7px', color: '#f5ddbd' }).setDepth(43);
    const labels = [
      { x: 40, text: 'IONA\n15×30 / PLAYER', color: '#f1c99a' },
      { x: 120, text: 'SENTRY\nRUST / LUNGE', color: '#8dd6cb' },
      { x: 200, text: 'SHARDRUNNER\nJADE / DASH', color: '#db9e91' },
      { x: 280, text: 'ORBIT WISP\nGLASS / SHOT', color: '#88d9d1' },
      { x: 360, text: 'BASTION\nSTEEL / GUARD', color: '#e7ba72' },
      { x: 440, text: 'CANTOR\nRING / ELITE', color: '#d5bde8' },
    ];
    this.add.rectangle(240, 256, 480, 28, 0x07131d, .92).setDepth(41);
    for (const label of labels) this.add.text(label.x, 246, label.text, { fontFamily: 'monospace', fontSize: '5px', color: label.color, align: 'center', lineSpacing: 1 }).setOrigin(.5, 0).setDepth(42);
    this.add.text(240, 229, 'R / LB FORM TO REVIEW DAWNRUSH AURA   ·   ESC RETURNS TO TITLE', { fontFamily: 'monospace', fontSize: '5px', color: '#e5ddd0', backgroundColor: '#0b1620cc', padding: { x: 3, y: 2 } }).setOrigin(.5, 1).setDepth(43);
  }

  private createHud(): void {
    this.hudGraphics = this.add.graphics().setScrollFactor(0).setDepth(45);
    const style = { fontFamily: 'monospace', fontSize: '6px', color: '#f4ead2', stroke: '#08111e', strokeThickness: 2 };
    this.add.text(10, 8, 'SUNDERGLASS / ENCOUNTER GAUNTLET', { ...style, fontSize: '7px', color: '#f4d0a8' }).setScrollFactor(0).setDepth(46);
    this.hudVitals = this.add.text(10, 22, '', style).setScrollFactor(0).setDepth(46);
    this.hudObjective = this.add.text(472, 9, '', { ...style, align: 'right' }).setOrigin(1, 0).setScrollFactor(0).setDepth(46);
    this.hudControls = this.add.text(8, 254, '', { ...style, fontSize: '5px', backgroundColor: '#0b1620d9', padding: { x: 4, y: 3 } }).setScrollFactor(0).setDepth(46);
    this.interactPrompt = this.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '6px', color: '#fbefd6', backgroundColor: '#111c25e8', padding: { x: 3, y: 2 }, align: 'center' }).setOrigin(.5, 1).setDepth(30).setVisible(false);
  }

  private updatePresentation(combat: B03CombatSnapshot): void {
    // Tweens destroy completed effects, but pruning here also bounds references over long runs.
    for (let index = this.transientEffects.length - 1; index >= 0; index -= 1) {
      const effect = this.transientEffects[index];
      if (effect && !effect.active) this.transientEffects.splice(index, 1);
    }
    this.syncEnemyPresentation();
    for (const enemy of this.director.enemies) {
      const visual = this.enemyVisuals.get(enemy.id);
      if (!visual) continue;
      const pose = this.poseFor(enemy);
      if (visual.sprite.texture.key !== pose) visual.sprite.setTexture(pose);
      const wisp = enemy.archetype === 'orbit-wisp';
      visual.sprite.setFlipX(enemy.facing < 0).setPosition(enemy.x, wisp ? enemy.y : GROUND_TOP);
      visual.label.setPosition(enemy.x, wisp ? enemy.y - 31 : GROUND_TOP - B06_ENEMY_PROFILES[enemy.archetype].height - 12);
      visual.label.setText(enemy.hp <= 0 ? 'BROKEN' : enemy.archetype === 'cantor' ? `CANTOR  ${enemy.hp}/${enemy.maxHp}` : `${B06_ENEMY_PROFILES[enemy.archetype].displayName.toUpperCase()}  ${enemy.hp}`);
      visual.label.setVisible(enemy.phase !== 'ko');
      const barWidth = enemy.archetype === 'cantor' ? 56 : 36;
      const y = wisp ? enemy.y - 20 : GROUND_TOP - B06_ENEMY_PROFILES[enemy.archetype].height - 4;
      this.hudGraphics?.fillStyle(0x111923, .92).fillRect(enemy.x - barWidth / 2, y, barWidth, 3);
      this.hudGraphics?.fillStyle(enemy.archetype === 'cantor' ? 0xcda7e2 : enemy.archetype === 'pressure-bastion' ? 0xe8b15d : 0x89d7ce, .96).fillRect(enemy.x - barWidth / 2, y, barWidth * enemy.hp / enemy.maxHp, 3);
      const tell = this.tellVisuals.get(enemy.id);
      if (tell) tell.setPosition(enemy.x + enemy.facing * 22, wisp ? enemy.y : GROUND_TOP - 18).setFlipX(enemy.facing < 0);
    }
    for (const [id, visual] of this.tellVisuals) {
      if (!this.director.enemies.some((enemy) => enemy.id === id && enemy.phase === 'telegraph')) { visual.destroy(); this.tellVisuals.delete(id); }
    }
    this.drawHud(combat);
  }

  private syncEnemyPresentation(): void {
    for (const enemy of this.director.enemies) {
      if (this.enemyVisuals.has(enemy.id)) continue;
      const texture = this.poseFor(enemy);
      const sprite = this.add.image(enemy.x, enemy.archetype === 'orbit-wisp' ? enemy.y : GROUND_TOP, texture).setDepth(16);
      if (enemy.archetype === 'orbit-wisp') sprite.setOrigin(.5, .5);
      else sprite.setOrigin(.5, 1);
      if (enemy.archetype !== 'spindle-sentry') sprite.setDisplaySize(80, 80);
      const label = this.add.text(enemy.x, enemy.y - 40, '', { fontFamily: 'monospace', fontSize: '5px', color: '#f4ead2', stroke: '#08111e', strokeThickness: 2, align: 'center' }).setOrigin(.5, 1).setDepth(20);
      this.enemyVisuals.set(enemy.id, { sprite, label, lastPose: texture, barX: enemy.x });
    }
  }

  private poseFor(enemy: B06EnemyRuntime): string {
    const arch = enemy.archetype;
    if (arch === 'spindle-sentry') {
      const state = enemy.hp <= 0 ? 'ko' : enemy.phase === 'telegraph' ? 'telegraph' : enemy.phase === 'commit' ? 'lunge' : enemy.phase === 'hurt' ? 'hurt' : enemy.phase === 'vulnerable' ? 'stagger' : 'idle';
      return `iona-b03-sentry-${state}`;
    }
    if (enemy.phase === 'ko') return `b06-${arch}-ko`;
    if (arch === 'shardrunner') {
      const state = enemy.phase === 'telegraph' ? 'telegraph' : enemy.phase === 'commit' ? 'attack' : enemy.phase === 'recover' || enemy.phase === 'vulnerable' ? 'recovery' : enemy.phase === 'hurt' ? 'hurt' : enemy.phase === 'approach' ? 'move' : 'idle';
      return `b06-shardrunner-${state}`;
    }
    if (arch === 'orbit-wisp') {
      const state = enemy.phase === 'telegraph' ? 'telegraph' : enemy.phase === 'commit' ? 'attack' : enemy.phase === 'recover' || enemy.phase === 'vulnerable' ? 'recovery' : enemy.phase === 'stagger' ? 'stagger' : enemy.phase === 'hurt' ? 'hurt' : enemy.phase === 'approach' ? 'move' : 'idle';
      return `b06-orbit-wisp-${state}`;
    }
    if (arch === 'pressure-bastion') {
      const state = enemy.phase === 'telegraph' ? 'telegraph' : enemy.phase === 'commit' ? 'attack' : enemy.phase === 'recover' || enemy.phase === 'vulnerable' ? 'recovery' : enemy.phase === 'hurt' ? 'guard-break' : enemy.phase === 'approach' ? 'move' : enemy.phase === 'guard' ? 'guard' : 'idle';
      return `b06-pressure-bastion-${state}`;
    }
    if (enemy.phase === 'intro') return 'b06-cantor-intro';
    if (enemy.phase === 'telegraph') return `b06-cantor-${enemy.action === 'cantor-pulse' ? 'pulse-telegraph' : 'sweep-telegraph'}`;
    if (enemy.phase === 'commit') return `b06-cantor-${enemy.action === 'cantor-pulse' ? 'pulse-attack' : 'sweep-attack'}`;
    if (enemy.phase === 'recover') return enemy.action === 'cantor-pulse' ? 'b06-cantor-vulnerable' : 'b06-cantor-sweep-recovery';
    if (enemy.phase === 'vulnerable') return 'b06-cantor-vulnerable';
    if (enemy.phase === 'hurt') return 'b06-cantor-hurt';
    return enemy.phase === 'approach' ? 'b06-cantor-move' : 'b06-cantor-idle';
  }

  private syncProjectiles(): void {
    const active = new Set(this.director.projectiles.map((projectile) => projectile.id));
    for (const projectile of this.director.projectiles) {
      let image = this.projectileVisuals.get(projectile.id);
      if (!image) {
        image = this.add.image(projectile.x, projectile.y, 'b06-fx-wisp-projectile').setDisplaySize(32, 18).setDepth(25);
        this.projectileVisuals.set(projectile.id, image);
      }
      image.setPosition(projectile.x, projectile.y).setRotation(Math.atan2(projectile.vy, projectile.vx));
    }
    for (const [id, image] of this.projectileVisuals) if (!active.has(id)) { image.destroy(); this.projectileVisuals.delete(id); }
  }

  private updateWorldState(combat: B03CombatSnapshot): void {
    if (this.flow.phase === 'reward') {
      this.rewardShard?.setVisible(true);
      this.interactPrompt?.setText(combat.controllerIndex >= 0 ? 'SOUTH / CLAIM REPAIR' : 'E / CLAIM REPAIR').setPosition(1295, GROUND_TOP - 54).setVisible(true);
    } else if (this.flow.phase === 'exit') {
      this.exitGate?.setAlpha(1);
      this.environment?.setTint(0x9fe4d3);
      this.interactPrompt?.setText(combat.controllerIndex >= 0 ? 'SOUTH / ENTER' : 'E / ENTER').setPosition(SUNDERGLASS_ATRIUM.exitX, GROUND_TOP - 116).setVisible(true);
    } else this.interactPrompt?.setVisible(false);
  }

  private drawHud(combat: B03CombatSnapshot): void {
    if (!this.hudGraphics) return;
    const graphics = this.hudGraphics;
    graphics.clear();
    graphics.fillStyle(0x07131d, .88).fillRect(6, 5, 182, 32).lineStyle(1, 0x735e4d, .85).strokeRect(6.5, 5.5, 182, 32);
    graphics.fillStyle(0x07131d, .88).fillRect(309, 5, 165, 32).lineStyle(1, 0x735e4d, .85).strokeRect(309.5, 5.5, 165, 32);
    graphics.fillStyle(0x09141d, .86).fillRect(5, 249, 326, 15).lineStyle(1, 0x3d6570, .68).strokeRect(5.5, 249.5, 326, 15);
    graphics.fillStyle(0x182630, 1).fillRect(73, 24, 91, 5);
    graphics.fillStyle(0xc66e62, 1).fillRect(73, 24, 91 * combat.playerHp / 5, 5);
    graphics.fillStyle(0x182630, 1).fillRect(73, 31, 91, 4);
    graphics.fillStyle(0x58c8bd, 1).fillRect(73, 31, 91 * combat.resonance / 100, 4);
    const dawnrush = this.dawnrushSnapshot();
    this.hudVitals?.setText(`INTEGRITY ${combat.playerHp}/5   RES ${Math.floor(combat.resonance)}   ${(dawnrush?.form ?? 'Base').toUpperCase()} ${Math.floor(dawnrush?.energy ?? 0)}%`);
    this.hudObjective?.setText(this.objectiveText());
    this.hudControls?.setText(combat.controllerIndex >= 0
      ? 'STICK MOVE · SOUTH JUMP · WEST LIGHT · NORTH HEAVY · EAST DODGE · RB DRIVE · LB FORM · START PAUSE'
      : 'A/D MOVE · SPACE JUMP · SHIFT DODGE · J COMBO · K HEAVY · Q DRIVE · R FORM · F FINISHER · E INTERACT · ESC PAUSE');
  }

  private objectiveText(): string {
    const stage = this.flow.phase === 'familiarization' ? '01 / LEARN THE TELL' : this.flow.phase === 'mixed' ? '02 / MIXED SIGNALS' : this.flow.phase === 'escalation' ? '03 / BREAK THE BRACE' : this.flow.phase === 'elite' ? '04 / SPLIT RING' : this.flow.phase === 'reward' ? 'REPAIR / RESONANCE' : this.flow.phase === 'exit' ? 'EXIT / ATRIUM GATE' : this.flow.phase.toUpperCase();
    const alive = this.director.enemies.filter((enemy) => enemy.hp > 0).length;
    return `${stage}    ${alive ? `${alive} THREAT${alive === 1 ? '' : 'S'}` : this.flow.phase === 'reward' ? 'E TO CLAIM' : ''}`;
  }

  private isWavePhase(phase: B06EncounterPhase): boolean { return phase === 'familiarization' || phase === 'mixed' || phase === 'escalation' || phase === 'elite'; }

  private playCue(cue: string): void {
    const key = `b06-audio-${cue}`;
    this.b06LastAudioCue = cue;
    if (this.b06AudioPermitted && this.cache.audio.exists(key)) this.sound.play(key, { volume: cue.includes('tell') || cue.includes('hover') ? .25 : .38 });
    window.dispatchEvent(new CustomEvent('crownflare:audio-event', { detail: { cue, source: 'procedural-synthesis', scene: 'b06', heard: false } }));
  }

  private unlockB06Audio(): void {
    if (this.sound.locked) this.sound.unlock();
    this.audioUnlocked = !this.sound.locked;
    if (this.audioUnlocked && !this.resultSent) this.startAmbience();
  }

  private startAmbience(): void {
    if (!this.audioUnlocked || this.resultSent || !this.ambience || this.sound.locked || this.ambience.isPlaying) return;
    this.ambience.play();
    window.dispatchEvent(new CustomEvent('crownflare:audio-event', { detail: { cue: 'sunderglass-ambience', source: 'B04-authored-loop', scene: 'b06', heard: false } }));
  }

  private finishResult(result: 'victory' | 'defeat'): void {
    if (this.resultSent) return;
    this.resultSent = true;
    this.setLabAudioPaused(true);
    window.dispatchEvent(new CustomEvent('crownflare:b04-result', { detail: { result, elapsedMs: Math.round(this.flow.elapsedMs), damageTaken: this.flow.damageTaken, rewardClaimed: this.flow.rewardClaimed, milestone: 'B06' } }));
  }

  private showBanner(message: string): void {
    const banner = this.add.text(240, 58, message, { fontFamily: 'monospace', fontSize: '6px', color: '#f5ddbd', backgroundColor: '#111923e8', padding: { x: 5, y: 4 }, align: 'center' }).setOrigin(.5, 0).setScrollFactor(0).setDepth(60).setAlpha(0);
    this.tweens.add({ targets: banner, alpha: 1, duration: 180, hold: 1500, yoyo: true, onComplete: () => banner.destroy() });
  }

  private expectedTextureKeys(): string[] {
    return [
      ...ENVIRONMENT.map((file) => `b06-env-${file}`),
      ...Object.entries(ENEMY_STATES).flatMap(([archetype, states]) => states.map((state) => `b06-${archetype}-${state}`)),
      ...EXPECTED_EFFECTS.map((effect) => `b06-fx-${effect}`),
      'iona-b03-sentry-idle', 'iona-b03-sentry-telegraph', 'iona-b03-sentry-lunge', 'iona-b03-sentry-hurt', 'iona-b03-sentry-stagger', 'iona-b03-sentry-ko',
    ];
  }

  private emitEvent(event: Record<string, unknown>): void {
    const row = { atMs: Math.round(this.flow.elapsedMs), ...event };
    this.eventLog.push(row);
    if (this.eventLog.length > 600) this.eventLog.shift();
    window.dispatchEvent(new CustomEvent('crownflare:b06-event', { detail: row }));
  }

  private emitState(): void {
    const snapshot = this.b06Snapshot();
    if (snapshot) window.dispatchEvent(new CustomEvent('crownflare:b06-state', { detail: snapshot }));
  }

  private destroyEnemyPresentation(): void {
    for (const visual of this.enemyVisuals.values()) { visual.sprite.destroy(); visual.label.destroy(); }
    this.enemyVisuals.clear();
    for (const projectile of this.projectileVisuals.values()) projectile.destroy();
    this.projectileVisuals.clear();
    for (const tell of this.tellVisuals.values()) tell.destroy();
    this.tellVisuals.clear();
    for (const effect of this.transientEffects) effect.destroy();
    this.transientEffects.length = 0;
  }
}
