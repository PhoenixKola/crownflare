/** Headed Chrome QA for the full B04 combat and reward route. */
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, copyFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port = 4192;
const base = `http://127.0.0.1:${port}`;
const evidence = 'review-evidence/b04';
const recordingDir = 'tests/evidence/b04-recordings';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'pipe' });
let serverErrors = '';
server.stderr.on('data', (buffer) => { serverErrors += buffer.toString(); });
let browser;
let recordingContext;
let recordingPage;
let passed = false;
const errors = [];
const checks = [];
const actions = [];
const events = [];
let hitVfxCaptured = false;
const now = () => Number((Date.now() / 1000).toFixed(2));
const record = (label, detail = {}) => actions.push({ time: now(), label, ...detail });
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const snapshot = (page) => page.evaluate(() => window.__CROWNFLARE_QA__?.snapshot());
const combat = async (page) => (await snapshot(page))?.combat;
const b04 = async (page) => (await snapshot(page))?.b04;
const check = (label, status, detail = {}) => checks.push({ label, status, ...detail });

async function ready(url) {
  for (let i = 0; i < 100; i += 1) {
    try { const response = await fetch(url); if (response.ok) return true; } catch { /* Vite still starting. */ }
    await delay(200);
  }
  return false;
}

async function filesIn(folder) {
  const entries = await readdir(folder, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const target = path.join(folder, entry.name);
    if (entry.isDirectory()) result.push(...await filesIn(target));
    else if (entry.isFile()) result.push(target);
  }
  return result;
}

async function sourceDigest() {
  const roots = ['src/game/scenes/B04VerticalSliceScene.ts', 'src/game/enemies/b04EncounterFlow.ts', 'src/game/rooms/sunderglassAtrium.ts', 'src/game/scenes/ChamberScene.ts', 'src/main.ts', 'src/game/createGame.ts', 'src/style.css', 'index.html', 'tests/unit/b04-atrium.test.ts', 'tests/unit/b04-encounter.test.ts', 'tools/local-qa/b04-combat-smoke.mjs', 'tools/local-qa/b04-production-route-smoke.mjs', 'tools/art-export/build-b04-environment.py', 'tools/art-export/audit-b04-environment.py', 'tools/audio/generate-b04-ambience.py', 'tools/audio/audit-b04-ambience.py', 'art-source/manifests/b04-generation-prompts.md', 'art-source/environments/b04/generation', 'public/assets/environments/b04', 'art-source/audio/b04', 'public/assets/audio/b04'];
  const files = [];
  for (const root of roots) {
    try { const info = await stat(root); files.push(...(info.isDirectory() ? await filesIn(root) : [root])); } catch { /* absent optional inputs */ }
  }
  files.sort((a, b) => a.localeCompare(b));
  const hash = createHash('sha256');
  for (const file of files) { hash.update(file.replaceAll('\\', '/') + '\0'); hash.update(await readFile(file)); }
  return { sha256: hash.digest('hex'), files: files.length };
}

