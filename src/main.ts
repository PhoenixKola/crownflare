import './style.css';
import './ui/b11.css';
import './ui/b14-title.css';
import type * as Phaser from 'phaser';
import { applyDisplayScaling, createGame } from './game/createGame';
import { loadSave, persistSave, recordRunResult, type B10RunCheckpoint, type B10RunSummary, type DisplayScalingMode, type SaveV2 } from './game/persistence/save';
import { GamepadStartEdge } from './game/input/gamepadStartEdge';
import type { AnimationLabSnapshot, ArtReviewSnapshot, ChamberScene, ChamberSnapshot, IonaPreviewSnapshot } from './game/scenes/ChamberScene';
import { B04VerticalSliceScene } from './game/scenes/B04VerticalSliceScene';
import { B06EnemyGauntletScene } from './game/scenes/B06EnemyGauntletScene';
import { B07ExpeditionScene } from './game/scenes/B07ExpeditionScene';
import { SAVE_NAMESPACE } from './game/persistence/save';
import { shouldEnableIonaPreview } from './game/preview/ionaPreviewGate';
import { ControllerSettingsScreen } from './game/input/controllerSettingsScreen';
import type { ControlSettings } from './game/input/controlSettings';
import { buttonLabel, controllerFamily, DEFAULT_CONTROL_SETTINGS, KEYBOARD_CODES, loadControlSettings, readPadActions, selectStandardPad, type RebindableAction, type StandardPadLike } from './game/input/controlSettings';
import { B09_UPGRADES, type RunBuildState, type UpgradeOffer } from './game/roguelite/b09RunBuild';
import { B08_BOSS_PROFILES } from './game/bosses/b08BossProfiles';
const byId = <T extends HTMLElement>(id: string): T => { const el = document.getElementById(id); if (!el) throw new Error(`Missing UI: ${id}`); return el as T; };
const title = byId<HTMLElement>('title-screen');
const titleHeroSprite = title.querySelector<HTMLImageElement>('.title-hero img')!;
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
const b11HudOverlay = byId<HTMLElement>('hud').querySelector<HTMLElement>('.b11-hud-overlay')!;
const b11Health = byId<HTMLElement>('b11-health');
const b11HealthCells = [...b11Health.querySelectorAll<HTMLElement>('i')];
const b11HpNumber = byId<HTMLElement>('b11-hp-number');
const b11Repairs = byId<HTMLElement>('b11-repairs');
const b11FormName = byId<HTMLElement>('b11-form-name');
const b11Region = byId<HTMLElement>('b11-region');
const b11Room = byId<HTMLElement>('b11-room');
const b11Objective = byId<HTMLElement>('b11-objective');
const b11ResonanceNumber = byId<HTMLElement>('b11-resonance-number');
const b11ResonanceFill = byId<HTMLElement>('b11-resonance-fill');
const b11ResonanceGauge = hud.querySelector<HTMLElement>('.b11-gauge-resonance')!;
const b11ResonanceReady = byId<HTMLElement>('b11-resonance-ready');
const b11FormNumber = byId<HTMLElement>('b11-form-number');
const b11FormFill = byId<HTMLElement>('b11-form-fill');
const b11FormDetail = byId<HTMLElement>('b11-form-detail');
const b11Boss = byId<HTMLElement>('b11-boss');
const b11BossName = byId<HTMLElement>('b11-boss-name');
const b11BossPhase = byId<HTMLElement>('b11-boss-phase');
const b11BossEpithet = byId<HTMLElement>('b11-boss-epithet');
const b11BossHp = byId<HTMLElement>('b11-boss-hp');
const b11BossFill = byId<HTMLElement>('b11-boss-fill');
const b11ActionStatus = byId<HTMLElement>('b11-action-status');
const b11Controller = byId<HTMLElement>('b11-controller');
const b11ContextPrompt = byId<HTMLElement>('b11-context-prompt');
const b11NavigationControl = byId<HTMLElement>('b11-navigation-control');
const b11Build = byId<HTMLElement>('b11-build');
const settingsMasterVolume = byId<HTMLInputElement>('settings-master-volume');
const settingsPixelScaling = byId<HTMLSelectElement>('settings-pixel-scaling');
const settingsVolumeValue = byId<HTMLOutputElement>('settings-volume-value');
const settingsReducedMotion = byId<HTMLInputElement>('settings-reduced-motion');
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
const titleIdleFrames = [0, 1, 2, 3, 2, 1].map((frame) => `/assets/characters/iona/b01e/idle-${frame}-left.png`);
const titleIdleImages = titleIdleFrames.map((src) => { const image = new Image(); image.src = src; return image; });
let titleIdleFrameIndex = 0;
window.setInterval(() => {
  const reducedMotion = saveState.options.reduceMotion || byId<HTMLElement>('app').classList.contains('reduce-motion') || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (title.classList.contains('hidden') || document.visibilityState !== 'visible' || reducedMotion) {
    if (titleHeroSprite.getAttribute('src') !== titleIdleFrames[0]) titleHeroSprite.src = titleIdleFrames[0]!;
    titleIdleFrameIndex = 0;
    return;
  }
  titleIdleFrameIndex = (titleIdleFrameIndex + 1) % titleIdleFrames.length;
  const nextImage = titleIdleImages[titleIdleFrameIndex];
  if (nextImage?.complete && nextImage.naturalWidth > 0) titleHeroSprite.src = titleIdleFrames[titleIdleFrameIndex]!;
}, 320);
function readB11ControlSettings(): ControlSettings { try { return loadControlSettings(window.localStorage); } catch { return DEFAULT_CONTROL_SETTINGS; } }
let b11ControlSettings: ControlSettings = readB11ControlSettings();
let hubSoundEnabled = true;
let b10RunId: string | null = null;
let b10FirstClearResult = false;
const controllerSettings = new ControllerSettingsScreen();
function setVisible(element: HTMLElement, shown: boolean): void { element.classList.toggle('hidden', !shown); element.setAttribute('aria-hidden', String(!shown)); }
type B11ExpeditionSnapshot = ReturnType<B07ExpeditionScene['b07Snapshot']>;
let b11LastPaintAt = 0;
let b11LastHp: number | null = null;
let b11LastResonance: number | null = null;
let b11LastFormEnergy: number | null = null;
let b11LastAcquisitionCount = 0;
let b11LastCooldownReady = false;
let b11StatusUntil = 0;
let b11StatusOverride = '';
const b11ActionBindings: Readonly<Record<string, RebindableAction>> = {
  light: 'light', heavy: 'heavy', aerial: 'jump', resonance: 'special', dash: 'dash', transform: 'transform', finisher: 'finisher',
};
function keyboardActionLabel(action: RebindableAction, compact = false): string {
  const code = KEYBOARD_CODES[action][0] ?? action;
  if (code === 'Space') return compact ? 'SPC' : 'SPACE';
  if (code.startsWith('Arrow')) return code.replace('Arrow', '').toUpperCase();
  if (code.startsWith('Shift')) return compact ? 'SHFT' : 'SHIFT';
  return code.replace(/^Key/, '').replace(/^Digit/, '');
}
function compactPadLabel(index: number, family: ReturnType<typeof controllerFamily>): string {
  const label = buttonLabel(index, family);
  const compact: Readonly<Record<string, string>> = { 'D-pad Up': '↑', 'D-pad Down': '↓', 'D-pad Left': '←', 'D-pad Right': '→', Cross: 'X', Circle: 'O', Square: '□', Triangle: '△' };
  return compact[label] ?? (label.startsWith('Button ') ? `B${label.slice(7)}` : label);
}
function b11Pad(): StandardPadLike | null {
  try { return selectStandardPad(Array.from(navigator.getGamepads?.() ?? []) as (StandardPadLike | null)[]); }
  catch { return null; }
}
function announceB11(text: string): void { b11StatusOverride = text; b11StatusUntil = performance.now() + 1350; }
function updateB11Hud(state: B11ExpeditionSnapshot): void {
  if (!b10Mode || !hud.classList.contains('b11-hud')) return;
  const combat = state.hud.combat;
  const form = state.hud.dawnrush;
  const hp = Math.max(0, Math.min(5, state.playerHp));
  const resonance = Math.max(0, Math.min(100, combat?.resonance ?? state.resonance));
  const energy = Math.max(0, Math.min(100, form?.energy ?? 0));
  const now = performance.now();
  if (b11LastHp !== null && hp < b11LastHp) announceB11(`HIT / ${hp} HP REMAIN`);
  else if (b11LastHp !== null && hp > b11LastHp) announceB11(`RESTORED / ${hp} HP`);
  if (b11LastResonance !== null && resonance >= b11LastResonance + 5) announceB11(`RESONANCE +${Math.floor(resonance - b11LastResonance)}`);
  if (b11LastFormEnergy !== null && energy >= b11LastFormEnergy + 3) announceB11(`DAWNRUSH +${Math.floor(energy - b11LastFormEnergy)} ENERGY`);
  const acquisitionCount = state.b09.build.acquisitions.length;
  if (acquisitionCount > b11LastAcquisitionCount) announceB11('ATTUNEMENT ACQUIRED / RUN BUILD UPDATED');
  const resonanceReady = !!combat && resonance >= combat.resonanceCost && combat.specialCooldownMs <= 0;
  if (resonanceReady && !b11LastCooldownReady && b11LastResonance !== null) announceB11('SOLAR DRIVE READY');
  b11LastHp = hp; b11LastResonance = resonance; b11LastFormEnergy = energy;
  b11LastAcquisitionCount = acquisitionCount; b11LastCooldownReady = resonanceReady;

  b11Health.setAttribute('aria-label', `Health ${hp} of 5`);
  b11Health.dataset.critical = String(hp > 0 && hp <= 2);
  b11HealthCells.forEach((cell, index) => { cell.dataset.filled = String(index < hp); });
  b11HpNumber.textContent = `${hp} / 5`;
  b11Repairs.textContent = `REPAIR ×${state.repairCharges}`;
  const formName = form?.form ?? 'Base';
  b11FormName.textContent = formName.toUpperCase();
  b11FormName.dataset.form = formName.toLowerCase();
  b11HudOverlay.dataset.form = formName.toLowerCase();
  b11HudOverlay.dataset.lowHealth = String(hp > 0 && hp <= 2);
  b11HudOverlay.dataset.hurt = String((combat?.hurtMs ?? 0) > 0);
  b11HudOverlay.dataset.menu = String(!!state.menu);
  b11ResonanceNumber.textContent = `${Math.floor(resonance)} / 100`;
  b11ResonanceFill.style.width = `${resonance}%`;
  b11ResonanceReady.textContent = !combat ? 'COMBAT DATA UNAVAILABLE' : combat.specialCooldownMs > 0
    ? `COOLDOWN ${(combat.specialCooldownMs / 1000).toFixed(1)}s`
    : resonance >= combat.resonanceCost ? 'SOLAR DRIVE READY' : `NEED ${combat.resonanceCost} TO DRIVE`;
  b11ResonanceGauge.dataset.ready = String(resonanceReady);
  b11FormNumber.textContent = `${Math.floor(energy)} / 100`;
  b11FormFill.style.width = `${energy}%`;
  b11FormDetail.textContent = !form ? 'FORM DATA UNAVAILABLE'
    : form.phaseMs > 0 ? `FORM SHIFT / ${Math.ceil(form.phaseMs)}ms`
      : form.form === 'Base' ? energy < 20 ? `NEED 20 DAWNRUSH / ${Math.floor(energy)} STORED` : form.transformReady ? 'TRANSFORM READY / R TO SHIFT' : 'WAIT FOR RECOVERY'
        : form.transformReady ? 'REVERSION READY / R TO SHIFT' : 'ACTIVE FORM / ENERGY DRAINS';

  b11Region.textContent = state.region === 'vesper-loomworks' ? 'VESPER LOOMWORKS' : state.region === 'sunderglass-reach' ? 'SUNDERGLASS REACH' : 'SPINDLE CORE';
  b11Room.textContent = state.b08.activeBoss ? `BOSS ${Math.max(1, state.b08.phaseNumber)} / 3` : `ROOM ${String(state.roomIndex).padStart(2, '0')} / ${state.routeLength}`;
  const roomTitle = state.hud.roomTitle.split('/').at(-1)?.trim() || state.roomId?.replaceAll('-', ' ') || 'EXPEDITION';
  b11Room.title = roomTitle.toUpperCase();
  b11Objective.textContent = state.hud.objective || 'FIELD SIGNAL / ACTIVE';

  const upgrades = Object.entries(state.b09.build.ranks).filter(([, rank]) => !!rank).map(([id, rank]) => `${B09_UPGRADES[id as keyof typeof B09_UPGRADES].name} ${rank}`);
  const attunementText = upgrades.length ? upgrades.slice(0, 2).join(' · ') + (upgrades.length > 2 ? ` +${upgrades.length - 2}` : '') : 'NO ATTUNEMENTS';
  b11Build.textContent = `BUILD / ${attunementText}`;
  b11Build.title = upgrades.join(' · ') || 'No run upgrades acquired';

  const bossId = state.b08.activeBoss;
  b11Boss.hidden = !bossId;
  if (bossId) {
    const profile = B08_BOSS_PROFILES[bossId];
    const phase = state.b08.phase;
    b11BossName.textContent = profile.name.toUpperCase();
    b11BossEpithet.textContent = profile.epithet.toUpperCase();
    b11BossHp.textContent = `${Math.max(0, state.b08.hp)} / ${state.b08.maxHp}`;
    b11BossFill.style.width = `${state.b08.maxHp > 0 ? Math.max(0, Math.min(100, 100 * state.b08.hp / state.b08.maxHp)) : 0}%`;
    b11BossPhase.textContent = phase === 'telegraph' ? `READ THE TELL${state.b08.pattern ? ` / ${state.b08.pattern.replaceAll('-', ' ').toUpperCase()}` : ''}`
      : phase === 'commit' ? 'STRIKE / EVADE' : phase === 'recovery' ? 'CORE EXPOSED / COUNTER' : phase === 'phase-change' ? `PHASE ${state.b08.phaseNumber} SHIFT`
        : phase === 'ko' ? 'MECHANISM FALLING SILENT' : `PHASE ${state.b08.phaseNumber || 1}`;
  }

  const pad = b11Pad();
  const family = pad ? controllerFamily(pad.id) : null;
  const compactPrompts = window.innerWidth <= 480;
  b11Controller.textContent = pad ? `${family === 'playstation' ? 'PLAYSTATION' : family === 'xbox' ? 'XBOX' : 'STANDARD'} PAD` : 'KEYBOARD';
  b11NavigationControl.textContent = pad ? 'START / PAUSE · STICK MOVE' : 'ESC / PAUSE · A / D MOVE';
  const abilities = hud.querySelectorAll<HTMLElement>('.b11-ability[data-action]');
  abilities.forEach((element) => {
    const ability = element.dataset.action ?? '';
    const action = b11ActionBindings[ability];
    if (!action) return;
    const keyboard = keyboardActionLabel(action, compactPrompts);
    const prompt = pad && family ? compactPrompts ? `${keyboard}/${compactPadLabel(b11ControlSettings.buttons[action], family)}` : `${keyboard} / ${compactPadLabel(b11ControlSettings.buttons[action], family)}` : keyboard;
    const promptElement = element.querySelector('kbd');
    if (promptElement && promptElement.textContent !== prompt) promptElement.textContent = prompt;
    let stateName = hp <= 0 ? 'unavailable' : 'ready';
    let status = 'READY';
    if (ability === 'aerial' && combat?.grounded) { stateName = 'air-only'; status = 'AIR ONLY'; }
    else if (ability === 'resonance' && combat && combat.specialCooldownMs > 0) { stateName = 'cooldown'; status = `${(combat.specialCooldownMs / 1000).toFixed(1)}s`; }
    else if (ability === 'resonance' && combat && resonance < combat.resonanceCost) { stateName = 'locked'; status = `NEED ${combat.resonanceCost}`; }
    else if (ability === 'dash' && (combat?.dashCooldownMs ?? 0) > 0) { stateName = 'cooldown'; status = `${((combat?.dashCooldownMs ?? 0) / 1000).toFixed(1)}s`; }
    else if (ability === 'transform' && form) {
      if (form.phaseMs > 0) { stateName = 'active'; status = 'SHIFTING'; }
      else if (form.form === 'Base' && energy < 20) { stateName = 'locked'; status = `NEED 20 / ${Math.floor(energy)}`; }
      else if (!form.transformReady) { stateName = form.form === 'Dawnrush' ? 'active' : 'locked'; status = form.form === 'Dawnrush' ? 'FORM ACTIVE' : 'RECOVER'; }
    } else if (ability === 'finisher' && form) {
      if (form.finisherReady) { stateName = 'ready'; status = 'READY'; }
      else if (form.form === 'Dawnrush' && form.finisherCooldownMs > 0) { stateName = 'cooldown'; status = `${(form.finisherCooldownMs / 1000).toFixed(1)}s`; }
      else { stateName = 'locked'; status = form.finisherStatus.replace(/^NEED /, 'NEED '); }
    }
    if (combat?.move.startsWith('light-') && ability === 'light' || combat?.move === 'heavy' && ability === 'heavy' || combat?.move === 'resonance' && ability === 'resonance') { stateName = 'active'; status = combat.phase.toUpperCase(); }
    element.dataset.state = stateName;
    element.setAttribute('aria-label', `${element.querySelector('span')?.textContent ?? ability}. ${status}. ${prompt}.`);
    element.title = `${status} / ${prompt}`;
  });

  const interactLabel = pad && family ? compactPadLabel(b11ControlSettings.buttons.interact, family) : 'E';
  const promptText = state.hud.prompt.replace(/^(?:SOUTH|E)\s*\/\s*/i, '').trim();
  const repairAvailable = !!bossId && hp > 0 && hp < 5 && state.repairCharges > 0;
  const contextual = repairAvailable ? `REPAIR +1 HP ×${state.repairCharges}`
    : promptText && !promptText.startsWith('CLEAR ENEMIES') ? promptText : '';
  b11ContextPrompt.hidden = !contextual;
  b11ContextPrompt.textContent = contextual ? `${interactLabel} / ${contextual}` : '';

  let status = state.result ? state.result === 'victory' ? 'SPINDLE RESTORED / RUN COMPLETE' : 'EXPEDITION ENDED'
    : combat?.move.startsWith('light-') ? `LIGHT COMBO ${combat.move.slice(-1)} / ${combat.phase.toUpperCase()}`
      : combat?.move === 'heavy' ? `HEAVY LAUNCHER / ${combat.phase.toUpperCase()}`
        : combat?.move === 'air-light' ? `AERIAL STRIKE / ${combat.phase.toUpperCase()}`
          : state.hud.objective || 'FIELD SIGNAL / ACTIVE';
  if (now < b11StatusUntil && b11StatusOverride) status = b11StatusOverride;
  if (b11ActionStatus.textContent !== status) b11ActionStatus.textContent = status;
}
function onB11ExpeditionState(event: Event): void {
  if (!b10Mode) return;
  const now = performance.now();
  if (now - b11LastPaintAt < 80) return;
  b11LastPaintAt = now;
  updateB11Hud((event as CustomEvent<B11ExpeditionSnapshot>).detail);
}
window.addEventListener('crownflare:b07-state', onB11ExpeditionState);
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
  byId<HTMLElement>('app').classList.toggle('reduce-motion', saveState.options.reduceMotion);
  hubContinueButton.disabled = !checkpoint;
  hubContinueButton.textContent = checkpoint ? `CONTINUE · ROOM ${checkpoint.route.roomIndex + 1} · ${checkpoint.seed.toString(16).toUpperCase()}` : 'CONTINUE LAST RUN · NO CHECKPOINT';
  const last = saveState.meta.lastRun;
  titleMetadata.textContent = saveState.activeRun ? 'EXPEDITION CHECKPOINT READY / CONTINUE FROM THE LAST SAFE THREAD' : saveState.meta.completedRuns ? `${saveState.meta.completedRuns} RUN${saveState.meta.completedRuns === 1 ? '' : 'S'} RECORDED / ${saveState.meta.beaconAwakened ? 'BEACON AWAKE' : 'BEACON UNLIT'}` : 'FIRST EXPEDITION / SPINDLE REFUGE AWAITS';
  const discoveryLog = last ? Object.values(last.eventChoices ?? {}).map((choice) => choice.replaceAll('-', ' ').toUpperCase()).join(' / ') : '';
  hubProgress.textContent = `${saveState.meta.completedRuns} COMPLETED RUN${saveState.meta.completedRuns === 1 ? '' : 'S'} · ${saveState.meta.beaconAwakened ? 'REFUGE BEACON LIT' : 'FIRST CLEAR WILL LIGHT THE BEACON'}${last ? ` · LAST ${last.result.toUpperCase()} / ${last.visited.length} ROOMS / ${discoveryLog || 'FRESH SEEDED ROUTE READY'}` : ''}`;
  hubProgress.title = last ? `Last route: ${last.visited.join(' → ')}${discoveryLog ? ` / discoveries: ${discoveryLog}` : ''}` : 'A fresh run seed selects different authored rooms and encounter timing.';
  byId<HTMLElement>('hub-beacon-state').textContent = saveState.meta.beaconAwakened ? 'AWAKE / FIRST-CLEAR MARK' : 'UNLIT';
  hubReducedMotion.checked = saveState.options.reduceMotion;
  hubVolume.value = String(saveState.options.masterVolume);
  settingsReducedMotion.checked = saveState.options.reduceMotion;
  settingsMasterVolume.value = String(saveState.options.masterVolume);
  settingsPixelScaling.value = saveState.options.pixelScaling ?? 'pixel-perfect';
  settingsVolumeValue.value = `${Math.round(saveState.options.masterVolume * 100)}%`;
  hubAmbience.volume = saveState.options.masterVolume;
  hubAmbience.muted = !hubSoundEnabled;
}
renderHub();
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
function completeB10Run(detail: { result: 'victory' | 'defeat'; elapsedMs: number; damageTaken: number; visited: readonly string[]; choices: B10RunCheckpoint['route']['choices']; eventChoices?: Readonly<Record<string, string>>; seed: number; b08BossesCleared?: readonly string[]; b09Build?: RunBuildState; runId?: string }): void {
  if (!b10Mode) return;
  const runId = detail.runId ?? b10RunId;
  if (!runId) return;
  const runBuild = detail.b09Build ?? (chamber instanceof B07ExpeditionScene ? chamber.b07Snapshot().b09.build : undefined);
  if (!runBuild) return;
  const summary: B10RunSummary = { runId, result: detail.result, seed: detail.seed, elapsedMs: Math.round(detail.elapsedMs), damageTaken: detail.damageTaken, visited: [...detail.visited], choices: detail.choices, eventChoices: detail.eventChoices ?? {}, bossesCleared: [...(detail.b08BossesCleared ?? [])], build: runBuild };
  b10FirstClearResult = detail.result === 'victory' && !saveState.meta.beaconAwakened;
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
function syncB11HudToCanvas(): void {
  if (!hud.classList.contains('b11-hud') || !game?.canvas) return;
  const viewport = byId<HTMLElement>('app').getBoundingClientRect();
  const canvas = game.canvas.getBoundingClientRect();
  hud.style.left = `${canvas.left - viewport.left}px`;
  hud.style.top = `${canvas.top - viewport.top}px`;
  hud.style.width = `${canvas.width}px`;
  hud.style.height = `${canvas.height}px`;
  hud.style.right = 'auto';
  hud.style.bottom = 'auto';
}
window.addEventListener('resize', () => window.requestAnimationFrame(syncB11HudToCanvas));
function start(artReview = false, animationLab = false, ionaPreview = false, b03Combat = false, b04 = false, b05 = false, b06 = false, b07 = false, b08 = false, b09 = false, b10 = false, seed?: number, checkpoint: B10RunCheckpoint | null = null, runId?: string): void {
  if (active) return;
  const b07On = b07 || b08 || b09 || b10;
  b11ControlSettings = readB11ControlSettings();
  b11LastPaintAt = 0; b11LastHp = null; b11LastResonance = null; b11LastFormEnergy = null; b11LastAcquisitionCount = 0; b11LastCooldownReady = false; b11StatusUntil = 0; b11StatusOverride = '';
  active = true; paused = false; artReviewMode = artReview; animationLabMode = animationLab; ionaPreviewMode = ionaPreview || b04 || b05 || b06 || b07On; b03CombatMode = b03Combat || b04 || b05 || b06 || b07On; b04Mode = b04 || b05 || b06 || b07On; b05Mode = b05 || b06 || b07On; b06Mode = b06; b07Mode = b07On; b08Mode = b08 || b09 || b10; b09Mode = b09 || b10; b10Mode = b10; b10RunId = runId ?? checkpoint?.runId ?? null; b09ChoiceVisible = false; b09CurrentOffer = null; b04ResultVisible = false; b07ResultVisible = false;
  b10StoryVisible = false; setVisible(b10StoryBeat, false); setVisible(title, false); setVisible(hubScreen, false); setVisible(hubStory, false); hubAmbience.pause(); setVisible(hud, !artReview && !animationLab && !b04 && !b05 && !b06 && (!b07On || b10)); hud.classList.toggle('b11-hud', b10); setVisible(pauseScreen, false); setVisible(b04Results, false); setVisible(b07Results, false);
  setVisible(byId<HTMLElement>('target-health'), b03Combat && !b06);
  setVisible(byId<HTMLElement>('b03-status'), b03Combat && !b06);
  hud.classList.toggle('preview-hud', ionaPreview);
  hud.classList.toggle('b03-hud', b03Combat);
  setVisible(previewTools, ionaPreview && !b03Combat);
  setVisible(previewReadout, ionaPreview && !b03Combat);
  if (b09 || b10) {
    hudMode.textContent = b10 ? 'SPINDLE REFUGE EXPEDITION' : '/ B09 RUN BUILD EXPEDITION';
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
  const instance = createGame(() => togglePause(), (connected) => { controllerIndicator.textContent = connected ? 'CONTROLLER CONNECTED' : ''; }, { artReview, animationLab, ionaPreview, b03Combat, b04, b05, b06, b07, b08, b09, b10, seed, checkpoint, runId, reduceMotion: saveState.options.reduceMotion, pixelScaling: saveState.options.pixelScaling ?? 'pixel-perfect' });
  game = instance.game; chamber = instance.scene;
  game.sound.setVolume(saveState.options.masterVolume);
  window.requestAnimationFrame(() => window.requestAnimationFrame(syncB11HudToCanvas));
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
  b11ControlSettings = readB11ControlSettings();
  settingsReducedMotion.checked = saveState.options.reduceMotion;
  settingsMasterVolume.value = String(saveState.options.masterVolume);
  settingsPixelScaling.value = saveState.options.pixelScaling ?? 'pixel-perfect';
  settingsVolumeValue.value = `${Math.round(saveState.options.masterVolume * 100)}%`;
  chamber?.resetTransientInput();
  game?.canvas?.blur();
  byId<HTMLElement>('settings-screen').querySelector<HTMLElement>('.settings-panel')!.scrollTop = 0;
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
    onApply: (settings: ControlSettings) => { b11ControlSettings = settings; chamber?.setControlSettings(settings); },
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
  setVisible(debugOverlay, false); setVisible(pauseScreen, false); setVisible(hud, false); setVisible(previewTools, false); setVisible(previewReadout, false); setVisible(b04Results, false); setVisible(b07Results, false); setVisible(b09ChoiceScreen, false); hud.classList.remove('preview-hud'); hud.classList.remove('b03-hud'); hud.classList.remove('b11-hud'); hud.style.left = ''; hud.style.top = ''; hud.style.width = ''; hud.style.height = ''; hud.style.right = ''; hud.style.bottom = ''; setVisible(title, !returnToHub);
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
  const detail = (event as CustomEvent<{ result: 'victory' | 'defeat'; elapsedMs: number; damageTaken: number; repairCharges: number; resonance: number; visited: readonly string[]; choices: B10RunCheckpoint['route']['choices']; eventChoices?: Readonly<Record<string, string>>; seed: number; b08BossBuilt: boolean; b08BossesCleared?: readonly string[]; b08Practice?: boolean; b09Enabled?: boolean; b09Build?: RunBuildState; b10Enabled?: boolean; runId?: string }>).detail;
  if (!detail) return;
  completeB10Run(detail);
  game?.scene.pause('Chamber'); chamber?.setLabAudioPaused(true); paused = true; b07ResultVisible = true;
  b07Results.dataset.result = detail.result;
  b07ResultHeading.textContent = detail.b09Enabled ? detail.result === 'victory' ? 'RUN BUILD / SPINDLE RESTORED' : 'RUN BUILD / EXPEDITION ENDED' : detail.b08BossBuilt ? detail.result === 'victory' ? detail.b08Practice ? 'BOSS PRACTICE CLEARED' : 'B08 FINAL CONFRONTATION CLEARED' : 'B08 EXPEDITION ENDED' : detail.result === 'victory' ? 'B07 ROUTE CLEARED' : 'EXPEDITION ENDED';
  if (detail.b10Enabled) b07ResultHeading.textContent = detail.result === 'victory' ? b10FirstClearResult ? 'FIRST CLEAR / SPINDLE RESTORED' : 'THE SPINDLE TURNS AGAIN' : 'EXPEDITION ENDED / RETURN TO REFUGE';
  const minutes = Math.floor(detail.elapsedMs / 60000);
  const seconds = Math.floor((detail.elapsedMs % 60000) / 1000).toString().padStart(2, '0');
  const reach = detail.choices.reach ?? 'not chosen'; const loom = detail.choices.loom ?? 'not chosen';
  const buildSummary = detail.b09Build ? Object.entries(detail.b09Build.ranks).filter(([, rank]) => !!rank).map(([id, rank]) => `${B09_UPGRADES[id as keyof typeof B09_UPGRADES].name} ${rank}`).join(' / ') || 'NO ATTUNEMENTS' : '';
  const eventSummary = Object.values(detail.eventChoices ?? {}).map((choice) => choice.replaceAll('-', ' ').toUpperCase()).join(' / ') || 'NONE';
  b07ResultStats.textContent = `${detail.result.toUpperCase()}  ·  ${minutes}:${seconds}  ·  ${detail.visited.length} ROOMS  ·  SEED ${detail.seed.toString(16).toUpperCase()}  ·  REACH ${reach}  ·  LOOM ${loom}  ·  DISCOVERIES ${eventSummary}  ·  REPAIRS ${detail.repairCharges}  ·  ROUTE RESONANCE ${detail.resonance}  ·  BOSSES ${detail.b08BossesCleared?.length ?? 0}/3  ·  ${detail.damageTaken} DAMAGE${detail.b09Enabled ? `  ·  RUN BUILD ${buildSummary}` : detail.b08BossBuilt ? '' : '. The B08 boss remains unbuilt.'}`;
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
hubReducedMotion.addEventListener('change', () => { chamber?.setReducedMotion(hubReducedMotion.checked); commitSave({ ...saveState, options: { ...saveState.options, reduceMotion: hubReducedMotion.checked } }); });
hubVolume.addEventListener('input', () => {
  hubAmbience.volume = Number(hubVolume.value);
  game?.sound.setVolume(Number(hubVolume.value));
  commitSave({ ...saveState, options: { ...saveState.options, masterVolume: Number(hubVolume.value) } });
});
settingsMasterVolume.addEventListener('input', () => {
  const volume = Number(settingsMasterVolume.value);
  settingsVolumeValue.value = `${Math.round(volume * 100)}%`;
  settingsVolumeValue.textContent = settingsVolumeValue.value;
  hubAmbience.volume = volume;
  game?.sound.setVolume(volume);
  commitSave({ ...saveState, options: { ...saveState.options, masterVolume: volume } });
});
settingsReducedMotion.addEventListener('change', () => {
  chamber?.setReducedMotion(settingsReducedMotion.checked);
  commitSave({ ...saveState, options: { ...saveState.options, reduceMotion: settingsReducedMotion.checked } });
});
settingsPixelScaling.addEventListener('change', () => {
  const mode = settingsPixelScaling.value as DisplayScalingMode;
  if (mode !== 'pixel-perfect' && mode !== 'fit') return;
  if (game) applyDisplayScaling(game, mode);
  commitSave({ ...saveState, options: { ...saveState.options, pixelScaling: mode } });
  byId<HTMLElement>('settings-message').textContent = mode === 'pixel-perfect'
    ? window.innerWidth < 480 || window.innerHeight < 270
      ? 'PIXEL PERFECT MODE / THE CANVAS FITS BELOW 480×270 BECAUSE NO WHOLE SCALE FITS.'
      : 'PIXEL PERFECT MODE / WHOLE-NUMBER SCALE WITH LETTERBOXING.'
    : 'FIT MODE / USES THE AVAILABLE AREA WITH NEAREST-NEIGHBOR PIXELS.';
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
    snapshot: (): { screen: 'title' | 'hub' | 'hubStory' | 'playing' | 'paused' | 'review' | 'animationLab' | 'ionaPreview' | 'b03Combat' | 'b04Combat' | 'b05Combat' | 'b06Combat' | 'b07Expedition' | 'b08Expedition' | 'b09Expedition' | 'b10Expedition' | 'b09Choice' | 'b04Results' | 'b07Results'; player: ChamberSnapshot | null; review: ArtReviewSnapshot | null; lab: AnimationLabSnapshot | null; preview: IonaPreviewSnapshot | null; combat: ReturnType<ChamberScene['combatSnapshot']>; b04: ReturnType<B04VerticalSliceScene['b04Snapshot']>; b05: ReturnType<ChamberScene['dawnrushSnapshot']>; b06: ReturnType<B06EnemyGauntletScene['b06Snapshot']>; b06Events: readonly Record<string, unknown>[]; b07: ReturnType<B07ExpeditionScene['b07Snapshot']> | null; save: { version: number; revision: number; completedRuns: number; beaconAwakened: boolean; activeRun: B10RunCheckpoint | null; lastRun: SaveV2['meta']['lastRun'] }; sceneType: string | null; sceneKey: string | null; sceneStatus: number | null; gameBooted: boolean; display: { mode: DisplayScalingMode; zoom: number; displayWidth: number; displayHeight: number; parentWidth: number; parentHeight: number } | null; sceneActive: boolean; scenePaused: boolean; loader: { loading: boolean; progress: number; queued: number; inflight: number; complete: number; failed: number } | null } => ({
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
      b07: active && game?.isBooted && b07Mode && chamber instanceof B07ExpeditionScene && chamber.sys.isActive() ? chamber.b07Snapshot() : null,
      save: { version: saveState.version, revision: saveState.revision, completedRuns: saveState.meta.completedRuns, beaconAwakened: saveState.meta.beaconAwakened, activeRun: saveState.activeRun, lastRun: saveState.meta.lastRun },
      sceneType: chamber?.constructor.name ?? null,
      sceneKey: chamber?.sys.settings.key ?? null,
      sceneStatus: chamber?.sys.settings.status ?? null,
      gameBooted: game?.isBooted ?? false,
      display: game ? { mode: saveState.options.pixelScaling ?? 'pixel-perfect', zoom: game.scale.zoom, displayWidth: game.scale.displaySize.width, displayHeight: game.scale.displaySize.height, parentWidth: game.scale.parentSize.width, parentHeight: game.scale.parentSize.height } : null,
      sceneActive: chamber?.sys.isActive() ?? false,
      scenePaused: game?.scene.isPaused('Chamber') ?? false,
      loader: chamber ? { loading: chamber.load.isLoading(), progress: chamber.load.progress, queued: chamber.load.list.size, inflight: chamber.load.inflight.size, complete: chamber.load.totalComplete, failed: chamber.load.totalFailed } : null,
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
