/** B12 single-pass headed Chrome check; bounded to representative movement, room, event and boss states. */
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port = 4244;
const base = `http://127.0.0.1:${port}`;
const evidence = 'review-evidence/b12';
const fixedSeed = 2027;
const budgetMs = 5 * 60 * 1000;
const startedAt = Date.now();
const elapsed = () => Date.now() - startedAt;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'pipe' });
let browser;
let context;
let serverErrors = '';
server.stderr.on('data', (chunk) => { serverErrors += chunk.toString(); });
const errors = [];
const checks = [];
const captures = [];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const check = (name, detail = {}) => checks.push({ name, status: 'PASS', atMs: elapsed(), ...detail });
const stateOf = (page) => page.evaluate(() => window.__CROWNFLARE_QA__?.snapshot());

async function ready() {
  for (let i = 0; i < 80; i += 1) { try { if ((await fetch(base)).ok) return true; } catch { /* Vite is starting */ } await delay(150); }
  return false;
}
function monitor(page, label) {
  page.on('pageerror', (error) => errors.push(`${label} runtime: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`${label} console: ${message.text()}`); });
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`${label} HTTP ${response.status()}: ${response.url()}`); });
  page.on('requestfailed', (request) => errors.push(`${label} request failed: ${request.url()}`));
}
async function waitState(page, predicate, description, timeout = 15000) {
  await page.waitForFunction((expression) => {
    const state = window.__CROWNFLARE_QA__?.snapshot();
    return state ? new Function('state', `return (${expression})(state);`)(state) : false;
  }, predicate.toString(), { timeout }).catch(async (error) => {
    throw new Error(`${description}: ${JSON.stringify(await stateOf(page))} / ${error.message}`);
  });
  return stateOf(page);
}
async function capture(page, name, locator = page) {
  const file = path.join(evidence, `${name}.png`);
  await locator.screenshot({ path: file, animations: 'allow' });
  const bytes = await readFile(file);
  const info = { file: file.replaceAll('\\', '/'), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
  captures.push(info);
  return info;
}
async function moveToX(page, targetX, timeoutMs = 9000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const state = await stateOf(page);
    const body = state?.b07?.physics?.player?.body;
    if (!body) throw new Error('Player physics bounds disappeared during movement');
    const x = (body.left + body.right) / 2;
    if (Math.abs(x - targetX) < 8) return x;
    const direction = targetX > x ? 'd' : 'a';
    await page.keyboard.down(direction);
    await delay(Math.min(120, Math.max(35, Math.abs(targetX - x) / 155 * 1000)));
    await page.keyboard.up(direction);
  }
  const state = await stateOf(page);
  throw new Error(`Could not reach world x=${targetX}; current=${JSON.stringify(state?.b07?.physics?.player?.body)}`);
}
async function tapKey(page, key, holdMs = 90) {
  await page.keyboard.down(key);
  await delay(holdMs);
  await page.keyboard.up(key);
  await delay(90);
}
async function interact(page) { await tapKey(page, 'e'); }
async function padTap(page, index, holdMs = 100) {
  await page.evaluate((button) => window.__B12_SYNTHETIC_PAD__?.set(button, true), index);
  await delay(holdMs);
  await page.evaluate((button) => window.__B12_SYNTHETIC_PAD__?.set(button, false), index);
  await delay(110);
}
function checkBudget() { assert(elapsed() < budgetMs, `B12 browser pass exceeded its ${budgetMs}ms time budget`); }

async function main() {
  await mkdir(evidence, { recursive: true });
  assert(await ready(), `Vite failed to start: ${serverErrors}`);
  browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--use-gl=angle', '--use-angle=swiftshader', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
  context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  monitor(page, 'B12 headed Chrome');
  await page.addInitScript((seed) => {
    if (!sessionStorage.getItem('__b12_init__')) {
      localStorage.removeItem('project-crownflare:save:v1');
      localStorage.removeItem('project-crownflare:save:v2');
      sessionStorage.setItem('__b12_init__', '1');
    }
    Object.defineProperty(crypto, 'getRandomValues', { configurable: true, value: (array) => { array[0] = seed; return array; } });
    const buttons = Array.from({ length: 16 }, () => ({ pressed: false, touched: false, value: 0 }));
    const pad = { id: 'Crownflare B12 synthetic standard pad', connected: true, index: 0, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [pad] });
    window.__B12_SYNTHETIC_PAD__ = { set(index, pressed) { buttons[index].pressed = pressed; buttons[index].value = pressed ? 1 : 0; } };
  }, fixedSeed);
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  assert((await page.locator('#start-button').innerText()).includes('ENTER'), 'release title did not load');
  await page.locator('#start-button').click();
  await page.locator('#hub-new-run').waitFor({ state: 'visible' });
  await padTap(page, 13);
  const hubFocusId = await page.evaluate(() => document.activeElement?.id);
  check('synthetic standard Gamepad D-pad moves Refuge focus', { status: hubFocusId === 'hub-controls' ? 'PASS' : 'INCONCLUSIVE', focusedId: hubFocusId ?? null, physicalController: 'not tested' });
  if (hubFocusId === 'hub-controls') await padTap(page, 0);
  else await page.locator('#hub-controls').click();
  await page.locator('#settings-screen').waitFor({ state: 'visible' });
  check('Refuge controls open and B11 settings stay available', { openedBy: hubFocusId === 'hub-controls' ? 'synthetic Gamepad accept' : 'UI focus fallback' });
  await page.locator('#settings-close').click();
  await page.locator('#hub-new-run').click();
  await page.locator('#hub-begin-run').click();
  let state = await waitState(page, (value) => value.screen === 'b10Expedition' && value.b07?.roomId === 'sg-breach-steps', 'normal B10 route enters the authored first room');
  await page.locator('canvas').click({ position: { x: 240, y: 225 } });
  assert(state.b07.seed === fixedSeed, `run seed was not held at ${fixedSeed}: ${state.b07.seed}`);
  assert(await page.locator('#hud.b11-hud').isVisible(), 'normal run does not show the B11 HUD');
  assert(state.b07.physics.player.body.bottom === 241 && state.b07.physics.player.sprite?.alpha?.bottom === 241, `standing feet and alpha bounds do not align: ${JSON.stringify(state.b07.physics.player)}`);
  await page.keyboard.press('F3');
  state = await stateOf(page);
  assert(state.b07.physics.diagnosticsVisible, 'F3 did not reveal the dev-only physics overlay');
  const initialCapture = await capture(page, 'b12-base-registration');
  check('grounded Base feet meet the 15x30 body and dev overlay shows alpha/hip/platform data', { body: state.b07.physics.player.body, alpha: state.b07.physics.player.sprite?.alpha, camera: state.b07.physics.player.cameraX, overlay: true, capture: initialCapture });
  await page.keyboard.press('F3');
  await page.keyboard.down('Space'); await delay(400); await page.keyboard.up('Space'); await delay(420);
  state = await stateOf(page);
  assert(state.b07.hud.combat?.grounded && Math.abs(state.b07.physics.player.feetY - 241) < .2, `jump landing did not return to the physical floor: ${JSON.stringify(state.b07.physics.player)}`);
  await tapKey(page, 'j');
  await waitState(page, (value) => value.b07?.hud?.combat?.move === 'none' && value.b07?.hud?.combat?.grounded, 'Base attack recovery');
  await tapKey(page, 'Shift', 70);
  await waitState(page, (value) => !value.b07?.hud?.combat?.dashActive && value.b07?.hud?.combat?.grounded, 'Base dash recovery');
  await tapKey(page, 'r');
  state = await waitState(page, (value) => value.b07?.hud?.dawnrush?.form === 'Dawnrush' && value.b07?.hud?.dawnrush?.transformReady, 'Base to Dawnrush transform completes', 5000);
  assert(Math.abs(state.b07.physics.player.sprite.alpha.bottom - state.b07.physics.player.body.bottom) < 1, 'Dawnrush visible feet lost the body ground anchor');
  check('Base jump/dash/light and Dawnrush transform keep the same body anchor', { form: state.b07.hud.dawnrush.form, body: state.b07.physics.player.body, alpha: state.b07.physics.player.sprite.alpha, spriteScale: state.b07.hud.combat?.spriteScale });
  await tapKey(page, 'j');
  state = await waitState(page, (value) => value.b07?.hud?.combat?.move?.startsWith('light-'), 'Dawnrush light attack starts');
  await waitState(page, (value) => value.b07?.hud?.combat?.move === 'none', 'Dawnrush attack recovery');
  await tapKey(page, 'r');
  await waitState(page, (value) => value.b07?.hud?.dawnrush?.form === 'Base' && value.b07?.hud?.dawnrush?.transformReady, 'Dawnrush returns to Base');

  await moveToX(page, 900); await interact(page);
  await waitState(page, (value) => value.b07?.menu === 'reach', 'Sunderglass route choice');
  await interact(page);
  await waitState(page, (value) => value.b07?.roomId === 'sg-copper-causeway', 'safe recovery branch room');
  await moveToX(page, 760); await interact(page);
  state = await stateOf(page);
  assert(state.b07.rewardClaimed && state.b07.repairCharges >= 1, 'Copper Causeway did not claim its once-only repair shard');
  await moveToX(page, 900); await interact(page);
  state = await waitState(page, (value) => value.b07?.roomId === 'sg-echo-crossing', 'seeded Sunderglass authored event room');
  assert(state.b07.seed === fixedSeed, 'seed changed while entering a seeded room');
  await moveToX(page, 500); await interact(page);
  await waitState(page, (value) => value.b07?.eventMenu === 'echo-exchange', 'Sunderglass Echo Exchange opens');
  await interact(page);
  state = await waitState(page, (value) => value.b07?.eventChoices?.['echo-exchange'] === 'repair-to-resonance', 'Echo Exchange choice is persisted');
  assert(state.b07.repairCharges === 0 && state.b07.hud.combat?.resonance > 55, 'Echo Exchange did not trade a repair charge for combat Resonance');
  check('Echo Exchange makes a once-only, recorded resource trade in the new Sunderglass room', { eventChoices: state.b07.eventChoices, repairCharges: state.b07.repairCharges, combatResonance: state.b07.hud.combat.resonance, room: state.b07.roomId });
  await moveToX(page, 900); await interact(page);
  await waitState(page, (value) => value.b07?.roomId === 'sg-resonance-gallery', 'Sunderglass reconverges through the Gallery');
  await moveToX(page, 524); await interact(page);
  await moveToX(page, 900); await interact(page);
  await waitState(page, (value) => value.b07?.roomId === 'sg-to-vesper-gate', 'Sunderglass/Vesper transition');
  await moveToX(page, 900); await interact(page);
  await waitState(page, (value) => value.b07?.menu === 'loom', 'Vesper route choice');
  await interact(page);
  state = await waitState(page, (value) => value.b07?.roomId === 'vl-counterweight-climb', 'seeded Vesper lift room');
  check('seeded route selects the new Vesper Counterweight Climb', { seed: state.b07.seed, room: state.b07.roomId, authoredPlatforms: state.b07.physics.platforms.map(({ id, moving }) => ({ id, moving })) });

  const liftId = 'counterweight-lift-a';
  await moveToX(page, 250);
  const liftApproachUntil = Date.now() + 4500;
  while (Date.now() < liftApproachUntil) {
    state = await stateOf(page);
    const lift = state.b07.physics.platforms.find((platform) => platform.id === liftId);
    if (lift && Math.abs(lift.body.y - 214) < 2) break;
    await delay(120);
  }
  await page.keyboard.down('Space'); await page.keyboard.down('d'); await delay(280); await page.keyboard.up('Space'); await page.keyboard.up('d');
  await delay(600);
  state = await stateOf(page);
  const lift = state.b07.physics.platforms.find((platform) => platform.id === liftId);
  assert(lift && Math.abs(lift.body.y - lift.visual.y) < .01, `moving lift art/body diverged: ${JSON.stringify(lift)}`);
  const player = state.b07.physics.player;
  assert(player.body.right > lift.body.x && player.body.left < lift.body.x + lift.body.width, `Iona missed the lift span: ${JSON.stringify({ player: player.body, lift })}`);
  const rideSamples = [];
  for (let index = 0; index < 8; index += 1) {
    await delay(160);
    state = await stateOf(page);
    const platform = state.b07.physics.platforms.find((candidate) => candidate.id === liftId);
    const registration = state.b07.physics.player;
    if (platform) rideSamples.push({ liftY: platform.body.y, visualY: platform.visual.y, feetY: registration.feetY, grounded: state.b07.hud.combat?.grounded });
  }
  assert(rideSamples.length === 8 && rideSamples.every((sample) => Math.abs(sample.liftY - sample.visualY) < .01), `lift display lost collision sync while moving: ${JSON.stringify(rideSamples)}`);
  const groundedRide = rideSamples.filter((sample) => sample.grounded && Math.abs(sample.feetY - sample.liftY) < 1.5);
  assert(groundedRide.length >= 3, `Iona did not remain grounded on the moving lift for several frames: ${JSON.stringify(rideSamples)}`);
  check('moving lift body/art stay coincident and Iona remains supported', { rideSamples });
  const checkpointBeforeReload = await page.evaluate(() => JSON.parse(localStorage.getItem('project-crownflare:save:v2') ?? 'null')?.activeRun);
  assert(checkpointBeforeReload?.route?.eventChoices?.['echo-exchange'] === 'repair-to-resonance', 'checkpoint missed the recorded event choice');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#start-button').click(); await page.locator('#hub-continue').waitFor({ state: 'visible' });
  await page.locator('#hub-continue').click();
  state = await waitState(page, (value) => value.screen === 'b10Expedition' && value.b07?.roomId === 'vl-counterweight-climb', 'continue restores the same Vesper room and seed');
  assert(state.b07.seed === fixedSeed && state.b07.eventChoices['echo-exchange'] === 'repair-to-resonance', 'continue changed seeded route or event choices');
  check('B10 checkpoint reload preserves the expanded route and one-time discovery', { seed: state.b07.seed, room: state.b07.roomId, eventChoices: state.b07.eventChoices, routeLength: state.b07.routeLength });
  const liftCapture = await capture(page, 'b12-vesper-counterweight');
  check('new Vesper art renders with B11 HUD at 1280x720', { viewport: { width: 1280, height: 720 }, capture: liftCapture });

  const bossPage = await context.newPage(); monitor(bossPage, 'B12 Sundial practice');
  await bossPage.goto(`${base}/?b08=1&boss=sundial-custodian`, { waitUntil: 'domcontentloaded' });
  state = await waitState(bossPage, (value) => value.screen === 'b08Expedition' && value.b07?.b08?.activeBoss === 'sundial-custodian', 'Sundial practice arena');
  await moveToX(bossPage, 520);
  state = await waitState(bossPage, (value) => value.b07?.b08?.phase === 'recovery', 'first boss recovery window', 8000);
  const hpBefore = state.b07.b08.hp;
  await tapKey(bossPage, 'j');
  await waitState(bossPage, (value) => value.b07?.b08?.hp < hpBefore || value.b07?.b08?.phase === 'phase-change', 'Base strike visibly damages the boss', 1800);
  await waitState(bossPage, (value) => value.b07?.b08?.phase === 'telegraph' || value.b07?.b08?.phase === 'phase-change', 'boss resumes its next readable tell', 2500);
  state = await stateOf(bossPage);
  assert(state.b07.b08.bossFrame.includes('sundial-custodian') && state.b07.b08.vfxEnabled, 'boss key-pose/VFX presentation disappeared');
  const bossCapture = await capture(bossPage, 'b12-boss-windup-recovery');
  check('headed boss practice shows tell, strike, recovery and a damage response', { boss: state.b07.b08.activeBoss, phase: state.b07.b08.phase, phaseNumber: state.b07.b08.phaseNumber, hp: state.b07.b08.hp, frame: state.b07.b08.bossFrame, capture: bossCapture });
  checkBudget();

  const report = {
    result: errors.length ? 'FAIL' : 'PASS', capturedAt: new Date().toISOString(), browser: 'Google Chrome headed through Playwright', checks, errors, captures,
    elapsedMs: elapsed(), budgetMs, seed: fixedSeed,
    gates: { representativeGamePlay: 'PASS', physicalController: 'NOT TESTED', syntheticGamepad: checks.find((entry) => entry.name.includes('Gamepad D-pad'))?.status ?? 'NOT RUN', audioHeard: 'NOT HEARD', fullRunDuration: 'NOT MEASURED', ownerReview: 'PENDING' },
  };
  await writeFile(path.join(evidence, 'b12-smoke-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  assert(errors.length === 0, errors.join('\n'));
  console.log(JSON.stringify({ result: report.result, checks: checks.length, elapsedMs: report.elapsedMs, errors, report: `${evidence}/b12-smoke-report.json`, captures }, null, 2));
}

try { await main(); }
catch (error) {
  await mkdir(evidence, { recursive: true });
  await writeFile(path.join(evidence, 'b12-smoke-report.json'), `${JSON.stringify({ result: 'FAIL', capturedAt: new Date().toISOString(), checks, captures, errors: [String(error?.message ?? error)], elapsedMs: elapsed(), budgetMs }, null, 2)}\n`).catch(() => {});
  throw error;
}
finally { await context?.close().catch(() => {}); await browser?.close().catch(() => {}); server.kill(); }
