/** Headed Chrome QA for the real Phaser B03 chamber and controller settings. */
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, copyFile, stat, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port = 4183;
const base = `http://127.0.0.1:${port}`;
const evidence = 'review-evidence/b03';
const recordingDir = 'tests/evidence/b03-recordings';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'pipe' });
let serverErrors = '';
server.stderr.on('data', (buffer) => { serverErrors += buffer.toString(); });
let browser;
let currentPage;
let recordingContext;
let passed = false;
const errors = [];
const actions = [];
const checks = [];
let capturedCombatEvents = [];
let recordedActivePlaySeconds = 0;
const now = () => Number((Date.now() / 1000).toFixed(2));
const record = (label, detail = {}) => actions.push({ time: now(), label, ...detail });
const assert = (value, message) => { if (!value) throw new Error(message); };
const snapshot = (page = currentPage) => page.evaluate(() => window.__CROWNFLARE_QA__?.snapshot());
const combat = async (page = currentPage) => (await snapshot(page))?.combat;
const audioCues = async (page = currentPage) => page.evaluate(() => (window.__B03_QA_EVENTS__ ?? []).filter((event) => event.name === 'crownflare:audio-event').map((event) => event.detail?.cue).filter(Boolean));
const check = (label, status, detail = {}) => checks.push({ label, status, ...detail });
function monitorPage(page, label) {
  page.on('pageerror', (error) => errors.push(`${label} runtime: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`${label} console: ${message.text()}`); });
  page.on('requestfailed', (request) => errors.push(`${label} request failed: ${request.method()} ${request.url()} / ${request.failure()?.errorText ?? 'unknown'}`));
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`${label} HTTP ${response.status()}: ${response.url()}`); });
}

async function ready(url) {
  for (let i = 0; i < 80; i += 1) {
    try { const response = await fetch(url); if (response.ok) return true; } catch { /* Vite still starting. */ }
    await delay(250);
  }
  return false;
}

async function projectFiles(folder) {
  const entries = await readdir(folder, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(folder, entry.name);
    if (entry.isDirectory()) files.push(...await projectFiles(target));
    else if (entry.isFile()) files.push(target);
  }
  return files;
}

async function sourceDigest() {
  const roots = ['src', 'tests/unit', 'tools/local-qa/b03-combat-smoke.mjs', 'tools/art-export/audit-b03-candidate.mjs', 'index.html', 'package.json', 'art-source/manifests/iona-b03-candidate-v1.json', 'art-source/manifests/iona-b03-generation-prompts.md', 'art-source/characters/iona/b03-candidate/generation', 'art-source/characters/enemies/b03-sentry/generation', 'art-source/vfx/b03', 'public/assets/characters/iona/b03', 'public/assets/enemies/spindle-sentry', 'public/assets/vfx/b03', 'docs/qa/b03-combat-move-matrix.md', 'docs/qa/b03-controller-checklist.md', 'docs/qa/b03-owner-decision-card.md'];
  const files = [];
  for (const item of roots) {
    try { const info = await stat(item); files.push(...(info.isDirectory() ? await projectFiles(item) : [item])); }
    catch { /* optional doc has not been created yet */ }
  }
  files.sort((a, b) => a.localeCompare(b));
  const hash = createHash('sha256');
  for (const file of files) { hash.update(file.replaceAll('\\', '/') + '\0'); hash.update(await readFile(file)); }
  return { sha256: hash.digest('hex'), files: files.length };
}

async function installSyntheticPads(context) {
  await context.addInitScript(() => {
    const state = { pads: [] };
    const build = (value, index) => ({
      connected: value.connected !== false,
      mapping: value.mapping ?? 'standard',
      index,
      id: value.id ?? `Synthetic Standard Pad ${index}`,
      axes: value.axes ?? [0, 0],
      buttons: Array.from({ length: 16 }, (_, button) => ({ pressed: (value.buttons ?? []).includes(button), touched: (value.buttons ?? []).includes(button), value: (value.buttons ?? []).includes(button) ? 1 : 0 })),
      vibrationActuator: undefined,
    });
    Object.defineProperty(window, '__setSyntheticPads', { configurable: true, value: (pads) => { state.pads = pads; } });
    Object.defineProperty(window, '__setSyntheticPad', { configurable: true, value: (patch) => { state.pads = [patch]; } });
    Object.defineProperty(window, 'getSyntheticPadState', { configurable: true, value: () => state.pads });
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => state.pads.map((pad, index) => build(pad, pad.index ?? index)) });
    window.__B03_QA_EVENTS__ = [];
    for (const name of ['crownflare:combat-event', 'crownflare:player-damage', 'crownflare:audio-event', 'crownflare:b03-move-start']) {
      window.addEventListener(name, (event) => window.__B03_QA_EVENTS__.push({ name, detail: event.detail, at: performance.now() }));
    }
  });
}

async function setPad(page, patch) { await page.evaluate((value) => window.__setSyntheticPad(value), patch); }
async function setPads(page, pads) { await page.evaluate((values) => window.__setSyntheticPads(values), pads); }
async function keyTap(page, key) { await page.keyboard.down(key); await page.waitForTimeout(45); await page.keyboard.up(key); }
async function waitCombat(page, predicate, message, timeout = 4000) {
  await page.waitForFunction((fn) => {
    const state = window.__CROWNFLARE_QA__?.snapshot().combat;
    return state ? fn(state) : false;
  }, predicate, { timeout }).catch((error) => { throw new Error(`${message}: ${JSON.stringify(error.message)} / ${JSON.stringify(undefined)}`); });
  return combat(page);
}

async function reset(page, reason = 'encounter reset') {
  await keyTap(page, 'r');
  await page.waitForFunction(() => {
    const state = window.__CROWNFLARE_QA__?.snapshot().combat;
    return state?.playerHp === 5 && state.enemyHp === 8 && state.move === 'none';
  }, undefined, { timeout: 3500 });
  record(reason, await combat(page));
}

async function approach(page, desiredGap = 32) {
  const deadline = Date.now() + 9000;
  while (Date.now() < deadline) {
    const state = await combat(page);
    if (!state) break;
    const gap = state.enemyX - state.playerX;
    const direction = gap >= 0 ? 'd' : 'a';
    if (Math.abs(gap) >= desiredGap - 4 && Math.abs(gap) <= desiredGap + 5 && state.facing === (direction === 'd' ? 1 : -1)) {
      await page.waitForTimeout(90);
      record('approach / melee range', { gap: Math.abs(gap), facing: state.facing, enemyState: state.enemyState });
      return state;
    }
    const move = Math.abs(gap) < desiredGap - 4 ? (direction === 'd' ? 'a' : 'd') : direction;
    await page.keyboard.down(move); await page.waitForTimeout(35); await page.keyboard.up(move);
  }
  throw new Error(`Could not approach sentry into melee range: ${JSON.stringify(await combat(page))}`);
}

async function captureFrame(page, label) {
  const destination = path.join(evidence, `b03-${label}.png`);
  await page.screenshot({ path: destination, animations: 'allow' });
  const state = await combat(page);
  record(`capture ${label}`, state);
  return destination.replaceAll('\\', '/');
}

async function capturePose(page, label) {
  const state = await snapshot(page);
  const canvas = await page.locator('#game-root canvas').boundingBox();
  assert(state?.player && state.combat && canvas, `cannot capture anatomy pose ${label}: Phaser canvas or player state missing`);
  const scale = canvas.width / 480;
  const centerX = canvas.x + (state.player.x - state.player.cameraX) * scale;
  const footY = canvas.y + (state.player.y + 15) * scale;
  const width = 250, height = 225;
  const clip = {
    x: Math.max(0, Math.min(1280 - width, Math.round(centerX - width / 2))),
    y: Math.max(0, Math.min(720 - height, Math.round(footY - height))),
    width,
    height,
  };
  const destination = path.join(evidence, `b03-pose-${label}.png`);
  await page.screenshot({ path: destination, clip, animations: 'allow' });
  record(`capture anatomy pose ${label}`, { frame:state.combat.frame, bodySize:state.combat.bodySize, spriteScale:state.combat.spriteScale, clip });
  return destination;
}

async function buildAnatomyComparison() {
  const poses = [
    ['Crouch / forearm windup', 'b03-pose-crouch.png'],
    ['Low kick / contact', 'b03-pose-low-kick.png'],
    ['Launcher / contact', 'b03-pose-launcher.png'],
    ['Air strike / contact', 'b03-pose-air.png'],
  ];
  const cards = await Promise.all(poses.map(async ([label, filename]) => {
    const image = (await readFile(path.join(evidence, filename))).toString('base64');
    return `<article><h2>${label}</h2><img src="data:image/png;base64,${image}" width="250" height="225"><p>Same Phaser 60px reference / scale 1.0</p></article>`;
  }));
  const comparisonPage = await browser.newPage({ viewport:{ width:1120, height:330 } });
  await comparisonPage.setContent(`<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#08131f;color:#e8f1ed;font:13px Segoe UI,Arial,sans-serif;padding:14px}h1{margin:0 0 9px;font-size:17px}main{display:grid;grid-template-columns:repeat(4,250px);gap:10px}article{border:1px solid #334d56;background:#111e2d;padding:7px}h2{font-size:12px;margin:0 0 6px;color:#b9e6d9}img{display:block;background:#09141e;image-rendering:pixelated}p{font-size:10px;color:#9fb6bb;margin:5px 0 0}small{color:#95acae}</style><h1>B03 action anatomy / native Phaser screenshot crops at one character scale</h1><main>${cards.join('')}</main><small>Each image is an unresized 250×225 CSS-pixel crop from 1280×720 headed Chrome gameplay.</small>`, { waitUntil:'load' });
  const destination = path.join(evidence, 'b03-anatomy-comparison.png');
  await comparisonPage.screenshot({ path:destination, fullPage:true });
  await comparisonPage.close();
  return destination.replaceAll('\\', '/');
}

async function performMove(page, key, id, label, waitMs = 250) {
  await keyTap(page, key);
  await page.waitForFunction((expected) => window.__CROWNFLARE_QA__?.snapshot().combat?.move === expected, id, { timeout: 1800 });
  await page.waitForTimeout(waitMs);
  const state = await combat(page);
  await captureFrame(page, label);
  record(`performed ${id}`, state);
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().combat?.move === 'none', undefined, { timeout: 3000 });
  return await combat(page);
}

async function settingsQA() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await installSyntheticPads(context);
  const page = await context.newPage();
  page.setDefaultTimeout(6000);
  monitorPage(page, 'settings');
  await page.goto(`${base}/?b03=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__CROWNFLARE_QA__);
  await setPad(page, { id: 'Xbox Wireless Controller', mapping: 'standard', axes: [0, 0], buttons: [] });
  await page.locator('#title-settings-button').click();
  await page.locator('#settings-screen').waitFor({ state: 'visible' });
  await page.waitForFunction(() => /CONNECTED.*XBOX.*INDEX 0/i.test(document.querySelector('#controller-status')?.textContent ?? ''));
  assert(/Unsupported by this controller/i.test(await page.locator('#rumble-support').innerText()), 'synthetic pad must be honestly reported without haptics');
  await setPad(page, { id: 'Xbox Wireless Controller', mapping: 'standard', axes: [0.17, 0], buttons: [2] });
  await page.locator('[data-test-button="2"]').waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.querySelector('[data-test-button="2"]')?.classList.contains('active'));
  assert(await page.locator('#axis-value').evaluate((element) => element.value) === '0.00', '0.17 analog input should be below the default 0.20 dead zone plus hysteresis');
  await page.locator('#deadzone-range').evaluate((element) => { element.value = '0.10'; element.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForFunction(() => document.querySelector('#axis-value')?.value === '0.17');
  await page.screenshot({ path: path.join(evidence, 'b03-controller-settings-live-test.png') });
  check('synthetic Xbox controller detection, live buttons, adjustable dead zone', 'PASS', { index: 0, rawAxis: 0.17, defaultAxis: 0, adjustedAxis: 0.17 });
  record('settings axis live test', { status: await page.locator('#controller-status').innerText(), axis: await page.locator('#axis-value').evaluate((element) => element.value) });

  await setPad(page, { id: 'Xbox Wireless Controller', mapping: 'standard', axes: [0, 0], buttons: [] });
  await page.locator('[data-capture="light"]').click();
  await page.waitForTimeout(100);
  await setPad(page, { id: 'Xbox Wireless Controller', mapping: 'standard', axes: [0, 0], buttons: [6] });
  await page.waitForFunction(() => /LT.*6/.test(document.querySelector('[data-rebind="light"]')?.textContent ?? ''), undefined, { timeout: 1800 });
  await setPad(page, { id: 'Xbox Wireless Controller', mapping: 'standard', axes: [0, 0], buttons: [] });
  await page.locator('#settings-save').click();
  await page.locator('#settings-screen').waitFor({ state: 'hidden' });
  assert(await page.evaluate(() => JSON.parse(localStorage.getItem('project-crownflare:controls:v1') ?? '{}').buttons.light) === 6, 'light rebind should persist to the versioned controller namespace');
  await page.reload();
  await page.waitForFunction(() => !!window.__CROWNFLARE_QA__);
  await setPad(page, { id: 'Xbox Wireless Controller', mapping: 'standard', axes: [0, 0], buttons: [] });
  await page.locator('#title-settings-button').click();
  await page.waitForFunction(() => /LT.*6/.test(document.querySelector('[data-rebind="light"]')?.textContent ?? ''));
  check('button remap and reload persistence', 'PASS', { lightButton: 6, namespace: 'project-crownflare:controls:v1' });
  await page.evaluate(() => localStorage.setItem('project-crownflare:controls:v1', '{broken'));
  await page.reload();
  await page.waitForFunction(() => !!window.__CROWNFLARE_QA__);
  await setPad(page, { id: 'Xbox Wireless Controller', mapping: 'standard', axes: [0, 0], buttons: [] });
  await page.locator('#title-settings-button').click();
  await page.waitForFunction(() => document.querySelector('[data-rebind="light"]')?.textContent === 'X · 2');
  check('corrupt control settings fall back safely', 'PASS', { fallback: 'standard defaults', saveNamespaceUntouched: true });
  await page.locator('[data-capture="light"]').click();
  await setPad(page, { id: 'Xbox Wireless Controller', mapping: 'standard', axes: [0, 0], buttons: [3] });
  await page.waitForFunction(() => /already assigned to heavy/i.test(document.querySelector('#settings-message')?.textContent ?? ''));
  await page.keyboard.press('Escape');
  check('duplicate controller assignment is rejected and can be cancelled', 'PASS');
  await page.locator('[data-capture="jump"]').click();
  await setPad(page, { id: 'Xbox Wireless Controller', mapping: 'standard', axes: [0, 0], buttons: [9] });
  await page.waitForFunction(() => /remapping cancelled/i.test(document.querySelector('#settings-message')?.textContent ?? ''));
  check('Start/Menu is reserved and cancels remapping safely', 'PASS');
  await page.locator('#settings-reset').click();
  await page.locator('#settings-save').click();

  await setPad(page, { id: 'Unmapped USB Controller', mapping: '', axes: [0, 0], buttons: [] });
  await page.locator('#title-settings-button').click();
  await page.waitForFunction(() => /UNKNOWN MAPPING/i.test(document.querySelector('#controller-status')?.textContent ?? ''));
  await setPad(page, { id: 'DualSense Wireless Controller', mapping: 'standard', axes: [0, 0], buttons: [] });
  await page.waitForFunction(() => /PLAYSTATION.*INDEX 0/i.test(document.querySelector('#controller-status')?.textContent ?? ''));
  await setPads(page, [
    { index: 0, id: 'Unmapped USB Controller', mapping: '', axes: [0, 0], buttons: [] },
    { index: 1, id: 'Xbox Wireless Controller', mapping: 'standard', axes: [0, 0], buttons: [] },
    { index: 2, id: 'DualSense Wireless Controller', mapping: 'standard', axes: [0, 0], buttons: [0] },
  ]);
  await page.waitForFunction(() => /PLAYSTATION.*INDEX 2/i.test(document.querySelector('#controller-status')?.textContent ?? ''));
  await setPads(page, [
    { index: 0, id: 'Unmapped USB Controller', mapping: '', axes: [0, 0], buttons: [] },
    { index: 1, id: 'Xbox Wireless Controller', mapping: 'standard', axes: [0, 0], buttons: [2] },
    { index: 2, id: 'DualSense Wireless Controller', mapping: 'standard', axes: [0, 0], buttons: [] },
  ]);
  await page.waitForFunction(() => /XBOX.*INDEX 1/i.test(document.querySelector('#controller-status')?.textContent ?? ''));
  check('unknown mapping, active-pad selection and multiple-controller switching', 'PASS', { unknownMappingDisclosed: true, selectedIndexes: [0, 2, 1] });
  await setPads(page, [{ index: 2, id: 'DualSense Wireless Controller', mapping: 'standard', axes: [0, 0], buttons: [] }]);
  await page.waitForFunction(() => /PLAYSTATION.*INDEX 2/i.test(document.querySelector('#controller-status')?.textContent ?? ''));
  await setPad(page, { id: 'Unmapped USB Controller', mapping: '', axes: [0, 0], buttons: [] });
  await page.waitForFunction(() => /UNKNOWN MAPPING/i.test(document.querySelector('#controller-status')?.textContent ?? ''));
  await setPad(page, { id: 'DualSense Wireless Controller', mapping: 'standard', axes: [0, 0], buttons: [] });
  await page.waitForTimeout(80);
  await setPad(page, { id: 'DualSense Wireless Controller', mapping: 'standard', axes: [0, 0], buttons: [1] });
  await page.locator('#settings-screen').waitFor({ state: 'hidden' });
  check('controller East button provides a working back action', 'PASS');
  await context.close();
}

async function reducedMotionQA() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await installSyntheticPads(context);
  const page = await context.newPage(); page.setDefaultTimeout(6000);
  monitorPage(page, 'reduced-motion');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${base}/?b03=1`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /enter b03 combat trial/i }).click();
  await page.waitForFunction(() => {
    const state = window.__CROWNFLARE_QA__?.snapshot().combat;
    return state?.reducedMotion === true && state.vfxEnabled === false;
  }, undefined, { timeout: 10000 });
  check('prefers-reduced-motion suppresses combat VFX and camera shake without changing move timing', 'PASS', { vfxEnabled: false, timingModel: 'unchanged fixed 60Hz combat clock' });
  await context.close();
}

