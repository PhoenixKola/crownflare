import './style.css';
import type * as Phaser from 'phaser';
import { createGame } from './game/createGame';
import { loadSave, persistSave, recordRunResult, type B10RunCheckpoint, type B10RunSummary, type SaveV2 } from './game/persistence/save';
import { GamepadStartEdge } from './game/input/gamepadStartEdge';
import type { AnimationLabSnapshot, ArtReviewSnapshot, ChamberScene, ChamberSnapshot, IonaPreviewSnapshot } from './game/scenes/ChamberScene';
import { B04VerticalSliceScene } from './game/scenes/B04VerticalSliceScene';
import { B06EnemyGauntletScene } from './game/scenes/B06EnemyGauntletScene';
import { B07ExpeditionScene } from './game/scenes/B07ExpeditionScene';
import { SAVE_NAMESPACE } from './game/persistence/save';
import { shouldEnableIonaPreview } from './game/preview/ionaPreviewGate';
import { ControllerSettingsScreen } from './game/input/controllerSettingsScreen';
import type { ControlSettings } from './game/input/controlSettings';
import { controllerFamily, DEFAULT_CONTROL_SETTINGS, loadControlSettings, readPadActions, selectStandardPad, type StandardPadLike } from './game/input/controlSettings';
import { B09_UPGRADES, type RunBuildState, type UpgradeOffer } from './game/roguelite/b09RunBuild';
const byId = <T extends HTMLElement>(id: string): T => { const el = document.getElementById(id); if (!el) throw new Error(`Missing UI: ${id}`); return el as T; };
const title = byId<HTMLElement>('title-screen');
const hubScreen = byId<HTMLElement>('hub-screen');
const hubStory = byId<HTMLElement>('hub-story');
const b10StoryBeat = byId<HTMLElement>('b10-story-beat');
const b10StoryContinue = byId<HTMLButtonElement>('b10-story-continue');
const hubNewRunButton = byId<HTMLButtonElement>('hub-new-run');
const hubContinueButton = byId<HTMLButtonElement>('hub-continue');
const hubSaveStatus = byId<HTMLElement>('hub-save-status');
const hubProgress = byId<HTMLElement>('hub-progress');
const hubReducedMotion = byId<HTMLInputElement>('hub-reduced-motion');
const hubVolume = byId<HTMLInputElement>('hub-volume');
const hubSoundToggle = byId<HTMLButtonElement>('hub-sound-toggle');
const hubAmbience = byId<HTMLAudioElement>('hub-ambience');
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
const b04Results = byId<HTMLElement>('b04-results');
const b04ResultHeading = byId<HTMLElement>('b04-result-heading');
const b04ResultStats = byId<HTMLElement>('b04-result-stats');
const b04ReplayButton = byId<HTMLButtonElement>('b04-replay-button');
const b04TitleButton = byId<HTMLButtonElement>('b04-title-button');
const b07Results = byId<HTMLElement>('b07-results');
const b07ResultHeading = byId<HTMLElement>('b07-result-heading');
const b07ResultStats = byId<HTMLElement>('b07-result-stats');
const b07ResultStory = byId<HTMLElement>('b07-result-story');
const b07ReplayButton = byId<HTMLButtonElement>('b07-replay-button');
const b07TitleButton = byId<HTMLButtonElement>('b07-title-button');
const b09ChoiceScreen = byId<HTMLElement>('b09-choice-screen');
const b09ChoiceHeading = byId<HTMLElement>('b09-choice-heading');
const b09ChoiceSource = byId<HTMLElement>('b09-choice-source');
const b09ChoiceCards = byId<HTMLElement>('b09-choice-cards');
const b09ChoiceHint = byId<HTMLElement>('b09-choice-hint');
const b09AbandonButton = byId<HTMLButtonElement>('b09-abandon-button');
const b09PauseBuild = byId<HTMLElement>('b09-pause-build');
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
let b04Mode = false;
let b05Mode = false;
let b06Mode = false;
let b07Mode = false;
let b08Mode = false;
let b09Mode = false;
let b10Mode = false;
let b10StoryVisible = false;
let b09ChoiceVisible = false;
let b09CurrentOffer: UpgradeOffer | null = null;
let b09SelectedIndex = 0;
let b09PadAxis = 0;
let b09PadAccept = false;
let b09ChoiceFrame = 0;
let b04ResultVisible = false;
let b07ResultVisible = false;
let b04ResultsFrame = 0;
let b04PreviousAccept = false;
let b04PreviousLeft = false;
let b04PreviousRight = false;
let settingsOpen = false;
let settingsReturnToPause = false;
const query = new URLSearchParams(window.location.search);
const b03CombatRequested = import.meta.env.DEV && query.get('b03') === '1';
const b04Requested = import.meta.env.DEV && query.get('b04') === '1';
const b05Requested = import.meta.env.DEV && query.get('b05') === '1';
const b06Requested = import.meta.env.DEV && query.get('b06') === '1';
const b07Requested = import.meta.env.DEV && query.get('b07') === '1';
const b08Requested = import.meta.env.DEV && query.get('b08') === '1';
const b09Requested = import.meta.env.DEV && query.get('b09') === '1';
const ionaPreviewRequested = shouldEnableIonaPreview(import.meta.env.DEV, query.get('ionaPreview') === '1' || b03CombatRequested ? '1' : null);
let pausedGamepadFrame = 0;
let hubGamepadFrame = 0;
let hubPadPreviousDown = false;
let hubPadPreviousUp = false;
let hubPadPreviousAccept = false;
const pausedGamepadStart = new GamepadStartEdge();
const browserStorage = { getItem: (key: string) => window.localStorage.getItem(key), setItem: (key: string, value: string) => window.localStorage.setItem(key, value) };
let saveState: SaveV2 = loadSave(browserStorage);
let hubSoundEnabled = true;
let b10RunId: string | null = null;
const controllerSettings = new ControllerSettingsScreen();
function setVisible(element: HTMLElement, shown: boolean): void { element.classList.toggle('hidden', !shown); element.setAttribute('aria-hidden', String(!shown)); }
function commitSave(next: SaveV2): boolean {
  saveState = next;
  const saved = persistSave(browserStorage, next);
  if (saved) saveState = loadSave(browserStorage);
  hubSaveStatus.textContent = saved ? `LOCAL CHECKPOINT SAVED · REVISION ${saveState.revision}` : 'SAVE UNAVAILABLE · THIS SESSION CAN CONTINUE, BUT PROGRESS MAY NOT PERSIST';
  renderHub();
  return saved;
}
function renderHub(): void {
  const checkpoint = saveState.activeRun;
  hubContinueButton.disabled = !checkpoint;
  hubContinueButton.textContent = checkpoint ? `CONTINUE · ROOM ${checkpoint.route.roomIndex + 1} · ${checkpoint.seed.toString(16).toUpperCase()}` : 'CONTINUE LAST RUN · NO CHECKPOINT';
  const last = saveState.meta.lastRun;
  hubProgress.textContent = `${saveState.meta.completedRuns} COMPLETED RUN${saveState.meta.completedRuns === 1 ? '' : 'S'} · ${saveState.meta.beaconAwakened ? 'REFUGE BEACON LIT' : 'FIRST CLEAR WILL LIGHT THE BEACON'}${last ? ` · LAST ${last.result.toUpperCase()}` : ''}`;
  byId<HTMLElement>('hub-beacon-state').textContent = saveState.meta.beaconAwakened ? 'AWAKE / FIRST-CLEAR MARK' : 'UNLIT';
  hubReducedMotion.checked = saveState.options.reduceMotion;
  hubVolume.value = String(saveState.options.masterVolume);
  hubAmbience.volume = saveState.options.masterVolume;
  hubAmbience.muted = !hubSoundEnabled;
}
function openHub(): void {
  b10StoryVisible = false; setVisible(b10StoryBeat, false); setVisible(title, false); setVisible(hubScreen, true); setVisible(hubStory, false); renderHub();
  if (hubSoundEnabled) void hubAmbience.play().catch(() => { hubSaveStatus.textContent = 'SELECT SOUND ON TO ENABLE THE REFUGE AMBIENCE'; });
  hubNewRunButton.focus();
  pollHubGamepad();
}
function showHubStory(): void {
  const first = !saveState.story.prologueSeen;
  byId<HTMLElement>('hub-story-title').textContent = first ? 'The day broke twice.' : 'The hinge remembers.';
  byId<HTMLElement>('hub-story-copy').innerHTML = first
    ? 'IONA: The Spindle is holding two broken skies apart.<br /><br />SIGNAL: Repair the hinge. The cost will be yours to carry.<br /><br />IONA: I will mend the turning. The hour it chooses is not mine alone.'
    : 'IONA: The two regions are still pulling against each other.<br /><br />SIGNAL: You know what the Spindle asks of you now.<br /><br />IONA: Then I will choose the turning again.';
  setVisible(hubStory, true); byId<HTMLButtonElement>('hub-begin-run').focus();
}
function makeRunSeed(): number {
  try { const value = new Uint32Array(1); crypto.getRandomValues(value); return value[0] || 1; }
  catch { return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0 || 1; }
}
function launchB10Run(seed: number, checkpoint: B10RunCheckpoint | null, runId: string): void {
  b10RunId = runId;
  stopHubGamepad(); hubAmbience.pause(); setVisible(hubScreen, false); setVisible(hubStory, false);
  start(false, false, false, false, false, false, false, false, false, false, true, seed, checkpoint, runId);
}
function beginB10NewRun(): void {
  const seed = makeRunSeed();
  const runId = `run-${Date.now().toString(36)}-${seed.toString(16)}`;
  const next = { ...saveState, story: { ...saveState.story, prologueSeen: true }, activeRun: null };
  commitSave(next);
  launchB10Run(seed, null, runId);
}
function continueB10Run(): void {
  const checkpoint = saveState.activeRun;
  if (!checkpoint) return;
  launchB10Run(checkpoint.seed, checkpoint, checkpoint.runId);
}
function stopHubGamepad(): void {
  if (hubGamepadFrame) window.cancelAnimationFrame(hubGamepadFrame);
  hubGamepadFrame = 0; hubPadPreviousDown = false; hubPadPreviousUp = false; hubPadPreviousAccept = false;
}
function hubFocus(direction: -1 | 1): void {
  const controls: HTMLButtonElement[] = hubStory.classList.contains('hidden')
    ? [hubNewRunButton, hubContinueButton, byId<HTMLButtonElement>('hub-controls'), hubSoundToggle]
    : [byId<HTMLButtonElement>('hub-begin-run'), byId<HTMLButtonElement>('hub-story-back')];
  const enabled = controls.filter((button) => !button.disabled);
  const index = enabled.indexOf(document.activeElement as HTMLButtonElement);
  enabled[(index + direction + enabled.length) % enabled.length]?.focus();
}
function pollHubGamepad(): void {
  if (hubScreen.classList.contains('hidden')) { stopHubGamepad(); return; }
  let pad: Gamepad | null = null;
  try { pad = Array.from(navigator.getGamepads?.() ?? []).find((candidate) => candidate?.connected) ?? null; } catch { pad = null; }
  if (pad) {
    const down = !!pad.buttons[13]?.pressed || (pad.axes[1] ?? 0) > .65;
    const up = !!pad.buttons[12]?.pressed || (pad.axes[1] ?? 0) < -.65;
    const accept = !!pad.buttons[0]?.pressed;
    if (down && !hubPadPreviousDown) hubFocus(1);
    if (up && !hubPadPreviousUp) hubFocus(-1);
    if (accept && !hubPadPreviousAccept && document.activeElement instanceof HTMLButtonElement) document.activeElement.click();
    hubPadPreviousDown = down; hubPadPreviousUp = up; hubPadPreviousAccept = accept;
  } else { hubPadPreviousDown = false; hubPadPreviousUp = false; hubPadPreviousAccept = false; }
  hubGamepadFrame = window.requestAnimationFrame(pollHubGamepad);
}
function saveB10Checkpoint(event: Event): void {
  if (!b10Mode) return;
  const checkpoint = (event as CustomEvent<B10RunCheckpoint>).detail;
  if (!checkpoint || checkpoint.runId !== b10RunId) return;
  commitSave({ ...saveState, activeRun: checkpoint });
}
function completeB10Run(detail: { result: 'victory' | 'defeat'; elapsedMs: number; damageTaken: number; visited: readonly string[]; choices: B10RunCheckpoint['route']['choices']; seed: number; b08BossesCleared?: readonly string[]; b09Build?: RunBuildState; runId?: string }): void {
  if (!b10Mode) return;
  const runId = detail.runId ?? b10RunId;
  if (!runId) return;
  const runBuild = detail.b09Build ?? (chamber instanceof B07ExpeditionScene ? chamber.b07Snapshot().b09.build : undefined);
  if (!runBuild) return;
  const summary: B10RunSummary = { runId, result: detail.result, seed: detail.seed, elapsedMs: Math.round(detail.elapsedMs), damageTaken: detail.damageTaken, visited: [...detail.visited], choices: detail.choices, bossesCleared: [...(detail.b08BossesCleared ?? [])], build: runBuild };
  commitSave(recordRunResult(saveState, summary));
}
function openB10StoryBeat(event: Event): void {
  if (!b10Mode || saveState.story.loomBeatSeen || (event as CustomEvent<{ id?: string }>).detail?.id !== 'vesper-arrival') return;
  b10StoryVisible = true;
  commitSave({ ...saveState, story: { ...saveState.story, loomBeatSeen: true } });
  chamber?.resetTransientInput(); chamber?.setLabAudioPaused(true); game?.scene.pause('Chamber');
  setVisible(b10StoryBeat, true); b10StoryContinue.focus();
}
function closeB10StoryBeat(): void {
  if (!b10StoryVisible) return;
  b10StoryVisible = false; setVisible(b10StoryBeat, false);
  chamber?.resetTransientInput(); chamber?.setLabAudioPaused(false); game?.scene.resume('Chamber'); focusGameCanvas();
}
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
function start(artReview = false, animationLab = false, ionaPreview = false, b03Combat = false, b04 = false, b05 = false, b06 = false, b07 = false, b08 = false, b09 = false, b10 = false, seed?: number, checkpoint: B10RunCheckpoint | null = null, runId?: string): void {
  if (active) return;
  const b07On = b07 || b08 || b09 || b10;
  active = true; paused = false; artReviewMode = artReview; animationLabMode = animationLab; ionaPreviewMode = ionaPreview || b04 || b05 || b06 || b07On; b03CombatMode = b03Combat || b04 || b05 || b06 || b07On; b04Mode = b04 || b05 || b06 || b07On; b05Mode = b05 || b06 || b07On; b06Mode = b06; b07Mode = b07On; b08Mode = b08 || b09 || b10; b09Mode = b09 || b10; b10Mode = b10; b10RunId = runId ?? checkpoint?.runId ?? null; b09ChoiceVisible = false; b09CurrentOffer = null; b04ResultVisible = false; b07ResultVisible = false;
  b10StoryVisible = false; setVisible(b10StoryBeat, false); setVisible(title, false); setVisible(hubScreen, false); setVisible(hubStory, false); hubAmbience.pause(); setVisible(hud, !artReview && !animationLab && !b04 && !b05 && !b06 && !b07On); setVisible(pauseScreen, false); setVisible(b04Results, false); setVisible(b07Results, false);
  setVisible(byId<HTMLElement>('target-health'), b03Combat && !b06);
  setVisible(byId<HTMLElement>('b03-status'), b03Combat && !b06);
  hud.classList.toggle('preview-hud', ionaPreview);
  hud.classList.toggle('b03-hud', b03Combat);
  setVisible(previewTools, ionaPreview && !b03Combat);
  setVisible(previewReadout, ionaPreview && !b03Combat);
  if (b09 || b10) {
    hudMode.textContent = b10 ? '/ SPINDLE REFUGE EXPEDITION' : '/ B09 RUN BUILD EXPEDITION';
    byId<HTMLElement>('controls-tip').textContent = 'A/D MOVE · SPACE JUMP · SHIFT DODGE · J LIGHT · K HEAVY · Q RESONANCE · R DAWNRUSH · E / SOUTH INTERACT · ESC PAUSE';
  } else if (b08) {
    hudMode.textContent = '/ B08 THREE-BOSS EXPEDITION';
    byId<HTMLElement>('controls-tip').textContent = 'A/D MOVE · SPACE JUMP · SHIFT DODGE · J LIGHT · K HEAVY · Q RESONANCE · R DAWNRUSH · E / SOUTH INTERACT · V VFX · ESC PAUSE';
  } else if (b07) {
    hudMode.textContent = '/ B07 TWO-REGION EXPEDITION';
    byId<HTMLElement>('controls-tip').textContent = 'A/D MOVE Â· SPACE JUMP Â· SHIFT DODGE Â· J LIGHT Â· K HEAVY Â· Q RESONANCE Â· R DAWNRUSH Â· E / SOUTH INTERACT Â· ESC PAUSE';
  } else if (b06) {
    hudMode.textContent = '/ B06 ENEMY GAUNTLET';
    byId<HTMLElement>('controls-tip').textContent = 'A/D MOVE · SPACE JUMP · SHIFT DODGE · J LIGHT · K HEAVY · Q RESONANCE · R DAWNRUSH · F FINISHER · E INTERACT · ESC PAUSE';
  } else if (b03Combat) {
    hudMode.textContent = '/ B03 COMBAT CANDIDATE';
    byId<HTMLElement>('controls-tip').textContent = 'A/D MOVE · SPACE JUMP · SHIFT DODGE · J / WEST LIGHT · K / NORTH HEAVY · Q / RB RESONANCE · E INTERACT · ESC / START PAUSE';
  } else if (b05) {
    hudMode.textContent = '/ B05 DAWNRUSH REVIEW';
    byId<HTMLElement>('controls-tip').textContent = 'A/D MOVE · SPACE JUMP · SHIFT DODGE · J LIGHT COMBO · K HEAVY · Q SOLAR DRIVE · R TRANSFORM · G DEV CHARGE';
  } else if (ionaPreview) {
    hudMode.textContent = '/ PROVISIONAL IONA';
    byId<HTMLElement>('controls-tip').textContent = 'A/D OR ARROWS MOVE · SPACE/W/↑ JUMP · SHIFT / EAST DODGE · J OR WEST LIGHT · K OR NORTH HEAVY · Q / RB SPECIAL · ESC PAUSE';
  } else {
    hudMode.textContent = '/ CHAMBER 00';
    byId<HTMLElement>('controls-tip').textContent = 'A/D MOVE · SPACE JUMP · SHIFT DASH · ESC PAUSE';
  }
  quitButton.textContent = b10 ? 'RETURN TO REFUGE' : 'RETURN TO TITLE';
  const instance = createGame(() => togglePause(), (connected) => { controllerIndicator.textContent = connected ? 'CONTROLLER CONNECTED' : ''; }, { artReview, animationLab, ionaPreview, b03Combat, b04, b05, b06, b07, b08, b09, b10, seed, checkpoint, runId, reduceMotion: saveState.options.reduceMotion });
  game = instance.game; chamber = instance.scene;
  game.sound.setVolume(saveState.options.masterVolume);
  focusGameCanvas();
}
function togglePause(reason = 'The Spindle is still.'): void {
  if (!active || !game || settingsOpen || b04ResultVisible || b07ResultVisible || b09ChoiceVisible) return;
  paused = !paused;
  chamber?.resetTransientInput();
  chamber?.setLabAudioPaused(paused);
  if (paused) {
    updateB09PauseBuild();
    game.scene.pause('Chamber');
    if (!artReviewMode) {
      pausedGamepadStart.reset(gamepadStartDown());
      pausedGamepadFrame = window.requestAnimationFrame(pollPausedGamepad);
    }
  } else {
    setVisible(b09PauseBuild, false);
    stopPausedGamepadMonitor();
    game.scene.resume('Chamber');
  }
  pauseReason.textContent = reason;
  setVisible(pauseScreen, paused);
  if (paused) resumeButton.focus(); else game.canvas?.focus();
}