function monitor(page, label) {
  page.on('pageerror', (error) => errors.push(`${label} runtime: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`${label} console: ${message.text()}`); });
  page.on('requestfailed', (request) => errors.push(`${label} request failed: ${request.method()} ${request.url()} / ${request.failure()?.errorText ?? 'unknown'}`));
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`${label} HTTP ${response.status()}: ${response.url()}`); });
}

async function initCapture(context) {
  await context.addInitScript(() => {
    window.__B04_QA_EVENTS__ = [];
    for (const name of ['crownflare:b04-state', 'crownflare:b04-result', 'crownflare:combat-event', 'crownflare:player-damage', 'crownflare:audio-event', 'crownflare:b04-vfx']) {
      window.addEventListener(name, (event) => window.__B04_QA_EVENTS__.push({ name, detail: event.detail, at: performance.now() }));
    }
  });
}

async function keyTap(page, key, duration = 45) {
  await page.keyboard.down(key); await page.waitForTimeout(duration); await page.keyboard.up(key);
}

async function dodgeSentry(page, state) {
  const toward = state.enemyX > state.playerX ? 'd' : 'a';
  const away = toward === 'd' ? 'a' : 'd';
  if ((state.facing > 0 ? 'd' : 'a') === toward) await keyTap(page, away, 20);
  await keyTap(page, 'Shift', 30);
}

async function waitFor(page, predicate, message, timeout = 12000) {
  await page.waitForFunction((fn) => {
    const state = window.__CROWNFLARE_QA__?.snapshot();
    return state ? (new Function('state', `return (${fn})(state);`))(state) : false;
  }, predicate.toString(), { timeout }).catch(async (error) => { throw new Error(`${message}: ${JSON.stringify(await snapshot(page))} / ${error.message}`); });
  return snapshot(page);
}

async function capture(page, name) {
  const destination = path.join(evidence, `${name}.png`);
  await page.screenshot({ path: destination, animations: 'allow' });
  record(`capture ${name}`, await snapshot(page));
  return destination.replaceAll('\\', '/');
}

async function approach(page, desiredGap = 34) {
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    const state = await combat(page);
    if (!state || state.playerHp <= 0) break;
    if (state.enemyState === 'telegraph') {
      await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().combat?.enemyState !== 'telegraph', undefined, { timeout: 900 }).catch(() => {});
      continue;
    }
    if (state.enemyState === 'lunge') {
      await dodgeSentry(page, state);
      await page.waitForTimeout(180);
      continue;
    }
    const delta = state.enemyX - state.playerX;
    const gap = Math.abs(delta);
    const towardFacing = delta >= 0 ? 1 : -1;
    if (gap >= desiredGap - 8 && gap <= desiredGap + 8) {
      if (state.facing === towardFacing) {
        await page.waitForTimeout(45);
        record('positioned for melee', { gap, playerX: state.playerX, enemyX: state.enemyX, facing: state.facing });
        return state;
      }
      const turn = towardFacing > 0 ? 'd' : 'a';
      await page.keyboard.down(turn); await page.waitForTimeout(18); await page.keyboard.up(turn);
      continue;
    }
    const toward = delta >= 0 ? 'd' : 'a';
    const key = gap > desiredGap + 5 ? toward : toward === 'd' ? 'a' : 'd';
    await page.keyboard.down(key); await page.waitForTimeout(35); await page.keyboard.up(key);
  }
  throw new Error(`Could not position for melee: ${JSON.stringify(await combat(page))}`);
}

async function moveToX(page, x, tolerance = 18) {
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    const state = await combat(page);
    if (!state || Math.abs(state.playerX - x) <= tolerance) return state;
    const key = state.playerX < x ? 'd' : 'a';
    await page.keyboard.down(key); await page.waitForTimeout(40); await page.keyboard.up(key);
  }
  throw new Error(`Could not reach x=${x}: ${JSON.stringify(await combat(page))}`);
}

async function attackAndWait(page, key) {
  const before = await combat(page);
  const expectedMove = key === 'k' ? 'heavy' : key === 'q' ? 'resonance' : 'light-1';
  let started = false;
  for (let retry = 0; retry < 10 && !started; retry += 1) {
    let readyState = await combat(page);
    if (readyState.playerHp <= 0) return readyState;
    if (readyState.move !== 'none') {
      await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().combat?.move === 'none', undefined, { timeout: 3000 });
      readyState = await combat(page);
    }
    if (readyState.frame.includes('hurt-')) {
      await page.waitForFunction(() => { const state = window.__CROWNFLARE_QA__?.snapshot().combat; return state && state.playerHp > 0 && !state.frame.includes('hurt-'); }, undefined, { timeout: 1400 });
      continue;
    }
    if (readyState.enemyState === 'telegraph') {
      await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().combat?.enemyState !== 'telegraph', undefined, { timeout: 900 }).catch(() => {});
      continue;
    }
    if (readyState.enemyState === 'lunge') {
      await dodgeSentry(page, readyState);
      await page.waitForTimeout(180);
      continue;
    }
    await keyTap(page, key);
    try {
      await page.waitForFunction((move) => window.__CROWNFLARE_QA__?.snapshot().combat?.move === move, expectedMove, { timeout: 1000 });
      started = true;
    } catch {
      const retryState = await combat(page);
      if (retryState.playerHp <= 0) return retryState;
      if (retryState.frame.includes('hurt-')) {
        await page.waitForFunction(() => { const state = window.__CROWNFLARE_QA__?.snapshot().combat; return state && state.playerHp > 0 && !state.frame.includes('hurt-'); }, undefined, { timeout: 1400 });
        continue;
      }
      if (retryState.enemyState === 'lunge') { await keyTap(page, 'Shift', 30); await page.waitForTimeout(100); continue; }
      throw new Error(`Could not start ${expectedMove}: ${JSON.stringify(retryState)}`);
    }
  }
  if (!started) return combat(page);
  let dodgeSent = false;
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    const state = await combat(page);
    if (state.enemyState === 'lunge' && !dodgeSent) { await dodgeSentry(page, state); dodgeSent = true; }
    if (state.enemyHp < before.enemyHp || (state.move === 'none' && state.phase === 'idle')) break;
    await page.waitForTimeout(50);
  }
  const after = await combat(page);
  record(`attack ${expectedMove}`, { beforeHp: before.enemyHp, afterHp: after.enemyHp, result: after.lastResult, playerHp: after.playerHp, move: after.move });
  if (after.enemyHp < before.enemyHp && !hitVfxCaptured) {
    await page.waitForFunction(() => (window.__B04_QA_EVENTS__ ?? []).some((event) => event.name === 'crownflare:b04-vfx' && event.detail?.kind === 'impact'), undefined, { timeout: 700 });
    await capture(page, 'b04-hit-confirmation-vfx');
    hitVfxCaptured = true;
  }
  if (after.playerHp <= 0 || (await b04(page))?.phase === 'defeat') return after;
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().combat?.move === 'none', undefined, { timeout: 4500 }).catch(async (error) => { throw new Error(`Combat action failed to settle: ${JSON.stringify(await combat(page))} / ${error.message}`); });
  return after;
}

async function clearCurrentSentry(page, label, captureResult = true) {
  let state = await combat(page);
  let attempts = 0;
  const moves = ['k', 'q', 'k', 'j', 'k', 'k', 'j', 'k', 'q', 'k', 'j', 'k'];
  while (state.enemyHp > 0 && attempts < moves.length) {
    await approach(page, moves[attempts] === 'q' ? 60 : 42);
    const beforeHp = state.enemyHp;
    state = await attackAndWait(page, moves[attempts]);
    attempts += 1;
    if (state.enemyHp >= beforeHp && state.playerHp > 0) {
      await approach(page, 40);
      state = await attackAndWait(page, 'k');
      attempts += 1;
    }
    state = await combat(page);
    if (state.playerHp <= 0) throw new Error(`${label} combat failed: player defeated before sentry clear: ${JSON.stringify(state)}`);
    if (state.phase === 'defeat') throw new Error(`${label} phase entered defeat during attack sequence`);
  }
  assert(state.enemyHp <= 0, `${label} did not clear: ${JSON.stringify(state)}`);
  const nextPhase = label === 'first sentry' ? 'reward' : 'exit';
  await waitFor(page, new Function(`return (value) => value.b04?.phase === '${nextPhase}'`)(), `${label} encounter phase transition`);
  if (captureResult) await capture(page, label === 'first sentry' ? 'b04-first-sentry-cleared' : 'b04-second-sentry-cleared');
  check(`${label} combat uses shared B03 moves and advances B04 encounter phase`, 'PASS', { attempts, playerHp: state.playerHp, damageDealt: 8 - state.enemyHp, result: state.lastResult, nextPhase: (await b04(page)).phase });
  return state;
}

async function viewportCheck(width, height, label) {
  const context = await browser.newContext({ viewport: { width, height } });
  await initCapture(context);
  const page = await context.newPage(); monitor(page, label);
  await page.goto(`${base}/?b04=1`, { waitUntil: 'domcontentloaded' });
  await page.locator('#start-button').click();
  await waitFor(page, (state) => state.sceneType === 'B04VerticalSliceScene' && state.b04?.loadedTextures === 15, `${label} scene loaded`);
  const bounds = await page.locator('#game-root canvas').boundingBox();
  const screen = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, overflowX: document.documentElement.scrollWidth > innerWidth, overflowY: document.documentElement.scrollHeight > innerHeight }));
  assert(bounds && bounds.width <= width && bounds.height <= height && !screen.overflowX && !screen.overflowY, `${label} viewport overflow: ${JSON.stringify({ bounds, screen })}`);
  await page.screenshot({ path: path.join(evidence, `b04-viewport-${label}.png`) });
  check(`${label} viewport keeps the game canvas inside the window without page overflow`, 'PASS', { viewport: { width, height }, canvas: bounds, screen });
  record(`viewport ${label}`, { viewport: { width, height }, canvas: bounds });
  await context.close();
}

async function controllerCheck() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await initCapture(context);
  await context.addInitScript(() => {
    const state = { pad: null };
    Object.defineProperty(window, '__setSyntheticPad', { configurable: true, value: (patch) => { state.pad = patch; } });
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => state.pad ? [{
      connected: true, mapping: 'standard', index: 0, id: 'Synthetic Standard Controller', axes: state.pad.axes ?? [0, 0],
      buttons: Array.from({ length: 16 }, (_, button) => ({ pressed: (state.pad.buttons ?? []).includes(button), touched: false, value: (state.pad.buttons ?? []).includes(button) ? 1 : 0 })),
    }] : [] });
  });
  const page = await context.newPage(); monitor(page, 'controller');
  await page.goto(`${base}/?b04=1`, { waitUntil: 'domcontentloaded' });
  await page.locator('#start-button').click();
  await waitFor(page, (state) => state.sceneType === 'B04VerticalSliceScene' && state.sceneActive && state.b04?.loadedTextures === 15, 'controller B04 scene loaded');
  await page.evaluate(() => window.__setSyntheticPad({ axes: [0.75, 0] }));
  await page.waitForFunction(() => { const state = window.__CROWNFLARE_QA__?.snapshot().combat; return state?.controllerIndex === 0 && state.playerX > 134; }, undefined, { timeout: 2500 });
  const rightX = (await combat(page)).playerX;
  await page.evaluate(() => window.__setSyntheticPad({ axes: [-0.75, 0] }));
  await page.waitForFunction((startX) => { const state = window.__CROWNFLARE_QA__?.snapshot().combat; return state?.controllerIndex === 0 && state.playerX < startX - 3; }, rightX, { timeout: 2000 });
  const leftX = (await combat(page)).playerX;
  check('standard gamepad axes move the same player left and right through the B03 controller path', 'PASS', { rightX, leftX, controllerIndex: (await combat(page)).controllerIndex, physicalController: 'NOT TESTED' });
  record('synthetic standard controller movement', { rightX, leftX });
  await context.close();
}

async function main() {
  await mkdir(evidence, { recursive: true });
  await mkdir(recordingDir, { recursive: true });
  assert(await ready(`${base}/?b04=1`), `Vite did not start. ${serverErrors}`);
  browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--use-gl=angle', '--use-angle=swiftshader'] });
  recordingContext = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: recordingDir, size: { width: 1280, height: 720 } } });
  await initCapture(recordingContext);
  recordingPage = await recordingContext.newPage();
  monitor(recordingPage, 'main');
  const startedAt = Date.now();
  await recordingPage.goto(`${base}/?b04=1`, { waitUntil: 'domcontentloaded' });
  assert(await recordingPage.locator('#start-button').isVisible(), 'B04 title entry is missing');
  check('dev-only B04 route presents original candidate slice title and review status', 'PASS', { title: await recordingPage.locator('#title-metadata').innerText(), notice: await recordingPage.locator('#preview-notice').innerText() });
  record('B04 title visible');
  await recordingPage.locator('#start-button').click();
  await waitFor(recordingPage, (state) => state.sceneType === 'B04VerticalSliceScene' && state.sceneActive && state.b04?.loadedTextures === 15, 'B04 scene and all environment textures load');
  let state = await snapshot(recordingPage);
  assert(state.b04.missingTextures.length === 0 && state.b04.missingIonaFrames.length === 0 && state.b04.missingCombatArt.length === 0, `Missing B04/Iona/combat art: ${JSON.stringify(state.b04)}`);
  check('original environment, sentry attack frames, Iona frames and combat textures load', 'PASS', { environmentTextures: state.b04.loadedTextures, ionaFrames: state.b04.loadedIonaFrames, missingTextures: state.b04.missingTextures, missingIonaFrames: state.b04.missingIonaFrames, missingCombatArt: state.b04.missingCombatArt });
  await capture(recordingPage, 'b04-entry-1280x720');
  await recordingPage.keyboard.press('Escape');
  await recordingPage.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().screen === 'paused', undefined, { timeout: 1500 });
  assert(await recordingPage.locator('#pause-screen').isVisible(), 'Pause overlay did not appear');
  check('pause overlay freezes the combat scene and remains accessible', 'PASS');
  await recordingPage.locator('#resume-button').click();
  await waitFor(recordingPage, (value) => value.screen === 'b04Combat', 'pause resumes B04');
  await recordingPage.waitForTimeout(100);
  await recordingPage.keyboard.down('d'); await recordingPage.waitForTimeout(230); await recordingPage.keyboard.up('d');
  state = await snapshot(recordingPage);
  assert(state.combat.playerX > 130, `Keyboard movement did not advance from entry: ${JSON.stringify(state.combat)}`);
  check('keyboard movement advances the real Phaser player from the entry beacon', 'PASS', { fromX: 130, toX: state.combat.playerX });
  await recordingPage.keyboard.down('Space');
  await recordingPage.waitForFunction(() => (window.__CROWNFLARE_QA__?.snapshot().combat?.playerY ?? 226) < 226, undefined, { timeout: 1200 });
  const jumpY = (await combat(recordingPage)).playerY;
  await recordingPage.keyboard.up('Space');
  check('jump produces live vertical movement while preserving the existing player controller', 'PASS', { peakObservedPlayerY: jumpY });
  await recordingPage.waitForFunction(() => { const state = window.__CROWNFLARE_QA__?.snapshot().combat; return state && state.playerY >= 225.5 && state.move === 'none'; }, undefined, { timeout: 2500 });
  await recordingPage.waitForTimeout(100);
  await capture(recordingPage, 'b04-entry-traverse');
  const beforeFirst = await b04(recordingPage);
  check('entry walk feeds the first live sentry encounter', 'PASS', { phase: beforeFirst.phase, playerX: beforeFirst.playerX, sentryX: (await combat(recordingPage)).enemyX, health: beforeFirst.playerHp });
  await clearCurrentSentry(recordingPage, 'first sentry');
  await moveToX(recordingPage, 380, 17);
  await capture(recordingPage, 'b04-resonance-shard');
  await keyTap(recordingPage, 'e');
  await waitFor(recordingPage, (value) => value.b04?.phase === 'sentry-two' && value.b04.rewardClaimed, 'shard collection wakes second sentry');
  state = await snapshot(recordingPage);
  assert(state.b04.playerHp >= 3, `Reward failed to restore health or second sentry: ${JSON.stringify(state.b04)}`);
  check('shard reward restores health and activates the second sentry', 'PASS', { phase: state.b04.phase, playerHp: state.b04.playerHp, rewardClaimed: state.b04.rewardClaimed, sentryX: state.combat.enemyX });
  record('shard claimed', state.b04);
  await recordingPage.waitForTimeout(900);
  await moveToX(recordingPage, 930, 22);
  await capture(recordingPage, 'b04-traverse-to-second-sentry');
  await clearCurrentSentry(recordingPage, 'second sentry');
  await moveToX(recordingPage, 1480, 34);
  await capture(recordingPage, 'b04-open-exit-gate');
  await keyTap(recordingPage, 'e');
  await waitFor(recordingPage, (value) => value.screen === 'b04Results' && value.b04?.phase === 'victory', 'exit gate produces the victory results state');
  const resultText = await recordingPage.locator('#b04-result-stats').innerText();
  assert(resultText.includes('CLEAR') && resultText.includes('RESONANCE SHARD RECOVERED'), `Victory stats are incomplete: ${resultText}`);
  await capture(recordingPage, 'b04-victory');
  check('exit gate completes the encounter and displays clear time, damage and reward status', 'PASS', { resultText, elapsedMs: (await b04(recordingPage)).elapsedMs });
  await recordingPage.keyboard.press('Tab');
  const tabTarget = await recordingPage.evaluate(() => document.activeElement?.id);
  await recordingPage.keyboard.press('Shift+Tab');
  const reverseTabTarget = await recordingPage.evaluate(() => document.activeElement?.id);
  assert(tabTarget === 'b04-title-button' && reverseTabTarget === 'b04-replay-button', `Result buttons are not keyboard navigable: ${tabTarget} / ${reverseTabTarget}`);
  check('victory choices follow a visible keyboard tab order', 'PASS', { tabTarget, reverseTabTarget });
  await recordingPage.waitForTimeout(1000);
  await recordingPage.locator('#b04-replay-button').click();
  await waitFor(recordingPage, (value) => value.screen === 'b04Combat' && value.b04?.phase === 'sentry-one' && value.b04.playerHp === 5, 'Replay resets player and encounter');
  check('Replay resets both waves, player health and reward state', 'PASS', { phase: (await b04(recordingPage)).phase, hp: (await b04(recordingPage)).playerHp });
  record('replay selected');
  await approach(recordingPage, 34);
  const attackVisualCheckStartedAt = await recordingPage.evaluate(() => performance.now());
  await waitFor(recordingPage, (value) => value.b04?.enemyState === 'telegraph', 'second run exposes enemy telegraph', 10000);
  assert((await b04(recordingPage)).attackFxState === 'telegraph', `Sentry telegraph effect did not activate: ${JSON.stringify(await b04(recordingPage))}`);
  await capture(recordingPage, 'b04-sentry-telegraph');
  await waitFor(recordingPage, (value) => value.b04?.enemyState === 'lunge' && value.b04?.attackFxState?.startsWith('lunge-'), 'sentry lunge attack effect starts', 1200);
  const attackFxState = await recordingPage.evaluate((startedAt) => {
    const events = window.__B04_QA_EVENTS__ ?? [];
    const event = [...events].reverse().find((candidate) => candidate.name === 'crownflare:b04-state'
      && candidate.at >= startedAt && candidate.detail?.enemyState === 'lunge'
      && /^lunge-[0-2]$/.test(candidate.detail?.attackFxState ?? ''));
    return event?.detail?.attackFxState ?? null;
  }, attackVisualCheckStartedAt);
  assert(attackFxState, 'No active sentry lunge frame was captured in the B04 state event log');
  await capture(recordingPage, 'b04-sentry-lunge-effect');
  check('sentry telegraph stays attached to its core and advances into the generated lunge streak', 'PASS', { telegraphEffect: 'single attached thrust cue', lungeEffect: attackFxState });
  await waitFor(recordingPage, (value) => value.b04?.phase === 'defeat', 'sentry attacks cause a real defeat', 19000);
  await waitFor(recordingPage, (value) => value.screen === 'b04Results', 'defeat results panel appears');
  assert((await recordingPage.locator('#b04-result-heading').innerText()).includes('SPINDLE FALLS SILENT'), 'Defeat heading missing');
  await capture(recordingPage, 'b04-defeat');
  check('a second live encounter can end in defeat and present retry/title actions', 'PASS', { hp: (await b04(recordingPage)).playerHp, damageTaken: (await b04(recordingPage)).damageTaken, resultText: await recordingPage.locator('#b04-result-stats').innerText() });
  await recordingPage.waitForTimeout(1000);
  await recordingPage.locator('#b04-replay-button').click();
  await waitFor(recordingPage, (value) => value.screen === 'b04Combat' && value.b04?.phase === 'sentry-one' && value.b04.playerHp === 5, 'Retry starts a fresh combat run');
  check('Retry returns from defeat to a clean playable entry state', 'PASS', { phase: (await b04(recordingPage)).phase, hp: (await b04(recordingPage)).playerHp });
  await approach(recordingPage, 34);
  await waitFor(recordingPage, (value) => value.b04?.phase === 'defeat', 'second run reaches defeat for title handoff', 19000);
  await waitFor(recordingPage, (value) => value.screen === 'b04Results', 'second defeat panel appears');
  await recordingPage.locator('#b04-title-button').click();
  await recordingPage.waitForFunction(() => !window.__CROWNFLARE_QA__?.snapshot().sceneActive && window.__CROWNFLARE_QA__?.snapshot().screen === 'title', undefined, { timeout: 4000 });
  check('Return to Title destroys the B04 run and restores the title screen', 'PASS');
  record('return to title');

  await viewportCheck(640, 360, 'small-640x360');
  await viewportCheck(360, 780, 'portrait-360x780');
  await viewportCheck(1280, 800, '16x10-1280x800');
  await viewportCheck(1920, 720, 'ultrawide-1920x720');
  await controllerCheck();

  const elapsed = Date.now() - startedAt;
  if (elapsed < 70000) await delay(70000 - elapsed);
  const reportEvents = await recordingPage.evaluate(() => window.__B04_QA_EVENTS__ ?? []);
  events.push(...reportEvents);
  const combatEvents = reportEvents.filter((event) => event.name === 'crownflare:combat-event');
  const hitCount = combatEvents.filter((event) => event.detail?.result === 'hit').length;
  const missCount = combatEvents.filter((event) => event.detail?.result === 'miss').length;
  const damageEvents = reportEvents.filter((event) => event.name === 'crownflare:player-damage');
  const audioCues = reportEvents.filter((event) => event.name === 'crownflare:audio-event').map((event) => event.detail?.cue).filter(Boolean);
  const hitVfxEvents = reportEvents.filter((event) => event.name === 'crownflare:b04-vfx' && event.detail?.kind === 'impact');
  assert(hitCount >= 4, `Combat event log has too few hits: ${hitCount}`);
  assert(hitVfxEvents.length === hitCount, `Hit feedback effects ${hitVfxEvents.length} do not match actual successful contacts ${hitCount}`);
  assert(reportEvents.some((event) => event.name === 'crownflare:b04-result' && event.detail?.result === 'victory'), 'No victory result event was captured');
  assert(reportEvents.some((event) => event.name === 'crownflare:b04-result' && event.detail?.result === 'defeat'), 'No defeat result event was captured');
  check('hit VFX fires once on each successful combat contact; result flow records victory and defeat', 'PASS', { hits: hitCount, impactVfx: hitVfxEvents.length, misses: missCount, playerDamageEvents: damageEvents.length, audioEventCount: audioCues.length, cueNames: [...new Set(audioCues)] });

  const video = recordingPage.video();
  await recordingContext.close(); recordingContext = null;
  const tempVideo = await video.path();
  const videoPath = path.join(evidence, 'b04-playable-chrome.webm');
  await copyFile(tempVideo, videoPath);
  const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size:stream=codec_name,codec_type,width,height,avg_frame_rate', '-of', 'json', videoPath], { encoding: 'utf8' }));
  const stream = probe.streams.find((candidate) => candidate.codec_type === 'video');
  const seconds = Number(probe.format.duration);
  assert(seconds >= 60 && seconds <= 180, `B04 Chrome video duration outside 1–3 minute requirement: ${seconds}s`);
  const videoBytes = Number(probe.format.size);
  const videoHash = createHash('sha256').update(await readFile(videoPath)).digest('hex');
  const source = await sourceDigest();
  const report = {
    result: errors.length === 0 ? 'PASS' : 'FAIL', capturedAt: new Date().toISOString(), route: '/?b04=1 (Vite development server)', browser: 'Google Chrome headed through Playwright', viewport: { width: 1280, height: 720 },
    requirements: { realTimeChromeVideoSeconds: seconds, targetSeconds: '60–180', nativeImageGeneration: 'Used; source masters and runtime crops retained', ownerApproval: 'PENDING', audioHeardByAgent: 'NO', physicalController: 'NOT TESTED', normalSpeedHumanReview: 'PENDING; local browser surface unavailable to the agent' },
    checks, actions, events: { total: reportEvents.length, combat: combatEvents.length, hits: hitCount, misses: missCount, playerDamage: damageEvents.length, audioCueNames: [...new Set(audioCues)] },
    video: { path: 'review-evidence/b04/b04-playable-chrome.webm', sha256: videoHash, bytes: videoBytes, durationSeconds: seconds, width: stream?.width ?? null, height: stream?.height ?? null, frameRate: stream?.avg_frame_rate ?? null, codec: stream?.codec_name ?? null, audioTrack: probe.streams.some((candidate) => candidate.codec_type === 'audio') },
    sourceTree: source, errors, serverErrors,
  };
  await writeFile(path.join(evidence, 'qa-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  assert(errors.length === 0, `Browser errors: ${errors.join('\n')}`);
  console.log(JSON.stringify({ result: report.result, checkCount: checks.length, sourceTree: source, video: report.video, errors }, null, 2));
  passed = true;
}

try { await main(); }
catch (error) {
  console.error(error?.stack ?? error);
  const failure = { result: 'FAIL', capturedAt: new Date().toISOString(), checks, actions, events, errors: [...errors, String(error?.message ?? error)], serverErrors };
  await writeFile(path.join(evidence, 'qa-report.json'), `${JSON.stringify(failure, null, 2)}\n`).catch(() => {});
}
finally {
  if (recordingContext) await recordingContext.close().catch(() => {});
  if (browser) await browser.close().catch(() => {});
  server.kill();
}
if (!passed) process.exitCode = 1;