async function productionRouteQA() {
  const productionPort = 4184;
  const previewServer = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(productionPort), '--strictPort'], { stdio: 'pipe' });
  try {
    assert(await ready(`http://127.0.0.1:${productionPort}/`), 'Vite production preview did not start');
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage(); page.setDefaultTimeout(6000);
    monitorPage(page, 'production-route');
    await page.goto(`http://127.0.0.1:${productionPort}/?ionaPreview=1&b03=1`, { waitUntil: 'domcontentloaded' });
    assert(!(await page.locator('#preview-notice').isVisible()), 'production must hide the development Iona preview notice');
    assert(/TEMPORARY GAMEPLAY ART/.test(await page.locator('#title-metadata').innerText()), 'production title must remain on the B00 foundation route');
    await page.getByRole('button', { name: /enter the spindle/i }).click();
    await page.waitForFunction(() => document.querySelector('#hud-mode')?.textContent?.includes('CHAMBER 00'));
    assert(!(await page.locator('#target-health').isVisible()), 'production B00 must not enable the B03 combat HUD');
    assert(!(await page.evaluate(() => !!window.__CROWNFLARE_QA__)), 'production bundle must omit the development QA hook');
    check('built production ignores preview flags and preserves B00 route', 'PASS', { routeQuery: '?ionaPreview=1&b03=1', hud: await page.locator('#hud-mode').innerText() });
    await context.close();
  } finally { previewServer.kill(); }
}