function moveB09Choice(direction: -1 | 1): void {
  if (!b09CurrentOffer) return;
  const count = b09CurrentOffer.choices.length;
  b09SelectedIndex = (b09SelectedIndex + direction + count) % count;
  const cards = b09ChoiceCards.querySelectorAll<HTMLButtonElement>('.b09-choice-card');
  cards[b09SelectedIndex]?.focus();
}

function chooseB09Card(index = b09SelectedIndex): void {
  const choice = b09CurrentOffer?.choices[index];
  if (!choice || !b09ChoiceVisible) return;
  b09ChoiceHint.textContent = `${choice.name.toUpperCase()} SELECTED · APPLYING TO THIS RUN`;
  for (const button of b09ChoiceCards.querySelectorAll<HTMLButtonElement>('button')) button.disabled = true;
  window.dispatchEvent(new CustomEvent('crownflare:b09-choice-selected', { detail: { sourceId: b09CurrentOffer!.sourceId, choiceId: choice.id } }));
}

function stopB09ChoiceMonitor(): void {
  if (b09ChoiceFrame) window.cancelAnimationFrame(b09ChoiceFrame);
  b09ChoiceFrame = 0; b09PadAxis = 0; b09PadAccept = false;
}

function pollB09Choice(): void {
  if (!b09ChoiceVisible || !b09CurrentOffer) { stopB09ChoiceMonitor(); return; }
  let pad: StandardPadLike | null = null;
  try { pad = selectStandardPad(Array.from(navigator.getGamepads?.() ?? []) as (StandardPadLike | null)[]); } catch { pad = null; }
  let state = { axis: 0, axisEngaged: false, pressed: { jump:false, light:false, heavy:false, dash:false, special:false, interact:false, transform:false, finisher:false }, pausePressed:false, interactPressed:false };
  if (pad) {
    let settings = DEFAULT_CONTROL_SETTINGS;
    try { settings = loadControlSettings(window.localStorage); } catch { /* use defaults when storage is unavailable */ }
    state = readPadActions(pad, settings, Math.abs(b09PadAxis) > .25);
  }
  if (Math.abs(state.axis) > .55 && b09PadAxis === 0) moveB09Choice(state.axis < 0 ? -1 : 1);
  const accept = !!state.pressed.interact;
  if (accept && !b09PadAccept) chooseB09Card();
  b09PadAxis = Math.abs(state.axis) > .3 ? Math.sign(state.axis) : 0;
  b09PadAccept = accept;
  b09ChoiceFrame = window.requestAnimationFrame(pollB09Choice);
}

