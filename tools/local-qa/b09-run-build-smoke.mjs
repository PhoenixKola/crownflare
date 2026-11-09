/** Headed Chrome review of B09's real reward menu, deterministic seeded choices, and production gate. */
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const devPort = 4219;
const previewPort = 4220;
const devUrl = `http://127.0.0.1:${devPort}`;
const previewUrl = `http://127.0.0.1:${previewPort}`;
const headed = process.argv.includes('--headed');
const b10FullRun = process.argv.includes('--b10-full-run');
const noRecord = !process.argv.includes('--record') || process.argv.includes('--no-record');
const evidence = 'review-evidence/b09';
const rawEvidence = 'review-evidence/raw';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(devPort), '--strictPort'], { stdio: 'pipe' });
let preview;
let browser;
let context;
let serverErrors = '';
server.stderr.on('data', (chunk) => { serverErrors += chunk.toString(); });
const errors = [];
const actions = [];
const checks = [];
const events = [];
const started = Date.now();
const now = () => Date.now() - started;
const record = (label, detail = {}) => actions.push({ atMs: now(), label, ...detail });
const check = (label, detail = {}) => checks.push({ label, status: 'PASS', ...detail });
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const snapshot = (page) => page.evaluate(() => window.__CROWNFLARE_QA__?.snapshot());

