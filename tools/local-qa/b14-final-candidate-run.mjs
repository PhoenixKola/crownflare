import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port = 4287;
const base = `http://127.0.0.1:${port}`;
const evidence = path.resolve('review-evidence/b14-final');
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: ['ignore', 'pipe', 'pipe'] });
const serverOutput = [];
server.stdout.on('data', (chunk) => serverOutput.push(chunk.toString()));
server.stderr.on('data', (chunk) => serverOutput.push(chunk.toString()));
let browser;
let context;
let page;
const errors = [];
const requestsFailed = [];
const milestones = [];
const captures = [];
const roomTimes = new Map();
let wallStartedAt = 0;
let entryAt = 0;

function assert(condition, message) { if (!condition) throw new Error(message); }
async function ready() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try { if ((await fetch(base)).ok) return; } catch { /* Vite is starting */ }
    await delay(150);
  }
  throw new Error(`Vite did not start on ${base}: ${serverOutput.join('')}`);
}
function monitor(target, label) {
  target.on('pageerror', (error) => errors.push(`${label}: ${error.message}`));
  target.on('console', (message) => { if (message.type() === 'error') errors.push(`${label}: ${message.text()}`); });
  target.on('requestfailed', (request) => requestsFailed.push(`${label}: ${request.url()} / ${request.failure()?.errorText ?? 'failed'}`));
  target.on('response', (response) => { if (response.status() >= 400) requestsFailed.push(`${label}: HTTP ${response.status()} ${response.url()}`); });
}
async function snapshot() { return page.evaluate(() => window.__CROWNFLARE_QA__?.snapshot() ?? null); }
async function waitForState(predicate, label, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await snapshot();
    if (value && predicate(value)) return value;
    await delay(100);
  }
  throw new Error(`${label}: timed out; latest state=${JSON.stringify(await snapshot())}`);
}
async function capture(name) {
  const file = path.join(evidence, `${name}.png`);
  await page.screenshot({ path: file, animations: 'allow' });
  const canvasFile = path.join(evidence, `${name}-native.png`);
  const canvas = page.locator('#game-root canvas');
  const dataUrl = await canvas.count() ? await canvas.evaluate((element) => element.toDataURL('image/png')) : null;
  if (dataUrl) await writeFile(canvasFile, Buffer.from(dataUrl.split(',')[1], 'base64'));
  const bytes = await import('node:fs/promises').then(({ readFile }) => readFile(file));
  const record = { file: path.relative(process.cwd(), file).replaceAll('\\', '/'), sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length };
  if (dataUrl) record.nativeFile = path.relative(process.cwd(), canvasFile).replaceAll('\\', '/');
  captures.push(record);
  return record;
}
async function mark(label, extra = {}) {
  const state = await snapshot();
  const entry = { label, wallMs: wallStartedAt ? Date.now() - wallStartedAt : 0, activeMs: state?.b07?.runElapsedMs ?? null, roomId: state?.b07?.roomId ?? null, boss: state?.b07?.b08?.activeBoss ?? null, hp: state?.b07?.playerHp ?? null, ...extra };
  milestones.push(entry);
  console.log(`[B14 QA] ${label} ${JSON.stringify({ wallMs: entry.wallMs, activeMs: entry.activeMs, roomId: entry.roomId, boss: entry.boss, hp: entry.hp })}`);
}
function browserKey(key) {
  if (/^Key[A-Z]$/.test(key)) return key.slice(3).toLowerCase();
  if (key === 'ShiftLeft' || key === 'ShiftRight') return 'Shift';
  return key;
}
async function tap(key, pressMs = 85) { const normalized = browserKey(key); await page.keyboard.down(normalized); await delay(pressMs); await page.keyboard.up(normalized); }
async function clickIfVisible(selector) {
  const target = page.locator(selector);
  if (await target.count() && await target.first().isVisible()) { await target.first().click(); return true; }
  return false;
}
async function handleOverlay() {
  if (await page.locator('#b10-story-beat').isVisible().catch(() => false)) {
    await capture('vesper-story');
    await page.locator('#b10-story-continue').click();
    await waitForState((state) => state.b07?.roomId !== null, 'continue region story');
    return true;
  }
  if (await page.locator('#b09-choice-screen').isVisible().catch(() => false)) {
    const source = await page.locator('#b09-choice-source').innerText();
    await capture(source.includes('BOSS CLEAR') ? `upgrade-boss-${captures.length}` : `upgrade-room-${captures.length}`);
    await page.locator('.b09-choice-card').first().click();
    await waitForState((state) => state.screen !== 'b09Choice', 'claim deterministic run-build choice');
    await mark('upgrade-selected', { source });
    return true;
  }
  if (await page.locator('#b07-results').isVisible().catch(() => false)) return false;
  return false;
}