function openB09Choice(event: Event): void {
  if (!active || !b09Mode || !(chamber instanceof B07ExpeditionScene) || b09ChoiceVisible) return;
  const detail = (event as CustomEvent<{ offer: UpgradeOffer }>).detail;
  if (!detail?.offer || detail.offer.choices.length !== 3) return;
  b09CurrentOffer = detail.offer; b09SelectedIndex = 0; b09ChoiceVisible = true; paused = true;
  chamber.resetTransientInput(); chamber.setLabAudioPaused(true); game?.scene.pause('Chamber');
  setVisible(pauseScreen, false); setVisible(b04Results, false); setVisible(b07Results, false);
  b09ChoiceHeading.textContent = detail.offer.fallbackUsed ? 'CHOOSE YOUR FIELD REWARD' : 'CHOOSE YOUR ATTUNEMENT';
  const [kind, id] = detail.offer.sourceId.split(':');
  b09ChoiceSource.textContent = `${kind === 'boss' ? 'BOSS CLEAR' : kind === 'room' ? 'ROOM REWARD' : 'SPINDLE EVENT'}  /  ${id?.replaceAll('-', ' ') ?? ''}  /  SEED ${chamber.b07Snapshot().seed.toString(16).toUpperCase()}`;
  b09ChoiceHint.textContent = 'ARROWS / D-PAD SELECT · ENTER / E / SOUTH CONFIRM · ESC ABANDON RUN';
  b09ChoiceCards.replaceChildren();
  detail.offer.choices.forEach((choice, index) => {
    const card = document.createElement('button'); card.type = 'button'; card.className = 'b09-choice-card'; card.dataset.tier = choice.tier ?? 'fallback'; card.setAttribute('aria-pressed', 'false');
    card.setAttribute('aria-label', `${choice.name}. ${choice.kind === 'upgrade' ? `${choice.tier} upgrade, rank ${choice.currentRank} to ${choice.nextRank}. ` : ''}${choice.rule}`);
    const top = document.createElement('span'); top.className = 'b09-card-top';
    const icon = document.createElement('img'); icon.src = `./assets/upgrades/b09/${choice.icon}.png`; icon.alt = ''; icon.setAttribute('aria-hidden', 'true');
    const tag = document.createElement('span'); tag.className = 'b09-card-tier'; tag.textContent = choice.kind === 'upgrade' ? `${choice.tier} · ${B09_UPGRADES[choice.upgradeId!].category}` : 'FIELD OPTION';
    const rank = document.createElement('span'); rank.className = 'b09-card-rank'; rank.textContent = choice.kind === 'upgrade' ? `RANK ${choice.currentRank} → ${choice.nextRank}` : 'NO RANK';
    top.append(icon, document.createElement('span')); top.lastElementChild!.append(tag, rank);
    const name = document.createElement('strong'); name.textContent = choice.name;
    const rule = document.createElement('span'); rule.className = 'b09-card-rule'; rule.textContent = choice.rule;
    const prompt = document.createElement('span'); prompt.className = 'b09-card-prompt'; prompt.textContent = index === 0 ? 'SOUTH / ENTER TO TAKE' : 'FOCUS · SOUTH / ENTER TO TAKE';
    card.append(top, name, rule, prompt); card.addEventListener('focus', () => { b09SelectedIndex = index; }); card.addEventListener('click', () => { b09SelectedIndex = index; chooseB09Card(index); });
    b09ChoiceCards.append(card);
  });
  setVisible(b09ChoiceScreen, true);
  b09ChoiceCards.querySelector<HTMLButtonElement>('.b09-choice-card')?.focus();
  pollB09Choice();
}

