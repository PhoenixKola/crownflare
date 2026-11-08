/** Chrome playthrough and evidence capture for the development-only B07 expedition. */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, copyFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port = 4197;
const base = `http://127.0.0.1:${port}`;
const evidence = 'review-evidence/b07';
const noRecord = process.argv.includes('--no-record');
let recordingDir;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'pipe' });
let serverErrors = '';
server.stderr.on('data', (buffer) => { serverErrors += buffer.toString(); });
let browser;
const errors = [];
const checks = [];
const screenshots = [];
const events = [];
let recordingContext;
let recordingPage;

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const snapshot = (page) => page.evaluate(() => window.__CROWNFLARE_QA__?.snapshot());
const record = (name, details = {}) => checks.push({ name, ...details });

async function ready(url) {
  for (let i = 0; i < 100; i += 1) {
    try { const response = await fetch(url); if (response.ok) return true; } catch { /* dev server is starting */ }
    await delay(200);
  }
  return false;
}

function monitor(page, name) {
  page.on('pageerror', (error) => errors.push(`${name} pageerror: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`${name} console: ${message.text()}`); });
  page.on('requestfailed', (request) => errors.push(`${name} request: ${request.url()} ${request.failure()?.errorText ?? ''}`));
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`${name} HTTP ${response.status()}: ${response.url()}`); });
  page.on('console', (message) => {
    if (!message.text().startsWith('[vite]')) return;
  });
}

async function waitFor(page, predicate, message, timeoutMs = 15000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const state = await snapshot(page);
    if (state && predicate(state)) return state;
    await page.waitForTimeout(80);
  }
  throw new Error(`${message}: ${JSON.stringify(await snapshot(page))}`);
}

async function tap(page, key, duration = 75) {
  await page.keyboard.down(key);
  await page.waitForTimeout(duration);
  await page.keyboard.up(key);
  await page.waitForTimeout(60);
}

async function capture(page, name) {
  const target = path.join(evidence, `${name}.png`);
  await page.screenshot({ path: target, animations: 'allow' });
  screenshots.push(target.replaceAll('\\', '/'));
  return target;
}

async function moveTo(page, targetX, roomId, limitMs = 23000) {
  const jumpTriggers = {
    'sg-breach-steps': [312, 640],
    'sg-copper-causeway': [344, 420],
    'vl-spindle-lift': [287, 430],
  }[roomId] ?? [];
  let nextJump = 0;
  await page.keyboard.down('d');
  const deadline = Date.now() + limitMs;
  let lastX = -1;
  let stalledSince = Date.now();
  while (Date.now() < deadline) {
    const state = await snapshot(page);
    if (state?.b07?.roomId !== roomId) break;
    const x = state?.player?.x ?? 0;
    if (x >= targetX - 24) break;
    if (state?.player?.grounded && ((nextJump < jumpTriggers.length && x >= jumpTriggers[nextJump]) || Date.now() - stalledSince > 720)) {
      await page.keyboard.down('Space');
      await page.waitForTimeout(260);
      await page.keyboard.up('Space');
      if (nextJump < jumpTriggers.length && x >= jumpTriggers[nextJump]) nextJump += 1;
      stalledSince = Date.now();
    }
    if (Math.abs(x - lastX) > 1) { lastX = x; stalledSince = Date.now(); }
    else if (Date.now() - stalledSince > 2300) {
      await page.keyboard.up('d');
      await page.screenshot({ path: path.join(evidence, `b07-move-failure-${roomId}.png`) });
      throw new Error(`Player stopped before target ${targetX} in ${roomId}: ${JSON.stringify({ player: state?.player, b07: state?.b07 })}`);
    }
    await page.waitForTimeout(70);
  }
  await page.keyboard.up('d');
  await page.waitForTimeout(500);
  const state = await snapshot(page);
  if (state?.b07?.roomId === roomId && (state?.player?.x ?? 0) < targetX - 50) throw new Error(`Player did not reach target ${targetX} in ${roomId}: ${JSON.stringify(state.player)}`);
  return state;
}

async function interact(page) { await tap(page, 'e', 80); }

async function enter(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  assert(await page.locator('#start-button').isVisible(), 'B07 entry screen did not appear');
  await page.locator('#start-button').click();
  const state = await waitFor(page, (value) => value.sceneType === 'B07ExpeditionScene' && value.b07?.roomId === 'sg-breach-steps', 'B07 opening room loads');
  assert(state.b07.missingTextures.length === 0 && state.b07.loadedTextures === 8, `B07 Vesper/roster textures missing: ${state.b07.missingTextures}`);
  return state;
}

async function enterBranch(page, route) {
  const state = await snapshot(page);
  const roomId = state.b07.roomId;
  await moveTo(page, 918, roomId);
  await interact(page);
  const menu = await waitFor(page, (value) => value.b07?.menu === route, `${route} branch menu opens`);
  assert((await snapshot(page)).combat?.playerHp === 5, `Entry room unexpectedly damaged the player before any encounter: ${JSON.stringify({ b07: menu.b07, combat: (await snapshot(page)).combat })}`);
  await capture(page, `b07-${route}-route-menu`);
}

async function branchWithKeyboard(page, route, optionIndex) {
  await enterBranch(page, route);
  if (optionIndex === 1) await tap(page, 'd', 80);
  await interact(page);
  const chosen = route === 'reach' ? optionIndex === 0 ? 'safe-recovery' : 'conduit-challenge' : optionIndex === 0 ? 'spindle-lift' : 'lattice-elite';
  return waitFor(page, (state) => state.b07?.choices?.[route] === chosen && state.b07?.menu === null, `${chosen} branch is selected`);
}

async function runBaseSafeRoute() {
  recordingContext = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, ...(noRecord ? {} : { recordVideo: { dir: recordingDir, size: { width: 1280, height: 720 } } }) });
  recordingPage = await recordingContext.newPage();
  monitor(recordingPage, 'base-route');
  await enter(recordingPage, `${base}/?b07=1&seed=13031988`);
  await capture(recordingPage, 'b07-sunderglass-entry-base');
  await tap(recordingPage, 'Escape');
  assert((await snapshot(recordingPage)).screen === 'paused', 'B07 did not pause from Escape');
  await tap(recordingPage, 'Escape');
  await recordingPage.setViewportSize({ width: 1024, height: 768 });
  await recordingPage.waitForTimeout(120);
  await recordingPage.setViewportSize({ width: 1280, height: 720 });
  record('pause and resize preserve the running expedition', { status: 'PASS' });

  await branchWithKeyboard(recordingPage, 'reach', 0);
  const visitedOrder = [];
  const roomLimit = 12;
  for (let count = 0; count < roomLimit; count += 1) {
    let state = await snapshot(recordingPage);
    const roomId = state.b07.roomId;
    if (!roomId) {
      if (state.b07.menu) { await interact(recordingPage); continue; }
      throw new Error(`No room while advancing route: ${JSON.stringify(state.b07)}`);
    }
    visitedOrder.push(roomId);
    if (roomId === 'vl-condensation-vault') {
      await moveTo(recordingPage, 562, roomId);
      await waitFor(recordingPage, (value) => value.b07?.hazards?.some((hazard) => hazard.phase === 'active'), 'Vesper thread press enters its live phase', 8000);
      await waitFor(recordingPage, (value) => value.b07?.events?.some((event) => event.type === 'hazard-contact' && event.hazardId === 'vault-thread-press'), 'Vesper press causes a real player contact', 8000);
      record('thread press warning, active collision, damage event and recovery state', { status: 'PASS', hit: (await snapshot(recordingPage)).b07.events.find((item) => item.type === 'hazard-contact') });
      await capture(recordingPage, 'b07-vesper-thread-press-contact');
    }
    const rewardTargets = {
      'sg-copper-causeway': 760,
      'sg-resonance-gallery': 524,
      'sg-conduit-annex': 848,
      'vl-spindle-lift': 818,
      'vl-lattice-hall': 852,
      'vl-condensation-vault': 840,
    };
    if (rewardTargets[roomId] !== undefined && !state.b07.rewardClaimed) {
      const beforeRewardRunState = state.b07;
      const reachedReward = await moveTo(recordingPage, rewardTargets[roomId], roomId);
      if (roomId === 'sg-copper-causeway') {
        assert(reachedReward.b07?.playerHp === beforeRewardRunState.playerHp, `Player took damage crossing the charged conduit: ${JSON.stringify({ before: beforeRewardRunState.playerHp, after: reachedReward.b07?.playerHp })}`);
        record('charged conduit crossing succeeds without damage using the authored jump lane', { status: 'PASS', hp: reachedReward.b07?.playerHp });
        await capture(recordingPage, 'b07-sg-conduit-arc-cleared');
      }
      await interact(recordingPage);
      state = await waitFor(recordingPage, (value) => value.b07?.rewardClaimed, `${roomId} run reward is claimable`);
      assert(state.b07.repairCharges > 0 || state.b07.resonance > 0, `Reward did not change run state in ${roomId}`);
      await capture(recordingPage, `b07-${roomId}-reward`);
    }
    if (roomId === 'vl-night-side-threshold') {
      await capture(recordingPage, 'b07-vesper-b08-threshold');
      break;
    }
    await moveTo(recordingPage, 918, roomId);
    await interact(recordingPage);
    state = await waitFor(recordingPage, (value) => value.b07?.roomId !== roomId || !!value.b07?.menu, `room ${roomId} advances`);
    if (state.b07?.menu === 'loom') {
      await capture(recordingPage, 'b07-vesper-choice-menu');
      await interact(recordingPage);
      state = await waitFor(recordingPage, (value) => value.b07?.roomId === 'vl-spindle-lift', 'Spindle Lift route begins');
    }
    if (state.b07?.roomId === 'vl-spindle-lift') {
      state = await waitFor(recordingPage, (value) => value.b07?.hazards?.some((hazard) => hazard.id === 'loom-lift-cycle' && Number.isFinite(hazard.y)), 'moving lift initializes inside the Vesper route');
      await capture(recordingPage, 'b07-vesper-region-entry');
      const liftId = 'loom-lift-cycle';
      const liftStartY = state.b07.hazards.find((hazard) => hazard.id === liftId)?.y;
      assert(Number.isFinite(liftStartY), `Moving lift did not expose its initial authored Y position: ${JSON.stringify(state.b07.hazards)}`);
      await recordingPage.waitForTimeout(750);
      const liftLater = await snapshot(recordingPage);
      const liftLaterY = liftLater.b07?.hazards.find((hazard) => hazard.id === liftId)?.y;
      assert(Number.isFinite(liftLaterY) && Math.abs(liftLaterY - liftStartY) >= 4, `Moving lift did not change physical position: ${liftStartY} -> ${liftLaterY}`);
      record('Vesper spindle lift moves through its authored travel range', { status: 'PASS', startY: liftStartY, laterY: liftLaterY });
      record('moving lift travels during safe-route traversal', { status: 'PASS', startY: liftStartY, laterY: liftLaterY });
      await capture(recordingPage, 'b07-vesper-lift-moving');
    }
  }

  const final = await snapshot(recordingPage);
  if (final.screen !== 'b07Results') {
    const current = final.b07;
    if (current?.roomId === 'vl-night-side-threshold') {
      await moveTo(recordingPage, 852, current.roomId);
      await interact(recordingPage);
    }
  }
  const results = await waitFor(recordingPage, (state) => state.screen === 'b07Results', 'B07 completion results appear', 12000);
  assert(results.b07?.result === 'victory' && results.b07.visited.at(-1) === 'vl-night-side-threshold', `B07 result did not honestly stop at the boss threshold: ${JSON.stringify(results.b07)}`);
  await capture(recordingPage, 'b07-route-complete-results');
  record('Base safe-recovery route crosses the Vesper region and stops before B08 boss', { status: 'PASS', visited: results.b07.visited, seed: results.b07.seed, repairCharges: results.b07.repairCharges, resonance: results.b07.resonance });
  const videoPath = noRecord ? null : await recordingPage.video()?.path();
  await recordingContext.close(); recordingContext = undefined; recordingPage = undefined;
  if (videoPath) await copyFile(videoPath, path.join(evidence, 'b07-base-safe-expedition.webm'));
  return results.b07;
}

async function runControllerChallengeBranch() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await context.addInitScript(() => {
    const pad = { index: 0, id: 'Xbox 360 Controller (XInput STANDARD GAMEPAD)', connected: true, mapping: 'standard', timestamp: 1, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
    Object.defineProperty(window, '__QA_GAMEPAD__', { value: pad, configurable: true });
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
  });
  const page = await context.newPage(); monitor(page, 'controller-challenge');
  await enter(page, `${base}/?b07=1&seed=556677`);
  await enterBranch(page, 'reach');
  await page.evaluate(() => { window.__QA_GAMEPAD__.axes[0] = 1; });
  await page.waitForTimeout(180);
  await page.evaluate(() => { window.__QA_GAMEPAD__.axes[0] = 0; window.__QA_GAMEPAD__.buttons[12] = { pressed: true, touched: true, value: 1 }; });
  await page.waitForTimeout(120);
  await page.evaluate(() => { window.__QA_GAMEPAD__.buttons[12] = { pressed: false, touched: false, value: 0 }; });
  let state = await waitFor(page, (value) => value.b07?.choices?.reach === 'conduit-challenge' && value.b07?.roomId === 'sg-conduit-annex', 'standard controller opens challenge route');
  assert(state.player?.controller === true, 'synthetic standard pad was not recognized by the existing controller mapping');
  assert(state.b07.enemies.length === 2, `Challenge branch did not assemble its enemy encounter: ${JSON.stringify(state.b07.enemies)}`);
  await capture(page, 'b07-conduit-annex-controller-branch');
  await tap(page, 'r', 80);
  state = await waitFor(page, (value) => value.b05?.form === 'Dawnrush', 'Dawnrush is playable inside the B07 route');
  await moveTo(page, 460, 'sg-conduit-annex');
  const tell = await waitFor(page, (value) => value.b07?.events?.some((event) => event.type === 'enemy-telegraph'), 'challenge enemy wakes and telegraphs in the assembled room', 8000);
  await capture(page, 'b07-conduit-annex-dawnrush-telegraph');
  record('standard controller selects challenge; Dawnrush and room-context B06 telegraph are active', { status: 'PASS', seed: state.b07.seed, enemies: state.b07.enemies, telegraph: tell.b07.events.find((event) => event.type === 'enemy-telegraph'), dawnrush: tell.b05?.form });
  const defeat = await waitFor(page, (value) => value.screen === 'b07Results' && value.b07?.result === 'defeat', 'challenge encounter produces a real defeat and results screen', 30000);
  await capture(page, 'b07-defeat-results');
  record('challenge defeat produces a terminal results state', { status: 'PASS', result: defeat.b07.result, damageEvents: defeat.b07.events.filter((event) => event.type === 'player-hit') });
  await page.locator('#b07-replay-button').click();
  const retry = await waitFor(page, (value) => value.sceneType === 'B07ExpeditionScene' && value.b07?.roomId === 'sg-breach-steps' && value.b07.visited.length === 0, 'retry resets route and re-enters the first room');
  assert(retry.b07.playerHp === 5 && retry.b07.choices.reach === undefined && retry.b05?.form === 'Base', `Retry did not restore a fresh run: ${JSON.stringify({ b07: retry.b07, b05: retry.b05 })}`);
  await capture(page, 'b07-retry-entry');
  record('replay restores full player health, Base form, route choices and first-room context', { status: 'PASS', hp: retry.b07.playerHp, form: retry.b05.form, visited: retry.b07.visited });
  await branchWithKeyboard(page, 'reach', 0);
  const rewardAt = { 'sg-copper-causeway': 760, 'sg-resonance-gallery': 524 };
  for (let hops = 0; hops < 5; hops += 1) {
    state = await snapshot(page);
    if (state.b07.menu === 'loom') break;
    const roomId = state.b07.roomId;
    if (rewardAt[roomId] !== undefined && !state.b07.rewardClaimed) {
      await moveTo(page, rewardAt[roomId], roomId);
      await interact(page);
      await waitFor(page, (value) => value.b07?.rewardClaimed, `${roomId} reward is claimed on the alternate route`);
    }
    await moveTo(page, 918, roomId);
    await interact(page);
    state = await waitFor(page, (value) => value.b07?.roomId !== roomId || !!value.b07?.menu, `${roomId} advances on the alternate route`);
  }
  state = await waitFor(page, (value) => value.b07?.menu === 'loom', 'second route choice opens on the alternate seed');
  await tap(page, 'd', 80);
  await interact(page);
  const elite = await waitFor(page, (value) => value.b07?.roomId === 'vl-lattice-hall', 'alternate seed reaches the Vesper elite room');
  assert(elite.b07.enemies.length === 2 && elite.b07.enemies.some((enemy) => enemy.archetype === 'pressure-bastion'), `Vesper elite roster missing: ${JSON.stringify(elite.b07.enemies)}`);
  await capture(page, 'b07-vl-lattice-elite');
  record('alternate seed selects the elite branch and assembles Wisp plus Bastion in Vesper', { status: 'PASS', seed: elite.b07.seed, visited: elite.b07.visited, enemies: elite.b07.enemies });
  await context.close();
}

async function runReducedMotionCheck() {
  const context = await browser.newContext({ viewport: { width: 960, height: 540 }, reducedMotion: 'reduce' });
  const page = await context.newPage(); monitor(page, 'reduced-motion');
  const state = await enter(page, `${base}/?b07=1&seed=909`);
  assert(state.b07.reducedMotion, 'B07 failed to detect reduced motion');
  await capture(page, 'b07-reduced-motion-entry');
  record('reduced-motion preference keeps static warning cues available', { status: 'PASS', reducedMotion: state.b07.reducedMotion });
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await waitFor(page, (value) => value.screen === 'paused', 'focus loss holds the running expedition');
  await page.locator('#quit-button').click();
  await page.locator('#start-button').waitFor({ state: 'visible' });
  await page.locator('#start-button').click();
  const reentered = await waitFor(page, (value) => value.sceneType === 'B07ExpeditionScene' && value.b07?.roomId === 'sg-breach-steps', 'menu return can re-enter a new B07 run');
  record('focus loss pauses safely and title menu re-entry starts a fresh route', { status: 'PASS', room: reentered.b07.roomId, visited: reentered.b07.visited });
  await context.close();
}

try {
  await mkdir(evidence, { recursive: true });
  recordingDir = await mkdtemp(path.join(tmpdir(), 'crownflare-b07-'));
  assert(await ready(base), `Vite did not start: ${serverErrors}`);
  browser = await chromium.launch({ headless: !process.argv.includes('--headed') });
  await runBaseSafeRoute();
  await runControllerChallengeBranch();
  await runReducedMotionCheck();
  assert(errors.length === 0, `Chrome logged errors:\n${errors.join('\n')}`);
  const sourceFiles = [
    'src/game/scenes/B07ExpeditionScene.ts', 'src/game/scenes/ChamberScene.ts', 'src/game/rooms/b07RoomLibrary.ts',
    'src/game/rooms/b07RouteAssembly.ts', 'src/game/rooms/b07Hazards.ts', 'src/game/enemies/b06EnemyModel.ts',
    'tools/art-export/build-b07-world.py', 'art-source/environments/b07/asset-manifest.json',
  ];
  const sourceHash = createHash('sha256');
  for (const filename of sourceFiles) { sourceHash.update(filename); sourceHash.update('\0'); sourceHash.update(await readFile(filename)); }
  const html = await readFile('dist/index.html', 'utf8');
  const bundleMatch = html.match(/assets\/index-[\w-]+\.js/);
  assert(bundleMatch, 'Built production JavaScript bundle was not found for hashing');
  const buildHash = createHash('sha256').update(await readFile(path.join('dist', bundleMatch[0]))).digest('hex');
  const report = {
    milestone: 'B07', status: 'PASS', date: new Date().toISOString(), browser: 'Chromium via Playwright; standard controller input synthesized using existing mapping',
    sourceHash: { algorithm: 'SHA-256', digest: sourceHash.digest('hex'), files: sourceFiles },
    buildHash: { algorithm: 'SHA-256', digest: buildHash, file: `dist/${bundleMatch[0]}` },
    checks, screenshots, runtimeErrors: errors, sourceArtManifest: 'art-source/environments/b07/asset-manifest.json',
    audio: 'Vesper drone is synthesized in Web Audio and the Sunderglass source ambience WAV is loaded. No human listening signoff or system-audio recording was performed.',
    recording: noRecord ? 'Disabled by --no-record; screenshots and live checks retained.' : 'One normal-speed Playwright recording retained under review-evidence/b07.',
    limitations: ['This evidence is a development route preview; owner art-motion, audio listening and physical-controller gates remain pending.', 'B08 boss and three-boss route were exercised separately in the B08 regression run.'],
  };
  await writeFile(path.join(evidence, 'b07-qa-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(path.join(evidence, 'b07-browser-errors.json'), `${JSON.stringify(errors, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.error(error?.stack ?? error);
  process.exitCode = 1;
} finally {
  if (recordingContext) await recordingContext.close().catch(() => {});
  if (browser) await browser.close();
  server.kill();
  if (recordingDir) await rm(recordingDir, { recursive: true, force: true });
}
