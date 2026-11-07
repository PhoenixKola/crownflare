import './style.css';
import type * as Phaser from 'phaser';
import { createGame } from './game/createGame';
import { loadSave } from './game/persistence/save';
import { GamepadStartEdge } from './game/input/gamepadStartEdge';
import type { AnimationLabSnapshot, ArtReviewSnapshot, ChamberScene, ChamberSnapshot } from './game/scenes/ChamberScene';
import { SAVE_NAMESPACE } from './game/persistence/save';
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
let game: Phaser.Game | null = null;
let chamber: ChamberScene | null = null;
let active = false;
let paused = false;
let debug = false;
let artReviewMode = false;
let animationLabMode = false;
let pausedGamepadFrame = 0;
const pausedGamepadStart = new GamepadStartEdge();
loadSave({ getItem: (key) => window.localStorage.getItem(key) }); // access stays inside loadSave's permission-error fallback
function setVisible(element: HTMLElement, shown: boolean): void { element.classList.toggle('hidden', !shown); element.setAttribute('aria-hidden', String(!shown)); }
function gamepadStartDown(): boolean {
  try { return Array.from(navigator.getGamepads?.() ?? []).some((pad) => !!pad?.connected && !!pad.buttons[9]?.pressed); }
  catch { return false; }
}
function stopPausedGamepadMonitor(): void {
  if (pausedGamepadFrame) window.cancelAnimationFrame(pausedGamepadFrame);
  pausedGamepadFrame = 0; pausedGamepadStart.reset(false);
}
function pollPausedGamepad(): void {
  if (!active || !paused || artReviewMode) { pausedGamepadFrame = 0; return; }
  if (pausedGamepadStart.poll(gamepadStartDown())) { pausedGamepadFrame = 0; togglePause('Resumed with controller Start.'); return; }
  pausedGamepadFrame = window.requestAnimationFrame(pollPausedGamepad);
}
function start(artReview = false, animationLab = false): void {
  if (active) return;
  active = true; paused = false; artReviewMode = artReview; animationLabMode = animationLab;
  setVisible(title, false); setVisible(hud, !artReview && !animationLab); setVisible(pauseScreen, false);
  const instance = createGame(() => togglePause(), (connected) => { controllerIndicator.textContent = connected ? 'CONTROLLER CONNECTED' : ''; }, { artReview, animationLab });
  game = instance.game; chamber = instance.scene;
}
function togglePause(reason = 'The Spindle is still.'): void {
  if (!active || !game) return;
  paused = !paused;
  chamber?.resetTransientInput();
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
function toggleDebug(): void { if (!import.meta.env.DEV) return; debug = !debug; setVisible(debugOverlay, debug); }
function quit(): void {
  if (!active) return;
  stopPausedGamepadMonitor();
  game?.destroy(true);
  game = null; chamber = null; active = false; paused = false; debug = false; artReviewMode = false; animationLabMode = false;
  setVisible(debugOverlay, false); setVisible(pauseScreen, false); setVisible(hud, false); setVisible(title, true);
  startButton.focus();
}
startButton.addEventListener('click', () => start());
resumeButton.addEventListener('click', () => { if (paused) togglePause(); });
quitButton.addEventListener('click', quit);
window.addEventListener('blur', () => { if (active && !paused) togglePause('Focus lost — simulation held for safety.'); });
document.addEventListener('visibilitychange', () => { if (document.hidden && active && !paused) togglePause('Tab hidden — simulation held for safety.'); });
window.addEventListener('keydown', (event) => {
  if (event.code === 'Escape' && active) { event.preventDefault(); if (artReviewMode) quit(); else togglePause(); }
  if (event.code === 'Backquote' && active && !artReviewMode && import.meta.env.DEV) { event.preventDefault(); toggleDebug(); }
  // One window listener owns Escape in both play and pause, preventing double toggles.
});
window.addEventListener('crownflare:tick', () => {
  if (debug && chamber && active) {
    const state = chamber.snapshot();
    if (!state) return;
    debugOverlay.textContent = `B00 DEBUG ONLY\nX:${state.x}  Y:${state.y}\nON FLOOR:${state.grounded}\nDASH:${state.dashActive}\nCAM:${state.cameraX}\nSAVE:${SAVE_NAMESPACE}`;
  }
});
if (import.meta.env.DEV) {
  // QA hook is read-only and never changes game rules or bypasses play input.
  Object.defineProperty(window, '__CROWNFLARE_QA__', { configurable: true, value: {
    snapshot: (): { screen: 'title' | 'playing' | 'paused' | 'review' | 'animationLab'; player: ChamberSnapshot | null; review: ArtReviewSnapshot | null; lab: AnimationLabSnapshot | null } => ({
      screen: !active ? 'title' : artReviewMode ? 'review' : paused ? 'paused' : animationLabMode ? 'animationLab' : 'playing',
      player: active && !artReviewMode ? chamber?.snapshot() ?? null : null,
      review: active && artReviewMode ? chamber?.reviewSnapshot() ?? null : null,
      lab: active && animationLabMode ? chamber?.animationSnapshot() ?? null : null,
    }),
  } });
}
if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('artReview') === '1') start(true);
if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('animationLab') === '1') start(false,true);
