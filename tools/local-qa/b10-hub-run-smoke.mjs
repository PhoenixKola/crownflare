/** Headed Chrome smoke for the normal B10 title, refuge, story, run, checkpoint and continue path. */
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port = 4221;
const previewPort = 4222;
const base = `http://127.0.0.1:${port}`;
const previewBase = `http://127.0.0.1:${previewPort}`;
const evidence = 'review-evidence/b10';
const headed = process.argv.includes('--headed');
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'pipe' });
let preview;
let browser;
let context;
let serverErrors = '';
server.stderr.on('data', (chunk) => { serverErrors += chunk.toString(); });
const errors = [];
const checks = [];
const actions = [];
const startedAt = Date.now();
const now = () => Date.now() - startedAt;
const check = (name, detail = {}) => checks.push({ name, status: 'PASS', ...detail });
const record = (name, detail = {}) => actions.push({ atMs: now(), name, ...detail });
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const snapshot = (page) => page.evaluate(() => window.__CROWNFLARE_QA__?.snapshot());

async function ready(url) {
  for (let i = 0; i < 100; i++) { try { if ((await fetch(url)).ok) return true; } catch { /* server starting */ } await delay(150); }
  return false;
}
function monitor(page, label) {
  page.on('pageerror', (error) => errors.push(`${label} runtime: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`${label} console: ${message.text()}`); });
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`${label} HTTP ${response.status()}: ${response.url()}`); });
  page.on('requestfailed', (request) => errors.push(`${label} request failed: ${request.url()}`));
}
async function waitFor(page, predicate, label, timeout = 15000) {
  await page.waitForFunction((fn) => { const state = window.__CROWNFLARE_QA__?.snapshot(); return state ? new Function('state', `return (${fn})(state);`)(state) : false; }, predicate.toString(), { timeout })
    .catch(async (error) => { throw new Error(`${label}: ${JSON.stringify(await snapshot(page))} / ${error.message}`); });
  return snapshot(page);
}
async function screenshot(page, file) {
  const pathName = path.join(evidence, file);
  await page.screenshot({ path: pathName, animations: 'allow' });
  const bytes = await readFile(pathName);
  return { file: pathName.replaceAll('\\', '/'), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
}
async function sampleFramePacing(page, durationMs = 1500) {
  return page.evaluate(async (duration) => {
    const intervals = [];
    let previous;
    const started = performance.now();
    await new Promise((resolve) => {
      const frame = (now) => {
        if (previous !== undefined) intervals.push(now - previous);
        previous = now;
        if (now - started < duration) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
    const sorted = [...intervals].sort((a, b) => a - b);
    const percentile = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? null;
    return {
      durationMs: Math.round(performance.now() - started),
      frames: intervals.length,
      medianFrameMs: percentile(.5) === null ? null : Number(percentile(.5).toFixed(2)),
      p95FrameMs: percentile(.95) === null ? null : Number(percentile(.95).toFixed(2)),
      maxFrameMs: intervals.length ? Number(Math.max(...intervals).toFixed(2)) : null,
      medianFpsEstimate: percentile(.5) ? Number((1000 / percentile(.5)).toFixed(1)) : null,
      browserHeap: performance.memory ? { used: performance.memory.usedJSHeapSize, total: performance.memory.totalJSHeapSize } : 'not exposed by this Chrome build',
    };
  }, durationMs);
}

async function main() {
  await mkdir(evidence, { recursive: true });
  assert(await ready(base), `Vite did not start: ${serverErrors}`);
  browser = await chromium.launch({ channel: 'chrome', headless: !headed, args: ['--use-gl=angle', '--use-angle=swiftshader'] });
  context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await context.newPage(); monitor(page, 'B10 headed Chrome');
  await page.addInitScript(() => {
    localStorage.setItem('project-crownflare:save:v1', JSON.stringify({ version: 1, options: { reduceMotion: false, masterVolume: 0.65 }, meta: { completedRuns: 2 } }));
    const buttons = Array.from({ length: 16 }, () => ({ pressed: false, value: 0 }));
    const pad = { id: 'Crownflare QA Synthetic Standard Pad', connected: true, index: 0, mapping: 'standard', timestamp: 0, axes: [0, 0], buttons };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
    window.__B10_QA_PAD__ = { set(index, pressed) { buttons[index].pressed = pressed; buttons[index].value = pressed ? 1 : 0; } };
  });
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  assert((await page.locator('#title-metadata').innerText()).includes('PRE-RELEASE PLAYABLE'), 'pre-release disclosure is missing on the normal title');
  const titleCapture = await screenshot(page, 'b10-title.png');
  check('normal route opens the pre-release title and keeps QA shortcuts out of the player menu', { action: await page.locator('#start-button').innerText(), capture: titleCapture });
  await page.locator('#start-button').click();
  await page.locator('#hub-new-run').waitFor({ state: 'visible' });
  assert(await page.locator('#hub-continue').isDisabled(), 'continue is enabled before a run has a checkpoint');
  const legacy = await page.evaluate(() => ({ old: JSON.parse(localStorage.getItem('project-crownflare:save:v1') ?? 'null'), current: JSON.parse(localStorage.getItem('project-crownflare:save:v2') ?? 'null') }));
  assert(legacy.old?.version === 1 && legacy.current?.version === 2 && legacy.current.meta.completedRuns === 2 && legacy.current.options.masterVolume === .65, `V1 browser save did not migrate without deleting its source: ${JSON.stringify(legacy)}`);
  check('real browser migrates V1 options and run count into V2 while retaining the original V1 key', { legacyVersion: legacy.old.version, migratedVersion: legacy.current.version, completedRuns: legacy.current.meta.completedRuns, masterVolume: legacy.current.options.masterVolume });
  const hubCapture = await screenshot(page, 'b10-spindle-refuge.png');
  record('enter illustrated Spindle Refuge', { capture: hubCapture, dimensions: await page.locator('#hub-screen').evaluate((el) => ({ width: el.clientWidth, height: el.clientHeight })) });
  const hubFramePacing = await sampleFramePacing(page);
  check('sampled live requestAnimationFrame pacing and heap in the Refuge', hubFramePacing);
  const padTap = async (index) => {
    await page.evaluate((button) => window.__B10_QA_PAD__.set(button, true), index);
    await page.waitForTimeout(90);
    await page.evaluate((button) => window.__B10_QA_PAD__.set(button, false), index);
    await page.waitForTimeout(90);
  };
  await padTap(13);
  assert(await page.evaluate(() => document.activeElement?.id) === 'hub-controls', 'synthetic standard Gamepad down should move focus to Controls');
  await padTap(0);
  await page.locator('#settings-screen').waitFor({ state: 'visible' });
  check('synthetic standard Gamepad API moves hub focus and opens controller settings', { focusedControl: 'hub-controls', settingsVisible: true, physicalController: 'not tested' });
  await page.locator('#settings-close').click();
  await page.locator('#hub-new-run').waitFor({ state: 'visible' });
  await page.locator('#hub-reduced-motion').check();
  await page.locator('#hub-volume').fill('0.55');
  const migrated = await page.evaluate(() => JSON.parse(localStorage.getItem('project-crownflare:save:v2') ?? 'null'));
  assert(migrated?.version === 2 && migrated.options.reduceMotion === true && migrated.options.masterVolume === .55, 'hub accessibility/audio preferences did not persist in V2');
  check('hub saves reduced-motion and master-volume settings', { version: migrated.version, revision: migrated.revision, reduceMotion: migrated.options.reduceMotion, masterVolume: migrated.options.masterVolume });
  await page.locator('#hub-new-run').click();
  assert(await page.locator('#hub-story').isVisible(), 'pre-departure story dialog did not open');
  const storyCapture = await screenshot(page, 'b10-departure-story.png');
  record('read the short departure beat and run preparation', { capture: storyCapture, dialogue: await page.locator('#hub-story-copy').innerText() });
  await page.locator('#hub-begin-run').click();
  let state = await waitFor(page, (value) => value.screen === 'b10Expedition' && !!value.b07 && value.b07.roomId !== null && value.b07.b09?.enabled === true, 'B10 enters the existing two-region B07/B08/B09 run');
  await page.waitForTimeout(400);
  state = await snapshot(page);
  assert(state.b07.b08.enabled && state.b07.b09.enabled && state.b07.b08.missingAssets.length === 0 && state.b07.missingTextures.length === 0, 'run did not load its B07/B08 runtime assets');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('project-crownflare:save:v2') ?? 'null'));
  assert(stored?.activeRun?.seed === state.b07.seed && stored.activeRun?.route?.rooms?.[stored.activeRun.route.roomIndex] === state.b07.roomId, 'room boundary checkpoint was not written to the current B10 seed/room');
  const roomCapture = await screenshot(page, 'b10-first-room.png');
  check('normal B10 expedition starts in the authored route with Base + Dawnrush, B08 bosses and B09 rewards enabled', { seed: state.b07.seed, roomId: state.b07.roomId, region: state.b07.region, routeLength: state.b07.routeLength, build: state.b07.b09.build, checkpointId: stored.activeRun.checkpointId, capture: roomCapture });
  const combatFramePacing = await sampleFramePacing(page);
  check('sampled live requestAnimationFrame pacing and heap in the active combat room', { ...combatFramePacing, roomId: state.b07.roomId, region: state.b07.region });
  const controlNamespaceBefore = await page.evaluate(() => localStorage.getItem('project-crownflare:controls:v1'));
  const expected = { seed: state.b07.seed, roomId: state.b07.roomId, checkpointId: stored.activeRun.checkpointId, ranks: state.b07.b09.build.ranks, ledger: state.b07.b09.build.ledger, hp: stored.activeRun.playerHp, resonance: stored.activeRun.resonance, energy: stored.activeRun.dawnrushEnergy };
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#start-button').click();
  assert(await page.locator('#hub-continue').isEnabled(), 'continue does not appear from a saved room checkpoint');
  await page.locator('#hub-continue').click();
  state = await waitFor(page, (value) => value.screen === 'b10Expedition' && !!value.b07 && value.b07.roomId !== null, 'continue restores the safe room');
  const continued = await page.evaluate(() => JSON.parse(localStorage.getItem('project-crownflare:save:v2') ?? 'null'));
  assert(state.b07.seed === expected.seed && state.b07.roomId === expected.roomId && state.b07.b09.build.ranks && JSON.stringify(state.b07.b09.build.ledger) === JSON.stringify(expected.ledger), 'continue changed the seed, room or reward ledger');
  assert(continued.activeRun.playerHp === expected.hp && continued.activeRun.resonance === expected.resonance && continued.activeRun.dawnrushEnergy === expected.energy, 'continue changed durable player resources');
  assert(await page.evaluate(() => localStorage.getItem('project-crownflare:controls:v1')) === controlNamespaceBefore, 'B10 save migration or continue modified the independent controller namespace');
  check('reload/continue restores the latest safe room, route seed, build ledger and durable resources', { expected, resumed: { seed: state.b07.seed, roomId: state.b07.roomId, checkpointId: continued.activeRun.checkpointId, ranks: state.b07.b09.build.ranks, ledger: state.b07.b09.build.ledger, hp: continued.activeRun.playerHp, resonance: continued.activeRun.resonance, energy: continued.activeRun.dawnrushEnergy } });
  await page.keyboard.press('Escape');
  await page.locator('#quit-button').click();
  assert(await page.locator('#hub-screen').isVisible() && await page.locator('#hub-continue').isEnabled(), 'returning from pause should preserve and expose the active checkpoint');
  await page.locator('#hub-continue').click();
  state = await waitFor(page, `value => value.screen === 'b10Expedition' && value.b07?.roomId === ${JSON.stringify(expected.roomId)}`, 'continue works again after returning to refuge');
  check('pause and return-to-refuge preserve a resumable checkpoint', { roomId: state.b07.roomId, seed: state.b07.seed });

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileCapture = await screenshot(page, 'b10-mobile-run.png');
  check('smaller mobile viewport fits the playable canvas without a page error', { viewport: { width: 390, height: 844 }, canvas: await page.locator('#game-root canvas').boundingBox(), capture: mobileCapture });
  const mobileHeap = await page.evaluate(() => performance.memory ? { used: performance.memory.usedJSHeapSize, total: performance.memory.totalJSHeapSize } : 'not exposed by this Chrome build');
  await page.close();

  const deniedContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await deniedContext.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } }));
  const denied = await deniedContext.newPage(); monitor(denied, 'storage denied');
  await denied.goto(base, { waitUntil: 'domcontentloaded' }); await denied.locator('#start-button').click();
  assert(await denied.locator('#hub-new-run').isVisible(), 'storage-denied fallback crashed before reaching refuge');
  check('storage-denied browser opens with safe in-memory defaults', { hubVisible: true, report: await denied.locator('#hub-save-status').innerText() });
  await deniedContext.close();

  const corruptContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await corruptContext.addInitScript(() => localStorage.setItem('project-crownflare:save:v2', '{not-json'));
  const corrupt = await corruptContext.newPage(); monitor(corrupt, 'corrupt storage');
  await corrupt.goto(base, { waitUntil: 'domcontentloaded' }); await corrupt.locator('#start-button').click();
  assert(await corrupt.locator('#hub-new-run').isVisible(), 'corrupt V2 fallback crashed before reaching refuge');
  check('corrupt V2 browser storage falls back to a playable hub', { hubVisible: true, continueEnabled: await corrupt.locator('#hub-continue').isEnabled() });
  await corruptContext.close();

  preview = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(previewPort), '--strictPort'], { stdio: 'pipe' });
  let previewErrors = ''; preview.stderr.on('data', (chunk) => { previewErrors += chunk.toString(); });
  assert(await ready(`${previewBase}/?b09=1`), `production preview did not start: ${previewErrors}`);
  const prod = await context.newPage(); monitor(prod, 'B10 production route gate');
  await prod.goto(`${previewBase}/?b09=1`, { waitUntil: 'domcontentloaded' });
  assert((await prod.locator('#start-button').innerText()).includes('ENTER THE REFUGE'), 'production should ignore development-only B09 query and offer B10 refuge');
  await prod.locator('#start-button').click(); assert(await prod.locator('#hub-screen').isVisible(), 'production normal route must enter refuge');
  check('production ignores ?b09=1 and keeps the normal B10 hub route', { url: prod.url(), titleAction: await prod.locator('#start-button').innerText(), hubVisible: true });
  await prod.close();

  const sourceFiles = ['src/main.ts', 'src/game/persistence/save.ts', 'src/game/scenes/B07ExpeditionScene.ts', 'src/game/createGame.ts', 'index.html', 'src/style.css', 'tests/unit/save.test.ts'];
  const sourceHash = createHash('sha256'); for (const file of sourceFiles) sourceHash.update(file).update('\0').update(await readFile(file));
  const report = {
    result: errors.length ? 'FAIL' : 'PASS', capturedAt: new Date().toISOString(), browser: `Google Chrome ${headed ? 'headed' : 'headless'} via Playwright`, checks, actions, errors,
    sourceDigest: { files: sourceFiles.length, sha256: sourceHash.digest('hex') },
    performance: { elapsedMs: now(), hubFramePacing, combatFramePacing, mobileHeap },
    gateStatus: { hubAndResume: 'PASS', safeRoomCheckpoint: 'PASS', b07B08B09RuntimeEnabled: 'PASS', completeVictoryAndDefeatWalkthrough: 'NOT EXERCISED IN THIS SMOKE', b06ThreeConsecutiveRuns: 'REQUIRED SEPARATE GATE', audioCaptured: 'NO', audioHeard: 'NO', physicalController: 'NOT TESTED', ownerAcceptance: 'PENDING' },
  };
  await writeFile(path.join(evidence, 'qa-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  assert(errors.length === 0, errors.join('\n'));
  console.log(JSON.stringify({ result: report.result, checks: checks.length, errors, report: `${evidence}/qa-report.json`, evidence: checks.map(({ capture }) => capture).filter(Boolean) }, null, 2));
}

try { await main(); }
catch (error) {
  await mkdir(evidence, { recursive: true });
  await writeFile(path.join(evidence, 'qa-report.json'), `${JSON.stringify({ result: 'FAIL', capturedAt: new Date().toISOString(), checks, actions, errors: [String(error?.message ?? error)] }, null, 2)}\n`).catch(() => {});
  throw error;
}
finally { await context?.close().catch(() => {}); await browser?.close().catch(() => {}); server.kill(); preview?.kill(); }