const EVENT_X = { 'sg-sunwell-terrace': 540, 'sg-echo-crossing': 500, 'vl-echo-condenser': 520 };
const REWARD_X = {
  'sg-copper-causeway': 760, 'sg-conduit-annex': 848, 'sg-emberwell-circuit': 856, 'sg-resonance-gallery': 524,
  'vl-spindle-lift': 818, 'vl-lattice-hall': 852, 'vl-condensation-vault': 840,
  'vl-counterweight-climb': 840, 'vl-cantor-pressure': 852,
};
async function enterRoomChoice(choice) {
  await capture('route-choice');
  if (choice !== 'reach' && choice !== 'loom') throw new Error(`Unexpected branch choice ${choice}`);
  if (choice === 'loom') await page.keyboard.press('ArrowRight');
  await tap('KeyE');
  await waitForState((state) => state.b07?.menu === null && state.b07?.roomId !== null, `select ${choice} route`);
  await mark('branch-selected', { branch: choice });
}
async function moveToX(target, label, timeoutMs = 18000) {
  let current = await snapshot();
  if (!current?.b07) throw new Error(`${label}: no active B07 snapshot`);
  const deadline = Date.now() + timeoutMs;
  const supports = () => (current.b07?.physics.platforms ?? [])
    .filter((platform) => (platform.body.height >= 10 || platform.moving) && platform.body.width > 30)
    .map((platform) => ({ left: platform.body.x, right: platform.body.x + platform.body.width, top: platform.body.y, moving: platform.moving }));
  if (target < (current.b07.physics.player.body.left + current.b07.physics.player.body.right) / 2) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      current = await snapshot();
      const x = current?.b07 ? (current.b07.physics.player.body.left + current.b07.physics.player.body.right) / 2 : -1;
      if (x <= target + 20) break;
      const duration = Math.min(260, Math.max(75, Math.round((x - target - 12) / 190 * 700)));
      await page.keyboard.down('a'); await delay(duration); await page.keyboard.up('a');
      await delay(40);
    }
    current = await snapshot();
    const finalX = current?.b07 ? (current.b07.physics.player.body.left + current.b07.physics.player.body.right) / 2 : -1;
    assert(finalX >= target - 40 && finalX <= target + 40, `${label}: expected x near ${target}, reached ${finalX} in ${timeoutMs}ms`);
    return;
  }
  await page.keyboard.down('d');
  let lastJumpAt = 0;
  try {
    while (Date.now() < deadline) {
      if (await handleOverlay()) { current = await snapshot(); continue; }
      current = await snapshot();
      if (!current?.b07 || current.screen === 'b07Results') break;
      const x = (current.b07.physics.player.body.left + current.b07.physics.player.body.right) / 2;
      if (x >= target) break;
      const grounded = current.b07.hud.combat?.grounded ?? false;
      const feet = current.b07.physics.player.body.bottom;
      const support = supports().filter((surface) => x >= surface.left - 5 && x <= surface.right + 2)
        .sort((a, b) => Math.abs(a.top - feet) - Math.abs(b.top - feet))[0];
      const onSupport = support && Math.abs(support.top - feet) <= 6 ? support : undefined;
      const next = onSupport
        ? supports().filter((surface) => surface.left > onSupport.right + 1).sort((a, b) => a.left - b.left)[0]
        : supports().filter((surface) => surface.left > x + 4).sort((a, b) => a.left - b.left)[0];
      const leavingSurface = !!onSupport && !!next && next.left - onSupport.right > 6 && x >= onSupport.right - 44;
      const recoveringFromGap = !onSupport && !!next && next.left - x < 190;
      if (grounded && (leavingSurface || recoveringFromGap) && Date.now() - lastJumpAt > 500) {
        lastJumpAt = Date.now();
        await page.keyboard.down('Space');
        await delay(150);
        await page.keyboard.up('Space');
      }
      await delay(100);
    }
  } finally { await page.keyboard.up('d'); }
  current = await snapshot();
  let finalX = current?.b07 ? (current.b07.physics.player.body.left + current.b07.physics.player.body.right) / 2 : -1;
  // Stop at the requested world-space point. An overshoot can make optional discoveries
  // impossible to open after crossing the event's interaction radius.
  for (let correction = 0; finalX > target + 26 && correction < 12; correction += 1) {
    await page.keyboard.down('a'); await delay(75); await page.keyboard.up('a');
    await delay(45);
    current = await snapshot();
    finalX = current?.b07 ? (current.b07.physics.player.body.left + current.b07.physics.player.body.right) / 2 : -1;
  }
  assert(finalX >= target - 40 && finalX <= target + 40, `${label}: expected x near ${target}, reached ${finalX} in ${timeoutMs}ms`);
}
async function interactAt(target, label) {
  await moveToX(target, label);
  const state = await snapshot();
  const x = state?.b07 ? (state.b07.physics.player.body.left + state.b07.physics.player.body.right) / 2 : -1;
  assert(Math.abs(x - target) <= 34, `${label}: interact point ${target} is ${Math.abs(x - target)}px from player at ${x}`);
  await tap('KeyE');
  await delay(120);
}
async function clickDiscoveryChoice(index) {
  const canvas = page.locator('#game-root canvas');
  const bounds = await canvas.boundingBox();
  assert(bounds, 'discovery menu canvas is not visible');
  const menuY = index === 0 ? 112 : 162;
  await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height * menuY / 270);
}
async function handleBranchMenu(state) {
  if (!state.b07?.menu) return false;
  await enterRoomChoice(state.b07.menu);
  return true;
}
async function fightEnemies(roomId) {
  let started = Date.now();
  let nextLight = 0;
  let nextHeavy = 0;
  let nextSpecial = 0;
  let nextJump = 0;
  let nextDodge = 0;
  await capture(`combat-${roomId}`);
  while (Date.now() - started < 90000) {
    if (await handleOverlay()) { started = Date.now() - 1; continue; }
    const state = await snapshot();
    if (state?.screen === 'b07Results') throw new Error(`Defeated during enemy encounter in ${roomId}`);
    if (!state?.b07) { await delay(100); continue; }
    const alive = state.b07.enemies.filter((enemy) => enemy.hp > 0);
    if (!alive.length) { await mark('room-combat-cleared', { roomId }); return; }
    const playerX = (state.b07.physics.player.body.left + state.b07.physics.player.body.right) / 2;
    const playerFeet = state.b07.physics.player.body.bottom;
    const target = [...alive].sort((a, b) => Math.abs(a.x - playerX) - Math.abs(b.x - playerX))[0];
    const difference = target.x - playerX;
    if ((target.phase === 'telegraph' || target.phase === 'commit') && Math.abs(difference) < 155 && Date.now() >= nextDodge) {
      const retreat = difference > 0 ? 'a' : 'd';
      await page.keyboard.down(retreat); await delay(115); await page.keyboard.up(retreat);
      await tap('ShiftLeft', 65);
      nextDodge = Date.now() + 900;
      await delay(80);
      continue;
    }
    const enemyHeight = { 'spindle-sentry': 46, shardrunner: 54, 'orbit-wisp': 38, 'pressure-bastion': 56, cantor: 68 }[target.archetype] ?? 48;
    const enemyFeet = target.y + enemyHeight / 2;
    if (playerFeet < enemyFeet - 30) {
      const ledge = state.b07.physics.platforms.map((platform) => platform.body)
        .find((body) => Math.abs(body.y - playerFeet) < 4 && playerX >= body.x && playerX <= body.x + body.width);
      if (ledge) {
        const rightDistance = ledge.x + ledge.width - playerX;
        const leftDistance = playerX - ledge.x;
        const direction = rightDistance < leftDistance ? 'd' : 'a';
        const distanceToEdge = Math.min(rightDistance, leftDistance) + 28;
        await page.keyboard.down(direction); await delay(Math.min(1000, Math.max(180, distanceToEdge / 155 * 1000))); await page.keyboard.up(direction);
        await delay(300);
        continue;
      }
    }
    if (Math.abs(difference) > 55) {
      await page.keyboard.down(difference > 0 ? 'd' : 'a');
      if (state.b07.hud.combat?.grounded && Math.abs(difference) > 120 && Date.now() - nextJump > 1200) {
        await page.keyboard.down('Space'); await delay(145); await page.keyboard.up('Space'); nextJump = Date.now();
      }
      await delay(115);
      await page.keyboard.up(difference > 0 ? 'd' : 'a');
    }
    if (enemyFeet < playerFeet - 28 && Math.abs(difference) < 90 && state.b07.hud.combat?.grounded && Date.now() - nextJump > 900) {
      await page.keyboard.down('Space'); await delay(145); await page.keyboard.up('Space'); nextJump = Date.now();
    }
    if (Date.now() >= nextHeavy && target.archetype === 'pressure-bastion') { await tap('KeyK'); nextHeavy = Date.now() + 950; }
    else if (Date.now() >= nextLight) { await tap('KeyJ'); nextLight = Date.now() + 320; }
    if ((state.b07.hud.combat?.resonance ?? 0) >= 35 && Date.now() >= nextSpecial && Math.abs(difference) < 88) { await tap('KeyQ'); nextSpecial = Date.now() + 1300; }
    if (state.b07.hud.combat?.playerHp && state.b07.hud.combat.playerHp <= 2) await tap('ShiftLeft', 55);
    await delay(80);
  }
  throw new Error(`Enemy encounter in ${roomId} did not clear within 90 seconds: ${JSON.stringify((await snapshot())?.b07?.enemies)}`);
}
async function fightBoss(bossId) {
  let started = Date.now();
  let nextLight = 0;
  let nextHeavy = 0;
  let nextRepair = 0;
  let hasTransformed = false;
  await mark('boss-entered', { bossId });
  await capture(`boss-${bossId}-entry`);
  while (Date.now() - started < 150000) {
    if (await handleOverlay()) { started = Date.now() - 1; continue; }
    let state = await snapshot();
    if (state?.screen === 'b07Results') throw new Error(`Defeated during ${bossId}`);
    if (!state?.b07) { await delay(100); continue; }
    const boss = state.b07.b08;
    if (!boss.activeBoss) return;
    const playerX = (state.b07.physics.player.body.left + state.b07.physics.player.body.right) / 2;
    const playerHp = state.b07.playerHp;
    if (state.b07.repairCharges > 0 && playerHp <= 3 && Date.now() >= nextRepair) { await tap('KeyE'); nextRepair = Date.now() + 1200; }
    if (!hasTransformed && state.b07.hud.dawnrush?.state === 'base' && state.b07.hud.dawnrush.energy >= 20) {
      await tap('KeyR'); hasTransformed = true; await delay(500); await capture(`boss-${bossId}-dawnrush`); continue;
    }
    let desiredX = 682;
    if (boss.phase === 'telegraph') {
      if (boss.pattern === 'glassline-sweep' || boss.pattern === 'meridian-cleave' || boss.pattern === 'daybreak-afterglow') desiredX = boss.safeX ?? 300;
      else if (boss.pattern === 'zenith-stamp' || boss.pattern === 'thread-drop') desiredX = (boss.targetX ?? 480) < 480 ? 690 : 280;
      else if (boss.pattern === 'loom-lash') desiredX = 108;
    }
    if (Math.abs(desiredX - playerX) > 24) {
      const key = desiredX > playerX ? 'd' : 'a';
      await page.keyboard.down(key); await delay(Math.min(320, Math.max(90, Math.abs(desiredX - playerX) * 2))); await page.keyboard.up(key);
    }
    if (boss.phase === 'recovery' && boss.vulnerable) {
      const x = (state.b07.physics.player.body.left + state.b07.physics.player.body.right) / 2;
      if (Math.abs((boss.bossX ?? 720) - x) < 100) {
        if (Date.now() >= nextHeavy) { await tap('KeyK'); nextHeavy = Date.now() + 780; }
        if (Date.now() >= nextLight) { await tap('KeyJ'); nextLight = Date.now() + 270; }
      }
      if (boss.phaseNumber === 2 && captures.filter((entry) => entry.file.includes(`${bossId}-phase-2`)).length === 0) await capture(`boss-${bossId}-phase-2`);
    } else if (boss.phase === 'commit' && Math.abs((boss.targetX ?? 480) - playerX) < 48) await tap('ShiftLeft', 55);
    if (playerHp <= 2) await tap('ShiftLeft', 55);
    await delay(90);
    state = await snapshot();
    if (state?.b07?.b08?.bossesCleared.includes(bossId)) {
      await mark('boss-cleared', { bossId, elapsedBossMs: Date.now() - started, playerHp: state.b07.playerHp });
      await capture(`boss-${bossId}-cleared`);
      return;
    }
  }
  throw new Error(`${bossId} did not clear within 150 seconds: ${JSON.stringify((await snapshot())?.b07?.b08)}`);
}