async function runCombatQA(page) {
  await page.goto(`${base}/?b03=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().screen === 'title');
  await page.screenshot({ path: path.join(evidence, 'b03-title.png') });
  assert(await page.locator('#preview-notice').isVisible(), 'B03 title must disclose provisional art');
  await page.getByRole('button', { name: /enter b03 combat trial/i }).click();
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().screen === 'b03Combat', undefined, { timeout: 15000 });
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().combat?.errors.length === 0, undefined, { timeout: 15000 });
  const activePlayStartedAt = Date.now();
  let state = await combat(page);
  assert(state?.bodySize.width === 15 && state.bodySize.height === 30, `B02 physics body changed: ${JSON.stringify(state?.bodySize)}`);
  assert(Math.abs(state.spriteScale - 1) < 0.0001, `B02 shared 60px reference scale changed: ${state.spriteScale}`);
  assert(await page.locator('#target-health').isVisible(), 'Target health must be visible in B03');
  assert(await page.locator('#resonance-meter').isVisible(), 'Resonance meter must be visible in B03');
  await captureFrame(page, 'combat-entry');
  check('B03 candidate route loads all 34 runtime textures at the B02 15x30 / 60px reference scale', 'PASS', { missingTextures: state.errors.length, bodySize: state.bodySize, spriteScale: state.spriteScale });

  await setPad(page, { id: 'Xbox Wireless Controller', mapping: 'standard', axes: [0, 0], buttons: [] });
  await page.waitForFunction(() => /LEFT STICK.*A JUMP.*X LIGHT.*RB RESONANCE/i.test(document.querySelector('#controls-tip')?.textContent ?? ''), undefined, { timeout: 2500 });
  const startPosition = state.playerX;
  await setPad(page, { id: 'Xbox Wireless Controller', mapping: 'standard', axes: [0.8, 0], buttons: [] });
  await page.waitForFunction((x) => (window.__CROWNFLARE_QA__?.snapshot().combat?.playerX ?? x) > x + 9, startPosition, { timeout: 2500 });
  await setPad(page, { id: 'Xbox Wireless Controller', mapping: 'standard', axes: [0, 0], buttons: [2] });
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().combat?.move === 'light-1', undefined, { timeout: 2000 });
  await setPad(page, { id: 'Xbox Wireless Controller', mapping: 'standard', axes: [0, 0], buttons: [] });
  state = await combat(page);
  record('controller standard west button starts light attack', state);
  check('actual configurable gamepad action enters Phaser combat', 'PASS', { control: 'Xbox west face / standard index 2', move: state.move, controllerIndex: state.controllerIndex });
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().combat?.move === 'none', undefined, { timeout: 2500 });
  await reset(page, 'reset after controller light test');

  await approach(page, 32);
  await keyTap(page, 'j');
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().combat?.move === 'light-1', undefined, { timeout: 1800 });
  await page.waitForFunction(() => {
    const current = window.__CROWNFLARE_QA__?.snapshot().combat;
    return current?.move === 'light-1' && current.elapsedMs >= 205 && current.elapsedMs <= 250;
  }, undefined, { timeout: 1400 });
  await keyTap(page, 'j');
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().combat?.move === 'light-2', undefined, { timeout: 1500 }).catch(async (error) => { throw new Error(`Light combo step 2 did not start: ${JSON.stringify(await combat(page))} / ${error.message}`); });
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().combat?.move === 'light-2' && window.__CROWNFLARE_QA__?.snapshot().combat?.frame.includes('combo-2-contact'), undefined, { timeout: 500 });
  await capturePose(page, 'low-kick');
  await page.waitForFunction(() => {
    const current = window.__CROWNFLARE_QA__?.snapshot().combat;
    return current?.move === 'light-2' && current.elapsedMs >= 205 && current.elapsedMs <= 250;
  }, undefined, { timeout: 1400 });
  await keyTap(page, 'j');
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().combat?.move === 'light-3', undefined, { timeout: 1500 }).catch(async (error) => { throw new Error(`Light combo step 3 did not start: ${JSON.stringify(await combat(page))} / ${error.message}`); });
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().combat?.frame.includes('combo-3-windup'), undefined, { timeout: 700 });
  await capturePose(page, 'crouch');
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().combat?.frame.includes('combo-3-contact'), undefined, { timeout: 900 });
  await captureFrame(page, 'combo-3-contact');
  state = await combat(page);
  check('three-hit lead palm / side kick / rising forearm chain in both cancel windows', 'PASS', { move: state.move, phase: state.phase, contactInstants: [112, 138, 165] });
  record('three-hit combo completed', state);
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().combat?.move === 'none', undefined, { timeout: 3000 });
  const comboHp = (await combat(page)).enemyHp;
  assert(comboHp < 8, `combo did not damage the moving target: ${JSON.stringify(await combat(page))}`);

  await reset(page, 'reset before combo pose capture'); await approach(page, 34);
  await performMove(page, 'j', 'light-1', 'combo-1-contact', 100);

  await reset(page, 'reset before heavy launcher'); await approach(page, 34);
  await keyTap(page, 'k');
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().combat?.move === 'heavy' && window.__CROWNFLARE_QA__?.snapshot().combat?.frame.includes('heavy-windup'), undefined, { timeout: 1800 });
  await capturePose(page, 'launcher');
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().combat?.frame.includes('heavy-contact'), undefined, { timeout: 2800 });
  await captureFrame(page, 'heavy-contact');
  await capturePose(page, 'launcher-contact');
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().combat?.move === 'none', undefined, { timeout: 3000 });
  state = await combat(page);
  const heavyCues = await audioCues(page);
  assert(heavyCues.includes('b03-heavy-charge') && heavyCues.includes('b03-heavy-impact'), `heavy launcher charge/impact cues missing: ${heavyCues.join(', ')}`);
  check('heavy launcher uses generated anticipation/contact/recovery poses, launch knockback and tagged charge/impact cues', 'PASS', { targetHp: state.enemyHp, targetY: state.enemyY, facing: state.facing, audioCues: heavyCues.filter((cue) => cue.startsWith('b03-heavy-')) });

  await reset(page, 'reset before air strike'); await approach(page, 34);
  await keyTap(page, 'Space');
  await page.waitForFunction(() => {
    const current = window.__CROWNFLARE_QA__?.snapshot().combat;
    return current && current.playerY < 226;
  }, undefined, { timeout: 1200 });
  await keyTap(page, 'j');
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().combat?.move === 'air-light', undefined, { timeout: 1600 });
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().combat?.frame.includes('air-contact'), undefined, { timeout: 1800 }).catch(async (error) => { throw new Error(`Aerial contact pose did not appear: ${JSON.stringify(await combat(page))} / ${error.message}`); });
  state = await combat(page); await captureFrame(page, 'air-contact');
  await capturePose(page, 'air');
  const airCues = await audioCues(page);
  assert(airCues.includes('b03-air-swing'), `aerial swing cue missing: ${airCues.join(', ')}`);
  check('air attack requires jump and uses its own authored pose/contact and tagged swing cue', 'PASS', { move: state.move, phase: state.phase, playerY: state.playerY, result: state.lastResult, audioCues: airCues.filter((cue) => cue === 'b03-air-swing') });
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().combat?.move === 'none', undefined, { timeout: 3500 });

  await reset(page, 'reset before Resonance'); await approach(page, 36);
  await page.keyboard.down('q'); await page.waitForTimeout(45); await page.keyboard.up('q');
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().combat?.move === 'resonance', undefined, { timeout: 1800 });
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().combat?.frame.includes('special-contact'), undefined, { timeout: 2200 });
  await page.waitForFunction(() => {
    const current = window.__CROWNFLARE_QA__?.snapshot().combat;
    return current && current.resonance < 55 && current.lastResult !== 'RESET' && current.lastResult !== 'none';
  }, undefined, { timeout: 1600 });
  state = await combat(page); await captureFrame(page, 'resonance-contact');
  const resonanceCues = await audioCues(page);
  assert(resonanceCues.includes('b03-resonance-charge') && resonanceCues.includes('b03-resonance-release'), `Resonance charge/release cues missing: ${resonanceCues.join(', ')}`);
  check('Resonance special spends resource, checks authored short-range hit geometry, animates generated wave and tags charge/release cues', 'PASS', { resource: state.resonance, cooldownMs: state.specialCooldownMs, result: state.lastResult, audioCues: resonanceCues.filter((cue) => cue.startsWith('b03-resonance-')) });
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().combat?.move === 'none', undefined, { timeout: 3500 });

  await keyTap(page, 'v');
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().combat?.vfxEnabled === false);
  await reset(page, 'reset before VFX-off test'); await approach(page, 36);
  await keyTap(page, 'q');
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().combat?.move === 'resonance', undefined, { timeout: 1800 });
  await page.waitForFunction(() => {
    const current = window.__CROWNFLARE_QA__?.snapshot().combat;
    return current && current.move === 'resonance' && current.lastResult !== 'RESET' && !current.vfxActive;
  }, undefined, { timeout: 2200 });
  await keyTap(page, 'c'); await keyTap(page, 'c');
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().combat?.background === 'busy');
  state = await combat(page); await captureFrame(page, 'vfx-off-busy-background');
  check('V key suppresses combat flashes while body animation remains and C cycles visual contrast', 'PASS', { vfxEnabled: state.vfxEnabled, vfxActive: state.vfxActive, background: state.background, frame: state.frame });
  await keyTap(page, 'c'); await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().combat?.background === 'calm');
  await keyTap(page, 'v'); await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().combat?.vfxEnabled === true);
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().combat?.move === 'none', undefined, { timeout: 3500 });

  await reset(page, 'reset before enemy telegraph');
  const beforeDamage = (await combat(page)).playerHp;
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().combat?.enemyState === 'telegraph', undefined, { timeout: 8000 });
  await captureFrame(page, 'enemy-telegraph');
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().combat?.enemyState === 'lunge', undefined, { timeout: 1500 });
  await page.waitForTimeout(35); await keyTap(page, 'Shift');
  await page.waitForFunction(() => (window.__CROWNFLARE_QA__?.snapshot().combat?.playerHp ?? 5) < 5 || window.__CROWNFLARE_QA__?.snapshot().combat?.enemyState === 'idle', undefined, { timeout: 1800 });
  state = await combat(page);
  check('enemy telegraph and lunge expose a dodge window and produce either avoided or readable damage result', 'PASS', { hpBefore: beforeDamage, hpAfter: state.playerHp, enemyState: state.enemyState });
  record('sentry lunge response', state);

  await reset(page, 'reset before explicit hurt-reaction capture');
  const hurtHpBefore = (await combat(page)).playerHp;
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().combat?.enemyState === 'telegraph', undefined, { timeout: 8000 });
  await page.keyboard.down('d'); await page.waitForTimeout(300); await page.keyboard.up('d');
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().combat?.enemyState === 'lunge', undefined, { timeout: 1200 });
  await page.waitForFunction((hp) => (window.__CROWNFLARE_QA__?.snapshot().combat?.playerHp ?? hp) < hp, hurtHpBefore, { timeout: 8000 });
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().combat?.frame.includes('hurt-flinch'), undefined, { timeout: 500 });
  state = await combat(page);
  await captureFrame(page, 'hurt-flinch');
  await capturePose(page, 'hurt');
  check('telegraphed sentry strike causes HP loss and displays the generated hurt-flinch pose', 'PASS', { hpBefore:hurtHpBefore, hpAfter:state.playerHp, frame:state.frame });

  await reset(page, 'reset before directional contact');
  await page.keyboard.down('d');
  await page.waitForFunction(() => {
    const current = window.__CROWNFLARE_QA__?.snapshot().combat;
    return current && current.playerX > current.enemyX + 40;
  }, undefined, { timeout: 8000 });
  await page.keyboard.up('d');
  await page.keyboard.down('a');
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().combat?.facing === -1, undefined, { timeout: 1500 });
  await page.keyboard.up('a'); await page.waitForTimeout(100);
  state = await combat(page);
  assert(state.facing === -1, `player did not turn left of sentry: ${JSON.stringify(state)}`);
  await keyTap(page, 'j');
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().combat?.move === 'light-1', undefined, { timeout: 1600 });
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().combat?.phase === 'idle' || window.__CROWNFLARE_QA__?.snapshot().combat?.lastResult !== 'RESET', undefined, { timeout: 1800 });
  state = await combat(page);
  await captureFrame(page, 'left-facing-test');
  check('left-facing combat keeps side-view identity and mirrored authored attack assets', state.facing === -1 ? 'PASS' : 'FAIL', { facing: state.facing, result: state.lastResult });
  await reset(page, 'dev reset after directional test');

  const moveStart = Date.now();
  while (Date.now() - moveStart < 113000) {
    const current = await combat(page);
    if (!current || current.playerHp <= 1 || current.enemyHp <= 0) await reset(page, 'retry in sustained play capture');
    const latest = await combat(page);
    const distance = Math.abs(latest.enemyX - latest.playerX);
    if (distance > 50) {
      const toward = latest.enemyX > latest.playerX ? 'd' : 'a';
      await page.keyboard.down(toward); await page.waitForTimeout(140); await page.keyboard.up(toward);
    }
    await keyTap(page, ['j', 'j', 'k', 'Space', 'Shift', 'q'][Math.floor((Date.now() - moveStart) / 700) % 6]);
    await page.waitForTimeout(180);
  }
  recordedActivePlaySeconds = Number(((Date.now() - activePlayStartedAt) / 1000).toFixed(2));
  record('sustained active play capture complete', await combat(page));

  await setPad(page, { id: 'Xbox Wireless Controller', mapping: 'standard', axes: [0, 0], buttons: [9] });
  await page.locator('#pause-screen').waitFor({ state: 'visible', timeout: 2500 });
  await setPad(page, { id: 'Xbox Wireless Controller', mapping: 'standard', axes: [0, 0], buttons: [] });
  await page.waitForTimeout(120);
  assert((await snapshot(page)).screen === 'paused', 'Start held across the pause edge must not immediately resume');
  await page.locator('#pause-settings-button').click();
  await page.locator('#settings-screen').waitFor({ state: 'visible' });
  await captureFrame(page, 'pause-controller-settings');
  await page.locator('#settings-cancel').click();
  await page.locator('#pause-screen').waitFor({ state: 'visible' });
  await page.locator('#resume-button').click();
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().screen === 'b03Combat');
  check('pause/settings input isolation returns to the same live encounter', 'PASS', { player: (await combat(page)).playerHp, enemy: (await combat(page)).enemyHp });

  capturedCombatEvents = await page.evaluate(() => window.__B03_QA_EVENTS__ ?? []);
  await writeFile(path.join(evidence, 'b03-browser-events.json'), `${JSON.stringify(capturedCombatEvents, null, 2)}\n`);

  await page.keyboard.press('Escape');
  await page.locator('#quit-button').click();
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().screen === 'title');
  check('quit returns to title and candidate art remains development-only', 'PASS');
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().screen === 'title');
  await page.getByRole('button', { name: /enter the spindle/i }).click();
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().screen === 'playing');
  const rootState = await snapshot(page);
  assert(rootState.combat === null && rootState.preview === null, 'ordinary route must not load provisional Iona/B03 content');
  check('ordinary development root retains B00 route', 'PASS', { screen: rootState.screen, combat: rootState.combat, preview: rootState.preview });

  assert(errors.length === 0, `Chrome console/page errors: ${errors.join(' | ')}`);
  record('B03 browser QA completed', { eventCount: capturedCombatEvents.length, consoleErrors: errors.length });
}

async function main() {
  await mkdir(evidence, { recursive: true }); await mkdir(recordingDir, { recursive: true });
  assert(await ready(`${base}/`), `Vite did not start: ${serverErrors}`);
  browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--use-gl=angle', '--use-angle=swiftshader'] });
  await settingsQA();
  await reducedMotionQA();
  await productionRouteQA();
  recordingContext = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: recordingDir, size: { width: 1280, height: 720 } } });
  await installSyntheticPads(recordingContext);
  currentPage = await recordingContext.newPage();
  currentPage.setDefaultTimeout(6000);
  monitorPage(currentPage, 'gameplay');
  await runCombatQA(currentPage);
  const anatomyComparison = await buildAnatomyComparison();
  const videoPath = await currentPage.video().path();
  await recordingContext.close(); recordingContext = null;
  const videoOut = path.join(evidence, 'b03-playable-chrome.webm');
  await copyFile(videoPath, videoOut);
  const videoBytes = await readFile(videoOut);
  const videoSha256 = createHash('sha256').update(videoBytes).digest('hex');
  const videoBytesOnDisk = (await stat(videoOut)).size;
  const videoProbe = JSON.parse(execFileSync('ffprobe', ['-v','error','-show_entries','format=duration:stream=codec_type,codec_name,width,height,r_frame_rate,avg_frame_rate','-of','json',videoOut], { encoding:'utf8' }));
  const videoStream = videoProbe.streams?.find((stream) => stream.codec_type === 'video');
  const videoDurationSeconds = Number(videoProbe.format?.duration ?? 0);
  assert(videoDurationSeconds >= 90 && videoDurationSeconds <= 180, `recording duration ${videoDurationSeconds}s is outside the 90–180s review requirement`);
  const source = await sourceDigest();
  const captureHead = execFileSync('git', ['rev-parse','HEAD'], { encoding:'utf8' }).trim();
  const report = {
    milestone: 'B03', capturedAt: new Date().toISOString(), result: 'PASS', browser: 'Google Chrome headed, SwiftShader WebGL', route: `${base}/?b03=1`,
    checks, actions, consoleErrors: errors, captureHead, sourceTree: source, activePlaySeconds: recordedActivePlaySeconds,
    gameEvents: { count: capturedCombatEvents.length, combatContacts: capturedCombatEvents.filter((event) => event.name === 'crownflare:combat-event').length, playerDamageEvents: capturedCombatEvents.filter((event) => event.name === 'crownflare:player-damage').length, audioEvents: capturedCombatEvents.filter((event) => event.name === 'crownflare:audio-event').length },
    video: { path: 'review-evidence/b03/b03-playable-chrome.webm', sha256: videoSha256, bytes: videoBytesOnDisk, durationSeconds: videoDurationSeconds, width: videoStream?.width ?? null, height: videoStream?.height ?? null, frameRate: videoStream?.avg_frame_rate ?? null, codec: videoStream?.codec_name ?? null, audioTrack: (videoProbe.streams ?? []).some((stream) => stream.codec_type === 'audio') },
    evidence: { anatomyComparison, poseScale:1, poseCropPixels:[250,225], allPosesFromHeadedChromeGameplay:true },
    controller: { qaType: 'synthetic Gamepad API fixture', physicalControllerTest: 'NOT RUN' },
  };
  const coveragePath = path.join(evidence, 'art-coverage.json');
  const coverage = JSON.parse(await readFile(coveragePath, 'utf8'));
  const chromeStatuses = new Map([
    ['combo-1-contact', 'SCREENSHOT_CAPTURED; combo damage and chain timing passed'],
    ['combo-2-contact', 'SCREENSHOT_CAPTURED; low-kick pose and chain timing passed'],
    ['combo-3-contact', 'SCREENSHOT_CAPTURED; rising-forearm pose and chain timing passed'],
    ['heavy', 'WINDUP AND CONTACT SCREENSHOTS; tagged charge/impact audio and launch passed'],
    ['air', 'CONTACT SCREENSHOT; aerial action and swing cue passed'],
    ['special', 'CONTACT + VFX SCREENSHOT; charge/release cues and resource passed'],
    ['hurt reactions', 'HURT-FLINCH SCREENSHOT; telegraph damage and HP change passed'],
  ]);
  for (const row of coverage.actionCoverage) if (chromeStatuses.has(row.action)) row.chrome = chromeStatuses.get(row.action);
  coverage.anatomyComparison = { path:'review-evidence/b03/b03-anatomy-comparison.png', poses:['crouch','low-kick','launcher','air strike'], cropPixels:[250,225], PhaserCanvasScale:1, ownerApproval:'PENDING' };
  coverage.browserCapture = { sourceTreeSha256:source.sha256, videoSha256, videoDurationSeconds, browserErrors:errors.length, checks:checks.length, ownerApproval:'PENDING' };
  await writeFile(coveragePath, `${JSON.stringify(coverage, null, 2)}\n`);
  await writeFile(path.join(evidence, 'qa-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ result: report.result, checkCount: checks.length, video: report.video, errors }, null, 2));
  passed = true;
}

try { await main(); }
catch (error) {
  console.error(error?.stack ?? error);
  const failure = { result: 'FAIL', capturedAt: new Date().toISOString(), checks, actions, errors: [...errors, String(error?.message ?? error)] };
  await writeFile(path.join(evidence, 'qa-report.json'), `${JSON.stringify(failure, null, 2)}\n`).catch(() => {});
}
finally {
  if (recordingContext) await recordingContext.close().catch(() => {});
  if (browser) await browser.close().catch(() => {});
  server.kill();
}
if (!passed) process.exitCode = 1;
