import * as Phaser from 'phaser';
import { B04_ASSETS, SUNDERGLASS_ATRIUM } from '../rooms/sunderglassAtrium';
import { ChamberScene, type B03CombatSnapshot } from './ChamberScene';
import { initialB04Encounter, recordB04Damage, recordB04Elapsed, stepB04Encounter, type B04EncounterEvent, type B04EncounterState } from '../enemies/b04EncounterFlow';

const GROUND_TOP = SUNDERGLASS_ATRIUM.world.groundTop;
const WORLD_WIDTH = SUNDERGLASS_ATRIUM.world.width;
const B04_IMAGE_PATH = './assets/environments/b04/';
const EXPECTED_IMAGES = [
  'horizon', 'architecture', 'platform-long', 'platform-short', 'conduit-tile',
  'entry-beacon', 'reward-shard', 'exit-gate', 'sentry-telegraph', 'sentry-attack-0', 'sentry-attack-1', 'sentry-attack-2',
  'impact-0', 'impact-1', 'impact-2',
] as const;

/** B04 composes the existing B03 player, move clock, controller and sentry encounter in its own art/content route. */
export class B04VerticalSliceScene extends ChamberScene {
  private flow: B04EncounterState = initialB04Encounter();
  private lastPlayerHp = 5;
  private resultSent = false;
  private currentCombat: B03CombatSnapshot | null = null;
  private gate?: Phaser.GameObjects.Image;
  private gatePulse?: Phaser.Tweens.Tween;
  private shard?: Phaser.GameObjects.Image;
  private conduit?: Phaser.GameObjects.TileSprite;
  private tell?: Phaser.GameObjects.Image;
  private sentryAttack?: Phaser.GameObjects.Image;
  private previousEnemyState = 'idle';
  private lungeFacing: -1 | 1 = 1;
  private lungeElapsedMs = 0;
  private attackFxState: 'hidden' | 'telegraph' | 'lunge-0' | 'lunge-1' | 'lunge-2' = 'hidden';
  private interactPrompt?: Phaser.GameObjects.Text;
  private hudGraphics?: Phaser.GameObjects.Graphics;
  private hudVitals?: Phaser.GameObjects.Text;
  private hudSpecial?: Phaser.GameObjects.Text;
  private hudEncounter?: Phaser.GameObjects.Text;
  private hudControls?: Phaser.GameObjects.Text;
  private hudDawnrush?: Phaser.GameObjects.Text;
  private ambience?: Phaser.Sound.BaseSound;
  private audioUnlocked = false;
  private readonly b05ReviewMode: boolean;

  private readonly combatListener = (event: Event): void => {
    const detail = (event as CustomEvent<{ result?: string; moveId?: string }>).detail;
    const state = this.combatSnapshot();
    if (detail?.result === 'hit' && state?.vfxEnabled && !state.reducedMotion) this.playImpact(state, detail.moveId ?? 'unknown');
    window.dispatchEvent(new CustomEvent('crownflare:b04-combat-event', { detail: { result: detail?.result ?? 'unknown', moveId: detail?.moveId ?? 'unknown', phase: this.flow.phase } }));
  };

  constructor(onPauseRequested: () => void, onControllerState: (active: boolean) => void, options: { b05?: boolean } = {}) {
    super(onPauseRequested, onControllerState, { ionaPreview: true, b03Combat: true, b04: true, b05: options.b05 === true });
    this.b05ReviewMode = options.b05 === true;
  }

  override preload(): void {
    super.preload();
    for (const file of EXPECTED_IMAGES) this.load.image(`b04-${file}`, `${B04_IMAGE_PATH}${file}.png`);
    this.load.audio(B04_ASSETS.ambience, './assets/audio/b04/sunderglass-ambience.wav');
  }