async function runCampaign({ reachChoice = 0, loomChoice = 0, record = false } = {}) {
  const contextOptions = { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, ...(record ? { recordVideo: { dir: evidence, size: { width: 1280, height: 720 } } } : {}) };
  context = await browser.newContext(contextOptions);
  page = await context.newPage();
  monitor(page, 'B14 headed Chrome');
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  assert((await page.locator('#title-metadata').innerText()).includes('BASE + DAWNRUSH'), 'title does not identify the shipped playable scope');
  assert(!(await page.locator('#title-screen').innerText()).match(/PRE-RELEASE|UNAPPROVED HERO ART|B13/i), 'production title contains a development disclosure');
  await capture('title');
  await page.locator('#start-button').click();
  await page.locator('#hub-screen').waitFor({ state: 'visible' });
  assert(!(await page.locator('#hub-screen').innerText()).match(/PRE-RELEASE|B13/i), 'Refuge contains a milestone/development label');
  await capture('spindle-refuge');
  await page.locator('#hub-new-run').click();
  await capture('preparation-story');
  await page.locator('#hub-begin-run').click();
  wallStartedAt = Date.now();
  let state = await waitForState((value) => value.screen === 'b10Expedition' && value.sceneActive && value.b07?.roomId === 'sg-breach-steps', 'normal menu New Run entry', 25000);
  entryAt = Date.now();
  await mark('new-run-active', { entryMs: entryAt - wallStartedAt, seed: state.b07.seed });
  await capture('entry-sg-breach-steps');
  // Show the authored Dawnrush form in the live game, then return to Base for the route.
  await tap('KeyR'); await delay(500);
  state = await snapshot();
  assert(state.b07?.hud.dawnrush?.state !== 'base', 'Dawnrush did not activate on the normal route');
  await capture('dawnrush-live');
  await tap('KeyR'); await delay(1400);
  state = await snapshot();
  await capture('base-live');
  if (process.argv.includes('--calibrate')) {
    await moveToX(870, 'calibration first-room traversal');
    await capture('calibration-gate');
    await tap('KeyE');
    const branchState = await waitForState((value) => value.b07?.menu === 'reach', 'normal first-region branch menu');
    const calibration = { result: 'PASS', entryMs: entryAt - wallStartedAt, seed: branchState.b07.seed, reachedX: (branchState.b07.physics.player.body.left + branchState.b07.physics.player.body.right) / 2, gapEvents: branchState.b07.events.filter((event) => event.type === 'room-entered') };
    await writeFile(path.join(evidence, 'calibration.json'), `${JSON.stringify(calibration, null, 2)}\n`);
    console.log(JSON.stringify(calibration, null, 2));
    await context.close(); context = null;
    return calibration;
  }
  await page.keyboard.press('Escape');
  await page.locator('#pause-settings-button').waitFor({ state: 'visible' });
  await page.locator('#pause-settings-button').click();
  await page.locator('#settings-screen').waitFor({ state: 'visible' });
  await page.locator('#settings-reduced-motion').check();
  const reducedSaved = await page.evaluate(() => JSON.parse(localStorage.getItem('project-crownflare:save:v2') ?? 'null')?.options?.reduceMotion);
  assert(reducedSaved === true, 'reduced-motion setting did not persist');
  await page.locator('#settings-close').click();
  await page.locator('#resume-button').click();
  await page.locator('#pause-settings-button').waitFor({ state: 'hidden' });
  await page.keyboard.press('Escape');
  await page.locator('#pause-settings-button').click();
  await page.locator('#settings-reduced-motion').uncheck();
  await page.locator('#settings-close').click();
  await page.locator('#resume-button').click();
  await page.locator('#resume-button').waitFor({ state: 'hidden' });
  await mark('pause-settings-reduced-motion', { persisted: reducedSaved });

  let roomsDone = new Set();
  let reloadChecked = false;
  let lastBoss = null;
  const routeDeadline = Date.now() + 20 * 60 * 1000;
  while (Date.now() < routeDeadline) {
    if (await page.locator('#b10-story-beat').isVisible().catch(() => false)) { await handleOverlay(); continue; }
    if (await page.locator('#b09-choice-screen').isVisible().catch(() => false)) { await handleOverlay(); continue; }
    if (await page.locator('#b07-results').isVisible().catch(() => false)) break;
    state = await snapshot();
    if (!state) { await delay(100); continue; }
    if (state.b07?.menu) {
      await capture(`branch-${state.b07.menu}`);
      if (state.b07.menu === 'reach' && reachChoice === 1 || state.b07.menu === 'loom' && loomChoice === 1) await page.keyboard.press('ArrowRight');
      const branch = state.b07.menu;
      await tap('KeyE');
      const branchDeadline = Date.now() + 15000;
      let transitioned = null;
      while (Date.now() < branchDeadline && !transitioned) {
        if (await page.locator('#b10-story-beat').isVisible().catch(() => false)) {
          await handleOverlay();
          transitioned = await waitForState((value) => value.b07?.menu === null && value.b07?.roomId !== null, `enter after ${branch} branch`, 25000);
          break;
        }
        const value = await snapshot();
        if (value?.b07?.menu === null && value.b07?.roomId !== null) { transitioned = value; break; }
        await delay(100);
      }
      assert(transitioned, `choose ${branch} branch: no room or story arrival after selection`);
      state = transitioned;
      await mark('branch-selected', { branch, routeChoice: branch === 'reach' ? state.b07.choices.reach : state.b07.choices.loom });
      continue;
    }
    const bossId = state.b07?.b08?.activeBoss;
    if (bossId) {
      if (lastBoss !== bossId) { lastBoss = bossId; await fightBoss(bossId); }
      await handleOverlay();
      continue;
    }
    const roomId = state.b07?.roomId;
    if (!roomId) { await delay(100); continue; }
    if (!roomsDone.has(roomId)) {
      roomsDone.add(roomId); roomTimes.set(roomId, { enteredAtWallMs: Date.now() - wallStartedAt, enteredAtActiveMs: state.b07.runElapsedMs });
      await mark('room-entered', { roomId, region: state.b07.region, roomIndex: state.b07.roomIndex, routeLength: state.b07.routeLength });
      if (roomId === 'vl-spindle-lift' && !reloadChecked) {
        const before = { runId: state.save.activeRun?.runId, seed: state.b07.seed, roomId, hp: state.b07.playerHp, elapsedMs: state.b07.runElapsedMs };
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.locator('#start-button').click(); await page.locator('#hub-continue').waitFor({ state: 'visible' }); await page.locator('#hub-continue').click();
        state = await waitForState((value) => value.screen === 'b10Expedition' && value.sceneActive && value.b07?.roomId === roomId, 'continue across region checkpoint', 25000);
        assert(state.save.activeRun?.runId === before.runId && state.b07.seed === before.seed, 'Continue changed run identity/seed at region checkpoint');
        reloadChecked = true;
        await mark('continue-midrun', { before, after: { runId: state.save.activeRun?.runId, seed: state.b07.seed, roomId: state.b07.roomId, hp: state.b07.playerHp, elapsedMs: state.b07.runElapsedMs } });
      }
    }
    if (state.b07.enemies.some((enemy) => enemy.hp > 0)) { await fightEnemies(roomId); continue; }
    const eventX = EVENT_X[roomId];
    if (eventX !== undefined && !state.b07.eventChoices[roomId] && !state.b07.eventChoices[roomId.replace('vl-','')]) {
      const choices = state.b07.eventChoices;
      const knownEvent = roomId === 'sg-sunwell-terrace' ? 'sunwell-rite' : roomId === 'sg-echo-crossing' ? 'echo-exchange' : 'condenser-choice';
      if (!choices[knownEvent]) {
        await interactAt(eventX, `open ${knownEvent}`);
        state = await waitForState((value) => value.b07?.eventMenu === knownEvent, `open ${knownEvent}`, 5000);
        await capture(`discovery-${knownEvent}`);
        let choiceIndex = 0;
        let available = true;
        const resonance = state.b07.hud.combat.resonance;
        if (knownEvent === 'echo-exchange') {
          if (resonance >= 24) choiceIndex = 1;
          available = choiceIndex === 0 ? state.b07.repairCharges > 0 && resonance < 100 : resonance >= 24;
        } else if (knownEvent === 'condenser-choice') {
          if (state.b07.playerHp >= 5) choiceIndex = 1;
          available = choiceIndex === 0 ? state.b07.playerHp < 5 : resonance < 100;
        }
        if (available) {
          await clickDiscoveryChoice(choiceIndex);
          await waitForState((value) => value.b07?.eventMenu === null, `choose ${knownEvent}`);
          await mark('discovery-selected', { roomId, eventId: knownEvent, choice: (await snapshot()).b07?.eventChoices?.[knownEvent] });
        } else {
          // An optional exchange can have no legal offer at full health and full meter.
          // Close it with the game's regular cancel key and continue the room normally.
          await page.keyboard.press('Escape');
          if (await page.locator('#resume-button').isVisible().catch(() => false)) await page.locator('#resume-button').click();
          await waitForState((value) => value.b07?.eventMenu === null, `cancel unavailable ${knownEvent}`);
          await mark('discovery-skipped-unavailable', { roomId, eventId: knownEvent });
        }
        continue;
      }
    }
    const rewardX = REWARD_X[roomId];
    if (rewardX !== undefined && !state.b07.rewardClaimed) {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        await interactAt(rewardX, `claim ${roomId} reward`);
        await page.locator('#game-root canvas').evaluate((canvas) => canvas.focus());
        await tap('KeyE');
        if (await page.locator('#b09-choice-screen').isVisible().catch(() => false)) await handleOverlay();
        else await delay(180);
        state = await snapshot();
        const rewardRecorded = state.b07?.events.some((event) => event.type === 'reward-claimed' && event.roomId === roomId)
          || state.save.activeRun?.route.rewarded.includes(roomId);
        if (rewardRecorded) { await mark('reward-claimed', { roomId, attempt: attempt + 1 }); break; }
      }
      const rewardRecorded = state.b07?.events.some((event) => event.type === 'reward-claimed' && event.roomId === roomId)
        || state.save.activeRun?.route.rewarded.includes(roomId);
      if (rewardRecorded) continue;
      const playerX = state.b07 ? (state.b07.physics.player.body.left + state.b07.physics.player.body.right) / 2 : null;
      throw new Error(`Reward interaction did not claim ${roomId} at x=${playerX}, target=${rewardX}`);
    }
    const gateTarget = roomId === 'sg-to-vesper-gate' ? 840 : roomId === 'vl-night-side-threshold' ? 820 : 870;
    await moveToX(gateTarget, `reach gate in ${roomId}`);
    await tap('KeyE');
    await delay(180);
    const after = await snapshot();
    if (after?.b07?.roomId === roomId && !after.b07.menu && !after.b07.b08.activeBoss && after.screen !== 'b07Results') {
      await delay(300);
      const again = await snapshot();
      assert(again?.b07?.roomId !== roomId || again.b07.b08.activeBoss, `Gate did not advance from ${roomId}: ${JSON.stringify(again?.b07?.hud.objective)}`);
    }
    if (roomId === 'vl-spindle-lift' && reloadChecked) await capture('vesper-lift-traversal');
  }

  const completed = await page.locator('#b07-results').isVisible().catch(() => false);
  assert(completed, `Campaign did not reach results: ${JSON.stringify(await snapshot())}`);
  await capture('ending-results');
  const resultText = await page.locator('#b07-result-stats').innerText();
  const storyText = await page.locator('#b07-result-story').innerText();
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('project-crownflare:save:v2') ?? 'null'));
  assert(/VICTORY/i.test(resultText) && /BOSSES 3\/3/i.test(resultText), `Full route did not record all three bosses: ${resultText}`);
  assert(save?.meta?.lastRun?.result === 'victory' && save.meta.lastRun.bossesCleared.length === 3 && save.meta.beaconAwakened, 'Victory did not persist first-clear progression and run summary');
  assert(save.activeRun === null, 'Completed victory retained a stale active run checkpoint');
  await mark('victory-and-ending', { resultText, storyText, runSummary: save.meta.lastRun, wallElapsedMs: Date.now() - wallStartedAt, activeElapsedMs: save.meta.lastRun.elapsedMs, rooms: [...roomsDone] });
  await page.locator('#b07-title-button').click();
  await page.locator('#hub-screen').waitFor({ state: 'visible' });
  assert(await page.locator('#hub-continue').isDisabled(), 'Continue remained enabled after victory closed the active run');
  await capture('refuge-after-first-clear');
  const runEvidence = {
    result: errors.length || requestsFailed.length ? 'FAIL' : 'PASS',
    method: 'agent-driven headed Chrome using ordinary menu, keyboard, combat, room and boss controls at real clock speed; no scene teleport or QA mutation of game state',
    browser: 'Google Chrome via Playwright / headed / 1280x720 viewport / Pixel Perfect 2x',
    startedAt: new Date(wallStartedAt).toISOString(), entryMs: entryAt - wallStartedAt, wallElapsedMs: Date.now() - wallStartedAt,
    activeRunElapsedMs: save.meta.lastRun.elapsedMs, routeLength: save.meta.lastRun.visited.length, visited: save.meta.lastRun.visited,
    choices: save.meta.lastRun.choices, discoveries: save.meta.lastRun.eventChoices, bossesCleared: save.meta.lastRun.bossesCleared,
    damageTaken: save.meta.lastRun.damageTaken, resultText, storyText, roomTimes: Object.fromEntries(roomTimes), milestones,
    checks: { newRun: 'PASS', bothBranches: save.meta.lastRun.choices.reach && save.meta.lastRun.choices.loom ? 'PASS' : 'FAIL', allBosses: save.meta.lastRun.bossesCleared.length === 3 ? 'PASS' : 'FAIL', victorySave: save.activeRun === null && save.meta.lastRun.result === 'victory' ? 'PASS' : 'FAIL', refugeReplay: 'PASS', regionContinue: reloadChecked ? 'PASS' : 'NOT RUN', reducedMotionPersistence: reducedSaved ? 'PASS' : 'FAIL', actualAudioHeard: 'NOT HEARD', physicalController: 'NOT TESTED' },
    errors, requestsFailed, captures,
  };
  await writeFile(path.join(evidence, 'full-run.json'), `${JSON.stringify(runEvidence, null, 2)}\n`);
  assert(!errors.length && !requestsFailed.length, [...errors, ...requestsFailed].join('\n'));
  console.log(JSON.stringify({ result: runEvidence.result, resultText, activeRunElapsedMs: runEvidence.activeRunElapsedMs, wallElapsedMs: runEvidence.wallElapsedMs, visited: runEvidence.visited, bossesCleared: runEvidence.bossesCleared, evidence: path.join(evidence, 'full-run.json') }, null, 2));
  const video = contextOptions.recordVideo ? page.video() : null;
  await context.close(); context = null;
  if (video) await video.saveAs(path.join(evidence, 'full-run.webm'));
  return runEvidence;
}

