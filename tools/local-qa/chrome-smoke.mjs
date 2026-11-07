/** Real Vite + Chrome Playwright smoke. Must run from user-owned authorized computer.
 * No remote debugging bypass. System audio is NOT captured by Playwright video.
 */
import { spawn } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const headless = process.argv.includes('--headless');
const port = 4173;
const evidenceDir = process.env.CROWNFLARE_QA_EVIDENCE_DIR ?? (headless ? 'tests/evidence/headless' : 'review-evidence');
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'pipe' });
let serverErrors = '';
server.stderr.on('data', (buf) => { serverErrors += buf.toString(); });
let browser;
let context;
let page;
let launchTarget = 'Playwright Chromium';
let qaPassed = false;
const failures = [];
const assert = (condition, message) => { if (!condition) { failures.push(message); throw new Error(message); } };
const snapshot = async () => page.evaluate(() => window.__CROWNFLARE_QA__?.snapshot());

try {
  let ready = false;
  for (let i = 0; i < 40; i++) {
    if (server.exitCode !== null) break;
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      if (response.ok) { ready = true; break; }
    } catch { /* Vite is still starting */ }
    await delay(250);
  }
  assert(ready, `Vite failed to start: ${serverErrors}`);

  mkdirSync('tests/evidence', { recursive: true });
  mkdirSync(evidenceDir, { recursive: true });
  const options = { headless, args: ['--use-gl=angle', '--use-angle=swiftshader'] };
  try {
    browser = await chromium.launch({ ...options, channel: 'chrome' });
    launchTarget = 'Installed Chrome';
  } catch (error) {
    console.warn(`Chrome channel unavailable; attempting Playwright Chromium: ${String(error).slice(0, 180)}`);
    browser = await chromium.launch(options);
  }

  context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: 'tests/evidence', size: { width: 1280, height: 720 } },
  });
  page = await context.newPage();
  page.on('pageerror', (error) => failures.push(`runtime: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') failures.push(`console: ${message.text()}`); });

  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().screen === 'title');
  assert((await snapshot())?.screen === 'title', 'Title not displayed');
  await page.screenshot({ path: `${evidenceDir}/b00-title.png` });

  await page.getByRole('button', { name: /ENTER THE SPINDLE/ }).click();
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().player !== null);
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().player?.grounded === true);
  let state = await snapshot();
  assert(state?.screen === 'playing', 'Game did not enter the playing state');
  assert(state.player !== null && state.player.grounded, 'Player did not land on the chamber floor');
  assert(await page.evaluate(() => document.activeElement === document.querySelector('#game-root canvas')), 'Canvas did not receive focus after Phaser boot');
  await page.keyboard.press('Backquote');
  await page.waitForFunction(() => !document.querySelector('#debug-overlay')?.classList.contains('hidden'));
  await page.keyboard.press('Backquote');
  await page.waitForFunction(() => document.querySelector('#debug-overlay')?.classList.contains('hidden'));
  await page.screenshot({ path: `${evidenceDir}/b00-chamber.png` });

  const canvas = page.locator('#game-root canvas');
  for (const viewport of [{ width: 1024, height: 768 }, { width: 1680, height: 720 }]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(100);
    const bounds = await canvas.boundingBox();
    assert(bounds !== null && bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= viewport.width + 1 && bounds.y + bounds.height <= viewport.height + 1, `Canvas clipped at ${viewport.width}x${viewport.height}`);
    assert(bounds !== null && Math.abs(bounds.width / bounds.height - 16 / 9) < 0.03, `Logical game aspect changed at ${viewport.width}x${viewport.height}`);
  }
  await page.setViewportSize({ width: 1280, height: 720 });

  const initialX = state.player.x;
  await page.keyboard.down('d');
  await page.waitForTimeout(380);
  await page.keyboard.up('d');
  state = await snapshot();
  assert(state.player.x > initialX + 10, 'Move right did not move the player');
  const movedRightX = state.player.x;

  await page.keyboard.down('a');
  await page.waitForTimeout(380);
  await page.keyboard.up('a');
  state = await snapshot();
  assert(state.player.x < movedRightX - 10 && state.player.facing === -1, 'Move left did not move/facing did not update');

  const floorY = state.player.y;
  await page.keyboard.down('d');
  await page.waitForTimeout(290);
  await page.keyboard.up('d');
  await page.keyboard.down('d');
  await page.keyboard.down('Space');
  await page.waitForTimeout(420);
  await page.keyboard.up('Space');
  await page.keyboard.up('d');
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().player?.grounded === true, undefined, { timeout: 2500 });
  state = await snapshot();
  assert(state.player.y < floorY - 30, `Jump did not land on the first raised platform (player y=${state.player.y}, floor y=${floorY})`);
  assert(state.player.x > 165 && state.player.x < 275, `Platform landing was outside the first platform (player x=${state.player.x})`);

  // Walk off the platform and use the coyote window immediately after its edge.
  await page.keyboard.down('d');
  await page.waitForFunction(() => {
    const player = window.__CROWNFLARE_QA__?.snapshot().player;
    return player !== null && player !== undefined && player.x > 276 && !player.grounded;
  }, undefined, { timeout: 1800 });
  const edgeY = (await snapshot()).player.y;
  await page.keyboard.down('Space');
  await page.waitForTimeout(85);
  state = await snapshot();
  await page.keyboard.up('Space');
  await page.keyboard.up('d');
  assert(state.player.y < edgeY - 8, `Coyote jump did not trigger after leaving the platform (edge y=${edgeY}, player y=${state.player.y})`);

  // Buffer jump just before landing on the floor and verify it fires on contact.
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().player?.grounded === true, undefined, { timeout: 2500 });
  await page.keyboard.down('Space');
  await page.waitForTimeout(390);
  await page.keyboard.up('Space');
  await page.waitForFunction((groundY) => {
    const player = window.__CROWNFLARE_QA__?.snapshot().player;
    return player !== null && player !== undefined && !player.grounded && player.y >= groundY - 13;
  }, floorY, { timeout: 2500 });
  await page.keyboard.down('Space');
  await page.waitForFunction((groundY) => {
    const player = window.__CROWNFLARE_QA__?.snapshot().player;
    return player !== null && player !== undefined && player.y < groundY - 8;
  }, floorY, { timeout: 900 });
  await page.keyboard.up('Space');
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().player?.grounded === true, undefined, { timeout: 2500 });
  for (const key of ['w', 'ArrowUp']) {
    await page.keyboard.down(key);
    await page.waitForTimeout(100);
    state = await snapshot();
    await page.keyboard.up(key);
    assert(state.player.y < floorY - 5, `${key} jump alias did not leave the floor`);
    await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().player?.grounded === true, undefined, { timeout: 2500 });
  }

  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().player?.grounded === true, undefined, { timeout: 2500 });

  // Reach the fixed vertical test barrier, then dash into it and prove solid collision holds.
  await page.keyboard.down('d');
  await page.waitForTimeout(7200);
  state = await snapshot();
  await page.keyboard.down('Shift');
  await page.waitForTimeout(55);
  state = await snapshot();
  assert(state.player.dashActive, `Dash did not activate on a fresh press: ${JSON.stringify(state.player)}`);
  assert(state.player.cameraX > 0, 'Camera did not follow player across the chamber');
  assert(state.player.x <= 1108, `Dash crossed the solid barrier (player x=${state.player.x})`);
  await page.keyboard.up('Shift');
  await page.keyboard.up('d');
  await page.waitForTimeout(120);

  // Pause in the air so a running simulation would visibly fall.
  await page.keyboard.down('Space');
  await page.waitForTimeout(75);
  await page.keyboard.up('Space');
  await page.waitForTimeout(45);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(80);
  assert((await snapshot())?.screen === 'paused', 'Escape did not pause');
  state = await snapshot();
  const frozenY = state.player.y;
  await page.waitForTimeout(350);
  state = await snapshot();
  assert(Math.abs(state.player.y - frozenY) < 0.1, 'Player simulation moved while paused');

  // First let the airborne player land, then press jump while paused and resume.
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().screen === 'playing');
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().player?.grounded === true, undefined, { timeout: 2500 });
  state = await snapshot();
  const groundedY = state.player.y;
  await page.keyboard.press('Escape');
  await page.keyboard.down('Space');
  await page.waitForTimeout(60);
  assert((await snapshot())?.screen === 'paused', 'A gameplay key activated the pause overlay');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().screen === 'playing');
  await page.keyboard.up('Space');
  await page.waitForTimeout(90);
  state = await snapshot();
  assert(state.screen === 'playing', 'Escape did not resume');
  assert(state.player.grounded && Math.abs(state.player.y - groundedY) < 1, 'Pause input leaked into gameplay after resume');

  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.waitForTimeout(80);
  assert((await snapshot())?.screen === 'paused', 'Window blur did not pause the simulation');
  await page.keyboard.press('Escape');
  assert((await snapshot())?.screen === 'playing', 'Escape did not resume after blur');

  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /RETURN TO TITLE/ }).click();
  assert((await snapshot())?.screen === 'title', 'Returning to title did not cleanly shut down the chamber');
  await page.getByRole('button', { name: /ENTER THE SPINDLE/ }).click();
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().screen === 'playing' && window.__CROWNFLARE_QA__?.snapshot().player !== null);
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().player?.grounded === true);
  assert((await snapshot())?.screen === 'playing', 'Starting a second time after quit failed');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /RETURN TO TITLE/ }).click();
  assert((await snapshot())?.screen === 'title', 'Second chamber did not return cleanly to title');
  assert(failures.length === 0, failures.join('; '));
  qaPassed = true;
} catch (error) {
  console.error('REAL CHROME SMOKE FAIL/BLOCKED:', error);
  process.exitCode = 1;
} finally {
  const video = page?.video();
  const browserVersion = browser?.version() ?? 'version unavailable';
  if (context) await context.close();
  if (browser) await browser.close();
  server.kill();

  if (qaPassed && video) {
    const sourceFiles = [
      'index.html', 'package.json', 'package-lock.json', 'vite.config.ts', 'tsconfig.json', 'src/style.css',
      'src/main.ts', 'src/game/createGame.ts', 'src/game/input/InputController.ts',
      'src/game/movement/motion.ts', 'src/game/combat/sim.ts', 'src/game/persistence/save.ts',
      'src/game/scenes/ChamberScene.ts', 'src/types/qa.d.ts',
      'tools/local-qa/chrome-smoke.mjs',
    ];
    const sourceHasher = createHash('sha256');
    for (const file of sourceFiles) sourceHasher.update(file).update(readFileSync(file));
    const sourceHash = sourceHasher.digest('hex');
    const rawVideo = await video.path();
    const reviewVideo = `${evidenceDir}/b00-gameplay.webm`;
    if (!headless) copyFileSync(rawVideo, reviewVideo);
    const videoToReport = headless ? rawVideo : reviewVideo;
    const videoHash = createHash('sha256').update(readFileSync(videoToReport)).digest('hex');
    const videoBytes = statSync(videoToReport).size;
    if (!headless) writeFileSync(`${evidenceDir}/b00-qa.md`, [
      '# B00 local browser evidence', '',
      `- Run: ${new Date().toISOString()}`, `- Browser: ${launchTarget} ${browserVersion} (headed=${!headless})`,
      '- App: Vite + Phaser 4 local build at 480×270 logical resolution',
      '- Scenarios: title/start, left/right/facing, Space/W/Up jump inputs, Space landing on the first raised platform, platform-edge coyote jump, buffered jump on floor landing, development telemetry toggle, responsive canvas at 4:3 and 21:9 viewport sizes, camera follow, barrier collision during dash, pause freeze/input clearing, synthetic window-blur handler, resume, quit and clean re-entry.',
      '- Console/page errors: none', `- Aggregate source SHA-256: ${sourceHash}`,
      `- Gameplay clip: ${reviewVideo} (${videoBytes} bytes, SHA-256 ${videoHash})`,
      '- Screenshots: b00-title.png and b00-chamber.png',
      '- Audio: no game audio exists; Playwright recording is not audio evidence.',
      '- Controller: no physical controller test is claimed by this keyboard smoke.', '',
    ].join('\n'));
    const reportedVideo = headless ? `${rawVideo} (${videoBytes} bytes)` : `${reviewVideo} (${videoBytes} bytes)`;
    console.log(`REAL ${headless ? 'HEADLESS' : 'HEADED'} CHROME SMOKE PASS: ${launchTarget} ${browserVersion}; title/start/move/Space-W-Up/platform/coyote/buffer/resize/dash-barrier/camera/pause/blur/quit; no console errors.`);
    console.log(`Evidence: ${reportedVideo}; source SHA-256 ${sourceHash}`);
  }
  if (failures.length) {
    console.error('ERRORS:', failures.join('\n'));
    process.exitCode = 1;
  }
}
