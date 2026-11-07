import './style.css';
import type * as Phaser from 'phaser';
import { createGame } from './game/createGame';
import { loadSave } from './game/persistence/save';
import { GamepadStartEdge } from './game/input/gamepadStartEdge';
import type { AnimationLabSnapshot, ArtReviewSnapshot, ChamberScene, ChamberSnapshot, IonaPreviewSnapshot } from './game/scenes/ChamberScene';
import { SAVE_NAMESPACE } from './game/persistence/save';
import { shouldEnableIonaPreview } from './game/preview/ionaPreviewGate';
import { ControllerSettingsScreen } from './game/input/controllerSettingsScreen';
import type { ControlSettings } from './game/input/controlSettings';
import { controllerFamily } from './game/input/controlSettings';
const byId = <T extends HTMLElement>(id: string): T => { const el = document.getElementById(id); if (!el) throw new Error(`Missing UI: ${id}`); return el as T; };
const title = byId<HTMLElement>('title-screen');
const hud = byId<HTMLElement>('hud');
const pauseScreen = byId<HTMLElement>('pause-screen');
const startButton = byId<HTMLButtonElement>('start-button');
const resumeButton = byId<HTMLButtonElement>('resume-button');
const quitButton = byId<HTMLButtonElement>('quit-button');
const debugOverlay = byId<HTMLElement>('debug-overlay');
const controllerIndicator = byId<HTMLElement>('controller-indicator');
const pauseReason = byId<HTMLElement>('pause-reason');
const titleMetadata = byId<HTMLElement>('title-metadata');
const previewNotice = byId<HTMLElement>('preview-notice');
const hudMode = byId<HTMLElement>('hud-mode');
const previewReadout = byId<HTMLElement>('preview-readout');
const previewTools = byId<HTMLElement>('preview-tools');
const previewAudioCue = byId<HTMLSelectElement>('preview-audio-cue');
const previewAudioPlay = byId<HTMLButtonElement>('preview-audio-play');
const previewAudioToggle = byId<HTMLButtonElement>('preview-audio-toggle');
const previewAudioVolume = byId<HTMLInputElement>('preview-audio-volume');
const titleSettingsButton = byId<HTMLButtonElement>('title-settings-button');
const pauseSettingsButton = byId<HTMLButtonElement>('pause-settings-button');
let game: Phaser.Game | null = null;
let chamber: ChamberScene | null = null;
let active = false;
let paused = false;
let debug = false;
let artReviewMode = false;
let animationLabMode = false;
let ionaPreviewMode = false;
let b03CombatMode = false;
let settingsOpen = false;
let settingsReturnToPause = false;
const query = new URLSearchParams(window.location.search);
const b03CombatRequested = import.meta.env.DEV && query.get('b03') === '1';
const ionaPreviewRequested = shouldEnableIonaPreview(import.meta.env.DEV, query.get('ionaPreview') === '1' || b03CombatRequested ? '1' : null);
let pausedGamepadFrame = 0;
const pausedGamepadStart = new GamepadStartEdge();
loadSave({ getItem: (key) => window.localStorage.getItem(key) }); // access stays inside loadSave's permission-error fallback
const controllerSettings = new ControllerSettingsScreen();
function setVisible(element: HTMLElement, shown: boolean): void { element.classList.toggle('hidden', !shown); element.setAttribute('aria-hidden', String(!shown)); }
function focusGameCanvas(): void { game?.canvas?.focus({ preventScroll: true }); }
function gamepadStartDown(): boolean {
  try { return Array.from(navigator.getGamepads?.() ?? []).some((pad) => !!pad?.connected && !!pad.buttons[9]?.pressed); }
  catch { return false; }
}
function stopPausedGamepadMonitor(): void {
  if (pausedGamepadFrame) window.cancelAnimationFrame(pausedGamepadFrame);
  pausedGamepadFrame = 0; pausedGamepadStart.reset(false);
}
function pollPausedGamepad(): void {
  if (!active || !paused || artReviewMode || settingsOpen) { pausedGamepadFrame = 0; return; }
  if (pausedGamepadStart.poll(gamepadStartDown())) { pausedGamepadFrame = 0; togglePause('Resumed with controller Start.'); return; }
  pausedGamepadFrame = window.requestAnimationFrame(pollPausedGamepad);
}
function start(artReview = false, animationLab = false, ionaPreview = false, b03Combat = false): void {
  if (active) return;
  active = true; paused = false; artReviewMode = artReview; animationLabMode = animationLab; ionaPreviewMode = ionaPreview; b03CombatMode = b03Combat;
  setVisible(title, false); setVisible(hud, !artReview && !animationLab); setVisible(pauseScreen, false);
  setVisible(byId<HTMLElement>('target-health'), b03Combat);
  setVisible(byId<HTMLElement>('b03-status'), b03Combat);
  hud.classList.toggle('preview-hud', ionaPreview);
  hud.classList.toggle('b03-hud', b03Combat);
  setVisible(previewTools, ionaPreview && !b03Combat);
  setVisible(previewReadout, ionaPreview && !b03Combat);
  if (b03Combat) {
    hudMode.textContent = '/ B03 COMBAT CANDIDATE';
    byId<HTMLElement>('controls-tip').textContent = 'A/D MOVE · SPACE JUMP · SHIFT DODGE · J / WEST LIGHT · K / NORTH HEAVY · Q / RB RESONANCE · E INTERACT · ESC / START PAUSE';
  } else if (ionaPreview) {
    hudMode.textContent = '/ PROVISIONAL IONA';
    byId<HTMLElement>('controls-tip').textContent = 'A/D OR ARROWS MOVE · SPACE/W/↑ JUMP · SHIFT / EAST DODGE · J OR WEST LIGHT · K OR NORTH HEAVY · Q / RB SPECIAL · ESC PAUSE';
  } else {
    hudMode.textContent = '/ CHAMBER 00';
    byId<HTMLElement>('controls-tip').textContent = 'A/D MOVE · SPACE JUMP · SHIFT DASH · ESC PAUSE';
  }
  const instance = createGame(() => togglePause(), (connected) => { controllerIndicator.textContent = connected ? 'CONTROLLER CONNECTED' : ''; }, { artReview, animationLab, ionaPreview, b03Combat });
  game = instance.game; chamber = instance.scene;
  focusGameCanvas();
}
function togglePause(reason = 'The Spindle is still.'): void {
  if (!active || !game || settingsOpen) return;
  paused = !paused;
  chamber?.resetTransientInput();
  chamber?.setLabAudioPaused(paused);
  if (paused) {
    game.scene.pause('Chamber');
    if (!artReviewMode) {
      pausedGamepadStart.reset(gamepadStartDown());
      pausedGamepadFrame = window.requestAnimationFrame(pollPausedGamepad);
    }
  } else {
    stopPausedGamepadMonitor();
    game.scene.resume('Chamber');
  }
  pauseReason.textContent = reason;
  setVisible(pauseScreen, paused);
  if (paused) resumeButton.focus(); else game.canvas?.focus();
}
function openControllerSettings(fromPause: boolean): void {
  if (settingsOpen) return;
  settingsOpen = true;
  settingsReturnToPause = fromPause && paused;
  if (settingsReturnToPause) { stopPausedGamepadMonitor(); setVisible(pauseScreen, false); }
  chamber?.resetTransientInput();
  game?.canvas?.blur();
  controllerSettings.open({
    onClose: () => {
      settingsOpen = false;
      if (settingsReturnToPause) {
        setVisible(pauseScreen, true);
        pausedGamepadStart.reset(gamepadStartDown());
        pausedGamepadFrame = window.requestAnimationFrame(pollPausedGamepad);
      }
      settingsReturnToPause = false;
      chamber?.resetTransientInput();
    },
    onApply: (settings: ControlSettings) => chamber?.setControlSettings(settings),
  });
}
function toggleDebug(): void { if (!import.meta.env.DEV) return; debug = !debug; setVisible(debugOverlay, debug); }
function quit(): void {
  if (!active) return;
  stopPausedGamepadMonitor();
  game?.destroy(true);
  game = null; chamber = null; active = false; paused = false; debug = false; artReviewMode = false; animationLabMode = false; ionaPreviewMode = false; b03CombatMode = false;
  setVisible(debugOverlay, false); setVisible(pauseScreen, false); setVisible(hud, false); setVisible(previewTools, false); setVisible(previewReadout, false); hud.classList.remove('preview-hud'); setVisible(title, true);
  startButton.focus();
}
startButton.addEventListener('click', () => start(false, false, ionaPreviewRequested, b03CombatRequested));
titleSettingsButton.addEventListener('click', () => openControllerSettings(false));
pauseSettingsButton.addEventListener('click', () => openControllerSettings(true));
resumeButton.addEventListener('click', () => { if (paused) togglePause(); });
quitButton.addEventListener('click', quit);
window.addEventListener('blur', () => { if (active && !paused) togglePause('Focus lost — simulation held for safety.'); });
document.addEventListener('visibilitychange', () => { if (document.hidden && active && !paused) togglePause('Tab hidden — simulation held for safety.'); });
window.addEventListener('keydown', (event) => {
  if (event.code === 'Escape' && active) { event.preventDefault(); if (artReviewMode) quit(); else if (settingsOpen) return; else togglePause(); }
  if (event.code === 'Backquote' && active && !artReviewMode && import.meta.env.DEV) { event.preventDefault(); toggleDebug(); }
  // One window listener owns Escape in both play and pause, preventing double toggles.
});
window.addEventListener('crownflare:tick', () => {
  if (debug && chamber && active) {
    const state = chamber.snapshot();
    if (!state) return;
    debugOverlay.textContent = `B00 DEBUG ONLY\nX:${state.x}  Y:${state.y}\nON FLOOR:${state.grounded}\nDASH:${state.dashActive}\nCAM:${state.cameraX}\nSAVE:${SAVE_NAMESPACE}`;
  }
  if (ionaPreviewMode && chamber) {
    const state = chamber.previewSnapshot();
    if (!state) return;
    previewReadout.textContent = `TARGET ${state.targetHealth} HP / ${Math.round(state.targetX)} · ${state.lastCombatEvent} · ${state.action.toUpperCase()} ${state.frame} ${state.facing < 0 ? 'LEFT' : 'RIGHT'} · ${state.reviewScale}px · AUDIO ${state.audioStatus}`;
    previewAudioToggle.textContent = state.audioEnabled ? 'MUTE' : 'UNMUTE';
    previewAudioToggle.setAttribute('aria-pressed', String(state.audioEnabled));
    previewAudioVolume.value = String(state.audioVolume);
    for (const button of previewTools.querySelectorAll<HTMLButtonElement>('[data-preview-scale]')) {
      button.setAttribute('aria-pressed', String(Number(button.dataset.previewScale) === state.reviewScale));
    }
  }
});
window.addEventListener('crownflare:b03-state', (event) => {
  if (!b03CombatMode) return;
  const detail = (event as CustomEvent<{ playerHp:number; playerMaxHp:number; enemyHp:number; enemyMaxHp:number; resonance:number; resonanceMax:number; specialCooldown:number; combo:string; status:string; controllerIndex:number }>).detail;
  const playerFill = byId<HTMLElement>('player-health').querySelector<HTMLElement>('.bar i');
  const targetFill = byId<HTMLElement>('target-health').querySelector<HTMLElement>('.bar i');
  const resonanceFill = byId<HTMLElement>('resonance-meter').querySelector<HTMLElement>('.bar i');
  if (playerFill) playerFill.style.width = `${Math.max(0, detail.playerHp / detail.playerMaxHp) * 100}%`;
  if (targetFill) targetFill.style.width = `${Math.max(0, detail.enemyHp / detail.enemyMaxHp) * 100}%`;
  if (resonanceFill) resonanceFill.style.width = `${Math.max(0, detail.resonance / detail.resonanceMax) * 100}%`;
  byId<HTMLElement>('resonance-meter').querySelector('span')!.textContent = `RESONANCE ${Math.floor(detail.resonance)} / SPECIAL ${detail.specialCooldown > 0 ? `${Math.ceil(detail.specialCooldown / 100) / 10}s` : 'READY'}`;
  byId<HTMLElement>('b03-status').textContent = `${detail.combo} · ${detail.status} · ${detail.controllerIndex >= 0 ? 'CONTROLLER' : 'KEYBOARD / MOUSE'}`;
  if (detail.controllerIndex < 0) {
    byId<HTMLElement>('controls-tip').textContent = 'A/D MOVE · SPACE JUMP · SHIFT DODGE · J / LEFT CLICK LIGHT · K / RIGHT CLICK HEAVY · Q RESONANCE · E INTERACT · ESC PAUSE';
  } else {
    let id = '';
    try { id = navigator.getGamepads?.()[detail.controllerIndex]?.id ?? ''; } catch { /* controller may disconnect between frames */ }
    const family = controllerFamily(id);
    const map = family === 'xbox'
      ? 'A JUMP · X LIGHT · Y HEAVY · B DODGE · RB RESONANCE · D-PAD UP INTERACT'
      : family === 'playstation'
      ? 'CROSS JUMP · SQUARE LIGHT · TRIANGLE HEAVY · CIRCLE DODGE · R1 RESONANCE · D-PAD UP INTERACT'
      : 'SOUTH JUMP · WEST LIGHT · NORTH HEAVY · EAST DODGE · BUTTON 5 RESONANCE · D-PAD UP INTERACT';
    byId<HTMLElement>('controls-tip').textContent = `LEFT STICK / D-PAD MOVE · ${map} · START PAUSE`;
  }
});
for (const button of previewTools.querySelectorAll<HTMLButtonElement>('[data-preview-scale]')) {
  button.addEventListener('click', () => { chamber?.setPreviewScale(Number(button.dataset.previewScale) as 48 | 60 | 72); focusGameCanvas(); });
}
previewAudioPlay.addEventListener('click', () => { chamber?.playPreviewCue(previewAudioCue.value); focusGameCanvas(); });
previewAudioToggle.addEventListener('click', () => {
  const state = chamber?.previewSnapshot();
  if (state) chamber?.setPreviewAudioEnabled(!state.audioEnabled);
  focusGameCanvas();
});
previewAudioVolume.addEventListener('input', () => chamber?.setPreviewAudioVolume(Number(previewAudioVolume.value)));
previewAudioVolume.addEventListener('change', focusGameCanvas);
if (import.meta.env.DEV) {
  // QA hook is read-only and never changes game rules or bypasses play input.
  Object.defineProperty(window, '__CROWNFLARE_QA__', { configurable: true, value: {
    snapshot: (): { screen: 'title' | 'playing' | 'paused' | 'review' | 'animationLab' | 'ionaPreview' | 'b03Combat'; player: ChamberSnapshot | null; review: ArtReviewSnapshot | null; lab: AnimationLabSnapshot | null; preview: IonaPreviewSnapshot | null; combat: ReturnType<ChamberScene['combatSnapshot']> } => ({
      screen: !active ? 'title' : artReviewMode ? 'review' : paused ? 'paused' : animationLabMode ? 'animationLab' : b03CombatMode ? 'b03Combat' : ionaPreviewMode ? 'ionaPreview' : 'playing',
      player: active && !artReviewMode ? chamber?.snapshot() ?? null : null,
      review: active && artReviewMode ? chamber?.reviewSnapshot() ?? null : null,
      lab: active && animationLabMode ? chamber?.animationSnapshot() ?? null : null,
      preview: active && ionaPreviewMode ? chamber?.previewSnapshot() ?? null : null,
      combat: active && b03CombatMode ? chamber?.combatSnapshot() ?? null : null,
    }),
  } });
}
if (ionaPreviewRequested) {
  title.classList.add('iona-preview-title');
  setVisible(previewNotice, true);
  titleMetadata.textContent = b03CombatRequested ? 'B03 COMBAT PLAYTEST / PROVISIONAL GAMEPLAY ART / NOT APPROVED' : 'DEVELOPMENT PLAYTEST / PROVISIONAL GAMEPLAY ART / NOT APPROVED';
  if (b03CombatRequested) startButton.innerHTML = 'ENTER B03 COMBAT TRIAL <span aria-hidden="true">→</span>';
}
if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('artReview') === '1') start(true);
if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('animationLab') === '1') start(false,true);