async function runDefeatRetry() {
  context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  page = await context.newPage();
  monitor(page, 'B14 defeat and retry');
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.locator('#start-button').click();
  await page.locator('#hub-screen').waitFor({ state: 'visible' });
  await page.locator('#hub-new-run').click();
  await page.locator('#hub-begin-run').click();
  wallStartedAt = Date.now();
  let state = await waitForState((value) => value.sceneActive && value.b07?.roomId === 'sg-breach-steps', 'defeat/retry fresh entry', 25000);
  const failedRunId = state.save.activeRun?.runId;
  const failedSeed = state.b07.seed;
  await moveToX(870, 'reach first branch for alternate route');
  await tap('KeyE');
  await waitForState((value) => value.b07?.menu === 'reach', 'alternate route branch menu');
  await clickDiscoveryChoice(1);
  state = await waitForState((value) => value.b07?.roomId === 'sg-conduit-annex', 'alternate conduit challenge branch');
  assert(state.save.activeRun?.runId === failedRunId && state.save.activeRun.seed === failedSeed, 'Alternate branch did not retain the original run checkpoint');
  await mark('alternate-branch', { branch: 'conduit-challenge', roomId: state.b07.roomId, seed: state.b07.seed });
  await capture('alternate-conduit-challenge');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#start-button').click();
  await page.locator('#hub-screen').waitFor({ state: 'visible' });
  assert(!(await page.locator('#hub-continue').isDisabled()), 'Continue was unavailable for the saved alternate-branch run');
  await page.locator('#hub-continue').click();
  state = await waitForState((value) => value.sceneActive && value.b07?.roomId === 'sg-conduit-annex', 'continue alternate branch checkpoint', 25000);
  assert(state.save.activeRun?.runId === failedRunId && state.b07.seed === failedSeed, 'Continue changed the alternate-branch run identity or seed');
  await mark('alternate-branch-continued', { runId: failedRunId, seed: failedSeed, roomId: state.b07.roomId });
  await capture('alternate-conduit-continued');
  await moveToX(560, 'approach challenge enemies');
  const defeatTimeout = 90000;
  await page.locator('#b07-results').waitFor({ state: 'visible', timeout: defeatTimeout }).catch(() => {});
  state = await snapshot();
  assert(state?.screen === 'b07Results' && state.save.lastRun?.result === 'defeat', `Alternate attempt did not record defeat: ${JSON.stringify(state?.save?.lastRun)}`);
  assert(state.save.lastRun.seed === failedSeed && state.save.activeRun === null, 'Defeat did not close the matching active run checkpoint');
  const defeatStats = await page.locator('#b07-result-stats').innerText();
  await capture('alternate-defeat-results');
  await mark('alternate-defeat', { runId: failedRunId, seed: failedSeed, result: state.save.lastRun.result, elapsedMs: state.save.lastRun.elapsedMs, damageTaken: state.save.lastRun.damageTaken, visited: state.save.lastRun.visited });
  await page.locator('#b07-replay-button').click();
  state = await waitForState((value) => value.sceneActive && value.b07?.roomId === 'sg-breach-steps', 'restart after recorded defeat', 25000);
  assert(state.save.activeRun?.runId && state.save.activeRun.runId !== failedRunId, 'Retry did not start a new run identity');
  const retry = { runId: state.save.activeRun.runId, seed: state.b07.seed, roomId: state.b07.roomId, visited: state.b07.visited, elapsedMs: state.b07.runElapsedMs };
  await capture('alternate-retry-new-run');
  const evidenceRecord = { result: 'PASS', method: 'headed Chrome normal menus and keyboard; select and save the authored conduit-challenge branch, reload and Continue the same run, accept the recorded defeat, then choose BEGIN ANOTHER RUN', startedAt: new Date(wallStartedAt).toISOString(), wallElapsedMs: Date.now() - wallStartedAt, continuedRun: { runId: failedRunId, seed: failedSeed, roomId: 'sg-conduit-annex' }, failedRun: { runId: failedRunId, seed: failedSeed, result: 'defeat', defeatStats }, retry, errors, requestsFailed, captures };
  await writeFile(path.join(evidence, 'defeat-retry.json'), `${JSON.stringify(evidenceRecord, null, 2)}\n`);
  assert(!errors.length && !requestsFailed.length, [...errors, ...requestsFailed].join('\n'));
  console.log(JSON.stringify({ result: evidenceRecord.result, failedRunId, failedSeed, defeatStats, retry, wallElapsedMs: evidenceRecord.wallElapsedMs, evidence: path.join(evidence, 'defeat-retry.json') }, null, 2));
  await context.close(); context = null;
  return evidenceRecord;
}

async function main() {
  await mkdir(evidence, { recursive: true });
  const headed = process.argv.includes('--headless') ? true : false;
  const record = process.argv.includes('--record');
  await ready();
  browser = await chromium.launch({ channel: 'chrome', headless: headed, args: ['--use-gl=angle', '--use-angle=swiftshader', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
  const result = process.argv.includes('--defeat-retry') ? await runDefeatRetry() : await runCampaign({ record });
  return result;
}

main().catch(async (error) => {
  await mkdir(evidence, { recursive: true });
  const state = page ? await snapshot().catch(() => null) : null;
  await writeFile(path.join(evidence, 'full-run-failure.json'), `${JSON.stringify({ result: 'FAIL', at: new Date().toISOString(), error: String(error?.stack ?? error), state, milestones, errors, requestsFailed, serverOutput: serverOutput.join('') }, null, 2)}\n`);
  console.error(error);
  process.exitCode = 1;
}).finally(async () => { await context?.close().catch(() => {}); await browser?.close().catch(() => {}); server.kill(); });
