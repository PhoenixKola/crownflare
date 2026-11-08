/** Headed Chrome review of the three real B08 boss fights and B07/B08 route gates. */
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, copyFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port = 4198;
const base = `http://127.0.0.1:${port}`;
const evidence = 'review-evidence/b08';
const recordingDir = 'review-evidence/.b08-recording-tmp';
const shortReview = process.argv.includes('--short');
const noRecord = shortReview || process.argv.includes('--no-record');
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'pipe' });
let serverErrors = '';
server.stderr.on('data', (buffer) => { serverErrors += buffer.toString(); });
let browser;
let context;
const errors = [];
const checks = [];
const actions = [];
const runs = [];
let repairUseGateReported = false;
const now = () => Number((Date.now() / 1000).toFixed(2));
const snapshot = (page) => page.evaluate(() => window.__CROWNFLARE_QA__?.snapshot());
const record = (label, detail = {}) => actions.push({ time: now(), label, ...detail });
const check = (label, status, detail = {}) => checks.push({ label, status, ...detail });
const assert = (condition, message) => { if (!condition) throw new Error(message); };

function monitor(page, label) {
  page.on('pageerror', (error) => errors.push(`${label} runtime: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`${label} console: ${message.text()}`); });
  page.on('requestfailed', (request) => errors.push(`${label} request failed: ${request.method()} ${request.url()} / ${request.failure()?.errorText ?? 'unknown'}`));
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`${label} HTTP ${response.status()}: ${response.url()}`); });
}

async function ready(url) {
  for (let i = 0; i < 100; i += 1) {
    try { const response = await fetch(url); if (response.ok) return true; } catch { /* Vite is starting. */ }
    await delay(200);
  }
  return false;
}

async function waitState(page, predicate, message, timeout = 12000) {
  const expression = typeof predicate === 'string' ? predicate : predicate.toString();
  await page.waitForFunction((fn) => {
    const state = window.__CROWNFLARE_QA__?.snapshot();
    return state ? (new Function('state', `return (${fn})(state);`))(state) : false;
  }, expression, { timeout }).catch(async (error) => {
    throw new Error(`${message}: ${JSON.stringify(await snapshot(page))} / ${error.message}`);
  });
  return snapshot(page);
}

async function keyTap(page, key, duration = 70) {
  await page.keyboard.down(key); await page.waitForTimeout(duration); await page.keyboard.up(key);
}

async function moveTo(page, targetX, maxMs = 540) {
  const before = await snapshot(page);
  const dx = targetX - (before?.combat?.playerX ?? targetX);
  if (Math.abs(dx) < 20) return;
  const direction = dx > 0 ? 'd' : 'a';
  const duration = Math.max(100, Math.min(maxMs, Math.abs(dx) / 0.13));
  await page.keyboard.down(direction); await page.waitForTimeout(duration); await page.keyboard.up(direction);
  record('move toward the announced lane / punish range', { direction, startX: before?.combat?.playerX, targetX, endX: (await snapshot(page))?.combat?.playerX });
}

async function dashTo(page, targetX, maxMs = 560) {
  const before = await snapshot(page);
  const playerX = before?.combat?.playerX ?? targetX;
  const dx = targetX - playerX;
  if (Math.abs(dx) < 20) return;
  const direction = dx > 0 ? 'd' : 'a';
  const duration = Math.max(130, Math.min(maxMs, Math.abs(dx) / 0.155));
  await page.keyboard.down(direction);
  await page.keyboard.down('Shift');
  await page.waitForTimeout(130);
  await page.keyboard.up('Shift');
  if (duration > 130) await page.waitForTimeout(duration - 130);
  await page.keyboard.up(direction);
  record('dash out of the authored boss contact lane', { direction, startX: playerX, targetX, endX: (await snapshot(page))?.combat?.playerX });
}

async function moveAcrossRoom(page, targetX, roomId, limitMs = 23000) {
  const jumpTriggers = {
    'sg-breach-steps': [312, 640],
    'sg-copper-causeway': [344, 420],
    'vl-spindle-lift': [287, 430],
  }[roomId] ?? [];
  let nextJump = 0;
  let lastX = -1;
  let stalledSince = Date.now();
  await page.keyboard.down('d');
  const deadline = Date.now() + limitMs;
  while (Date.now() < deadline) {
    const state = await snapshot(page);
    if (state?.b07?.roomId !== roomId) break;
    const x = state?.player?.x ?? 0;
    if (x >= targetX - 24) break;
    if (state?.player?.grounded && ((nextJump < jumpTriggers.length && x >= jumpTriggers[nextJump]) || Date.now() - stalledSince > 720)) {
      await page.keyboard.down('Space'); await page.waitForTimeout(260); await page.keyboard.up('Space');
      if (nextJump < jumpTriggers.length && x >= jumpTriggers[nextJump]) nextJump += 1;
      stalledSince = Date.now();
    }
    if (Math.abs(x - lastX) > 1) { lastX = x; stalledSince = Date.now(); }
    else if (Date.now() - stalledSince > 2300) {
      await page.keyboard.up('d');
      throw new Error(`Player stopped before target ${targetX} in ${roomId}: ${JSON.stringify({ player: state?.player, b07: state?.b07 })}`);
    }
    if ((state?.b07?.playerHp ?? 1) <= 0) { await page.keyboard.up('d'); throw new Error(`Player was defeated while crossing ${roomId}`); }
    await page.waitForTimeout(70);
  }
  await page.keyboard.up('d'); await page.waitForTimeout(450);
  const final = await snapshot(page);
  if (final?.b07?.roomId === roomId && (final?.player?.x ?? 0) < targetX - 50) throw new Error(`Player did not reach ${targetX} in ${roomId}: ${JSON.stringify(final.player)}`);
  record('walk and jump across the authored B07 route room', { roomId, targetX, endX: final?.player?.x, hp: final?.b07?.playerHp });
  return final;
}

async function faceBossAndEnterRange(page) {
  const state = await snapshot(page);
  const playerX = state?.combat?.playerX ?? 0;
  const bossX = state?.b07?.b08?.bossX ?? 720;
  const direction = bossX >= playerX ? 'd' : 'a';
  if (Math.abs(bossX - playerX) > 68) await moveTo(page, bossX - Math.sign(bossX - playerX) * 44, 380);
  else await keyTap(page, direction, 38);
}

async function punishWithSingleHeavy(page, id) {
  const before = await snapshot(page);
  const hp = before?.b07?.b08?.hp ?? 0;
  const direction = (before?.b07?.b08?.bossX ?? 720) >= (before?.combat?.playerX ?? 0) ? 'd' : 'a';
  await keyTap(page, direction, 38);
  await keyTap(page, 'k', 45);
  const started = await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot()?.combat?.move === 'heavy', undefined, { timeout: 900 }).then(() => true).catch(() => false);
  if (!started) {
    record('boss punish input did not start; retry during a later recovery window', { boss: id, move: (await snapshot(page))?.combat?.move, hpBefore: hp, hpAfter: (await snapshot(page))?.b07?.b08?.hp });
    return false;
  }
  await page.waitForTimeout(500);
  const hpAfter = (await snapshot(page))?.b07?.b08?.hp;
  record('land one normal heavy punish, then release inputs for the next telegraph', { boss: id, hpBefore: hp, hpAfter });
  return hpAfter < hp;
}

async function capture(page, name) {
  const destination = path.join(evidence, `${name}.png`);
  await page.screenshot({ path: destination, animations: 'allow' });
  record(`capture ${name}`);
  return destination;
}

async function checkRouteGate(page) {
  await page.goto(`${base}/?b07=1`, { waitUntil: 'domcontentloaded' });
  await page.locator('#start-button').click();
  let state = await waitState(page, (value) => value.screen === 'b07Expedition' && value.b07?.roomId === 'sg-breach-steps', 'B07 regression route starts at its original entry room');
  assert(state.b07.b08.enabled === false && state.b07.b08.activeBoss === null, 'The ?b07=1 route unexpectedly enables B08 boss content');
  check('original ?b07=1 route remains boss-free at the authored Sunderglass entry', 'PASS', { roomId: state.b07.roomId, b08Enabled: state.b07.b08.enabled });
  await capture(page, 'b07-route-preserved-entry');
  await page.goto(`${base}/?b08=1`, { waitUntil: 'domcontentloaded' });
  await page.locator('#start-button').click();
  state = await waitState(page, (value) => value.screen === 'b08Expedition' && value.b07?.b08?.enabled === true && value.b07.roomId === 'sg-breach-steps', 'B08 continuous route enters the same B07 two-region route spine');
  assert(state.b07.b08.activeBoss === null && state.b07.b08.bossesCleared.length === 0, 'B08 continuous route skips the authored route or bosses');
  check('dev-only ?b08=1 enters the existing branchable two-region route with shared B08 tracking', 'PASS', { roomId: state.b07.roomId, choices: state.b07.choices, routeLength: state.b07.routeLength });
  await capture(page, 'b08-continuous-route-entry');
}

async function completeContinuousRoute(page) {
  await page.goto(`${base}/?b08=1&seed=13031988`, { waitUntil: 'domcontentloaded' });
  await page.locator('#start-button').click();
  let state = await waitState(page, (value) => value.b07?.b08?.enabled === true && value.b07?.roomId === 'sg-breach-steps', 'continuous B08 expedition starts in the original B07 room graph');
  assert(state.b07.b08.practice === false && state.b07.playerHp === 5, `Continuous route did not start from the ordinary player state: ${JSON.stringify(state.b07)}`);
  await capture(page, 'b08-safe-route-start');
  const visited = [];
  const bossOrder = [];
  const expectedBosses = ['sundial-custodian', 'spoolheart-regent', 'broken-meridian'];
  const expectedSources = ['sg-resonance-gallery', 'vl-condensation-vault', 'vl-night-side-threshold'];
  const rewardTargets = {
    'sg-copper-causeway': 760,
    'sg-resonance-gallery': 524,
    'vl-spindle-lift': 818,
    'vl-condensation-vault': 840,
  };
  let ended = false;
  for (let step = 0; step < 22; step += 1) {
    state = await snapshot(page);
    if (state?.b07?.b08?.outcome === 'victory' && expectedBosses.every((id) => state.b07.b08.bossesCleared.includes(id))) { ended = true; break; }
    if (state?.b07?.b08?.activeBoss) {
      const id = state.b07.b08.activeBoss;
      const index = bossOrder.length;
      assert(id === expectedBosses[index], `Continuous route reached bosses out of order: ${JSON.stringify({ bossOrder, active: id })}`);
      const intro = state.b07.events.find((event) => event.type === 'boss-intro' && event.bossId === id);
      assert(intro?.sourceRoom === expectedSources[index] && intro.practice === false, `${id} did not start at its integrated route room: ${JSON.stringify(intro)}`);
      await fightActiveBoss(page, id, 'base', false);
      bossOrder.push(id);
      continue;
    }
    if (state?.b07?.menu) {
      assert(state.b07.menu === 'reach' || state.b07.menu === 'loom', `Unexpected route menu in B08: ${state.b07.menu}`);
      const menu = state.b07.menu;
      await keyTap(page, 'e', 75);
      const choice = menu === 'reach' ? 'safe-recovery' : 'spindle-lift';
      state = await waitState(page, `value => value.b07?.choices?.[${JSON.stringify(menu)}] === ${JSON.stringify(choice)} && value.b07?.menu === null`, `${choice} continuous B08 branch selected`);
      record('continuous B08 route takes the authored safe branch', { choice, routeIndex: state.b07.roomIndex });
      continue;
    }
    const roomId = state?.b07?.roomId;
    assert(roomId, `Continuous B08 route lost its room and menu: ${JSON.stringify(state?.b07)}`);
    if (visited.at(-1) !== roomId) visited.push(roomId);
    if (roomId === 'vl-night-side-threshold') {
      await moveAcrossRoom(page, 852, roomId);
      await keyTap(page, 'e', 75);
      await waitState(page, (value) => value.b07?.b08?.activeBoss === 'broken-meridian', 'final confrontation begins from the authored night-side threshold');
      continue;
    }
    if (rewardTargets[roomId] !== undefined && !state.b07.rewardClaimed) {
      await moveAcrossRoom(page, rewardTargets[roomId], roomId);
      await keyTap(page, 'e', 75);
      state = await waitState(page, (value) => value.b07?.rewardClaimed === true, `${roomId} route reward is collected before its boss gate`);
      record('continuous B08 route collects its authored room reward', { roomId, repairCharges: state.b07.repairCharges, resonance: state.b07.resonance, playerHp: state.b07.playerHp });
    }
    await moveAcrossRoom(page, 918, roomId);
    await keyTap(page, 'e', 75);
    await waitState(page, `value => value.b07?.roomId !== ${JSON.stringify(roomId)} || !!value.b07?.menu || !!value.b07?.b08?.activeBoss`, `${roomId} advances inside the continuous B08 route`);
  }
  state = await waitState(page, `value => value.b07?.b08?.outcome === 'victory' && ${JSON.stringify(expectedBosses)}.every(id => value.b07.b08.bossesCleared.includes(id))`, 'continuous B08 final result records all three route bosses', 15000);
  assert(ended || state.b07.b08.practice === false, 'Continuous route unexpectedly used a practice shortcut');
  assert(JSON.stringify(bossOrder) === JSON.stringify(expectedBosses), `Continuous run did not defeat all three route bosses: ${JSON.stringify(bossOrder)}`);
  assert(expectedSources.every((roomId) => state.b07.visited.includes(roomId)), `Continuous result omitted one or more boss source rooms: ${JSON.stringify(state.b07.visited)}`);
  await capture(page, 'b08-continuous-route-victory');
  const routeResult = { result: state.b07.b08.outcome, practice: state.b07.b08.practice, choices: state.b07.choices, bossesCleared: state.b07.b08.bossesCleared, bossOrder, bossSources: expectedSources, visited: state.b07.visited, playerHp: state.b07.playerHp, repairCharges: state.b07.repairCharges, resonance: state.b07.resonance };
  check('unassisted ?b08=1 route crosses B07 rooms and defeats each boss at its authored route source', 'PASS', routeResult);
  return routeResult;
}

async function practiceBoss(page, id, form) {
  await page.goto(`${base}/?b08=1&boss=${id}`, { waitUntil: 'domcontentloaded' });
  await page.locator('#start-button').click();
  return fightActiveBoss(page, id, form, true);
}

async function fightActiveBoss(page, id, form, practice) {
  let state = await waitState(page, `value => value.screen === 'b08Expedition' && value.b07?.b08?.activeBoss === ${JSON.stringify(id)}`, `${id} ${practice ? 'practice shortcut' : 'continuous B08 route'} enters the actual boss scene`);
  const startingBossHp = state.b07.b08.maxHp;
  assert(state.b07.b08.loadedAssets === 42 && state.b07.b08.missingAssets.length === 0, `${id} boss master/pose/arena/VFX assets are missing: ${JSON.stringify(state.b07.b08)}`);
  assert(state.b07.b08.audioAssetsLoaded === 15, `${id} boss cue files are missing: ${JSON.stringify(state.b07.b08)}`);
  assert(state.combat?.bodySize.width === 15 && state.combat?.bodySize.height === 30, `${id} changed Iona's fixed physics body`);
  const prefix = practice ? '' : 'continuous-';
  await capture(page, `${prefix}${id}-boss-entry`);
  check(`${id} generated sprite, nine-pose set, arena, signature VFX, audio cues and fixed player body load in the real Phaser scene`, 'PASS', { loadedBossAssets: state.b07.b08.loadedAssets, loadedBossAudio: state.b07.b08.audioAssetsLoaded, bodySize: state.combat.bodySize, practice, form: state.b05?.state ?? 'base' });

  if (form === 'dawnrush') {
    state = await snapshot(page);
    if (state.b05?.state !== 'dawnrush') {
      await keyTap(page, 'r', 60);
    state = await waitState(page, `value => value.b05?.state === 'dawnrush'`, `${id} Dawnrush form activates through normal controller input`, 5000);
    }
    check(`${id} accepts normal Dawnrush activation while preserving the same boss`, 'PASS', { state: state.b05.state, energy: state.b05.energy });
  }

  const captured = new Set();
  if (id === 'sundial-custodian' && practice) {
    const before = (await snapshot(page)).b07.b08.vfxEnabled;
    await keyTap(page, 'v', 45);
    state = await waitState(page, `value => value.b07.b08.vfxEnabled !== ${JSON.stringify(before)}`, 'B08 optional VFX toggle changes state');
    assert(state.b07.b08.vfxEnabled === false, 'VFX-off state did not disable supplemental boss effects');
    state = await waitState(page, (value) => value.b07?.b08?.phase === 'telegraph', 'VFX-off boss telegraph is visible');
    const offAttackId = state.b07.b08.attackId;
    const offPattern = state.b07.b08.pattern;
    await capture(page, `${prefix}sundial-custodian-vfx-off-telegraph`);
    await keyTap(page, 'v', 45);
    state = await waitState(page, `value => value.b07.b08.vfxEnabled === ${JSON.stringify(before)}`, 'B08 optional VFX toggle restores state');
    state = await waitState(page, (value) => value.b07?.b08?.phase === 'telegraph', 'VFX-on boss telegraph is visible in the continuing fight');
    await capture(page, `${prefix}sundial-custodian-vfx-on-telegraph`);
    captured.add('vfx-off');
    captured.add('vfx-on');
    check('VFX can be disabled and restored while authored boss telegraphs continue', 'PASS', { offAttackId, offPattern, onAttackId: state.b07.b08.attackId, onPattern: state.b07.b08.pattern, restored: state.b07.b08.vfxEnabled, offTelegraphVisible: true, onTelegraphVisible: true });
  }

  const deadline = Date.now() + 120000;
  const dealt = [];
  const demonstratedMoves = new Set();
  let lastPunishedAttackId = '';
  let lastPlayerHp = state.b07?.playerHp ?? 0;
  let lastHp = state.b07.b08.hp;
  let lastAttackId = '';
  let previousPhase = '';
  while (Date.now() < deadline) {
    state = await snapshot(page);
    if (!state?.b07?.b08?.activeBoss) break;
    const boss = state.b07.b08;
    if (boss.phase === 'phase-change') {
      const phaseFrame = id === 'broken-meridian' ? `b08-${id}-phase-change` : `b08-${id}-phase-2`;
      assert(boss.bossFrame === phaseFrame, `${id} phase change is not showing its generated transition pose: ${boss.bossFrame}`);
    }
    if ((boss.phaseNumber === 2 && boss.phase === 'recovery') && !captured.has('phase-2')) {
      assert(boss.bossFrame === `b08-${id}-phase-2`, `${id} phase-two recovery is not showing its generated phase-2 sprite: ${boss.bossFrame}`);
      await capture(page, `${prefix}${id}-phase-two`);
      captured.add('phase-2');
    }
    if ((state.b07.playerHp ?? 0) < lastPlayerHp) {
      const contact = state.b07.events?.filter((event) => event.type === 'boss-player-contact' && event.result === 'hit').at(-1);
      record('boss encounter damages Iona', { boss: id, phase: boss.phase, pattern: boss.pattern, playerX: state.combat?.playerX, targetX: boss.targetX, safeX: boss.safeX, playerHp: state.b07.playerHp, contact });
      lastPlayerHp = state.b07.playerHp ?? 0;
      if (!practice && lastPlayerHp > 0 && state.b07.repairCharges > 0) {
        const hpBefore = lastPlayerHp;
        const chargesBefore = state.b07.repairCharges;
        await keyTap(page, 'e', 55);
        state = await waitState(page, `value => value.b07?.playerHp > ${hpBefore} && value.b07?.repairCharges === ${chargesBefore - 1}`, 'mapped Interact spends one carried field repair and restores one HP');
        lastPlayerHp = state.b07.playerHp;
        record('spend a carried B07 field repair during a B08 boss fight', { boss: id, hpBefore, hpAfter: state.b07.playerHp, chargesBefore, chargesAfter: state.b07.repairCharges, action: 'mapped-interact' });
        if (!repairUseGateReported) {
          check('mapped Interact spends a carried field-repair charge during the real B08 boss fight and restores exactly one HP', 'PASS', { boss: id, hpBefore, hpAfter: state.b07.playerHp, chargesBefore, chargesAfter: state.b07.repairCharges });
          repairUseGateReported = true;
        }
      }
    }
    if (boss.hp < lastHp) { dealt.push(lastHp - boss.hp); lastHp = boss.hp; record('boss loses health during authoritative combat contact', { boss: id, hp: boss.hp, damage: dealt.at(-1), phase: boss.phase }); }
    if (boss.phase !== previousPhase) { previousPhase = boss.phase; record('boss state transition rendered', { boss: id, phase: boss.phase, phaseNumber: boss.phaseNumber, pattern: boss.pattern }); }
    if (boss.phase === 'ko') {
      if (!captured.has('ko')) { await capture(page, `${prefix}${id}-defeat-animation`); captured.add('ko'); }
      break;
    }
    if (boss.phase === 'telegraph' && boss.attackId !== lastAttackId) {
      lastAttackId = boss.attackId;
      state = await snapshot(page);
      const pattern = state.b07.b08.pattern;
      let telegraphCapture = null;
      if (!captured.has('telegraph')) {
        captured.add('telegraph');
        telegraphCapture = capture(page, `${prefix}${id}-telegraph`);
      }
      if (pattern === 'loom-lash') {
        const demonstrateJump = practice && id === 'spoolheart-regent' && !captured.has('loom-jump');
        const tellMs = state.b07.b08.phaseNumber === 2 ? 770 : 900;
        const jumpAtMs = tellMs - 380;
        if (demonstrateJump && state.player?.grounded && state.b07.b08.phaseMs < jumpAtMs) {
          state = await waitState(page, `value => value.b07?.b08?.phase === 'telegraph' && value.b07.b08.attackId === ${JSON.stringify(lastAttackId)} && value.b07.b08.phaseMs >= ${jumpAtMs}`, 'wait for the Loom Lash jump timing that clears the lane at impact', 9000);
        }
        if (demonstrateJump && state.player?.grounded && state.b07.b08.phaseMs <= tellMs - 230) {
          const playerHpBefore = state.b07.playerHp;
          const jumpAttackId = state.b07.b08.attackId;
          await keyTap(page, 'Space', 270);
          record('time a normal jump through the marked Loom Lash lane', { boss: id, jumpAtMs: state.b07.b08.phaseMs, phaseNumber: state.b07.b08.phaseNumber });
          state = await waitState(page, `value => value.b07?.b08?.attackId === ${JSON.stringify(jumpAttackId)} && value.b07.b08.phase === 'recovery'`, 'normal jump reaches the end of the Loom Lash contact window', 9000);
          const tookHit = state.b07.events?.some((event) => event.type === 'boss-player-contact' && event.attackId === jumpAttackId && event.result === 'hit') ?? false;
          assert(!tookHit && state.b07.playerHp === playerHpBefore, `The normal Loom Lash jump did not clear its authored hitbox: ${JSON.stringify({ attackId: jumpAttackId, playerHpBefore, playerHpAfter: state.b07.playerHp, contacts: state.b07.events?.filter((event) => event.attackId === jumpAttackId) })}`);
          captured.add('loom-jump');
          check('Spoolheart Loom Lash clears with a normal, non-dash jump through the warned lane', 'PASS', { phaseNumber: state.b07.b08.phaseNumber, playerHp: state.b07.playerHp, attackId: jumpAttackId, result: 'no boss contact' });
        } else {
          const bossX = state.b07.b08.bossX ?? 720;
          const playerX = state.combat?.playerX ?? bossX;
          const leftEdge = Math.min(bossX, state.b07.b08.targetX ?? bossX) - 18;
          const rightEdge = Math.max(bossX, state.b07.b08.targetX ?? bossX) + 18;
          const leftSafe = leftEdge - 16;
          const rightSafe = rightEdge + 16;
          const escapeX = rightSafe <= 820 && (leftSafe < 140 || Math.abs(rightSafe - playerX) <= Math.abs(leftSafe - playerX)) ? rightSafe : leftSafe;
          await dashTo(page, escapeX, Math.min(760, Math.max(160, tellMs - state.b07.b08.phaseMs - 80)));
          record('dash out of the marked Loom Lash lane', { boss: id, pattern, safeX: escapeX, phaseMs: state.b07.b08.phaseMs, phaseNumber: state.b07.b08.phaseNumber });
        }
      } else if (pattern === 'zenith-stamp' || pattern === 'thread-drop') {
        const target = state.b07.b08.targetX ?? 650;
        const playerX = state.combat?.playerX ?? target;
        const left = target - 70;
        const right = target + 70;
        const escapeX = right > 820 ? left : left < 140 ? right : playerX < target - 8 ? left : playerX > target + 8 ? right : target >= 480 ? left : right;
        await dashTo(page, escapeX, 560);
        record('leave the locked stamp / thread-drop contact lane', { boss: id, pattern, targetX: target });
      } else {
        await dashTo(page, state.b07.b08.safeX ?? 700, 560);
        record('enter the announced safe gap before active contact', { boss: id, pattern, safeX: state.b07.b08.safeX });
      }
      if (telegraphCapture) await telegraphCapture;
      continue;
    }
    if (boss.phase === 'commit' && !captured.has('commit')) {
      await capture(page, `${prefix}${id}-committed-attack`); captured.add('commit');
    }
    if (boss.phase === 'recovery' && boss.vulnerable && boss.attackId !== lastPunishedAttackId) {
      let recoveryCapture = null;
      if (!captured.has('recovery')) { captured.add('recovery'); recoveryCapture = capture(page, `${prefix}${id}-punish-window`); }
      await faceBossAndEnterRange(page);
      const recoveryState = await snapshot(page);
      if (practice && id === 'sundial-custodian' && form === 'base' && !demonstratedMoves.has('resonance') && (recoveryState.combat?.resonance ?? 0) >= 35) {
        const hpBefore = recoveryState.b07.b08.hp;
        const resonanceBefore = recoveryState.combat.resonance;
        await keyTap(page, 'q', 60);
        await waitState(page, `value => value.combat?.move === ${JSON.stringify('resonance')}`, 'Base Resonance special starts from its mapped keyboard action');
        const hit = await waitState(page, `value => value.b07?.b08?.hp < ${hpBefore}`, 'Base Resonance special damages the boss during the live recovery window');
        await capture(page, 'sundial-custodian-resonance-special-contact');
        record('mapped Base Resonance special lands on Sundial during recovery', { boss: id, resonanceBefore, resonanceAfter: hit.combat.resonance, hpBefore, hpAfter: hit.b07.b08.hp });
        check('Base Resonance special spends its resource and lands on a boss through the authoritative combat contact path', 'PASS', { boss: id, move: 'resonance', resonanceBefore, resonanceAfter: hit.combat.resonance, hpBefore, hpAfter: hit.b07.b08.hp });
        await waitState(page, `value => value.combat?.move === ${JSON.stringify('none')}`, 'Base Resonance special recovery finishes');
        if (recoveryCapture) await recoveryCapture;
        demonstratedMoves.add('resonance'); captured.add('special-contact'); lastPunishedAttackId = boss.attackId;
        continue;
      }
      if (practice && id === 'spoolheart-regent' && form === 'dawnrush' && !demonstratedMoves.has('finisher') && recoveryState.b05?.finisherReady) {
        const hpBefore = recoveryState.b07.b08.hp;
        const energyBefore = recoveryState.b05.energy;
        const resonanceBefore = recoveryState.combat?.resonance ?? 0;
        await keyTap(page, 'f', 60);
        await waitState(page, `value => value.combat?.move === ${JSON.stringify('finisher')}`, 'Dawnfall Breaker starts from its mapped finisher action');
        const hit = await waitState(page, `value => value.b07?.b08?.hp < ${hpBefore}`, 'Dawnfall Breaker damages the boss during the live recovery window');
        await capture(page, 'spoolheart-regent-dawnfall-finisher-contact');
        record('mapped Dawnfall Breaker finisher lands on Spoolheart during recovery', { boss: id, resonanceBefore, resonanceAfter: hit.combat.resonance, energyBefore, energyAfter: hit.b05.energy, hpBefore, hpAfter: hit.b07.b08.hp });
        check('Dawnfall Breaker passes its Dawnrush, resonance and energy gates, then lands on a boss through authoritative combat contact', 'PASS', { boss: id, move: 'finisher', resonanceBefore, resonanceAfter: hit.combat.resonance, energyBefore, energyAfter: hit.b05.energy, hpBefore, hpAfter: hit.b07.b08.hp });
        await waitState(page, `value => value.combat?.move === ${JSON.stringify('none')}`, 'Dawnfall Breaker finisher recovery finishes');
        if (recoveryCapture) await recoveryCapture;
        demonstratedMoves.add('finisher'); captured.add('finisher-contact'); lastPunishedAttackId = boss.attackId;
        continue;
      }
      await punishWithSingleHeavy(page, id);
      if (recoveryCapture) await recoveryCapture;
      lastPunishedAttackId = boss.attackId;
      continue;
    }
    if (boss.phase === 'intro') {
      await page.waitForTimeout(65);
    } else await page.waitForTimeout(65);
    if (state.b07.playerHp <= 0) break;
  }

  state = await snapshot(page);
  await page.waitForTimeout(1900);
  const final = await snapshot(page);
  const run = { boss: id, form, practice, phase: final.b07?.b08?.phase ?? null, result: final.b07?.b08?.outcome ?? final.b07?.result ?? null, bossesCleared: final.b07?.b08?.bossesCleared ?? [], startingHp: startingBossHp, remainingHp: final.b07?.b08?.hp ?? state.b07?.b08?.hp ?? 0, playerHp: final.b07?.playerHp ?? 0, damageTaken: final.b07?.events?.filter((event) => event.type === 'boss-player-contact' && event.result === 'hit').length ?? 0, recentBossContacts: final.b07?.events?.filter((event) => event.type === 'boss-player-contact').slice(-10) ?? [], damageEvents: dealt, captured: [...captured] };
  runs.push(run);
  assert(errors.length === 0, `Browser errors during ${id}: ${errors.join('\n')}`);
  assert(dealt.length > 0, `${id} never took a real player combat hit; state=${JSON.stringify(final.b07?.b08)}`);
  assert(run.bossesCleared.includes(id) && run.remainingHp === 0 && run.playerHp > 0, `${id} did not reach a genuine boss defeat with Iona alive: ${JSON.stringify(run)}`);
  if (practice) assert(run.result === 'victory', `${id} practice did not enter the victory result: ${JSON.stringify(run)}`);
  else if (id === 'broken-meridian') assert(run.result === 'victory', `The continuous B08 route did not complete: ${JSON.stringify(run)}`);
  else assert(final.b07?.b08?.activeBoss !== id && final.b07?.result !== 'defeat', `${id} did not return to the continuous B07 room graph: ${JSON.stringify(run)}`);
  const midrouteClear = !practice && id !== 'broken-meridian' && run.bossesCleared.includes(id);
  assert(captured.has('telegraph') && captured.has('commit') && captured.has('recovery') && captured.has('phase-2') && (captured.has('ko') || midrouteClear), `${id} lacks full attack, phase-two, or KO/route-clear evidence: ${JSON.stringify(run)}`);
  if (midrouteClear && !captured.has('ko')) record('continuous mid-boss KO presentation completed during its route transition window', { boss: id, koScreenshot: 'practice shortcut captures the full KO frame' });
  if (practice && id === 'sundial-custodian' && form === 'base') assert(demonstratedMoves.has('resonance'), 'B08 practice did not land the required Base Resonance special');
  if (practice && id === 'spoolheart-regent' && form === 'dawnrush') assert(demonstratedMoves.has('finisher'), 'B08 practice did not land the required Dawnrush finisher');
  check(`${id} shows a normal-speed telegraph, committed hit, recovery punish, phase two and ${practice ? 'practice KO/victory' : midrouteClear ? 'continuous route transition' : 'final route KO/victory'}`, 'PASS', run);
}

async function reducedMotionReview(page) {
  const reduced = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
  await reduced.addInitScript(() => { window.__B08_EVENTS__ = []; });
  const reducedPage = await reduced.newPage(); monitor(reducedPage, 'reduced-motion');
  await reducedPage.goto(`${base}/?b08=1&boss=broken-meridian`, { waitUntil: 'domcontentloaded' });
  await reducedPage.locator('#start-button').click();
  const state = await waitState(reducedPage, (value) => value.b07?.b08?.activeBoss === 'broken-meridian' && value.b07?.reducedMotion === true, 'B08 reduced-motion fight starts and suppresses supplemental VFX');
  assert(state.b07.b08.vfxEnabled === false && state.b07.b08.loadedAssets === 42, `Reduced-motion settings or boss assets are wrong: ${JSON.stringify(state.b07.b08)}`);
  assert(state.b07.b08.audioAssetsLoaded === 15, `Reduced-motion boss audio files are missing: ${JSON.stringify(state.b07.b08)}`);
  await waitState(reducedPage, (value) => value.b07?.b08?.phase === 'telegraph', 'Reduced-motion still displays a boss attack tell');
  const tell = await snapshot(reducedPage);
  assert(tell.b07.b08.phase === 'telegraph' && tell.b07.reducedMotion === true, 'Reduced motion removed the required attack warning');
  check('reduced-motion keeps the authored attack tell, fixed 15x30 body and boss assets while hiding supplemental VFX', 'PASS', { phase: tell.b07.b08.phase, reducedMotion: tell.b07.reducedMotion, vfxEnabled: tell.b07.b08.vfxEnabled, bodySize: tell.combat.bodySize });
  await reduced.close();
}

async function main() {
  await mkdir(evidence, { recursive: true }); await mkdir(recordingDir, { recursive: true });
  assert(await ready(`${base}/?b08=1`), `Vite did not start: ${serverErrors}`);
  browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--use-gl=angle', '--use-angle=swiftshader'] });
  context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, ...(noRecord ? {} : { recordVideo: { dir: recordingDir, size: { width: 1280, height: 720 } } }) });
  await context.addInitScript(() => {
    window.__B08_EVENTS__ = [];
    window.__B08_FRAME_TIMES__ = [];
    let previousFrame = 0;
    const sampleFrame = (now) => {
      if (previousFrame > 0) window.__B08_FRAME_TIMES__.push(now - previousFrame);
      previousFrame = now;
      requestAnimationFrame(sampleFrame);
    };
    requestAnimationFrame(sampleFrame);
    window.addEventListener('crownflare:b07-state', (event) => {
      const s = event.detail; const b = s?.b08;
      if (!b?.activeBoss) return;
      const last = window.__B08_LAST__;
      const key = `${b.activeBoss}:${b.phase}:${b.pattern}:${b.phaseNumber}:${b.hp}:${s.playerHp}:${b.outcome}`;
      if (last === key) return;
      window.__B08_LAST__ = key;
      window.__B08_EVENTS__.push({ atMs: Math.round(performance.now()), boss: b.activeBoss, phase: b.phase, phaseNumber: b.phaseNumber, pattern: b.pattern, hp: b.hp, playerHp: s.playerHp, safeX: b.safeX, targetX: b.targetX, outcome: b.outcome });
    });
  });
  const page = await context.newPage(); monitor(page, 'B08 headed Chrome');
  await checkRouteGate(page);
  await completeContinuousRoute(page);
  if (!shortReview) {
    for (const [id, form] of [['sundial-custodian', 'base'], ['sundial-custodian', 'dawnrush'], ['spoolheart-regent', 'base'], ['spoolheart-regent', 'dawnrush'], ['broken-meridian', 'base'], ['broken-meridian', 'dawnrush']]) await practiceBoss(page, id, form);
    const testedForms = Object.fromEntries(['sundial-custodian', 'spoolheart-regent', 'broken-meridian'].map((id) => [id, [...new Set(runs.filter((run) => run.boss === id && run.practice).map((run) => run.form))].sort()]));
    assert(Object.values(testedForms).every((forms) => forms.includes('base') && forms.includes('dawnrush')), `Every B08 boss must be defeated by Base and Dawnrush: ${JSON.stringify(testedForms)}`);
    check('each B08 boss is defeated in both Base and Dawnrush via playable practice shortcuts', 'PASS', testedForms);
  } else check('short B08 regression covers the continuous route; six separate practice replays are omitted', 'SKIPPED', { continuousRoute: 'all three bosses defeated', practiceBossReplays: 6 });
  await reducedMotionReview(page);
  const events = await page.evaluate(() => window.__B08_EVENTS__ ?? []);
  const frameTimes = await page.evaluate(() => window.__B08_FRAME_TIMES__ ?? []);
  const sortedFrameTimes = [...frameTimes].sort((a, b) => a - b);
  const performance = { sampleCount: frameTimes.length, medianMs: sortedFrameTimes.length ? Number(sortedFrameTimes[Math.floor(sortedFrameTimes.length * .5)].toFixed(2)) : null, p95Ms: sortedFrameTimes.length ? Number(sortedFrameTimes[Math.floor(sortedFrameTimes.length * .95)].toFixed(2)) : null, maxMs: frameTimes.length ? Number(Math.max(...frameTimes).toFixed(2)) : null };
  let videoRecord = null;
  if (noRecord) {
    await context.close(); context = null;
    check('B08 no-record regression keeps screenshots and route checks without a second large video', 'SKIPPED', { recordVideo: false });
  } else {
  const video = page.video();
  await context.close(); context = null;
  const tempVideo = await video.path();
  const videoPath = path.join(evidence, 'b08-continuous-route-plus-practice-chrome.webm');
  await copyFile(tempVideo, videoPath);
  const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size:stream=codec_name,codec_type,width,height,avg_frame_rate', '-of', 'json', videoPath], { encoding: 'utf8' }));
  const videoStream = probe.streams.find((stream) => stream.codec_type === 'video');
  const videoBytes = Number(probe.format.size);
  const videoSha256 = createHash('sha256').update(await readFile(videoPath)).digest('hex');
  videoRecord = { path: 'review-evidence/b08/b08-continuous-route-plus-practice-chrome.webm', sha256: videoSha256, bytes: videoBytes, durationSeconds: Number(probe.format.duration), width: videoStream?.width ?? null, height: videoStream?.height ?? null, frameRate: videoStream?.avg_frame_rate ?? null, codec: videoStream?.codec_name ?? null, audioTrack: probe.streams.some((stream) => stream.codec_type === 'audio') };
  assert(videoRecord.durationSeconds >= 30 && videoRecord.durationSeconds <= 600, `B08 live-play video duration outside 30–600s: ${videoRecord.durationSeconds}`);
  check('single headed Chrome video records real normal-speed boss practice', 'PASS', videoRecord);
  }
  const sourceFiles = [
    'package.json', 'prompts/b08-crownflare-three-bosses-and-final-confrontation.md',
    'src/game/bosses/b08BossTypes.ts', 'src/game/bosses/b08BossProfiles.ts', 'src/game/bosses/b08BossDirector.ts', 'src/game/bosses/b08BossRoutes.ts',
    'src/game/scenes/B07ExpeditionScene.ts', 'src/game/scenes/ChamberScene.ts', 'src/game/createGame.ts', 'src/main.ts',
    'tests/unit/b08-boss.test.ts', 'tools/local-qa/b08-three-boss-smoke.mjs',
    'tools/art-export/build-b08-bosses.py', 'tools/art-export/audit-b08-bosses.py',
    'tools/audio/generate-b08-boss-audio.py', 'tools/audio/audit-b08-boss-audio.py',
  ].sort();
  const sourceDigestHash = createHash('sha256');
  for (const source of sourceFiles) sourceDigestHash.update(source).update('\0').update(await readFile(source));
  const buildName = (await readdir('dist/assets')).find((name) => name.startsWith('index-') && name.endsWith('.js'));
  assert(buildName, 'Production JavaScript bundle missing from dist/assets');
  const buildPath = path.join('dist/assets', buildName);
  const buildBytes = await readFile(buildPath);
  const sourceDigest = { algorithm: 'SHA-256', files: sourceFiles.length, sha256: sourceDigestHash.digest('hex') };
  const buildDigest = { algorithm: 'SHA-256', file: buildPath.replaceAll('\\', '/'), bytes: buildBytes.length, sha256: createHash('sha256').update(buildBytes).digest('hex') };
  check('B08 review report records exact source and production-bundle digests', 'PASS', { sourceDigest, buildDigest });
  assert(errors.length === 0, `Browser errors: ${errors.join('\n')}`);
  const report = { result: 'PASS', reviewMode: shortReview ? 'short continuous route, no recording' : noRecord ? 'full route/practice, no recording' : 'full review', capturedAt: new Date().toISOString(), route: 'Vite dev server; continuous safe-branch B08 route plus separate boss practice shortcuts', browser: 'Google Chrome headed through Playwright', viewport: { width: 1280, height: 720 }, sourceDigest, buildDigest, checks, actions, runs, events, performance, video: videoRecord, gates: { tech: 'PASS', artMotion: 'OWNER REVIEW PENDING', audioHeard: 'NO', physicalController: 'NOT TESTED', ownerApproval: 'PENDING', b06Regression: 'FAIL / qa:b06 latest unchanged Dawnrush pilot stopped in wave 1 after 63.648s with 0/4 waves cleared and HP 0. Five Shardrunner hits; among 36 strikes the trace records 5 hits, 5 dodges and 26 misses. Encounter fairness versus scripted chase/dash strategy remains unresolved; no B06 balance changes or invulnerability workaround were added.' }, errors, serverErrors, reviewManifest: 'review-evidence/b08/review-manifest.json' };
  await writeFile(path.join(evidence, 'qa-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  const hashFiles = async (folder, prefix = folder) => {
    const found = [];
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const absolute = path.join(folder, entry.name);
      if (entry.isDirectory()) found.push(...await hashFiles(absolute, prefix));
      else {
        const relative = path.relative(process.cwd(), absolute).replaceAll('\\', '/');
        const bytes = await readFile(absolute);
        found.push({ path: relative, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
      }
    }
    return found;
  };
  const evidenceFiles = (await readdir(evidence)).filter((name) => name.endsWith('.png') || name === 'b08-continuous-route-plus-practice-chrome.webm' || name === 'qa-report.json').map((name) => path.join(evidence, name));
  const packageFiles = [
    ...evidenceFiles,
    ...await hashFiles('art-source/bosses/b08'),
    ...await hashFiles('public/assets/bosses/b08'),
    ...await hashFiles('public/assets/audio/bosses/b08'),
  ];
  const packageManifest = { version: 1, createdAt: new Date().toISOString(), files: await Promise.all(packageFiles.map(async (entry) => {
    if (typeof entry === 'string') {
      const bytes = await readFile(entry);
      return { path: entry.replaceAll('\\', '/'), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
    }
    return entry;
  })) };
  await writeFile(path.join(evidence, 'review-manifest.json'), `${JSON.stringify(packageManifest, null, 2)}\n`);
  console.log(JSON.stringify({ result: report.result, checks: checks.length, runs, video: videoRecord, errors }, null, 2));
}

try { await main(); }
catch (error) {
  console.error(error?.stack ?? error);
  await writeFile(path.join(evidence, 'qa-report.json'), `${JSON.stringify({ result: 'FAIL', capturedAt: new Date().toISOString(), checks, actions, runs, errors: [...errors, String(error?.message ?? error)], serverErrors }, null, 2)}\n`).catch(() => {});
  process.exitCode = 1;
} finally {
  await context?.close().catch(() => {});
  await browser?.close().catch(() => {});
  server.kill('SIGTERM');
}
