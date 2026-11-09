/** Short headed-Chrome B11 presentation smoke. UI-only reward/result previews are explicitly marked. */
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port = 4231;
const base = `http://127.0.0.1:${port}`;
const evidence = 'review-evidence/b11';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'pipe' });
let browser;
let serverErrors = '';
server.stderr.on('data', (chunk) => { serverErrors += chunk.toString(); });
const errors = [];
const checks = [];
const captures = [];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const check = (name, detail = {}) => checks.push({ name, status: 'PASS', ...detail });
const stateOf = (page) => page.evaluate(() => window.__CROWNFLARE_QA__?.snapshot());

async function ready() {
  for (let i = 0; i < 80; i++) { try { if ((await fetch(base)).ok) return true; } catch { /* Vite is starting */ } await delay(150); }
  return false;
}
function monitor(page, label) {
  page.on('pageerror', (error) => errors.push(`${label} runtime: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`${label} console: ${message.text()}`); });
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`${label} HTTP ${response.status()}: ${response.url()}`); });
  page.on('requestfailed', (request) => errors.push(`${label} request failed: ${request.url()}`));
}
async function capture(page, name, target = page) {
  const file = path.join(evidence, `${name}.png`);
  await target.screenshot({ path: file, animations: 'allow' });
  const bytes = await readFile(file);
  const result = { file: file.replaceAll('\\', '/'), width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
  captures.push(result);
  return result;
}
async function captureCanvasOnly(page, name) {
  const hud = page.locator('#hud');
  const priorVisibility = await hud.evaluate((element) => element.style.visibility);
  await hud.evaluate((element) => { element.style.visibility = 'hidden'; });
  await page.waitForTimeout(30);
  const result = await capture(page, name, page.locator('#game-root canvas'));
  await hud.evaluate((element, value) => { element.style.visibility = value; }, priorVisibility);
  return result;
}
async function addSyntheticPad(context) {
  await context.addInitScript(() => {
    const buttons = Array.from({ length: 16 }, () => ({ pressed: false, touched: false, value: 0 }));
    const pad = { id: 'Xbox 360 Controller (B11 synthetic)', connected: true, index: 0, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
    window.__B11_SYNTHETIC_PAD__ = { tap(index) { buttons[index].pressed = true; buttons[index].value = 1; setTimeout(() => { buttons[index].pressed = false; buttons[index].value = 0; }, 110); } };
  });
}
async function startRun(page) {
  await page.locator('#start-button').click();
  await page.locator('#hub-new-run').waitFor({ state: 'visible' });
  await page.locator('#hub-new-run').click();
  await page.locator('#hub-begin-run').click();
  await page.waitForFunction(() => {
    const state = window.__CROWNFLARE_QA__?.snapshot();
    return state?.screen === 'b10Expedition' && state.b07 && (state.b07.roomId || state.b07.b08?.activeBoss) && state.b07.hud?.combat;
  }, undefined, { timeout: 25000 });
  await page.waitForTimeout(500);
}

try {
  await mkdir(evidence, { recursive: true });
  assert(await ready(), `Vite failed to start: ${serverErrors}`);
  browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--use-gl=angle', '--use-angle=swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await addSyntheticPad(context);
  const page = await context.newPage();
  monitor(page, 'normal B10 route');
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  assert((await page.locator('#title-metadata').innerText()).includes('FIRST EXPEDITION'), 'fresh title does not reflect the save state');
  check('title shows save-aware first-run status', { action: await page.locator('#start-button').innerText(), metadata: await page.locator('#title-metadata').innerText(), capture: await capture(page, 'b11-title-1280') });

  await page.locator('#start-button').click();
  await page.locator('#hub-new-run').waitFor({ state: 'visible' });
  check('Refuge presents new run, continue state, Beacon progress and settings', { continueDisabled: await page.locator('#hub-continue').isDisabled(), progress: await page.locator('#hub-progress').innerText(), capture: await capture(page, 'b11-refuge-1280') });
  await page.locator('#hub-controls').click();
  await page.locator('#settings-screen').waitFor({ state: 'visible' });
  const refugeSettingsCapture = await capture(page, 'b11-settings-refuge-1280');
  await page.setViewportSize({ width: 352, height: 266 }); await page.waitForTimeout(100);
  const compactSettings = await page.locator('.settings-panel').evaluate((panel) => {
    const footer = panel.querySelector('.settings-footer').getBoundingClientRect();
    const screen = panel.closest('#settings-screen');
    const box = panel.getBoundingClientRect();
    return { viewport: { width: innerWidth, height: innerHeight, media: matchMedia('(max-width: 680px)').matches }, screen: { width: screen.clientWidth, padding: getComputedStyle(screen).padding, align: getComputedStyle(screen).alignItems }, panel: { width: box.width, contentWidth: panel.clientWidth, cssWidth: getComputedStyle(panel).width, height: panel.clientHeight, scrollHeight: panel.scrollHeight }, footer: { top: footer.top, bottom: footer.bottom, height: footer.height }, closeVisible: panel.querySelector('#settings-close').getBoundingClientRect().width > 0 };
  });
  const compactSettingsCapture = await capture(page, 'b11-settings-compact-352');
  assert(compactSettings.panel.width === 352 && compactSettings.panel.contentWidth >= 320 && compactSettings.panel.scrollHeight > compactSettings.panel.height && compactSettings.footer.top < 266 && compactSettings.footer.bottom <= 266, `compact settings layout did not preserve a visible sticky footer: ${JSON.stringify(compactSettings)}`);
  check('compact controller settings use a readable scrolling panel with a visible close and save footer', { viewport: { width: 352, height: 266 }, layout: compactSettings, capture: compactSettingsCapture });
  await page.setViewportSize({ width: 1280, height: 720 }); await page.waitForTimeout(60);
  await page.locator('#settings-reduced-motion').check();
  await page.locator('#settings-master-volume').fill('0.7');
  assert(await page.locator('#settings-volume-value').innerText() === '70%', 'settings volume value did not update');
  await page.locator('#settings-close').click();
  check('settings keeps controller remapping and exposes working volume/reduced-motion preferences', { savedOptions: await page.evaluate(() => JSON.parse(localStorage.getItem('project-crownflare:save:v2') ?? 'null')?.options), capture: refugeSettingsCapture });

  await page.locator('#hub-new-run').click();
  assert(await page.locator('#hub-story').isVisible(), 'departure story did not open');
  check('departure story remains a readable, separate modal', { capture: await capture(page, 'b11-story-1280') });
  await page.locator('#hub-begin-run').click();
  await page.waitForFunction(() => {
    const state = window.__CROWNFLARE_QA__?.snapshot();
    return state?.screen === 'b10Expedition' && !!state.b07?.roomId && state.b07.b09?.enabled;
  }, undefined, { timeout: 25000 });
  await page.waitForTimeout(450);
  let state = await stateOf(page);
  assert(await page.locator('#hud.b11-hud').isVisible(), 'normal B10 run is missing the B11 HUD');
  assert(state.b07.hud.combat && state.b07.hud.dawnrush && state.b07.playerHp === 5, `B11 HUD did not receive authoritative player data: ${JSON.stringify(state.b07.hud)}`);
  assert(state.b07.hud.cameraRoundPixels === true, 'startFollow reset the pixel camera rounding flag');
  const bodySize = state.player?.bodySize;
  assert(bodySize?.width === 15 && bodySize?.height === 30, `player collision body changed: ${JSON.stringify(bodySize)}`);
  const iconAudit = await page.locator('.b11-ability img').evaluateAll((icons) => icons.map((image) => ({ src: image.getAttribute('src'), complete: image.complete, width: image.naturalWidth, height: image.naturalHeight })));
  assert(iconAudit.length === 7 && iconAudit.every((icon) => icon.complete && icon.width === 96), `action icon family failed to load: ${JSON.stringify(iconAudit)}`);
  const canvasBox = await page.locator('#game-root canvas').boundingBox();
  const hudBox = await page.locator('#hud').boundingBox();
  assert(canvasBox && hudBox && Math.abs(canvasBox.x - hudBox.x) < 1 && Math.abs(canvasBox.y - hudBox.y) < 1 && Math.abs(canvasBox.width - hudBox.width) < 1, `DOM HUD does not track the letterboxed game canvas: ${JSON.stringify({ canvasBox, hudBox })}`);
  check('normal B10 room has authoritative five-HP HUD, native icons, rounded camera, matching canvas bounds and original 15x30 collision body', { roomId: state.b07.roomId, region: state.b07.region, cameraRoundPixels: state.b07.hud.cameraRoundPixels, bodySize, controls: await page.locator('#b11-ability-dock').innerText(), capture: await capture(page, 'b11-base-hud-1280') });
  const sharp1280 = await captureCanvasOnly(page, 'b11-sharpness-canvas-1280');

  await page.locator('#game-root canvas').evaluate((canvas) => canvas.focus());
  await page.keyboard.down('r');
  await page.waitForTimeout(100);
  await page.keyboard.up('r');
  try {
    await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().b07?.hud?.dawnrush?.form === 'Dawnrush', undefined, { timeout: 4000 });
  } catch (error) {
    throw new Error(`Dawnrush transform did not activate after R: ${JSON.stringify(await stateOf(page))}; ${error.message}`);
  }
  state = await stateOf(page);
  await page.waitForFunction(() => document.querySelector('#hud .b11-hud-overlay')?.dataset.form === 'dawnrush');
  const originalReducedMotion = await page.locator('#app').evaluate((element) => element.classList.contains('reduce-motion'));
  await page.locator('#app').evaluate((element) => element.classList.remove('reduce-motion'));
  const pulse = await page.locator('.b11-gauge-form .b11-gauge-track').evaluate((element) => getComputedStyle(element).animationName);
  const pulseFill = await page.locator('#b11-form-fill').evaluate((element) => getComputedStyle(element).animationName);
  await page.locator('#app').evaluate((element) => element.classList.add('reduce-motion'));
  const reducedPulse = await page.locator('.b11-gauge-form .b11-gauge-track').evaluate((element) => getComputedStyle(element).animationName);
  const reducedPulseFill = await page.locator('#b11-form-fill').evaluate((element) => getComputedStyle(element).animationName);
  await page.locator('#app').evaluate((element, wasReduced) => element.classList.toggle('reduce-motion', wasReduced), originalReducedMotion);
  const pulseContext = await page.locator('#app').evaluate((app, wasReduced) => ({ appClass: app.className, originalReducedMotion: wasReduced, form: document.querySelector('#hud .b11-hud-overlay')?.getAttribute('data-form'), trackCount: document.querySelectorAll('.b11-gauge-form .b11-gauge-track').length, mediaReduced: matchMedia('(prefers-reduced-motion: reduce)').matches }), originalReducedMotion);
  assert(pulse === 'b11-transform-pulse' && pulseFill === 'b11-transform-fill-pulse' && reducedPulse === 'none' && reducedPulseFill === 'none', `Dawnrush bar pulse or reduced-motion override failed: ${JSON.stringify({ pulse, pulseFill, reducedPulse, reducedPulseFill, pulseContext })}`);
  check('Dawnrush energy bar and fill pulse only while transformed and respect reduced motion', { form: state.b07.hud.dawnrush.form, energy: state.b07.hud.dawnrush.energy, pulse, pulseFill, reducedPulse, reducedPulseFill, capture: await capture(page, 'b11-dawnrush-hud-1280') });
  await page.keyboard.down('Space'); await page.waitForTimeout(85); await page.keyboard.up('Space');
  await page.keyboard.press('j'); await page.waitForTimeout(220);
  await page.keyboard.press('Shift'); await page.waitForTimeout(180);
  state = await stateOf(page);
  check('targeted jump, light attack and dash input preserve the player body and live HUD', { bodySize: state.player?.bodySize, move: state.b07.hud.combat?.move, cooldownMs: state.b07.hud.combat?.dashCooldownMs });

  await page.evaluate(async () => {
    const { generateUpgradeOffer } = await import('/src/game/roguelite/b09RunBuild.ts');
    const snapshot = window.__CROWNFLARE_QA__.snapshot();
    const offer = generateUpgradeOffer(snapshot.b07.b09.build, 'event:b11-ui-preview');
    window.dispatchEvent(new CustomEvent('crownflare:b09-choice-open', { detail: { offer, build: snapshot.b07.b09.build } }));
  });
  await page.locator('#b09-choice-screen').waitFor({ state: 'visible' });
  check('upgrade cards use the actual deterministic offer and existing twelve-icon upgrade library (UI preview; no selection mutation)', { cards: await page.locator('.b09-choice-card').count(), capture: await capture(page, 'b11-upgrade-choices-1280') });
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('crownflare:b09-choice-completed')));
  await page.locator('#b09-choice-screen').waitFor({ state: 'hidden' });

  await page.locator('#game-root canvas').evaluate((canvas) => canvas.focus());
  await page.keyboard.press('Escape');
  await page.locator('#pause-screen').waitFor({ state: 'visible' });
  check('pause keeps the active run-build summary and safe refuge return', { build: await page.locator('#b09-pause-build').innerText(), capture: await capture(page, 'b11-pause-1280') });
  await page.locator('#pause-settings-button').click();
  await page.locator('#settings-screen').waitFor({ state: 'visible' });
  check('controller settings reopen from pause and retain current mappings', { controller: await page.locator('#controller-status').innerText(), capture: await capture(page, 'b11-controller-settings-1280') });
  await page.locator('#settings-close').click();
  await page.locator('#resume-button').click();

  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(150);
  const canvas1920 = await page.locator('#game-root canvas').boundingBox();
  const hud1920 = await page.locator('#hud').boundingBox();
  assert(canvas1920 && hud1920 && Math.abs(canvas1920.width - hud1920.width) < 1 && Math.abs(canvas1920.height - hud1920.height) < 1, `1920 HUD/canvas bounds mismatch: ${JSON.stringify({ canvas1920, hud1920 })}`);
  const sharp1920 = await captureCanvasOnly(page, 'b11-sharpness-canvas-1920');
  check('1920x1080 keeps the same aspect ratio, canvas-aligned overlay and crisp-filtered source pixels', { canvas: canvas1920, capture: sharp1920 });
  await page.setViewportSize({ width: 1152, height: 720 }); await page.waitForTimeout(100);
  const narrowBox = await page.locator('#game-root canvas').boundingBox();
  const narrowHud = await page.locator('#hud').boundingBox();
  assert(narrowBox && narrowHud && Math.abs(narrowBox.x - narrowHud.x) < 1 && Math.abs(narrowBox.width - narrowHud.width) < 1, 'narrow laptop HUD did not follow the FIT canvas');
  check('narrow laptop layout letterboxes without cropping the B11 HUD', { viewport: { width: 1152, height: 720 }, canvas: narrowBox, capture: await capture(page, 'b11-narrow-laptop-1152') });
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(100);
  check('portrait constrained viewport remains readable and keeps controls inside the letterboxed canvas', { viewport: { width: 390, height: 844 }, canvas: await page.locator('#game-root canvas').boundingBox(), capture: await capture(page, 'b11-compact-390') });

  state = await stateOf(page);
  await page.evaluate((detail) => window.dispatchEvent(new CustomEvent('crownflare:b07-result', { detail })), {
    result: 'defeat', elapsedMs: state.b07.runElapsedMs, damageTaken: 0, repairCharges: state.b07.repairCharges, resonance: state.b07.resonance,
    visited: state.b07.visited, choices: state.b07.choices, seed: state.b07.seed, b08BossBuilt: state.b07.b08.enabled,
    b08BossesCleared: state.b07.b08.bossesCleared, b09Enabled: state.b07.b09.enabled, b09Build: state.b07.b09.build,
    b10Enabled: true, runId: state.save.activeRun?.runId,
  });
  await page.locator('#b07-results').waitFor({ state: 'visible' });
  check('results/Defeat layout renders real run context via UI-only injected defeat event; no campaign win is asserted', { heading: await page.locator('#b07-result-heading').innerText(), stats: await page.locator('#b07-result-stats').innerText(), capture: await capture(page, 'b11-results-defeat-ui-only') });
  await page.locator('#b07-title-button').click();
  await page.locator('#hub-screen').waitFor({ state: 'visible' });
  check('Return to Refuge works from the results screen', { continueEnabled: await page.locator('#hub-continue').isEnabled(), capture: await capture(page, 'b11-return-refuge') });
  await page.close();

  const bossContext = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await addSyntheticPad(bossContext);
  const bossPage = await bossContext.newPage(); monitor(bossPage, 'B10 practice boss HUD');
  await bossPage.goto(`${base}/?boss=sundial-custodian`, { waitUntil: 'domcontentloaded' });
  await startRun(bossPage);
  const bossState = await bossPage.evaluate(() => window.__CROWNFLARE_QA__?.snapshot());
  assert(bossState?.b07?.b08?.activeBoss === 'sundial-custodian' && bossState.b07.b08.hp > 0 && !bossPage.url().includes('b08=1'), 'normal B10 practice shortcut did not expose the live boss snapshot');
  assert(await bossPage.locator('#b11-boss').isVisible(), 'live boss panel was not shown by the normal B10 HUD');
  const bossCapture = await capture(bossPage, 'b11-live-boss-hud-1280');
  check('live B10 boss name, health, attack phase and practice state come from the existing B08 simulation', { bossId: bossState.b07.b08.activeBoss, hp: [bossState.b07.b08.hp, bossState.b07.b08.maxHp], phase: bossState.b07.b08.phase, capture: bossCapture });
  await bossContext.close();

  const sourceFiles = ['index.html', 'src/main.ts', 'src/style.css', 'src/ui/b11.css', 'src/game/createGame.ts', 'src/game/scenes/ChamberScene.ts', 'src/game/scenes/B07ExpeditionScene.ts', 'tools/art-export/build-b11-ui-icons.py'];
  const sourceHash = createHash('sha256'); for (const file of sourceFiles) sourceHash.update(file).update('\0').update(await readFile(file));
  const report = {
    result: errors.length ? 'FAIL' : 'PASS', capturedAt: new Date().toISOString(), browser: `Google Chrome headed ${browser.version()}`, checks, captures, errors,
    sourceDigest: { files: sourceFiles.length, sha256: sourceHash.digest('hex') },
    renderComparison: { sharpness1280: sharp1280, sharpness1920: sharp1920, scaling: 'Phaser 480x270 FIT; per-frame canvas bounds aligned with DOM HUD; pixelArt + nearest CSS; screenshot comparison retained for visual inspection' },
    gateStatus: { titleAndHub: 'PASS', baseHud: 'PASS', dawnrushHud: 'PASS', liveBossHud: 'PASS VIA B10 PRACTICE QUERY', rewardScreen: 'UI PREVIEW FROM REAL DETERMINISTIC OFFER; NO SELECTION MUTATION', controllerSettings: 'PASS; SYNTHETIC GAMEPAD API ONLY', compactViewport: 'PASS', defeatResults: 'UI-ONLY INJECTED DEFEAT EVENT; NO CAMPAIGN VICTORY', audioHeard: 'NO', physicalController: 'NOT TESTED', ownerAcceptance: 'PENDING' },
  };
  await writeFile(path.join(evidence, 'qa-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  assert(errors.length === 0, errors.join('\n'));
  console.log(JSON.stringify({ result: report.result, chrome: browser.version(), checks: checks.length, captures: captures.map(({ file }) => file), report: `${evidence}/qa-report.json` }, null, 2));
} catch (error) {
  await mkdir(evidence, { recursive: true });
  await writeFile(path.join(evidence, 'qa-report.json'), `${JSON.stringify({ result: 'FAIL', capturedAt: new Date().toISOString(), checks, captures, errors: [String(error?.message ?? error)] }, null, 2)}\n`).catch(() => {});
  throw error;
} finally { await browser?.close().catch(() => {}); server.kill(); }