function completeB09Choice(): void {
  if (!b09ChoiceVisible) return;
  stopB09ChoiceMonitor(); b09ChoiceVisible = false; b09CurrentOffer = null; paused = false;
  setVisible(b09ChoiceScreen, false); b09ChoiceCards.replaceChildren();
  chamber?.resetTransientInput(); chamber?.setLabAudioPaused(false); game?.scene.resume('Chamber');
  window.setTimeout(focusGameCanvas, 0);
}

b09ChoiceScreen.addEventListener('keydown', (event) => {
  if (event.code === 'ArrowRight' || event.code === 'ArrowDown') { event.preventDefault(); moveB09Choice(1); }
  else if (event.code === 'ArrowLeft' || event.code === 'ArrowUp') { event.preventDefault(); moveB09Choice(-1); }
  else if (event.code === 'Enter' || event.code === 'Space' || event.code === 'KeyE') { event.preventDefault(); chooseB09Card(); }
  else if (event.code === 'Escape') { event.preventDefault(); quit(); }
});
b09AbandonButton.addEventListener('click', quit);
window.addEventListener('crownflare:b09-choice-open', openB09Choice);
window.addEventListener('crownflare:b09-choice-completed', completeB09Choice);
function updateB09PauseBuild(): void {
  if (!b09Mode || !(chamber instanceof B07ExpeditionScene)) { setVisible(b09PauseBuild, false); return; }
  const state = chamber.b07Snapshot().b09.build;
  const text = Object.entries(state.ranks).filter(([, rank]) => !!rank).map(([id, rank]) => `${B09_UPGRADES[id as keyof typeof B09_UPGRADES].name} ${rank}`).join(' · ');
  b09PauseBuild.textContent = `CURRENT RUN BUILD  /  ${text || 'NO ATTUNEMENTS YET'}`;
  setVisible(b09PauseBuild, true);
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
  const returnToHub = b10Mode;
  stopPausedGamepadMonitor();
  stopB04ResultsMonitor();
  stopB09ChoiceMonitor();
  game?.destroy(true);
  game = null; chamber = null; active = false; paused = false; debug = false; artReviewMode = false; animationLabMode = false; ionaPreviewMode = false; b03CombatMode = false; b04Mode = false; b05Mode = false; b06Mode = false; b07Mode = false; b08Mode = false; b09Mode = false; b10Mode = false; b09ChoiceVisible = false; b09CurrentOffer = null; b04ResultVisible = false; b07ResultVisible = false;
  setVisible(debugOverlay, false); setVisible(pauseScreen, false); setVisible(hud, false); setVisible(previewTools, false); setVisible(previewReadout, false); setVisible(b04Results, false); setVisible(b07Results, false); setVisible(b09ChoiceScreen, false); hud.classList.remove('preview-hud'); hud.classList.remove('b03-hud'); setVisible(title, !returnToHub);
  if (returnToHub) { openHub(); return; }
  setVisible(hubScreen, false); startButton.focus();
}
function stopB04ResultsMonitor(): void {
  if (b04ResultsFrame) window.cancelAnimationFrame(b04ResultsFrame);
  b04ResultsFrame = 0; b04PreviousAccept = false; b04PreviousLeft = false; b04PreviousRight = false;
}
function pollB04Results(): void {
  if (!b04ResultVisible && !b07ResultVisible) { b04ResultsFrame = 0; return; }
  let pad: Gamepad | null = null;
  try { pad = Array.from(navigator.getGamepads?.() ?? []).find((candidate) => candidate?.connected) ?? null; } catch { /* a pad may disconnect between polls */ }
  if (pad) {
    const accept = !!pad.buttons[0]?.pressed || !!pad.buttons[9]?.pressed;
    const left = !!pad.buttons[14]?.pressed;
    const right = !!pad.buttons[15]?.pressed;
    if (left && !b04PreviousLeft) b04FocusResultButton(-1);
    if (right && !b04PreviousRight) b04FocusResultButton(1);
    if (accept && !b04PreviousAccept) (document.activeElement instanceof HTMLButtonElement ? document.activeElement : b07ResultVisible ? b07ReplayButton : b04ReplayButton).click();
    b04PreviousAccept = accept; b04PreviousLeft = left; b04PreviousRight = right;
  } else { b04PreviousAccept = false; b04PreviousLeft = false; b04PreviousRight = false; }
  b04ResultsFrame = window.requestAnimationFrame(pollB04Results);
}
function b04FocusResultButton(direction: -1 | 1): void {
  const buttons = b07ResultVisible ? [b07ReplayButton, b07TitleButton] : [b04ReplayButton, b04TitleButton];
  const activeIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);
  buttons[(activeIndex + direction + buttons.length) % buttons.length]!.focus();
}
function finishB04Result(event: Event): void {
  if (!active || !b04Mode) return;
  const result = (event as CustomEvent<{ result: 'victory' | 'defeat'; elapsedMs: number; damageTaken: number; rewardClaimed: boolean }>).detail;
  if (!result || b04ResultVisible) return;
  game?.scene.pause('Chamber');
  chamber?.setLabAudioPaused(true);
  paused = true; b04ResultVisible = true;
  const victory = result.result === 'victory';
  b04ResultHeading.textContent = b06Mode ? victory ? 'GAUNTLET CLEARED' : 'THE ATRIUM GOES QUIET' : b05Mode ? victory ? 'DAWNRUSH RELEASED' : 'THE SOLAR CURRENT FADES' : victory ? 'ATRIUM RESTORED' : 'THE SPINDLE FALLS SILENT';
  const minutes = Math.floor(result.elapsedMs / 60000);
  const seconds = Math.floor((result.elapsedMs % 60000) / 1000).toString().padStart(2, '0');
  b04ResultStats.textContent = `${victory ? 'CLEAR' : 'DEFEAT'}  ·  ${minutes}:${seconds}  ·  ${result.damageTaken} DAMAGE TAKEN  ·  ${result.rewardClaimed ? 'RESONANCE SHARD RECOVERED' : 'SHARD UNCLAIMED'}`;
  setVisible(b04Results, true); setVisible(pauseScreen, false);
  b04ReplayButton.focus();
  pollB04Results();
}
window.addEventListener('crownflare:b04-result', finishB04Result);
window.addEventListener('crownflare:b07-result', (event) => {
  if (!active || !b07Mode || b07ResultVisible) return;
  const detail = (event as CustomEvent<{ result: 'victory' | 'defeat'; elapsedMs: number; damageTaken: number; repairCharges: number; resonance: number; visited: readonly string[]; choices: B10RunCheckpoint['route']['choices']; seed: number; b08BossBuilt: boolean; b08BossesCleared?: readonly string[]; b08Practice?: boolean; b09Enabled?: boolean; b09Build?: RunBuildState; b10Enabled?: boolean; runId?: string }>).detail;
  if (!detail) return;
  completeB10Run(detail);
  game?.scene.pause('Chamber'); chamber?.setLabAudioPaused(true); paused = true; b07ResultVisible = true;
  b07ResultHeading.textContent = detail.b09Enabled ? detail.result === 'victory' ? 'RUN BUILD / SPINDLE RESTORED' : 'RUN BUILD / EXPEDITION ENDED' : detail.b08BossBuilt ? detail.result === 'victory' ? detail.b08Practice ? 'BOSS PRACTICE CLEARED' : 'B08 FINAL CONFRONTATION CLEARED' : 'B08 EXPEDITION ENDED' : detail.result === 'victory' ? 'B07 ROUTE CLEARED' : 'EXPEDITION ENDED';
  const minutes = Math.floor(detail.elapsedMs / 60000);
  const seconds = Math.floor((detail.elapsedMs % 60000) / 1000).toString().padStart(2, '0');
  const reach = detail.choices.reach ?? 'not chosen'; const loom = detail.choices.loom ?? 'not chosen';
  const buildSummary = detail.b09Build ? Object.entries(detail.b09Build.ranks).filter(([, rank]) => !!rank).map(([id, rank]) => `${B09_UPGRADES[id as keyof typeof B09_UPGRADES].name} ${rank}`).join(' / ') || 'NO ATTUNEMENTS' : '';
  b07ResultStats.textContent = `${detail.result.toUpperCase()}  ·  ${minutes}:${seconds}  ·  ${detail.visited.length} ROOMS  ·  SEED ${detail.seed.toString(16).toUpperCase()}  ·  REACH ${reach}  ·  LOOM ${loom}  ·  REPAIRS ${detail.repairCharges}  ·  ROUTE RESONANCE ${detail.resonance}  ·  BOSSES ${detail.b08BossesCleared?.length ?? 0}/3  ·  ${detail.damageTaken} DAMAGE${detail.b09Enabled ? `  ·  RUN BUILD ${buildSummary}` : detail.b08BossBuilt ? '' : '. The B08 boss remains unbuilt.'}`;
  b07ResultStory.textContent = b10Mode ? detail.result === 'victory'
    ? 'At Broken Meridian, Iona refuses to pin the sky to a single hour. The Lumen Spindle turns again: dawn and night return in their own time. The refuge keeps the light of the first clear; each new run begins with a fresh build.'
    : 'The Spindle lets go before the hinge can be mended. Iona returns to the refuge with the route remembered, but this expedition has ended. Start a new run when you are ready.'
    : '';
  b07ReplayButton.textContent = b10Mode ? 'BEGIN ANOTHER RUN  →' : 'REPLAY EXPEDITION  →';
  b07TitleButton.textContent = b10Mode ? 'RETURN TO REFUGE' : 'RETURN TO TITLE';
  setVisible(b07Results, true); setVisible(pauseScreen, false); b07ReplayButton.focus(); pollB04Results();
});
b04ReplayButton.addEventListener('click', () => {
  if (b06Mode && chamber instanceof B06EnemyGauntletScene && game) {
    b04ResultVisible = false; paused = false; setVisible(b04Results, false);
    chamber.resetB06Run(); chamber.setLabAudioPaused(false); game.scene.resume('Chamber'); focusGameCanvas(); stopB04ResultsMonitor();
    return;
  }
  if (!b04Mode || !(chamber instanceof B04VerticalSliceScene) || !game) return;
  b04ResultVisible = false; paused = false; setVisible(b04Results, false);
  chamber.resetB04Run(); chamber.setLabAudioPaused(false); game.scene.resume('Chamber'); focusGameCanvas(); stopB04ResultsMonitor();
});
b04TitleButton.addEventListener('click', quit);
b07ReplayButton.addEventListener('click', () => {
  if (!b07Mode || !(chamber instanceof B07ExpeditionScene) || !game) return;
  if (b10Mode) {
    stopB04ResultsMonitor(); game.destroy(true); game = null; chamber = null; active = false; paused = false; b07ResultVisible = false; b10Mode = false;
    setVisible(b07Results, false);
    const seed = makeRunSeed(); const runId = `run-${Date.now().toString(36)}-${seed.toString(16)}`;
    launchB10Run(seed, null, runId);
    return;
  }
  b07ResultVisible = false; paused = false; setVisible(b07Results, false);
  chamber.resetB07Run(); chamber.setLabAudioPaused(false); game.scene.resume('Chamber'); focusGameCanvas(); stopB04ResultsMonitor();
});
b07TitleButton.addEventListener('click', quit);
startButton.addEventListener('click', () => {
  if (b03CombatRequested || b04Requested || b05Requested || b06Requested || b07Requested || b08Requested || b09Requested || ionaPreviewRequested) {
    start(false, false, ionaPreviewRequested, b03CombatRequested, b04Requested, b05Requested, b06Requested, b07Requested, b08Requested, b09Requested);
  } else openHub();
});
hubNewRunButton.addEventListener('click', showHubStory);
hubContinueButton.addEventListener('click', continueB10Run);
byId<HTMLButtonElement>('hub-controls').addEventListener('click', () => openControllerSettings(false));
byId<HTMLButtonElement>('hub-story-back').addEventListener('click', () => { setVisible(hubStory, false); hubNewRunButton.focus(); });
byId<HTMLButtonElement>('hub-begin-run').addEventListener('click', beginB10NewRun);
hubSoundToggle.addEventListener('click', () => {
  hubSoundEnabled = !hubSoundEnabled; hubAmbience.muted = !hubSoundEnabled;
  hubSoundToggle.textContent = hubSoundEnabled ? 'SOUND ON' : 'SOUND OFF'; hubSoundToggle.setAttribute('aria-pressed', String(hubSoundEnabled));
  if (hubSoundEnabled && hubScreen.classList.contains('hidden') === false) void hubAmbience.play().catch(() => undefined);
  else hubAmbience.pause();
});
hubReducedMotion.addEventListener('change', () => commitSave({ ...saveState, options: { ...saveState.options, reduceMotion: hubReducedMotion.checked } }));
hubVolume.addEventListener('input', () => {
  hubAmbience.volume = Number(hubVolume.value);
  commitSave({ ...saveState, options: { ...saveState.options, masterVolume: Number(hubVolume.value) } });
});
hubStory.addEventListener('keydown', (event) => { if (event.code === 'Escape') { event.preventDefault(); setVisible(hubStory, false); hubNewRunButton.focus(); } });
b10StoryContinue.addEventListener('click', closeB10StoryBeat);
b10StoryBeat.addEventListener('keydown', (event) => { if (event.code === 'Escape' || event.code === 'Enter' || event.code === 'Space') { event.preventDefault(); closeB10StoryBeat(); } });
hubScreen.addEventListener('keydown', (event) => {
  if (event.code !== 'ArrowDown' && event.code !== 'ArrowUp') return;
  hubFocus(event.code === 'ArrowDown' ? 1 : -1); event.preventDefault();
});
window.addEventListener('crownflare:b10-checkpoint', saveB10Checkpoint);
window.addEventListener('crownflare:b10-story-beat', openB10StoryBeat);
titleSettingsButton.addEventListener('click', () => openControllerSettings(false));
pauseSettingsButton.addEventListener('click', () => openControllerSettings(true));
resumeButton.addEventListener('click', () => { if (paused) togglePause(); });
quitButton.addEventListener('click', quit);
window.addEventListener('blur', () => { if (active && !paused) togglePause('Focus lost — simulation held for safety.'); });
document.addEventListener('visibilitychange', () => { if (document.hidden && active && !paused) togglePause('Tab hidden — simulation held for safety.'); });
window.addEventListener('keydown', (event) => {
  if (event.code === 'Escape' && b10StoryVisible) { event.preventDefault(); closeB10StoryBeat(); return; }
  if (event.code === 'Escape' && active) { event.preventDefault(); if (b09ChoiceVisible || artReviewMode || b04ResultVisible || b07ResultVisible) quit(); else if (settingsOpen) return; else togglePause(); }
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
    snapshot: (): { screen: 'title' | 'hub' | 'hubStory' | 'playing' | 'paused' | 'review' | 'animationLab' | 'ionaPreview' | 'b03Combat' | 'b04Combat' | 'b05Combat' | 'b06Combat' | 'b07Expedition' | 'b08Expedition' | 'b09Expedition' | 'b10Expedition' | 'b09Choice' | 'b04Results' | 'b07Results'; player: ChamberSnapshot | null; review: ArtReviewSnapshot | null; lab: AnimationLabSnapshot | null; preview: IonaPreviewSnapshot | null; combat: ReturnType<ChamberScene['combatSnapshot']>; b04: ReturnType<B04VerticalSliceScene['b04Snapshot']>; b05: ReturnType<ChamberScene['dawnrushSnapshot']>; b06: ReturnType<B06EnemyGauntletScene['b06Snapshot']>; b06Events: readonly Record<string, unknown>[]; b07: ReturnType<B07ExpeditionScene['b07Snapshot']> | null; save: { version: number; revision: number; completedRuns: number; beaconAwakened: boolean; activeRun: B10RunCheckpoint | null; lastRun: SaveV2['meta']['lastRun'] }; sceneType: string | null; sceneActive: boolean; scenePaused: boolean } => ({
      screen: !active ? hubStory.classList.contains('hidden') ? hubScreen.classList.contains('hidden') ? 'title' : 'hub' : 'hubStory' : b09ChoiceVisible ? 'b09Choice' : b04ResultVisible ? 'b04Results' : b07ResultVisible ? 'b07Results' : artReviewMode ? 'review' : paused ? 'paused' : animationLabMode ? 'animationLab' : b10Mode ? 'b10Expedition' : b09Mode ? 'b09Expedition' : b08Mode ? 'b08Expedition' : b07Mode ? 'b07Expedition' : b06Mode ? 'b06Combat' : b05Mode ? 'b05Combat' : b04Mode ? 'b04Combat' : b03CombatMode ? 'b03Combat' : ionaPreviewMode ? 'ionaPreview' : 'playing',
      player: active && !artReviewMode ? chamber?.snapshot() ?? null : null,
      review: active && artReviewMode ? chamber?.reviewSnapshot() ?? null : null,
      lab: active && animationLabMode ? chamber?.animationSnapshot() ?? null : null,
      preview: active && ionaPreviewMode ? chamber?.previewSnapshot() ?? null : null,
      combat: active && (b03CombatMode || b04Mode) ? chamber?.combatSnapshot() ?? null : null,
      b04: active && b04Mode && chamber instanceof B04VerticalSliceScene ? chamber.b04Snapshot() : null,
      b05: active && b05Mode ? chamber?.dawnrushSnapshot() ?? null : null,
      b06: active && b06Mode && chamber instanceof B06EnemyGauntletScene ? chamber.b06Snapshot() : null,
      b06Events: active && b06Mode && chamber instanceof B06EnemyGauntletScene ? chamber.b06EventLog() : [],
      b07: active && b07Mode && chamber instanceof B07ExpeditionScene ? chamber.b07Snapshot() : null,
      save: { version: saveState.version, revision: saveState.revision, completedRuns: saveState.meta.completedRuns, beaconAwakened: saveState.meta.beaconAwakened, activeRun: saveState.activeRun, lastRun: saveState.meta.lastRun },
      sceneType: chamber?.constructor.name ?? null,
      sceneActive: chamber?.sys.isActive() ?? false,
      scenePaused: game?.scene.isPaused('Chamber') ?? false,
    }),
  } });
}
if (ionaPreviewRequested) {
  title.classList.add('iona-preview-title');
  setVisible(previewNotice, true);
  titleMetadata.textContent = b03CombatRequested ? 'B03 COMBAT PLAYTEST / PROVISIONAL GAMEPLAY ART / NOT APPROVED' : 'DEVELOPMENT PLAYTEST / PROVISIONAL GAMEPLAY ART / NOT APPROVED';
  if (b03CombatRequested) startButton.innerHTML = 'ENTER B03 COMBAT TRIAL <span aria-hidden="true">→</span>';
}
if (b04Requested) {
  setVisible(previewNotice, true);
  previewNotice.textContent = 'B04 DEVELOPMENT SLICE / OWNER REVIEW PENDING';
  titleMetadata.textContent = 'B04 COMBAT VERTICAL SLICE / ORIGINAL CANDIDATE ART / NOT APPROVED';
  startButton.innerHTML = 'ENTER THE SUNDERGLASS ATRIUM <span aria-hidden="true">&gt;</span>';
}
if (b05Requested) {
  setVisible(previewNotice, true);
  previewNotice.textContent = 'B05 DAWNRUSH TRANSFORMATION / DEVELOPMENT REVIEW / OWNER APPROVAL PENDING';
  titleMetadata.textContent = 'B05 DAWNRUSH / IMAGEGENERATED CANDIDATE / NOT APPROVED';
  startButton.innerHTML = 'ENTER DAWNRUSH PLAYTEST <span aria-hidden="true">&gt;</span>';
}
if (b06Requested) {
  setVisible(previewNotice, true);
  previewNotice.textContent = 'B06 ENEMY ROSTER GAUNTLET / DEVELOPMENT PLAYTEST / OWNER REVIEW PENDING';
  titleMetadata.textContent = 'B06 / FIVE-ENEMY ROSTER / BASE + DAWNRUSH / NOT APPROVED';
  startButton.innerHTML = 'ENTER THE SUNDERGLASS GAUNTLET <span aria-hidden="true">&gt;</span>';
}
if (b07Requested) {
  setVisible(previewNotice, true);
  previewNotice.textContent = 'B07 TWO-REGION EXPEDITION / OWNER REVIEW PENDING';
  titleMetadata.textContent = 'SUNDERGLASS REACH → VESPER LOOMWORKS / BASE + DAWNRUSH / B08 BOSS NOT INCLUDED';
  startButton.innerHTML = 'ENTER THE LUMEN SPINDLE EXPEDITION <span aria-hidden="true">&gt;</span>';
}
if (b08Requested) {
  setVisible(previewNotice, true);
  previewNotice.textContent = 'B08 THREE-BOSS EXPEDITION / CANDIDATE ART / OWNER APPROVAL PENDING';
  titleMetadata.textContent = 'SUNDERGLASS REACH → VESPER LOOMWORKS → BROKEN MERIDIAN / BOSS ART + AUDIO PENDING OWNER REVIEW';
  startButton.innerHTML = 'ENTER THE THREE-BOSS EXPEDITION <span aria-hidden="true">&gt;</span>';
}
if (b09Requested) {
  setVisible(previewNotice, true);
  previewNotice.textContent = 'B09 RUN BUILD EXPEDITION / OWNER REVIEW PENDING';
  titleMetadata.textContent = 'SUNDERGLASS → VESPER → BROKEN MERIDIAN / SEEDED RUN UPGRADES / BASE + DAWNRUSH';
  startButton.innerHTML = 'BEGIN A NEW RUN <span aria-hidden="true">&gt;</span>';
}
if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('artReview') === '1') start(true);
if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('animationLab') === '1') start(false,true);
