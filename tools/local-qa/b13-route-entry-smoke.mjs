import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port = 4246;
const base = `http://127.0.0.1:${port}`;
const reportPath = 'review-evidence/b13/route-entry-smoke.json';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
let browser;
const errors = [];
const requestsFailed = [];
const records = [];

function monitor(page, label) {
  page.on('pageerror', (error) => errors.push(`${label}: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`${label}: ${message.text()}`); });
  page.on('requestfailed', (request) => requestsFailed.push(`${label}: ${request.url()} / ${request.failure()?.errorText ?? 'failed'}`));
  page.on('response', (response) => { if (response.status() >= 400) requestsFailed.push(`${label}: HTTP ${response.status()} ${response.url()}`); });
}

async function ready() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { if ((await fetch(base)).ok) return; } catch { /* Vite is starting */ }
    await delay(100);
  }
  throw new Error('Vite did not start on the local QA port.');
}

async function snapshot(page) {
  return page.evaluate(() => window.__CROWNFLARE_QA__?.snapshot() ?? null);
}

async function enterNormalRun(page, label) {
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.locator('#start-button').click();
  await page.locator('#hub-new-run').waitFor({ state: 'visible' });
  await page.locator('#hub-controls').click();
  await page.locator('#settings-screen').waitFor({ state: 'visible' });
  await page.locator('#settings-close').click();
  await page.locator('#hub-new-run').click();
  await page.locator('#hub-begin-run').click();
  const started = Date.now();
  await page.waitForFunction(() => {
    const state = window.__CROWNFLARE_QA__?.snapshot();
    return state?.screen === 'b10Expedition' && state.sceneActive && state.b07?.roomId === 'sg-breach-steps' && state.b07.loadedTextures === 8;
  }, undefined, { timeout: 15000 });
  const elapsedMs = Date.now() - started;
  const state = await snapshot(page);
  const initialCanvas = await readCanvas(page);
  if (initialCanvas.scaleX !== 2 || initialCanvas.scaleY !== 2) throw new Error(`Default Pixel Perfect mode did not use 2x at 1280×720: ${JSON.stringify(initialCanvas)}`);
  records.push({ label, phase: 'new-run-entry', elapsedMs, sceneStatus: state.sceneStatus, sceneActive: state.sceneActive, room: state.b07.roomId, roomTextures: state.b07.loadedTextures, missingRoomTextures: state.b07.missingTextures, display: state.display, initialCanvas });
  return state;
}

async function readCanvas(page) {
  return page.locator('canvas').evaluate((canvas) => {
    const rect = canvas.getBoundingClientRect();
    return { left: Math.round(rect.left), top: Math.round(rect.top), width: Math.round(rect.width), height: Math.round(rect.height), scaleX: Number((rect.width / canvas.width).toFixed(4)), scaleY: Number((rect.height / canvas.height).toFixed(4)) };
  });
}

try {
  await ready();
  browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--use-gl=angle', '--use-angle=swiftshader', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });

  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  monitor(page, 'no-controller');
  let state = await enterNormalRun(page, 'no-controller');
  const startY = state.b07.physics.player.body.top;
  await page.keyboard.down('Space'); await delay(180);
  state = await snapshot(page);
  await page.keyboard.up('Space');
  records.push({ label: 'no-controller', phase: 'jump-input', startY, afterJumpY: state.b07.physics.player.body.top, yVelocity: state.b07.hud.combat?.yVelocity, grounded: state.b07.hud.combat?.grounded });
  const scaling = [];
  for (const viewport of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }, { width: 1366, height: 768 }, { width: 352, height: 266 }]) {
    await page.setViewportSize(viewport);
    await delay(180);
    scaling.push({ viewport, canvas: await readCanvas(page), display: (await snapshot(page)).display });
  }
  records.push({ label: 'no-controller', phase: 'pixel-scaling', mode: 'pixel-perfect', scaling });

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.keyboard.press('Escape');
  await page.locator('#pause-settings-button').waitFor({ state: 'visible' });
  await page.locator('#pause-settings-button').click();
  await page.locator('#settings-pixel-scaling').selectOption('fit');
  await delay(100);
  records.push({ label: 'no-controller', phase: 'fit-scaling', mode: 'fit', canvas: await readCanvas(page) });
  await page.locator('#settings-pixel-scaling').selectOption('pixel-perfect');
  await page.locator('#settings-close').click();
  await page.locator('#resume-button').click();
  const walkDeadline = Date.now() + 11000;
  let playerX = 0;
  const gapJumps = [];
  await page.keyboard.down('d');
  while (Date.now() < walkDeadline) {
    await delay(180);
    state = await snapshot(page);
    playerX = (state.b07.physics.player.body.left + state.b07.physics.player.body.right) / 2;
    const nextJumpX = gapJumps.length === 0 ? 295 : 600;
    if (gapJumps.length < 2 && playerX >= nextJumpX) {
      const before = state.b07.physics.player.body.top;
      await page.keyboard.down('Space'); await delay(140);
      const jumping = await snapshot(page);
      gapJumps.push({ atX: playerX, beforeY: before, afterY: jumping.b07.physics.player.body.top, grounded: jumping.b07.hud.combat?.grounded });
      await page.keyboard.up('Space');
    }
    if (playerX >= 850) break;
  }
  await page.keyboard.up('d');
  if (playerX < 850) throw new Error(`Keyboard movement did not reach the first room gate: x=${playerX}, gapJumps=${JSON.stringify(gapJumps)}, body=${JSON.stringify(state.b07.physics.player)}, grounded=${state.b07.hud.combat?.grounded}`);
  records.push({ label: 'no-controller', phase: 'first-room-traversal', room: state.b07.roomId, playerX, gapJumps });
  await page.keyboard.down('e'); await delay(110); await page.keyboard.up('e');
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot()?.b07?.menu === 'reach');
  await page.keyboard.down('e'); await delay(110); await page.keyboard.up('e');
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot()?.b07?.roomId === 'sg-copper-causeway');
  state = await snapshot(page);
  const checkpoint = await page.evaluate(() => JSON.parse(localStorage.getItem('project-crownflare:save:v2') ?? 'null')?.activeRun ?? null);
  if (!checkpoint?.runId || checkpoint.route.rooms[0] !== 'sg-breach-steps' || checkpoint.route.rooms[1] !== 'sg-copper-causeway') throw new Error('The second playable room did not save a resumable checkpoint.');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#start-button').click();
  await page.locator('#hub-continue').waitFor({ state: 'visible' });
  await page.locator('#hub-continue').click();
  await page.waitForFunction((runId) => {
    const state = window.__CROWNFLARE_QA__?.snapshot();
    return state?.screen === 'b10Expedition' && state.sceneActive && state.b07?.roomId === 'sg-copper-causeway' && state.save.activeRun?.runId === runId && state.b07.loadedTextures === 8;
  }, checkpoint.runId, { timeout: 15000 });
  state = await snapshot(page);
  records.push({ label: 'no-controller', phase: 'continue-entry', sceneActive: state.sceneActive, room: state.b07.roomId, seed: state.b07.seed, resumedRunId: state.save.activeRun.runId, playerReachedGate: playerX });
  await context.close();

  const padContext = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await padContext.addInitScript(() => {
    localStorage.removeItem('project-crownflare:save:v1');
    localStorage.removeItem('project-crownflare:save:v2');
    const buttons = Array.from({ length: 16 }, () => ({ pressed: false, touched: false, value: 0 }));
    const pad = { id: 'B13 synthetic standard pad', connected: true, index: 0, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
    window.__B13_PAD__ = { pad, buttons };
  });
  const padPage = await padContext.newPage();
  monitor(padPage, 'synthetic-controller');
  await padPage.goto(base, { waitUntil: 'domcontentloaded' });
  await padPage.locator('#start-button').click();
  await padPage.locator('#hub-new-run').waitFor({ state: 'visible' });
  await padPage.evaluate(() => { window.__B13_PAD__.buttons[13].pressed = true; window.__B13_PAD__.buttons[13].value = 1; });
  await delay(100);
  await padPage.evaluate(() => { window.__B13_PAD__.buttons[13].pressed = false; window.__B13_PAD__.buttons[13].value = 0; });
  const focusedId = await padPage.evaluate(() => document.activeElement?.id ?? null);
  if (focusedId !== 'hub-controls') throw new Error(`Synthetic D-pad did not move Refuge focus: ${focusedId}`);
  await padPage.evaluate(() => { window.__B13_PAD__.buttons[0].pressed = true; window.__B13_PAD__.buttons[0].value = 1; });
  await delay(100);
  await padPage.evaluate(() => { window.__B13_PAD__.buttons[0].pressed = false; window.__B13_PAD__.buttons[0].value = 0; });
  await padPage.locator('#settings-screen').waitFor({ state: 'visible' });
  await padPage.locator('#settings-close').click();
  await padPage.locator('#hub-new-run').click();
  await padPage.locator('#hub-begin-run').click();
  const padStarted = Date.now();
  await padPage.waitForFunction(() => {
    const state = window.__CROWNFLARE_QA__?.snapshot();
    return state?.screen === 'b10Expedition' && state.sceneActive && state.b07?.roomId === 'sg-breach-steps' && state.b07.loadedTextures === 8;
  }, undefined, { timeout: 15000 });
  const padElapsedMs = Date.now() - padStarted;
  await padPage.evaluate(() => { window.__B13_PAD__.pad.axes[0] = 0.7; });
  await delay(420);
  await padPage.evaluate(() => { window.__B13_PAD__.pad.axes[0] = 0; });
  state = await snapshot(padPage);
  const padX = (state.b07.physics.player.body.left + state.b07.physics.player.body.right) / 2;
  if (padX <= 70) throw new Error(`Synthetic controller movement did not advance Iona: x=${padX}`);
  records.push({ label: 'synthetic-controller', phase: 'new-run-entry-and-movement', focusedId, elapsedMs: padElapsedMs, sceneActive: state.sceneActive, room: state.b07.roomId, roomTextures: state.b07.loadedTextures, playerXAfterAxisInput: padX });
  await padContext.close();

  if (errors.length || requestsFailed.length) throw new Error([...errors, ...requestsFailed].join('\n'));
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify({ result: 'PASS', checks: records, errors, requestsFailed, gates: { noController: 'PASS', syntheticController: 'PASS', physicalController: 'NOT TESTED', audioHeard: 'NOT HEARD', fullRunDuration: 'NOT MEASURED', ownerReview: 'PENDING' } }, null, 2)}\n`);
  console.log(JSON.stringify({ result: 'PASS', checks: records.length, records, reportPath, errors, requestsFailed }, null, 2));
} catch (error) {
  await mkdir(path.dirname(reportPath), { recursive: true }).catch(() => {});
  await writeFile(reportPath, `${JSON.stringify({ result: 'FAIL', checks: records, errors: [...errors, String(error?.message ?? error)], requestsFailed }, null, 2)}\n`).catch(() => {});
  throw error;
} finally {
  await browser?.close().catch(() => {});
  server.kill();
}