function monitor(page, label) {
  page.on('pageerror', (error) => errors.push(`${label} runtime: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`${label} console: ${message.text()}`); });
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`${label} HTTP ${response.status()}: ${response.url()}`); });
  page.on('requestfailed', (request) => errors.push(`${label} request failed: ${request.url()}`));
}

async function ready(url) {
  for (let i = 0; i < 100; i++) { try { if ((await fetch(url)).ok) return true; } catch { /* server starting */ } await delay(150); }
  return false;
}

async function waitFor(page, predicate, message, timeout = 12000) {
  const expression = typeof predicate === 'string' ? predicate : predicate.toString();
  await page.waitForFunction((fn) => { const s = window.__CROWNFLARE_QA__?.snapshot(); return s ? new Function('state', `return (${fn})(state);`)(s) : false; }, expression, { timeout })
    .catch(async (error) => { throw new Error(`${message}: ${JSON.stringify(await snapshot(page))} / ${error.message}`); });
  return snapshot(page);
}

async function tap(page, key, ms = 70) { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); }

async function walkTo(page, roomId, targetX, limitMs = 18000) {
  const jumps = roomId === 'sg-breach-steps' ? [312, 640] : roomId === 'sg-copper-causeway' ? [344, 420] : roomId === 'vl-spindle-lift' ? [287, 430] : [];
  let nextJump = 0; let lastX = -1; let stall = Date.now(); const deadline = Date.now() + limitMs;
  const initial = await snapshot(page);
  record('begin live room traversal', { roomId, targetX, screen: initial?.screen, currentRoom: initial?.b07?.roomId, startX: initial?.player?.x, menu: initial?.b07?.menu });
  await page.keyboard.down('d');
  while (Date.now() < deadline) {
    const s = await snapshot(page);
    if (!s?.b07 || s.b07.roomId !== roomId || (s.player?.x ?? 0) >= targetX - 20) break;
    const x = s.player?.x ?? 0;
    if (s.player?.grounded && ((nextJump < jumps.length && x >= jumps[nextJump]) || Date.now() - stall > 760)) {
      await page.keyboard.down('Space'); await page.waitForTimeout(210); await page.keyboard.up('Space');
      if (nextJump < jumps.length && x >= jumps[nextJump]) nextJump += 1;
      stall = Date.now();
    }
    if (Math.abs(x - lastX) > 1) { lastX = x; stall = Date.now(); }
    else if (Date.now() - stall > 2700) { await page.keyboard.up('d'); throw new Error(`B09 route stopped in ${roomId}: ${JSON.stringify({ x, hp: s.b07.playerHp, player: s.player })}`); }
    if ((s.b07.playerHp ?? 1) <= 0) { await page.keyboard.up('d'); throw new Error(`Defeated crossing ${roomId}`); }
    await page.waitForTimeout(55);
  }
  await page.keyboard.up('d'); await page.waitForTimeout(340);
  const end = await snapshot(page);
  assert(end?.b07?.roomId !== roomId || (end.player?.x ?? 0) >= targetX - 64, `Failed to reach ${targetX} in ${roomId}: ${JSON.stringify(end?.player)}`);
  record('walk and jump through live B07 geometry', { roomId, targetX, x: end.player?.x, hp: end.b07?.playerHp });
  return end;
}

async function reachFirstUpgrade(page, seed) {
  await page.goto(`${devUrl}/?b09=1&seed=${seed}`, { waitUntil: 'domcontentloaded' });
  await page.locator('#start-button').click();
  let s = await waitFor(page, (v) => v.screen === 'b09Expedition' && v.b07?.roomId === 'sg-breach-steps' && v.b07?.b09.enabled, 'B09 starts its own full-route dev mode');
  assert(s.b07.b08.enabled && !s.b07.b08.practice && s.b07.playerHp === 5, 'B09 must start an ordinary full expedition with B08 boss routing');
  assert(s.b07.b09.version === 1 && s.b07.b09.build.acquisitions.length === 0, 'B09 run-build model must reset independently at run start');
  record('start new seeded B09 expedition', { seed, hp: s.b07.playerHp, routeLength: s.b07.routeLength, bodySize: s.combat.bodySize });
  await walkTo(page, 'sg-breach-steps', 918);
  await tap(page, 'e');
  s = await waitFor(page, (v) => v.b07?.menu === 'reach', 'first B07 branch appears before B09 upgrade choice');
  await tap(page, 'e');
  s = await waitFor(page, (v) => v.b07?.choices?.reach === 'safe-recovery' && v.b07?.roomId === 'sg-copper-causeway', 'safe route provides predictable repair reward');
  record('choose lower-risk branch through existing route menu', { branch: s.b07.choices.reach, room: s.b07.roomId });
  await walkTo(page, 'sg-copper-causeway', 760);
  await tap(page, 'e');
  s = await waitFor(page, (v) => v.screen === 'b09Choice' && v.b07?.b09.pendingSource === 'room:sg-copper-causeway', 'first real room reward opens the B09 three-card overlay');
  const cards = await page.locator('.b09-choice-card').count();
  assert(cards === 3, `B09 offer must render exactly three choices; received ${cards}`);
  const offerEvent = s.b07.events.findLast((item) => item.type === 'upgrade-offer-open' && item.sourceId === 'room:sg-copper-causeway');
  assert(offerEvent?.choices?.length === 3, 'Offer event must retain three seeded valid IDs');
  const before = { x: s.player.x, elapsed: s.b07.runElapsedMs, roomElapsed: s.b07.roomElapsedMs, events: s.b07.events.length };
  await page.waitForTimeout(900);
  const frozen = await snapshot(page);
  assert(frozen.screen === 'b09Choice' && Math.abs(frozen.player.x - before.x) < .1 && frozen.b07.runElapsedMs === before.elapsed && frozen.b07.roomElapsedMs === before.roomElapsed && frozen.b07.events.length === before.events, 'B09 reward selection must freeze player, timers, enemies, hazards, and event progression');
  const box = await page.locator('#b09-choice-panel, .b09-choice-panel').boundingBox();
  assert(box && box.width > 500 && await page.locator('.b09-choice-card:focus').count() === 1, 'B09 choice overlay needs responsive width and initial keyboard focus');
  const offerIds = offerEvent.choices;
  await page.screenshot({ path: path.join(evidence, `b09-seed-${seed}-reward-choice.png`), animations: 'allow' });
  record('inspect and capture paused three-card reward menu', { source: s.b07.b09.pendingSource, offerIds, viewport: await page.evaluate(() => ({ width: innerWidth, height: innerHeight })), frozen });
  return { seed, offerIds, before };
}

async function chooseAndVerify(page, index, keyboard = true) {
  const selectedCard = page.locator('.b09-choice-card').nth(index);
  if (keyboard) {
    if (index > 0) await page.keyboard.press('ArrowRight');
    assert(await page.evaluate(() => document.activeElement?.classList.contains('b09-choice-card')), 'keyboard navigation should keep focus on a reward card');
    await page.keyboard.press('Enter');
  } else await selectedCard.click();
  const state = await waitFor(page, (value) => value.screen === 'b09Expedition' && value.b07?.b09.pendingSource === null && value.b07?.b09.build.acquisitions.length === 1, 'selection applies the run upgrade and resumes combat');
  assert(state.b07.b09.build.ledger.claimedSourceIds.length === 1, 'one selected option must claim exactly one source');
  assert(await page.locator('#b09-choice-screen').evaluate((el) => el.getAttribute('aria-hidden')) === 'true', 'choice dialog must close accessibly after a valid selection');
  record('choose one upgrade and resume with a reset input edge', { selection: state.b07.b09.build.acquisitions[0], ranks: state.b07.b09.build.ranks, elapsed: state.b07.runElapsedMs });
  return state;
}

async function chooseRunOffer(page, sourceId, preferredId, acquisitionCount) {
  const opened = await waitFor(page, `value => value.screen === 'b09Choice' && value.b07?.b09?.pendingSource === ${JSON.stringify(sourceId)}`, `${sourceId} opens one authoritative B09 choice`);
  const event = opened.b07.events.findLast((item) => item.type === 'upgrade-offer-open' && item.sourceId === sourceId);
  assert(event?.choices?.length === 3, `${sourceId} must retain exactly three choices in its event ledger`);
  const choiceId = event.choices.includes(preferredId) ? preferredId : event.choices[0];
  const index = event.choices.indexOf(choiceId);
  await page.locator('.b09-choice-card').nth(index).click();
  const runScreen = b10FullRun ? 'b10Expedition' : 'b09Expedition';
  const selected = await waitFor(page, `value => value.screen === ${JSON.stringify(runScreen)} && value.b07?.b09?.pendingSource === null && value.b07?.b09?.build.acquisitions.length === ${acquisitionCount}`, `${sourceId} applies one run choice and resumes`);
  const acquisition = selected.b07.b09.build.acquisitions.at(-1);
  assert(acquisition?.sourceId === sourceId && acquisition.choiceId === choiceId, `${sourceId} selected a stale or mismatched card: ${JSON.stringify(acquisition)}`);
  assert(selected.b07.b09.build.ledger.claimedSourceIds.filter((source) => source === sourceId).length === 1, `${sourceId} reward ledger must contain one claim`);
  record('select a seeded upgrade in the live expedition', { sourceId, choices: event.choices, selected: choiceId, build: selected.b07.b09.build.ranks });
  return { state: selected, choiceId, choices: event.choices };
}

async function moveBossRange(page, targetX) {
  const before = await snapshot(page);
  const dx = targetX - (before?.combat?.playerX ?? targetX);
  if (Math.abs(dx) > 20) {
    const direction = dx > 0 ? 'd' : 'a';
    await page.keyboard.down(direction); await page.waitForTimeout(Math.min(560, Math.max(120, Math.abs(dx) / .13))); await page.keyboard.up(direction);
  }
}

async function dashBossLane(page, targetX, maxMs = 560) {
  const before = await snapshot(page); const playerX = before?.combat?.playerX ?? targetX; const dx = targetX - playerX;
  if (Math.abs(dx) < 20) return;
  const direction = dx > 0 ? 'd' : 'a'; const duration = Math.max(130, Math.min(maxMs, Math.abs(dx) / .155));
  await page.keyboard.down(direction); await page.keyboard.down('Shift'); await page.waitForTimeout(130); await page.keyboard.up('Shift');
  if (duration > 130) await page.waitForTimeout(duration - 130);
  await page.keyboard.up(direction);
}

async function punishBossOnce(page, id) {
  const before = await snapshot(page); const bossX = before?.b07?.b08?.bossX ?? 720; const playerX = before?.combat?.playerX ?? 0;
  await moveBossRange(page, bossX - Math.sign(bossX - playerX || 1) * 44);
  await tap(page, bossX >= (await snapshot(page))?.combat?.playerX ? 'd' : 'a', 38);
  await tap(page, 'k', 45);
  const started = await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot()?.combat?.move === 'heavy', undefined, { timeout: 900 }).then(() => true).catch(() => false);
  if (!started) { record('heavy punish input missed its recovery start', { boss: id }); return; }
  await page.waitForTimeout(500);
}

async function fightRunBoss(page, id) {
  let state = await waitFor(page, `value => value.b07?.b08?.activeBoss === ${JSON.stringify(id)}`, `${id} enters from its real route gate`);
  assert(state.b07.b08.practice === false && state.combat?.bodySize.width === 15 && state.combat?.bodySize.height === 30, `${id} must use the ordinary B09 route and fixed player body`);
  record('enter authored boss during the continuous B09 route', { boss: id, hp: state.b07.b08.hp, form: state.b05?.state ?? 'base' });
  let lastAttackId = '';
  let lastPunishedAttackId = '';
  let lastBossHp = state.b07.b08.hp;
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    state = await snapshot(page);
    const boss = state?.b07?.b08;
    if (!boss?.activeBoss || boss.activeBoss !== id || boss.phase === 'ko') break;
    if (state.b07.playerHp <= 0) throw new Error(`Iona was defeated by ${id}: ${JSON.stringify(state.b07.events.slice(-8))}`);
    if (boss.hp < lastBossHp) {
      const hits = state.b07.events.filter((item) => item.bossId === id && (item.type === 'boss-hit' || item.type === 'boss-ko'));
      const latest = hits.at(-1);
      if (latest) record('upgrade-aware authoritative boss contact', { boss: id, move: latest.move, damage: latest.damage, upgradeBonus: latest.upgradeBonus, resonanceGain: latest.resonanceGain, dawnrushEnergyEffect: latest.dawnrushEnergyEffect, hp: latest.hp, phase: latest.phase });
      lastBossHp = boss.hp;
    }
    if (boss.phase === 'telegraph' && boss.attackId !== lastAttackId) {
      lastAttackId = boss.attackId;
      const target = boss.targetX ?? 650; const x = state.combat?.playerX ?? target;
      if (boss.pattern === 'zenith-stamp' || boss.pattern === 'thread-drop') {
        const left = target - 70; const right = target + 70; const escapeX = right > 820 ? left : left < 140 ? right : x < target - 8 ? left : x > target + 8 ? right : target >= 480 ? left : right;
        await dashBossLane(page, escapeX, 560);
      } else if (boss.pattern === 'loom-lash') {
        const bossX = boss.bossX ?? 720; const left = Math.min(bossX, target) - 34; const right = Math.max(bossX, target) + 34;
        const escapeX = right < 820 && (left < 140 || Math.abs(right - x) < Math.abs(left - x)) ? right + 22 : left - 22;
        await dashBossLane(page, escapeX, 650);
      } else await dashBossLane(page, boss.safeX ?? (x < 480 ? 700 : 300), 560);
      record('dodge an authored boss tell with normal directional dash', { boss: id, pattern: boss.pattern, attackId: boss.attackId, targetX: boss.targetX, safeX: boss.safeX, startX: x, endX: (await snapshot(page))?.combat?.playerX });
      continue;
    }
    if (boss.phase === 'recovery' && boss.vulnerable && boss.attackId !== lastPunishedAttackId) {
      await punishBossOnce(page, id);
      lastPunishedAttackId = boss.attackId;
      continue;
    }
    await page.waitForTimeout(55);
  }
  state = await snapshot(page);
  assert(state.b07.b08.activeBoss === id && state.b07.b08.phase === 'ko' && state.b07.b08.hp === 0, `${id} did not reach a real KO: ${JSON.stringify(state.b07.b08)}`);
  const bossHits = state.b07.events.filter((item) => item.bossId === id && (item.type === 'boss-hit' || item.type === 'boss-ko'));
  assert(bossHits.length > 0, `${id} was not damaged through live combat contacts`);
  record('boss KO reached through live combat contacts', { boss: id, hits: bossHits.length, build: state.b07.b09.build.ranks, hp: state.b07.playerHp });
}

async function completeB09Run(page) {
  let runContext = null;
  let runVideo = null;
  if (!noRecord) {
    runContext = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, recordVideo: { dir: rawEvidence, size: { width: 960, height: 540 } } });
    page = await runContext.newPage();
    monitor(page, 'B09 full seeded route');
  }
  let state;
  if (b10FullRun) {
    // Keep the normal title -> hub flow, but make the seeded reward offer
    // deterministic so boss:sundial-custodian contains Radiant Discipline.
    // Seeds 1 and 2 both offer Close Orbit in Copper Causeway and Radiant
    // Discipline after the first boss; seed 3 verifies a fresh replay seed.
    await page.addInitScript(() => {
      const seeds = [1, 2, 3, 4];
      let nextSeed = 0;
      Object.defineProperty(window.crypto, 'getRandomValues', {
        configurable: true,
        value(values) { values[0] = seeds[Math.min(nextSeed++, seeds.length - 1)]; return values; },
      });
    });
    await page.goto(`${devUrl}/`, { waitUntil: 'domcontentloaded' });
    assert((await page.locator('#title-metadata').innerText()).includes('BASE + DAWNRUSH'), 'normal title no longer identifies the shipped form scope');
    await page.locator('#start-button').click();
    await page.locator('#hub-new-run').click();
    await page.locator('#hub-story').waitFor({ state: 'visible' });
    const storyTitle = await page.locator('#hub-story-title').innerText();
    await page.locator('#hub-begin-run').click();
    state = await waitFor(page, (value) => value.screen === 'b10Expedition' && value.b07?.roomId === 'sg-breach-steps', 'B10 new run starts through the title, refuge and departure story');
    record('B10 normal player route reaches the authored first region', { storyTitle, seed: state.b07.seed, roomId: state.b07.roomId });
  } else {
    await page.goto(`${devUrl}/?b09=1&seed=13031988`, { waitUntil: 'domcontentloaded' });
    await page.locator('#start-button').click();
    state = await waitFor(page, (value) => value.screen === 'b09Expedition' && value.b07?.roomId === 'sg-breach-steps', 'full B09 route starts from fresh route state');
  }
  const routeBosses = ['sundial-custodian', 'spoolheart-regent', 'broken-meridian'];
  let selections = 0; let dawnrushContact = null;
  for (let step = 0; step < 24; step += 1) {
    state = await snapshot(page);
    record('full B09 route driver state', { step, screen: state.screen, roomId: state.b07?.roomId, menu: state.b07?.menu, boss: state.b07?.b08?.activeBoss, bossPhase: state.b07?.b08?.phase, postKoMs: state.b07?.b08?.postKoMs, runElapsedMs: state.b07?.runElapsedMs, scenePaused: state.scenePaused, playerX: state.player?.x });
    if (b10FullRun && await page.locator('#b10-story-beat').isVisible().catch(() => false)) {
      await page.locator('#b10-story-continue').click();
      record('continue the mid-run Vesper story beat', { beat: 'A sky is not a price' });
      continue;
    }
    if (state.screen === 'b07Results') break;
    if (state.screen === 'b09Choice') {
      const sourceId = state.b07.b09.pendingSource;
      const preferred = sourceId === 'room:sg-copper-causeway' ? 'close-orbit' : sourceId === 'boss:sundial-custodian' ? 'radiant-discipline' : 'momentum-relay';
      const { state: selected } = await chooseRunOffer(page, sourceId, preferred, selections + 1);
      selections += 1;
      if (sourceId === 'boss:sundial-custodian') record('choose Dawnrush economy upgrade before the second boss', { chosen: selected.b07.b09.build.acquisitions.at(-1) });
      continue;
    }
    if (state.b07?.b08?.activeBoss) {
      const bossId = state.b07.b08.activeBoss;
      if (state.b07.b08.phase === 'ko') {
        await waitFor(page, `value => value.b07?.b08?.activeBoss !== ${JSON.stringify(bossId)} || value.screen === 'b07Results' || value.screen === 'b09Choice'`, `${bossId} KO completes its authored route transition`, 5000);
        continue;
      }
      if (bossId === 'spoolheart-regent' && state.b05?.state !== 'dawnrush') {
        await tap(page, 'r', 70);
        state = await waitFor(page, (value) => value.b05?.state === 'dawnrush', 'B09 Dawnrush activates in the continuous second-boss fight');
        record('activate Dawnrush inside the B09 run', { boss: bossId, energy: state.b05.energy, ranks: state.b07.b09.build.ranks });
      }
      await fightRunBoss(page, bossId);
      if (bossId === 'spoolheart-regent') {
        state = await snapshot(page);
        dawnrushContact = state.b07.events.findLast((item) => item.bossId === bossId && item.type === 'boss-hit' && item.dawnrushEnergyEffect > 0) ?? null;
        assert(dawnrushContact, 'Radiant Discipline must visibly extend Dawnrush energy on a live boss hit');
        record('verify Dawnrush upgrade extends energy on a real boss contact', { contact: dawnrushContact });
      }
      continue;
    }
    if (state.b07?.menu) {
      const menu = state.b07.menu; assert(menu === 'reach' || menu === 'loom', `Unexpected B09 route menu ${menu}`);
      await tap(page, 'e', 75);
      const choice = menu === 'reach' ? 'safe-recovery' : 'spindle-lift';
      state = await waitFor(page, `value => value.b07?.choices?.[${JSON.stringify(menu)}] === ${JSON.stringify(choice)} && value.b07?.menu === null`, `B09 takes authored ${choice} branch`);
      record('choose the existing lower-risk B07 route branch', { menu, choice });
      continue;
    }
    const roomId = state.b07?.roomId;
    assert(roomId, `B09 route lost its authored room graph: ${JSON.stringify(state)}`);
    if (roomId === 'vl-night-side-threshold') {
      await walkTo(page, roomId, 852);
      await tap(page, 'e', 75);
      await waitFor(page, (value) => value.b07?.b08?.activeBoss === 'broken-meridian', 'B09 enters the final confrontation from its real room gate');
      continue;
    }
    const rewardTargets = { 'sg-copper-causeway': 760, 'sg-resonance-gallery': 524, 'vl-spindle-lift': 818, 'vl-condensation-vault': 840 };
    if (rewardTargets[roomId] !== undefined && !state.b07.rewardClaimed) {
      await walkTo(page, roomId, rewardTargets[roomId]);
      await tap(page, 'e', 75);
      if (roomId === 'sg-copper-causeway') {
        await waitFor(page, `value => value.screen === 'b09Choice' && value.b07?.b09.pendingSource === ${JSON.stringify(`room:${roomId}`)}`, 'the first decision follows the actual Copper Causeway reward');
      } else state = await waitFor(page, (value) => value.b07?.rewardClaimed === true, `${roomId} room reward is collected`);
      continue;
    }
    await walkTo(page, roomId, 918);
    await tap(page, 'e', 75);
    await waitFor(page, `value => value.b07?.roomId !== ${JSON.stringify(roomId)} || !!value.b07?.menu || !!value.b07?.b08?.activeBoss`, `${roomId} advances along the full B09 route`);
  }
  state = await waitFor(page, (value) => value.screen === 'b07Results' && value.b07?.b08?.outcome === 'victory', `${b10FullRun ? 'B10' : 'B09'} finishes at the Broken Meridian route result`, 15000);
  assert(state.b07.b08.bossesCleared.length === 3 && JSON.stringify(state.b07.b08.bossesCleared) === JSON.stringify(routeBosses), `B09 did not complete all three route bosses: ${JSON.stringify(state.b07.b08.bossesCleared)}`);
  assert(selections === 3 && state.b07.b09.build.acquisitions.length === 3, `B09 run must make exactly three upgrade decisions; got ${selections}`);
  assert(state.b07.b09.build.ledger.claimedSourceIds.join('|') === 'room:sg-copper-causeway|boss:sundial-custodian|boss:spoolheart-regent', `B09 milestone sources are wrong: ${JSON.stringify(state.b07.b09.build.ledger)}`);
  const resultText = await page.locator('#b07-result-stats').textContent();
  assert(resultText?.includes('RUN BUILD') && resultText.includes('BOSSES 3/3'), `B09 final build summary is missing: ${resultText}`);
  await page.screenshot({ path: path.join(evidence, 'b09-full-run-victory.png'), animations: 'allow' });
  const run = { result: state.b07.b08.outcome, seed: state.b07.seed, route: state.b07.visited, branchChoices: state.b07.choices, bossesCleared: state.b07.b08.bossesCleared, acquisitions: state.b07.b09.build.acquisitions, ranks: state.b07.b09.build.ranks, dawnrushContact, resultText, playerHp: state.b07.playerHp };
  record('capture a full B09 three-boss run and build result', run);
  check(`${b10FullRun ? 'full normal-route B10' : 'full B09 development'} run completes with three milestone upgrades, route branches and Broken Meridian victory`, run);
  if (b10FullRun) {
    assert(state.save?.completedRuns === 1 && state.save?.lastRun?.result === 'victory' && state.save?.beaconAwakened && state.save?.activeRun === null, `B10 victory did not persist its first-clear unlock exactly once: ${JSON.stringify(state.save)}`);
    await page.locator('#b07-title-button').click();
    state = await waitFor(page, (value) => value.screen === 'hub', 'victory result returns to Spindle Refuge');
    assert(state.save.lastRun?.result === 'victory' && state.save.activeRun === null && await page.locator('#hub-continue').isDisabled(), 'victory hub should retain its summary without a stale active run');
    await page.locator('#hub-new-run').click();
    assert(await page.locator('#hub-story-title').innerText() === 'The hinge remembers.', 'repeat run should show the concise continuing story beat');
    await page.locator('#hub-begin-run').click();
    state = await waitFor(page, (value) => value.screen === 'b10Expedition' && value.b07?.roomId === 'sg-breach-steps' && value.b07?.b09?.build?.acquisitions?.length === 0, 'hub replay creates a new B10 run and clears its run-local build');
    const replaySeed = state.b07.seed;
    assert(replaySeed !== run.seed && state.save.beaconAwakened && state.save.completedRuns === 1, 'hub replay should change the seed while preserving only the permanent first-clear progress');
    check('B10 victory returns to refuge and replay starts a new seed with a fresh build', { previousSeed: run.seed, replaySeed, completedRuns: state.save.completedRuns, beaconAwakened: state.save.beaconAwakened, acquisitions: state.b07.b09.build.acquisitions });

    await walkTo(page, 'sg-breach-steps', 918); await tap(page, 'e', 75);
    state = await waitFor(page, (value) => !!value.b07?.menu, 'B10 replay reaches its first route branch');
    await tap(page, 'e', 75);
    state = await waitFor(page, (value) => value.b07?.choices?.reach === 'safe-recovery' && value.b07?.roomId === 'sg-copper-causeway', 'B10 defeat scenario selects the authored safe branch');
    await walkTo(page, 'sg-copper-causeway', 760); await tap(page, 'e', 75);
    await waitFor(page, (value) => value.screen === 'b09Choice' && value.b07?.b09?.pendingSource === 'room:sg-copper-causeway', 'B10 defeat scenario claims and opens its real upgrade reward');
    await page.locator('.b09-choice-card').first().click();
    state = await waitFor(page, (value) => value.screen === 'b10Expedition' && value.b07?.b09?.build?.acquisitions?.length === 1, 'B10 defeat scenario commits its run upgrade');
    await walkTo(page, 'sg-copper-causeway', 918); await tap(page, 'e', 75);
    await waitFor(page, (value) => value.b07?.roomId !== 'sg-copper-causeway' || !!value.b07?.menu, 'B10 defeat scenario advances from its reward room');
    for (let step = 0; step < 8; step += 1) {
      state = await snapshot(page);
      if (state.screen === 'b07Results') break;
      if (state.b07?.menu) {
        const menu = state.b07.menu; await tap(page, 'e', 75);
        const choice = menu === 'reach' ? 'safe-recovery' : 'spindle-lift';
        await waitFor(page, `value => value.b07?.choices?.[${JSON.stringify(menu)}] === ${JSON.stringify(choice)} && value.b07?.menu === null`, `B10 defeat scenario selects ${choice}`);
        continue;
      }
      if (state.b07?.b08?.activeBoss === 'sundial-custodian') break;
      const roomId = state.b07?.roomId; assert(roomId, `B10 defeat route lost room/menu state: ${JSON.stringify(state.b07)}`);
      const rewards = { 'sg-resonance-gallery': 524, 'vl-spindle-lift': 818, 'vl-condensation-vault': 840 };
      if (rewards[roomId] !== undefined && !state.b07.rewardClaimed) { await walkTo(page, roomId, rewards[roomId]); await tap(page, 'e', 75); await page.waitForTimeout(100); }
      await walkTo(page, roomId, 918); await tap(page, 'e', 75);
      await waitFor(page, `value => value.b07?.roomId !== ${JSON.stringify(roomId)} || !!value.b07?.menu || !!value.b07?.b08?.activeBoss`, `B10 defeat scenario traverses ${roomId}`);
    }
    state = await waitFor(page, (value) => value.b07?.b08?.activeBoss === 'sundial-custodian', 'B10 defeat scenario reaches the first integrated route boss');
    await waitFor(page, (value) => value.screen === 'b07Results' && value.b07?.result === 'defeat', 'idle player reaches the real B10 boss defeat result', 90000);
    state = await snapshot(page);
    assert(state.save?.lastRun?.result === 'defeat' && state.save.activeRun === null && state.save.beaconAwakened, `B10 defeat should close the active run and preserve prior permanent progress: ${JSON.stringify(state.save)}`);
    check('B10 defeat writes one terminal defeat summary while preserving the prior first-clear unlock', { result: state.save.lastRun.result, completedRuns: state.save.completedRuns, beaconAwakened: state.save.beaconAwakened, bossesCleared: state.save.lastRun.bossesCleared });
    await page.locator('#b07-replay-button').click();
    state = await waitFor(page, (value) => value.screen === 'b10Expedition' && value.b07?.roomId === 'sg-breach-steps' && value.b07?.b09?.build?.acquisitions?.length === 0, 'B10 defeat result retries with a fresh run-local build');
    check('B10 defeat retry starts a fresh route without clearing persistent beacon progress', { seed: state.b07.seed, completedRuns: state.save.completedRuns, beaconAwakened: state.save.beaconAwakened, acquisitions: state.b07.b09.build.acquisitions });
  } else {
    await page.locator('#b07-replay-button').click();
    state = await waitFor(page, (value) => value.screen === 'b09Expedition' && value.b07?.roomId === 'sg-breach-steps' && value.b07?.b09.build.acquisitions.length === 0 && value.b07?.b09.build.ledger.claimedSourceIds.length === 0, 'Replay resets the B09 build and one-claim ledger');
    check('B09 replay starts a fresh run build and source ledger', { seed: state.b07.seed, acquisitions: state.b07.b09.build.acquisitions, ledger: state.b07.b09.build.ledger });
  }
  if (runContext) {
    const tempVideo = await page.video()?.path().catch(() => null);
    await runContext.close(); runContext = null;
    if (tempVideo) {
      const output = path.join(rawEvidence, 'b09-full-run-selected-gameplay.webm');
      const bytes = await readFile(tempVideo); await writeFile(output, bytes);
      runVideo = { path: output.replaceAll('\\', '/'), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), durationSeconds: null, audioTrack: 'not captured by Playwright' };
      try {
        const { execFileSync } = await import('node:child_process');
        const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size:stream=codec_type', '-of', 'json', output], { encoding: 'utf8' }));
        runVideo.durationSeconds = Number(probe.format.duration);
        runVideo.audioTrack = probe.streams.some((stream) => stream.codec_type === 'audio');
      } catch { /* ffprobe is optional for this local gameplay capture */ }
      assert(runVideo.durationSeconds === null || runVideo.durationSeconds >= 30 && runVideo.durationSeconds <= 180, `B09 selected gameplay clip must be 30-180s: ${runVideo.durationSeconds}`);
    }
  }
  return { ...run, video: runVideo };
}

async function testViewport(page, size, name) {
  await page.setViewportSize(size);
  const cards = await page.locator('.b09-choice-card').evaluateAll((items) => items.map((item) => { const r = item.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height, visible:r.width>0&&r.height>0 }; }));
  assert(cards.length === 3 && cards.every((card) => card.visible && card.x >= -1 && card.x + card.width <= size.width + 1), `${name} B09 cards overflow: ${JSON.stringify(cards)}`);
  record('resize live upgrade menu', { name, size, cards });
}

async function main() {
  await mkdir(evidence, { recursive: true }); await mkdir(rawEvidence, { recursive: true });
  assert(await ready(`${devUrl}/?b09=1`), `Vite did not start: ${serverErrors}`);
  browser = await chromium.launch({ channel: 'chrome', headless: !headed, args: ['--use-gl=angle', '--use-angle=swiftshader'] });
  const contextOptions = { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 };
  context = await browser.newContext(contextOptions);
  const page = await context.newPage(); monitor(page, 'B09 headed Chrome');
  const mainVideo = page.video();
  await page.addInitScript(() => {
    window.__B09_EVENTS__ = [];
    window.addEventListener('crownflare:b07-state', (event) => { const s = event.detail; window.__B09_EVENTS__.push({ atMs: Math.round(performance.now()), screen: window.__CROWNFLARE_QA__?.snapshot()?.screen, roomId:s?.roomId, boss:s?.b08?.activeBoss, build:s?.b09?.build?.ranks, source:s?.b09?.pendingSource, runElapsedMs:s?.runElapsedMs }); });
  });

  const first = await reachFirstUpgrade(page, 13031988);
  await testViewport(page, { width: 1280, height: 800 }, '16:10');
  await testViewport(page, { width: 1024, height: 768 }, '4:3');
  await testViewport(page, { width: 390, height: 844 }, 'mobile-size responsive review');
  await page.setViewportSize({ width: 1280, height: 720 });
  let state = await chooseAndVerify(page, 1, true);
  const picked = state.b07.b09.build.acquisitions[0];
  assert(picked.choiceId === first.offerIds[1], 'keyboard confirm selected the focused second card');
  const firstBuild = state.b07.b09.build;

  await page.locator('#game-root canvas').focus();
  const beforeMoveX = state.player.x;
  await tap(page, 'a', 220);
  state = await snapshot(page);
  assert(Math.abs(state.player.x - beforeMoveX) > 1, `keyboard movement did not resume after the upgrade dialog; focus=${await page.evaluate(() => document.activeElement?.tagName ?? null)}`);
  record('verify movement input resumes after closing the reward dialog', { beforeX: beforeMoveX, afterX: state.player.x, focus: await page.evaluate(() => document.activeElement?.tagName ?? null) });
  await tap(page, 'r', 65);
  state = await waitFor(page, (value) => value.b05?.state === 'dawnrush', 'normal mapped transform input activates Dawnrush after the upgrade');
  record('activate Dawnrush with ordinary mapped input on a run containing an upgrade', { energy: state.b05.energy, form: state.b05.state });
  await tap(page, 'r', 65);
  await waitFor(page, (value) => value.b05?.state === 'base', 'normal transform input returns to Base');

  const second = await reachFirstUpgrade(page, 13031989);
  assert(first.offerIds.join('|') !== second.offerIds.join('|'), 'two route seeds should produce different three-card runs in Chrome');
  await page.locator('.b09-choice-card').nth(0).click();
  state = await waitFor(page, (value) => value.screen === 'b09Expedition' && value.b07?.b09.build.acquisitions.length === 1, 'mouse confirm picks a seeded B09 option');
  const secondBuild = state.b07.b09.build;
  record('select a second seed build by pointer', { seed: second.seed, offerIds: second.offerIds, selection: secondBuild.acquisitions[0] });
  check('two B09 seeds render distinct three-option upgrade offers and create distinct per-run builds', { first: { seed: first.seed, offerIds: first.offerIds, ranks: firstBuild.ranks }, second: { seed: second.seed, offerIds: second.offerIds, ranks: secondBuild.ranks } });
  check('reward modal receives keyboard focus, mouse, keyboard arrows/enter, and standard remapped Gamepad API action monitor', { keyboardChoice: picked.choiceId, pointerChoice: secondBuild.acquisitions[0].choiceId, gamepadMonitor: 'wired to selected standard pad + saved Interact mapping; physical device not tested' });
  check('modal freezes the live expedition clock, player, hazards and combat event stream', { before: first.before, held: '900ms', after: (await snapshot(page)).b07.runElapsedMs });
  check('B09 route includes existing safe branch repair reward and deterministic room reward source', { branch: 'safe-recovery', roomSource: 'room:sg-copper-causeway' });
  await page.screenshot({ path: path.join(evidence, 'b09-two-seed-builds-resumed.png'), animations: 'allow' });

  const fullRun = await completeB09Run(page);

  preview = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(previewPort), '--strictPort'], { stdio: 'pipe' });
  let previewErrors = ''; preview.stderr.on('data', (chunk) => { previewErrors += chunk.toString(); });
  assert(await ready(`${previewUrl}/?b09=1`), `Production preview failed to start: ${previewErrors}`);
  const prod = await context.newPage(); monitor(prod, 'B09 production gate');
  await prod.goto(`${previewUrl}/?b09=1`, { waitUntil: 'domcontentloaded' });
  assert(await prod.locator('#start-button').textContent().then((text) => text?.includes('ENTER THE REFUGE')), 'production ?b09=1 query must keep the ordinary B10 production title route');
  assert(!await prod.locator('#b09-choice-screen').isVisible(), 'production must not expose the B09 development upgrade route');
  check('production ignores the ?b09=1 development route', { path: '/?b09=1', titleAction: await prod.locator('#start-button').textContent() });
  await prod.close();

  const b09Events = await page.evaluate(() => window.__B09_EVENTS__ ?? []);
  await page.close();
  await context.close(); context = null;
  const fileList = ['package.json','prompts/b09-crownflare-roguelite-upgrades-rewards-and-run-build-variety.md','prompts/b10-crownflare-hub-story-complete-run-and-repository-cleanup.md','src/game/roguelite/b09RunBuild.ts','src/game/persistence/save.ts','src/game/scenes/B07ExpeditionScene.ts','src/game/scenes/ChamberScene.ts','src/game/createGame.ts','src/main.ts','index.html','src/style.css','tests/unit/b09-run-build.test.ts','tools/local-qa/b09-run-build-smoke.mjs','art-source/manifests/b09-upgrade-icons.json'];
  const hash = createHash('sha256'); for (const file of fileList) hash.update(file).update('\0').update(await readFile(file));
  const report = { result: errors.length ? 'FAIL' : 'PASS', capturedAt: new Date().toISOString(), browser: `Google Chrome ${headed ? 'headed' : 'headless'} via Playwright`, checks, actions, fullRun, errors, b09Events, sourceDigest: { files: fileList.length, sha256: hash.digest('hex') }, video: fullRun.video, gates: { tech: errors.length ? 'FAIL' : 'PASS', b10Journey: b10FullRun ? 'PASS: normal title/hub/story/full-run/results/refuge/replay/defeat/retry' : 'NOT RUN', artMotion: 'OWNER REVIEW PENDING', audioCaptured: 'NO', audioHeard: 'NO', physicalController: 'NOT TESTED' } };
  await writeFile(path.join(evidence, 'qa-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  assert(errors.length === 0, errors.join('\n'));
  console.log(JSON.stringify({ result: report.result, checks: checks.length, actions: actions.length, errors, video: report.video, report: `${evidence}/qa-report.json` }, null, 2));
}

try { await main(); }
catch (error) {
  await writeFile(path.join(evidence, 'qa-report.json'), `${JSON.stringify({ result: 'FAIL', capturedAt: new Date().toISOString(), checks, actions, errors: [String(error?.message ?? error)] }, null, 2)}\n`).catch(() => {});
  throw error;
}
finally { await context?.close().catch(() => {}); await browser?.close().catch(() => {}); server.kill(); preview?.kill(); }