  override create(): void {
    super.create();
    this.setB04StartPosition(SUNDERGLASS_ATRIUM.entryStartX);
    this.createEnvironment();
    this.createHud();
    this.createPrompt();
    this.shard?.setVisible(false);
    this.gate?.setAlpha(.32);
    this.input.keyboard?.on('keydown', () => this.unlockB04Audio());
    this.input.on(Phaser.Input.Events.POINTER_DOWN, () => this.unlockB04Audio());
    window.addEventListener('crownflare:combat-event', this.combatListener);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('crownflare:combat-event', this.combatListener);
      this.sound.stopAll();
    });
    this.emitState();
  }

  override update(time: number, delta: number): void {
    super.update(time, delta);
    if (this.resultSent) return;
    const step = Math.min(50, Math.max(0, delta));
    this.flow = recordB04Elapsed(this.flow, step);
    const combat = this.combatSnapshot();
    this.currentCombat = combat;
    if (!combat) return;
    if (combat.playerHp < this.lastPlayerHp) this.flow = recordB04Damage(this.flow);
    this.lastPlayerHp = combat.playerHp;
    if (combat.playerHp <= 0 && this.flow.phase !== 'defeat') this.transition('player-defeated');
    else if (combat.enemyHp <= 0 && this.flow.phase === 'sentry-one') this.transition('first-sentry-cleared');
    else if (combat.enemyHp <= 0 && this.flow.phase === 'sentry-two') this.transition('second-sentry-cleared');
    this.updateWorldState(combat, step);
    this.drawHud(combat);
    this.emitState();
  }

  protected override handleB04Interact(): boolean {
    const combat = this.currentCombat ?? this.combatSnapshot();
    if (!combat) return false;
    if (this.flow.phase === 'reward') {
      if (Math.abs(combat.playerX - SUNDERGLASS_ATRIUM.rewardX) > 42) return true;
      this.flow = stepB04Encounter(this.flow, 'claim-shard');
      this.shard?.setVisible(false);
      this.setB04PlayerHealth(Math.min(5, combat.playerHp + 2));
      this.setB04Target(SUNDERGLASS_ATRIUM.sentries[1], 8);
      this.showBanner('THE ATRIUM ANSWERS / A SECOND SENTINEL AWAKENS');
      this.playSoftChime('reward');
      this.audioEvent('atrium-shard', 'original-procedural');
      this.currentCombat = this.combatSnapshot();
      return true;
    }
    if (this.flow.phase === 'exit') {
      if (Math.abs(combat.playerX - SUNDERGLASS_ATRIUM.exitX) > 52) return true;
      this.transition('enter-gate');
      return true;
    }
    return this.flow.phase === 'victory' || this.flow.phase === 'defeat';
  }

  /** Called by the B04 result panel after an explicit Replay choice. */
  resetB04Run(): void {
    this.flow = stepB04Encounter(this.flow, 'retry');
    this.lastPlayerHp = 5;
    this.resultSent = false;
    this.shard?.setVisible(false);
    this.gate?.setAlpha(.32).clearTint().setScale(1);
    this.gatePulse?.stop();
    this.gatePulse = undefined;
    this.conduit?.clearTint();
    this.tell?.setVisible(false);
    this.sentryAttack?.setVisible(false);
    this.previousEnemyState = 'idle';
    this.attackFxState = 'hidden';
    this.resetB04Combat(SUNDERGLASS_ATRIUM.entryStartX);
    this.startAmbience();
    this.drawHud(this.combatSnapshot());
    this.emitState();
  }

  override setLabAudioPaused(paused: boolean): void {
    super.setLabAudioPaused(paused);
    if (paused) this.ambience?.stop();
    else this.startAmbience();
  }

  b04Snapshot(): {
    phase: B04EncounterState['phase']; wave: number; playerHp: number; enemyHp: number; resonance: number;
    playerX: number; enemyState: string; rewardClaimed: boolean; damageTaken: number; elapsedMs: number;
    vfxEnabled: boolean; reducedMotion: boolean; audioUnlocked: boolean; loadedTextures: number; missingTextures: string[];
    loadedIonaFrames: number; missingIonaFrames: string[]; missingCombatArt: string[];
    attackFxState: 'hidden' | 'telegraph' | 'lunge-0' | 'lunge-1' | 'lunge-2';
    dawnrush: ReturnType<ChamberScene['dawnrushSnapshot']>;
  } | null {
    const combat = this.currentCombat ?? this.combatSnapshot();
    if (!combat) return null;
    const missingTextures = EXPECTED_IMAGES.filter((name) => !this.textures.exists(`b04-${name}`));
    const iona = this.previewSnapshot();
    return {
      phase: this.flow.phase, wave: this.flow.phase === 'sentry-two' || this.flow.phase === 'exit' || this.flow.phase === 'victory' ? 2 : 1,
      playerHp: combat.playerHp, enemyHp: combat.enemyHp, resonance: combat.resonance, playerX: combat.playerX,
      enemyState: combat.enemyState, rewardClaimed: this.flow.rewardClaimed, damageTaken: this.flow.damageTaken,
      elapsedMs: Math.round(this.flow.elapsedMs), vfxEnabled: combat.vfxEnabled, reducedMotion: combat.reducedMotion,
      audioUnlocked: this.audioUnlocked, loadedTextures: EXPECTED_IMAGES.length - missingTextures.length, missingTextures,
      loadedIonaFrames: iona?.loadedTextures ?? 0, missingIonaFrames: iona?.missingTextures ?? [], missingCombatArt: combat.errors,
      attackFxState: this.attackFxState,
      dawnrush: this.dawnrushSnapshot(),
    };
  }

  private createEnvironment(): void {
    this.add.tileSprite(WORLD_WIDTH / 2, 0, WORLD_WIDTH, 270, B04_ASSETS.horizon).setOrigin(.5, 0).setDepth(-30).setScrollFactor(.09, 0);
    this.add.tileSprite(WORLD_WIDTH / 2, 0, WORLD_WIDTH, 270, B04_ASSETS.architecture).setOrigin(.5, 0).setAlpha(.94).setDepth(-20).setScrollFactor(.32, 0);
    for (const platform of SUNDERGLASS_ATRIUM.platforms) {
      const texture = platform.art === 'conduit' ? B04_ASSETS.conduit : platform.art === 'short' ? B04_ASSETS.platformShort : B04_ASSETS.platformLong;
      const height = platform.id === 'ground' ? 30 : 25;
      this.add.tileSprite(platform.centerX, platform.top - 3, platform.width, height, texture).setOrigin(.5, 0).setDepth(4);
    }
    this.conduit = this.add.tileSprite(790, GROUND_TOP - 31, 128, 32, B04_ASSETS.conduit).setOrigin(.5, 0).setDepth(6).setAlpha(.9);
    this.add.image(SUNDERGLASS_ATRIUM.entryX, GROUND_TOP, B04_ASSETS.entry).setOrigin(.5, 1).setDepth(7);
    this.shard = this.add.image(SUNDERGLASS_ATRIUM.rewardX, GROUND_TOP - 5, B04_ASSETS.shard).setOrigin(.5, 1).setDepth(9);
    this.gate = this.add.image(SUNDERGLASS_ATRIUM.exitX, GROUND_TOP, B04_ASSETS.gate).setOrigin(.5, 1).setDepth(8);
    this.tell = this.add.image(0, 0, B04_ASSETS.telegraph).setOrigin(.5, .5).setDisplaySize(64, 42).setDepth(22).setVisible(false);
    this.sentryAttack = this.add.image(0, 0, B04_ASSETS.sentryAttack[0]).setOrigin(.5, .5).setDisplaySize(92, 42).setDepth(23).setVisible(false);
    this.addMotes();
    if (this.cache.audio.exists(B04_ASSETS.ambience)) this.ambience = this.sound.add(B04_ASSETS.ambience, { loop: true, volume: .24 });
  }

  private addMotes(): void {
    for (let i = 0; i < 13; i += 1) {
      const x = 95 + i * 113;
      const y = 70 + ((i * 43) % 105);
      const mote = this.add.circle(x, y, i % 4 === 0 ? 1.2 : .8, i % 3 === 0 ? 0xe1b88e : 0x83d2ca, .46).setDepth(6).setScrollFactor(.7, 1);
      this.tweens.add({ targets: mote, y: y - 13 - (i % 5), alpha: .14, duration: 3100 + i * 217, yoyo: true, repeat: -1, delay: i * 95, ease: 'Sine.inOut' });
    }
  }

  private createHud(): void {
    this.hudGraphics = this.add.graphics().setScrollFactor(0).setDepth(45);
    const style = { fontFamily: 'monospace', fontSize: '6px', color: '#f4ead2', stroke: '#08111e', strokeThickness: 2 };
    this.add.text(10, 8, this.b05ReviewMode ? 'SUNDERGLASS / DAWNRUSH REVIEW' : 'THE SUNDERGLASS ATRIUM', { ...style, fontSize: this.b05ReviewMode ? '7px' : '8px', color: '#f4d0a8' }).setScrollFactor(0).setDepth(46);
    this.hudVitals = this.add.text(10, 23, '', style).setScrollFactor(0).setDepth(46);
    this.hudSpecial = this.add.text(10, 34, '', { ...style, fontSize: '5px', color: '#a9e4dc' }).setScrollFactor(0).setDepth(46);
    if (this.b05ReviewMode) this.hudDawnrush = this.add.text(10, 43, 'DAWNRUSH / R OR LB', { ...style, fontSize: '5px', color: '#ffd08f' }).setScrollFactor(0).setDepth(46);
    this.hudEncounter = this.add.text(472, 9, '', { ...style, align: 'right', color: '#f0d9bc' }).setOrigin(1, 0).setScrollFactor(0).setDepth(46);
    this.hudControls = this.add.text(8, 255, '', { ...style, fontSize: '5px', color: '#e4ddd0', backgroundColor: '#0b1620d9', padding: { x: 4, y: 3 } }).setScrollFactor(0).setDepth(46);
  }

  private createPrompt(): void {
    this.interactPrompt = this.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '6px', color: '#fbefd6', backgroundColor: '#111c25e8', padding: { x: 3, y: 2 }, align: 'center' }).setOrigin(.5, 1).setDepth(30).setVisible(false);
  }

  private updateWorldState(combat: B03CombatSnapshot, deltaMs: number): void {
    if (this.flow.phase === 'reward') {
      this.shard?.setVisible(true);
      this.interactPrompt?.setText(combat.controllerIndex >= 0 ? 'SOUTH  /  CLAIM SHARD' : 'E  /  CLAIM SHARD').setPosition(SUNDERGLASS_ATRIUM.rewardX, GROUND_TOP - 48).setVisible(true);
    } else if (this.flow.phase === 'exit') {
      this.gate?.setAlpha(1);
      if (this.gate && !this.gatePulse) this.gatePulse = this.tweens.add({ targets: this.gate, scaleX: 1.055, scaleY: 1.055, duration: 720, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.conduit?.setTint(0x94e4d1);
      this.interactPrompt?.setText(combat.controllerIndex >= 0 ? 'SOUTH  /  ENTER' : 'E  /  ENTER').setPosition(SUNDERGLASS_ATRIUM.exitX, GROUND_TOP - 116).setVisible(true);
    } else this.interactPrompt?.setVisible(false);

    const tellActive = this.flow.phase === 'sentry-one' || this.flow.phase === 'sentry-two';
    const facing: -1 | 1 = combat.playerX < combat.enemyX ? -1 : 1;
    if (tellActive && combat.enemyState === 'telegraph') {
      if (this.previousEnemyState !== 'telegraph' && this.previousEnemyState !== 'lunge') this.lungeFacing = facing;
      this.tell?.setPosition(combat.enemyX + this.lungeFacing * 17, GROUND_TOP - 28).setFlipX(this.lungeFacing < 0).setVisible(true);
      this.sentryAttack?.setVisible(false);
      this.attackFxState = 'telegraph';
    } else if (tellActive && combat.enemyState === 'lunge') {
      if (this.previousEnemyState !== 'lunge') {
        if (this.previousEnemyState !== 'telegraph') this.lungeFacing = facing;
        this.lungeElapsedMs = 0;
      }
      this.lungeElapsedMs += deltaMs;
      const frame = Math.min(2, Math.floor(this.lungeElapsedMs / 64));
      const texture = B04_ASSETS.sentryAttack[frame]!;
      this.tell?.setVisible(false);
      this.sentryAttack?.setTexture(texture).setPosition(combat.enemyX + this.lungeFacing * 20, GROUND_TOP - 27)
        .setFlipX(this.lungeFacing < 0).setVisible(true);
      this.attackFxState = `lunge-${frame}` as typeof this.attackFxState;
    } else {
      this.tell?.setVisible(false);
      this.sentryAttack?.setVisible(false);
      this.attackFxState = 'hidden';
    }
    this.previousEnemyState = combat.enemyState;
  }

  private drawHud(combat: B03CombatSnapshot | null): void {
    if (!combat || !this.hudGraphics) return;
    const g = this.hudGraphics;
    g.clear();
    const leftPanelHeight = this.b05ReviewMode ? 56 : 42;
    g.fillStyle(0x07131d, .86).fillRect(6, 5, 181, leftPanelHeight).lineStyle(1, 0x735e4d, .85).strokeRect(6.5, 5.5, 181, leftPanelHeight);
    g.fillStyle(0x07131d, .86).fillRect(314, 5, 160, 31).lineStyle(1, 0x735e4d, .85).strokeRect(314.5, 5.5, 160, 31);
    g.fillStyle(0x09141d, .84).fillRect(5, 249, 288, 15).lineStyle(1, 0x3d6570, .68).strokeRect(5.5, 249.5, 288, 15);
    g.fillStyle(0x182630, 1).fillRect(84, 25, 83, 5);
    g.fillStyle(0xc66e62, 1).fillRect(84, 25, 83 * combat.playerHp / 5, 5);
    g.fillStyle(0x182630, 1).fillRect(84, 35, 83, 4);
    g.fillStyle(0x58c8bd, 1).fillRect(84, 35, 83 * combat.resonance / 100, 4);
    const dawnrush = this.b05ReviewMode ? this.dawnrushSnapshot() : null;
    if (dawnrush) {
      g.fillStyle(0x182630, 1).fillRect(84, 45, 83, 4);
      g.fillStyle(0xf3a85f, 1).fillRect(84, 45, 83 * dawnrush.energy / 100, 4);
      this.hudDawnrush?.setText(`${dawnrush.form.toUpperCase()}  ${Math.floor(dawnrush.energy)}%  /  R OR LB TRANSFORM`);
    }
    for (let i = 0; i < 5; i += 1) {
      g.fillStyle(i < combat.playerHp ? 0xf1c99a : 0x3a3c43, i < combat.playerHp ? 1 : .72).fillRect(56 + i * 6, 25, 4, 5);
    }
    const enemyFraction = combat.enemyHp / 8;
    g.fillStyle(0x1e2830, 1).fillRect(328, 22, 128, 5);
    g.fillStyle(this.flow.phase === 'sentry-two' ? 0xd7a37b : 0x8dd6cb, 1).fillRect(328, 22, 128 * enemyFraction, 5);
    this.hudVitals?.setText(`INTEGRITY   ${combat.playerHp}/5      RESONANCE   ${Math.floor(combat.resonance)}`);
    this.hudSpecial?.setText(`RESONANCE IMPRINT  ${combat.specialCooldownMs > 0 ? `${(combat.specialCooldownMs / 1000).toFixed(1)}s` : 'READY'}`);
    this.hudEncounter?.setText(this.encounterLabel(combat));
    if (this.b05ReviewMode) this.hudControls?.setText(combat.controllerIndex >= 0
      ? 'STICK MOVE / SOUTH JUMP / WEST LIGHT / NORTH HEAVY / EAST DODGE / RB SOLAR DRIVE / LB TRANSFORM / G CHARGE'
      : 'A/D MOVE / SPACE JUMP / SHIFT DODGE / J COMBO / K HEAVY / Q SOLAR DRIVE / R TRANSFORM / G DEV CHARGE');
    this.hudControls?.setPosition(8, 254).setText(combat.controllerIndex >= 0
      ? 'STICK MOVE  ·  SOUTH JUMP  ·  WEST LIGHT  ·  NORTH HEAVY  ·  EAST DODGE  ·  RB IMPRINT  ·  START PAUSE'
      : 'A/D MOVE  ·  SPACE JUMP  ·  SHIFT DODGE  ·  J COMBO  ·  K HEAVY  ·  Q IMPRINT  ·  E INTERACT  ·  ESC PAUSE');
  }

  private encounterLabel(combat: B03CombatSnapshot): string {
    if (this.flow.phase === 'sentry-one') return `FRACTURED SENTRY     I / II`;
    if (this.flow.phase === 'reward') return `RESONANCE SHARD     RECOVER`;
    if (this.flow.phase === 'sentry-two') return `FRACTURED SENTRY     II / II`;
    if (this.flow.phase === 'exit') return `ATRIUM GATE     OPEN`;
    return combat.enemyState.toUpperCase();
  }

  private transition(event: B04EncounterEvent): void {
    const previous = this.flow.phase;
    this.flow = stepB04Encounter(this.flow, event);
    if (this.flow.phase === previous) return;
    if (event === 'first-sentry-cleared') {
      this.shard?.setVisible(true);
      this.playSoftChime('clear');
      this.audioEvent('sentry-ko', 'B03-original-procedural');
      this.showBanner('THE FIRST SENTINEL BREAKS / CLAIM THE RESONANCE SHARD');
    } else if (event === 'second-sentry-cleared') {
      this.gate?.setAlpha(1);
      this.playSoftChime('gate');
      this.audioEvent('gate-open', 'original-procedural');
      this.showBanner('THE ATRIUM REFORMS / THE EXIT IS OPEN');
    } else if (event === 'player-defeated') {
      this.finishResult('defeat');
    } else if (event === 'enter-gate') {
      this.finishResult('victory');
    }
    this.emitState();
  }

  private finishResult(result: 'victory' | 'defeat'): void {
    if (this.resultSent) return;
    this.resultSent = true;
    this.setLabAudioPaused(true);
    window.dispatchEvent(new CustomEvent('crownflare:b04-result', {
      detail: { result, elapsedMs: Math.round(this.flow.elapsedMs), damageTaken: this.flow.damageTaken, rewardClaimed: this.flow.rewardClaimed },
    }));
  }

  private showBanner(message: string): void {
    const banner = this.add.text(240, 58, message, { fontFamily: 'monospace', fontSize: '6px', color: '#f5ddbd', backgroundColor: '#111923e8', padding: { x: 5, y: 4 }, align: 'center' }).setOrigin(.5, 0).setScrollFactor(0).setDepth(60).setAlpha(0);
    this.tweens.add({ targets: banner, alpha: 1, duration: 180, hold: 1700, yoyo: true, onComplete: () => banner.destroy() });
  }

  private playImpact(state: B03CombatSnapshot, moveId: string): void {
    const impact = this.add.image(state.enemyX, GROUND_TOP - 25, B04_ASSETS.impacts[0]).setDepth(26).setScale(.8);
    window.dispatchEvent(new CustomEvent('crownflare:b04-vfx', { detail: { kind: 'impact', moveId, phase: this.flow.phase } }));
    const frames = B04_ASSETS.impacts;
    frames.forEach((frame, index) => this.time.delayedCall(index * 48, () => {
      if (impact.active) impact.setTexture(frame).setScale(index === 1 ? 1 : .76).setAlpha(index === 2 ? .72 : 1);
    }));
    this.time.delayedCall(175, () => impact.destroy());
  }

  private unlockB04Audio(): void {
    if (this.sound.locked) this.sound.unlock();
    this.audioUnlocked = !this.sound.locked;
    if (this.audioUnlocked && !this.resultSent) this.startAmbience();
  }

  private startAmbience(): void {
    if (!this.audioUnlocked || this.resultSent || !this.ambience || this.sound.locked || this.ambience.isPlaying) return;
    this.ambience.play();
    this.audioEvent('sunderglass-ambience', 'authored-8s-wav-loop');
  }

  private playSoftChime(kind: 'clear' | 'reward' | 'gate'): void {
    if (!this.audioUnlocked || this.sound.locked || this.resultSent) return;
    const context = (this.sound as unknown as { context?: AudioContext | null }).context;
    if (!context) return;
    if (context.state === 'suspended') void context.resume();
    const now = context.currentTime;
    const notes = kind === 'reward' ? [587.33, 783.99] : kind === 'gate' ? [261.63, 392, 523.25] : [392, 587.33];
    for (const frequency of notes) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.exponentialRampToValueAtTime(kind === 'gate' ? .018 : .013, now + .035);
      gain.gain.exponentialRampToValueAtTime(.0001, now + (kind === 'gate' ? .8 : .42));
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + (kind === 'gate' ? .82 : .44));
    }
    this.audioEvent(`atrium-${kind}`, 'original-soft-sine-chord');
  }

  private audioEvent(cue: string, source: string): void {
    window.dispatchEvent(new CustomEvent('crownflare:audio-event', { detail: { cue, source, scene: 'b04' } }));
  }

  private emitState(): void {
    const snapshot = this.b04Snapshot();
    if (snapshot) window.dispatchEvent(new CustomEvent('crownflare:b04-state', { detail: snapshot }));
  }
}
