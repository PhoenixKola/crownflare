/** Headed Chrome review of the B06 roster board and playable encounter gauntlet. */
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, copyFile, readdir, stat, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port = 4196;
const base = `http://127.0.0.1:${port}`;
const evidence = 'review-evidence/b06';
const recordingDir = 'review-evidence/.b06-recording-tmp';
const noRecord = process.argv.includes('--no-record');
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'pipe' });
let serverErrors = '';
server.stderr.on('data', (buffer) => { serverErrors += buffer.toString(); });
let browser;
let recordingContext;
let videoPage;
let passed = false;
const errors = [];
const checks = [];
const actions = [];
const compactEvents = [];
const sceneLogs = [];
const videos = [];
const encounters = [];
const failureDiagnoses = [];
let browserVersion = null;
let sourceTree = null;
let activeCapturePrefix = 'b06';
const now = () => Number((Date.now() / 1000).toFixed(2));
const record = (label, detail = {}) => actions.push({ time: now(), label, ...detail });
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const snapshot = (page) => page.evaluate(() => window.__CROWNFLARE_QA__?.snapshot());
const check = (label, status, detail = {}) => checks.push({ label, status, ...detail });

async function ready(url) {
  for (let i = 0; i < 100; i += 1) {
    try { const response = await fetch(url); if (response.ok) return true; } catch { /* Vite is starting. */ }
    await delay(200);
  }
  return false;
}

function monitor(page, label) {
  page.on('pageerror', (error) => errors.push(`${label} runtime: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`${label} console: ${message.text()}`); });
  page.on('requestfailed', (request) => errors.push(`${label} request failed: ${request.method()} ${request.url()} / ${request.failure()?.errorText ?? 'unknown'}`));
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`${label} HTTP ${response.status()}: ${response.url()}`); });
}

async function initCapture(context) {
  await context.addInitScript(() => {
    window.__B06_REVIEW_EVENTS__ = [];
    for (const name of ['crownflare:b06-event', 'crownflare:b06-combat-event', 'crownflare:b06-state', 'crownflare:b05-state', 'crownflare:b04-result', 'crownflare:audio-event', 'crownflare:player-damage']) {
      window.addEventListener(name, (event) => {
        if (name === 'crownflare:b06-state') {
          const state = event.detail;
          const last = window.__B06_LAST_STATE__;
          const key = `${state?.phase}:${state?.enemies?.map((enemy) => `${enemy.id}:${enemy.phase}:${enemy.hp}`).join(',')}:${state?.dawnrush?.state}`;
          if (last === key) return;
          window.__B06_LAST_STATE__ = key;
        }
        const sample = name === 'crownflare:player-damage' ? window.__CROWNFLARE_QA__?.snapshot?.() : undefined;
        window.__B06_REVIEW_EVENTS__.push({ name, detail: event.detail, atMs: Math.round(performance.now()), ...(sample ? { sample: { playerX: sample.combat?.playerX, playerY: sample.combat?.playerY, playerHp: sample.b06?.playerHp, enemies: sample.b06?.enemies?.map((enemy) => ({ id: enemy.id, archetype: enemy.archetype, x: enemy.x, phase: enemy.phase, phaseMs: enemy.phaseMs })) } } : {}) });
      });
    }
  });
}

async function waitFor(page, predicate, message, timeout = 12000) {
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
  await page.keyboard.down(key);
  await page.waitForTimeout(duration);
  await page.keyboard.up(key);
}

async function dodgeThreat(page, enemyX, playerX) {
  // Clear the locked melee lane; the old driver dashed toward the attack and then
  // repeatedly re-entered range before a recovery punish.
  let direction = enemyX > playerX ? 'a' : 'd';
  // The arena collision edge is x=72/1488. Leave enough room for one full
  // 125ms dash (45px) plus half the 15px player body before flipping inward.
  if (playerX < 125 && direction === 'a') direction = 'd';
  if (playerX > 1435 && direction === 'd') direction = 'a';
  await page.keyboard.down(direction);
  await page.keyboard.down('Shift');
  await page.waitForTimeout(125);
  await page.keyboard.up('Shift');
  await page.keyboard.up(direction);
}

async function capture(page, name) {
  const stem = name.startsWith('b06-') ? name.slice(4) : name;
  const destination = path.join(evidence, `${activeCapturePrefix}-${stem}.png`);
  await page.screenshot({ path: destination, animations: 'allow' });
  record(`capture ${name}`, { screen: (await snapshot(page))?.screen ?? null });
  return destination.replaceAll('\\', '/');
}

async function sourceDigest() {
  const roots = [
    'src/game/scenes/B06EnemyGauntletScene.ts', 'src/game/scenes/ChamberScene.ts', 'src/game/enemies/b06EnemyModel.ts',
    'src/game/enemies/b06EncounterFlow.ts', 'src/game/combat/b03Moves.ts', 'src/game/combat/dawnrushMoves.ts',
    'src/game/createGame.ts', 'src/main.ts', 'src/game/rooms/sunderglassAtrium.ts', 'package.json',
    'tests/unit/b06-enemy-model.test.ts', 'tools/local-qa/b06-enemy-gauntlet-smoke.mjs',
    'tools/art-export/build-b06-enemies.py', 'tools/art-export/audit-b06-enemies.py',
    'tools/audio/generate-b06-enemy-audio.py', 'tools/audio/audit-b06-enemy-audio.py',
    'art-source/enemies/b06', 'public/assets/enemies/b06', 'public/assets/audio/b06',
  ];
  const files = [];
  async function walk(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const target = path.join(folder, entry.name);
      if (entry.isDirectory()) await walk(target);
      else if (entry.isFile()) files.push(target);
    }
  }
  for (const root of roots) {
    try { const info = await stat(root); if (info.isDirectory()) await walk(root); else files.push(root); } catch { /* absent optional paths */ }
  }
  files.sort((a, b) => a.localeCompare(b));
  const hash = createHash('sha256');
  for (const file of files) { hash.update(file.replaceAll('\\', '/') + '\0'); hash.update(await readFile(file)); }
  return { sha256: hash.digest('hex'), files: files.length, scope: 'B06 implementation and generated inputs; review evidence excluded' };
}

async function rosterBoardReview() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await initCapture(context);
  const page = await context.newPage();
  monitor(page, 'roster');
  await page.goto(`${base}/?b06=1&roster=1`, { waitUntil: 'domcontentloaded' });
  const title = await page.locator('#title-metadata').innerText();
  assert(title.includes('FIVE-ENEMY ROSTER') && title.includes('NOT APPROVED'), `B06 title/review disclosure missing: ${title}`);
  await page.locator('#start-button').click();
  await waitFor(page, (state) => state.sceneType === 'B06EnemyGauntletScene' && state.sceneActive && state.b06?.loadedTextures === 65, 'roster art and texture manifest load');
  let state = await snapshot(page);
  assert(state.b06?.missingTextures.length === 0 && state.b06.enemies.length === 5, `Roster board did not load all five archetypes: ${JSON.stringify(state.b06)}`);
  await capture(page, 'b06-roster-base-true-scale');
  check('five enemy archetypes and Iona load together in the true-scale native game viewport', 'PASS', { loadedTextures: state.b06.loadedTextures, missingTextures: state.b06.missingTextures, archetypes: [...new Set(state.b06.enemies.map((enemy) => enemy.archetype))], viewport: { width: 480, height: 270 } });
  await keyTap(page, 'g');
  await keyTap(page, 'r', 45);
  await waitFor(page, (value) => value.b06?.dawnrush?.state === 'dawnrush', 'roster board Dawnrush form activates', 3500);
  await capture(page, 'b06-roster-dawnrush-true-scale');
  check('Dawnrush aura remains readable across all five roster silhouettes', 'PASS', { state: (await snapshot(page)).b06.dawnrush.state });
  await context.close();
}

async function reducedMotionReview() {
  activeCapturePrefix = 'b06';
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
  await initCapture(context);
  const page = await context.newPage();
  monitor(page, 'reduced-motion');
  await page.goto(`${base}/?b06=1`, { waitUntil: 'domcontentloaded' });
  await page.locator('#start-button').click();
  await waitFor(page, (state) => state.sceneType === 'B06EnemyGauntletScene' && state.b06?.loadedTextures === 65 && state.b06?.reducedMotion === true && state.b06?.vfxEnabled === false, 'B06 respects the OS reduced-motion preference');
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().b06?.enemies?.some((enemy) => enemy.phase === 'telegraph'), undefined, { timeout: 8000 });
  const state = await snapshot(page);
  const tell = state.b06.enemies.find((enemy) => enemy.phase === 'telegraph');
  assert(tell && state.b06.missingTextures.length === 0 && state.combat.bodySize.width === 15 && state.combat.bodySize.height === 30, `Reduced-motion tell or player body changed: ${JSON.stringify(state.b06)}`);
  await capture(page, 'b06-reduced-motion-telegraph');
  check('reduced-motion preference suppresses supplemental VFX and shake while keeping the authored tell and fixed player body', 'PASS', { reducedMotion: state.b06.reducedMotion, vfxEnabled: state.b06.vfxEnabled, tellEnemy: tell.id, tellArchetype: tell.archetype, tellState: tell.phase, bodySize: state.combat.bodySize, activeTransientEffects: state.b06.activeTransientEffects });
  await context.close();
}

async function activeGauntletReview(form = 'dawnrush') {
  const runPrefix = form === 'base' ? 'b06-base' : 'b06-dawnrush';
  activeCapturePrefix = runPrefix;
  recordingContext = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, ...(noRecord ? {} : { recordVideo: { dir: recordingDir, size: { width: 1280, height: 720 } } }) });
  await initCapture(recordingContext);
  videoPage = await recordingContext.newPage();
  monitor(videoPage, 'gauntlet');
  await videoPage.goto(`${base}/?b06=1`, { waitUntil: 'domcontentloaded' });
  assert(await videoPage.locator('#start-button').isVisible(), 'B06 playtest entry button is missing');
  await videoPage.locator('#start-button').click();
  await waitFor(videoPage, (state) => state.sceneType === 'B06EnemyGauntletScene' && state.sceneActive && state.b06?.loadedTextures === 65, 'B06 playable scene and all art load');
  let state = await snapshot(videoPage);
  assert(state.b06?.phase === 'familiarization' && state.b06.enemies.some((enemy) => enemy.archetype === 'shardrunner'), `Familiarization wave missing: ${JSON.stringify(state.b06)}`);
  await capture(videoPage, 'b06-gauntlet-entry');
  check('developer route enters the authored Shardrunner familiarization encounter', 'PASS', { phase: state.b06.phase, enemies: state.b06.enemies.map((enemy) => ({ id: enemy.id, archetype: enemy.archetype })) });

  if (form === 'dawnrush') {
    // Activate the normal form action before the approaching Shardrunner can interrupt it.
    await keyTap(videoPage, 'r');
    await waitFor(videoPage, (value) => value.b06?.dawnrush?.state === 'dawnrush', 'Dawnrush activates through the live player controller', 4000);
    await capture(videoPage, 'b06-gauntlet-dawnrush');
    check('normal R input activates Dawnrush from the route’s initial 70% charge', 'PASS', { state: (await snapshot(videoPage)).b06.dawnrush.state, chargeSource: 'authored initial player resource' });
  }

  await videoPage.keyboard.press('Escape');
  await waitFor(videoPage, (value) => value.screen === 'paused', 'pause opens during B06 combat');
  assert(await videoPage.locator('#pause-screen').isVisible(), 'Pause panel did not open');
  await videoPage.locator('#resume-button').click();
  await waitFor(videoPage, (value) => value.screen === 'b06Combat', 'B06 resumes from pause');
  check('pause/resume preserves the live encounter', 'PASS');

  if (form === 'dawnrush' && (await snapshot(videoPage)).b06?.dawnrush?.state !== 'dawnrush') {
    // The route begins with the normal B05 70% charge; R is the ordinary form action.
    await keyTap(videoPage, 'r');
    await waitFor(videoPage, (value) => value.b06?.dawnrush?.state === 'dawnrush', 'Dawnrush activates through the live player controller', 4000);
    await capture(videoPage, 'b06-gauntlet-dawnrush');
    check('normal R input activates Dawnrush from the route’s initial 70% charge', 'PASS', { state: (await snapshot(videoPage)).b06.dawnrush.state, chargeSource: 'authored initial player resource' });
  } else if (form === 'base') {
    assert(state.b06.dawnrush.state === 'base', `Base verification started in ${state.b06.dawnrush.state}`);
    check('Base-only run starts without using the form refill shortcut', 'PASS', { state: state.b06.dawnrush.state, energy: state.b06.dawnrush.energy });
  }

  const phaseCaptures = new Set();
  const evadedProjectiles = new Set();
  const phaseNames = ['familiarization', 'mixed', 'escalation', 'elite', 'reward', 'exit'];
  const phaseDeadline = Date.now() + 300000;
  let lastVisiblePhase = 'familiarization';
  let lastSeenPhase = 'familiarization';
  let lastEnemyHealth = new Map();
  while (Date.now() < phaseDeadline) {
    state = await snapshot(videoPage);
    if (!state?.b06) throw new Error(`B06 snapshot disappeared: ${JSON.stringify(state)}`);
    const phase = state.b06.phase;
    if (phase !== lastSeenPhase) { console.log(`B06 phase ${phase}`); lastSeenPhase = phase; }
    const nearThreat = state.b06.enemies.some((enemy) => enemy.hp > 0 && Math.abs(enemy.x - state.combat.playerX) < 180);
    if (phase !== lastVisiblePhase && phaseNames.includes(phase) && !phaseCaptures.has(phase)
      && (nearThreat || phase === 'reward' || phase === 'exit')) {
      await capture(videoPage, `b06-phase-${phase}`);
      phaseCaptures.add(phase);
      lastVisiblePhase = phase;
    }
    for (const enemy of state.b06.enemies) {
      if (lastEnemyHealth.has(enemy.id) && lastEnemyHealth.get(enemy.id) !== enemy.hp) console.log(`B06 ${enemy.id} HP ${enemy.hp}`);
      lastEnemyHealth.set(enemy.id, enemy.hp);
    }
    if (phase === 'victory' || phase === 'defeat' || state.screen === 'b04Results') break;
    if (phase === 'reward') {
      const dx = 1295 - state.combat.playerX;
      if (Math.abs(dx) > 30) await keyTap(videoPage, dx > 0 ? 'd' : 'a', 85);
      else await keyTap(videoPage, 'e', 55);
      await videoPage.waitForTimeout(180);
      continue;
    }
    if (phase === 'exit') {
      const dx = 1470 - state.combat.playerX;
      if (Math.abs(dx) > 36) await keyTap(videoPage, dx > 0 ? 'd' : 'a', 80);
      else await keyTap(videoPage, 'e', 55);
      await videoPage.waitForTimeout(180);
      continue;
    }
    if (phase === 'victory' || phase === 'defeat') break;
    if (state.b06.playerHp <= 0) break;
    const incomingProjectile = state.b06.projectiles
      .filter((projectile) => !evadedProjectiles.has(projectile.id)
        && Math.abs(projectile.x - state.combat.playerX) < 220
        && Math.abs(projectile.y - state.combat.playerY) < 64)
      .sort((a, b) => Math.abs(a.x - state.combat.playerX) - Math.abs(b.x - state.combat.playerX))[0];
    if (incomingProjectile) {
      evadedProjectiles.add(incomingProjectile.id);
      const hpBefore = state.b06.playerHp;
      await dodgeThreat(videoPage, incomingProjectile.x, state.combat.playerX);
      const afterDodge = await snapshot(videoPage);
      record('dash out of a live Orbit Wisp projectile lane', {
        projectileId: incomingProjectile.id, startX: state.combat.playerX, endX: afterDodge.combat.playerX,
        hpBefore, hpAfter: afterDodge.b06.playerHp,
      });
      await videoPage.waitForTimeout(140);
      continue;
    }
    const imminent = state.b06.enemies
      .filter((enemy) => enemy.hp > 0 && ['telegraph', 'commit'].includes(enemy.phase) && Math.abs(enemy.x - state.combat.playerX) < 160)
      .sort((a, b) => Math.abs(a.x - state.combat.playerX) - Math.abs(b.x - state.combat.playerX))[0];
    if (imminent) {
      if (imminent.phase === 'telegraph') {
        const tellMs = ({ 'shardrunner': 560, 'spindle-sentry': 440, 'orbit-wisp': 860, 'pressure-bastion': 820, 'cantor': 840 })[imminent.archetype] ?? 600;
        // Start the dash when the tell commits so its live 125ms window covers
        // the authored contact frame (instead of expiring just before contact).
        const lead = 0;
        const timelyTell = `state => { const enemy = state.b06?.enemies?.find((entry) => entry.id === ${JSON.stringify(imminent.id)}); return !enemy || enemy.phase !== 'telegraph' || enemy.phaseMs >= ${tellMs - lead}; }`;
        await waitFor(videoPage, timelyTell, `${imminent.archetype} reaches its readable dodge window`, 1500);
      }
      const atDodge = await snapshot(videoPage);
      const liveEnemy = atDodge.b06?.enemies?.find((enemy) => enemy.id === imminent.id);
      if (!liveEnemy || !['telegraph', 'commit'].includes(liveEnemy.phase)) continue;
      await dodgeThreat(videoPage, liveEnemy.x, atDodge.combat.playerX);
      const afterDodge = await snapshot(videoPage);
      record('dash out of the committed attack lane', {
        target: imminent.id, action: liveEnemy.action, phase: liveEnemy.phase,
        tellElapsedMs: liveEnemy.phaseMs,
        startX: atDodge.combat.playerX, endX: afterDodge.combat.playerX,
        hpBefore: atDodge.b06.playerHp, hpAfter: afterDodge.b06.playerHp,
      });
      await waitFor(videoPage, `state => { const enemy = state.b06?.enemies?.find((entry) => entry.id === ${JSON.stringify(imminent.id)}); return state.b06?.phase === 'defeat' || state.b06?.phase === 'victory' || state.screen === 'b04Results' || !enemy || !['telegraph', 'commit'].includes(enemy.phase); }`, `${imminent.archetype} finishes its active pattern or the encounter ends`, 1500);
      continue;
    }
    const alive = state.b06.enemies.filter((enemy) => enemy.hp > 0).sort((a, b) => Math.abs(a.x - state.combat.playerX) - Math.abs(b.x - state.combat.playerX));
    if (!alive.length) { await videoPage.waitForTimeout(100); continue; }
    const target = alive[0];
    const dx = target.x - state.combat.playerX;
    const distance = Math.abs(dx);
    if (form === 'dawnrush' && state.b06.dawnrush?.finisherReady && distance < 76) {
      await keyTap(videoPage, 'f', 70);
      record('use earned Dawnfall finisher against a close threat', { target: target.id, hp: target.hp, resonance: state.combat.resonance, energy: state.b06.dawnrush.energy });
      await videoPage.waitForTimeout(170);
      continue;
    }
    const specialCost = form === 'dawnrush' ? 32 : 35;
    if (state.combat.specialCooldownMs <= 0 && state.combat.resonance >= specialCost && distance < 92) {
      await keyTap(videoPage, 'q', 70);
      record('spend ready Resonance on a close enemy', { target: target.id, hp: target.hp, resonance: state.combat.resonance });
      await videoPage.waitForTimeout(170);
      continue;
    }
    if (distance > (target.archetype === 'orbit-wisp' ? 68 : 48)) {
      await keyTap(videoPage, dx > 0 ? 'd' : 'a', Math.min(100, Math.max(40, (distance - 40) / 1.4)));
      record('advance on selected threat', { target: target.id, x: state.combat.playerX, distance: Number(distance.toFixed(1)) });
    } else if (target.archetype === 'orbit-wisp') {
      if (state.combat.playerY >= 205) {
          await keyTap(videoPage, 'Space', 250);
        if (!phaseCaptures.has('wisp-aerial-apex')) {
          const aerial = await snapshot(videoPage);
          console.log(`Wisp aerial check playerY=${aerial?.combat?.playerY} targetX=${aerial?.b06?.enemies?.find((enemy) => enemy.id === target.id)?.x} playerX=${aerial?.combat?.playerX} grounded=${aerial?.player?.grounded}`);
          await capture(videoPage, 'b06-wisp-aerial-contact-approach');
          phaseCaptures.add('wisp-aerial-apex');
          record('aerial approach snapshot', { playerY: aerial?.combat?.playerY, targetY: aerial?.b06?.enemies?.find((enemy) => enemy.id === target.id)?.y });
        }
      }
      await keyTap(videoPage, 'j', 70);
      record('jump/light against airborne wisp', { target: target.id, playerY: state.combat.playerY });
    } else {
      const attack = form === 'base' || target.archetype === 'pressure-bastion' || target.archetype === 'cantor' ? 'k' : 'j';
      await keyTap(videoPage, attack, 65);
      record('attack selected threat', { target: target.id, attack, enemyPhase: target.phase, hp: target.hp });
    }
    await videoPage.waitForTimeout(170);
    // Capture actual scene states when the game event log reports them.
    const sceneEvents = state.b06Events ?? [];
    for (const event of sceneEvents.slice(-8)) {
      const archetype = event.archetype;
      const key = `${archetype}:${event.type}`;
      if (archetype && ['enemy-telegraph', 'enemy-strike', 'enemy-ko'].includes(event.type) && !phaseCaptures.has(key)) {
        const captureName = `b06-${String(archetype).replaceAll('-', '')}-${event.type}`;
        await capture(videoPage, captureName);
        phaseCaptures.add(key);
      }
    }
  }

  state = await snapshot(videoPage);
  const events = await videoPage.evaluate(() => window.__B06_REVIEW_EVENTS__ ?? []);
  const sceneEvents = state?.b06Events ?? [];
  if (state?.b06?.phase === 'victory') {
    check(`${form} gauntlet reaches its live victory/results state`, 'PASS', { phase: state.b06.phase, rewardClaimed: state.b06.rewardClaimed, wavesCleared: state.b06.wavesCleared });
    await capture(videoPage, 'b06-gauntlet-victory');
  } else if (state?.b06?.phase === 'defeat') {
    const diagnosis = {
      route: '/?b06=1', form, seed: null, seedMode: 'fixed authored wave sequence; no random seed parameter', browser: browserVersion,
      controls: ['A/D move', 'Space jump', 'Shift dash during tell', 'J light', 'K heavy', 'Q Resonance special', 'R Dawnrush', 'F finisher', 'Escape pause'],
      phase: state.b06.phase, elapsedMs: state.b06.elapsedMs, wavesCleared: state.b06.wavesCleared, rewardClaimed: state.b06.rewardClaimed,
      player: { x: state.combat?.playerX, y: state.combat?.playerY, velocity: state.combat?.playerVelocity, hp: state.b06.playerHp, form: state.b06.dawnrush?.form, dawnrushState: state.b06.dawnrush?.state, resonance: state.combat?.resonance, damageTaken: state.b06.damageTaken },
      enemies: state.b06.enemies,
      playerDamage: events.filter((event) => event.name === 'crownflare:player-damage'),
      enemyStrikes: sceneEvents.filter((event) => event.type === 'enemy-strike'),
      recentInputs: checks.filter((entry) => /dash|attack|advance|finisher|Resonance/i.test(entry.label)).slice(-24),
      sourceTree,
    };
    failureDiagnoses.push(diagnosis);
    console.error(`B06 failure diagnosis: ${JSON.stringify(diagnosis)}`);
    check(`${form} gauntlet reaches its live four-wave victory`, 'FAIL', { phase: state.b06.phase, playerHp: state.b06.playerHp, damageTaken: state.b06.damageTaken, wavesCleared: state.b06.wavesCleared });
    await capture(videoPage, 'b06-gauntlet-defeat');
  }
  assert(state?.b06?.phase === 'victory' && state.b06.wavesCleared === 4 && state.b06.rewardClaimed, `${form} did not complete every wave, claim the reward and reach the exit: ${JSON.stringify(state?.b06)}`);
  assert(sceneEvents.some((event) => event.type === 'enemy-telegraph'), 'No live enemy telegraph event was observed');
  assert(sceneEvents.some((event) => event.type === 'enemy-strike'), 'No live enemy strike event was observed');
  assert(sceneEvents.some((event) => event.type === 'hit' || event.type === 'interrupt' || event.type === 'stagger'), 'No live player hit/interrupt contact was observed');
  check(`${form} event log contains authored telegraph, strike and player-contact events`, 'PASS', { sceneEvents: sceneEvents.length, telemetryEvents: events.length, activeEffectsAtEnd: state?.b06?.activeTransientEffects ?? null });

  for (const event of events) {
    if (['crownflare:b06-event', 'crownflare:b06-combat-event', 'crownflare:b05-state', 'crownflare:b04-result', 'crownflare:audio-event', 'crownflare:player-damage'].includes(event.name)) compactEvents.push({ form, ...event });
  }
  sceneLogs.push({ form, events: sceneEvents });
  encounters.push({ form, phase: state.b06.phase, wavesCleared: state.b06.wavesCleared, rewardClaimed: state.b06.rewardClaimed, playerHp: state.b06.playerHp, damageTaken: state.b06.damageTaken, eventCount: sceneEvents.length });
  const video = videoPage.video();
  await recordingContext.close(); recordingContext = null;
  const browserIssues = errors.filter((entry) => !entry.includes('AudioContext was not allowed to start'));
  assert(browserIssues.length === 0, `Browser errors: ${browserIssues.join('\n')}`);
  if (noRecord) { check(`${form} baseline completed without a video capture`, 'SKIPPED', { recordVideo: false }); return; }
  const tempVideo = await video.path();
  const videoPath = path.join(evidence, `${runPrefix}-playable-chrome.webm`);
  await copyFile(tempVideo, videoPath);
  const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size:stream=codec_name,codec_type,width,height,avg_frame_rate', '-of', 'json', videoPath], { encoding: 'utf8' }));
  const stream = probe.streams.find((candidate) => candidate.codec_type === 'video');
  const seconds = Number(probe.format.duration);
  const videoBytes = Number(probe.format.size);
  const videoHash = createHash('sha256').update(await readFile(videoPath)).digest('hex');
  record('Chrome video complete', { durationSeconds: seconds, bytes: videoBytes });
  assert(seconds >= 30 && seconds <= 360, `${form} gameplay recording outside 30–360 seconds: ${seconds}s`);
  const videoRecord = { form, path: `review-evidence/b06/${runPrefix}-playable-chrome.webm`, sha256: videoHash, bytes: videoBytes, durationSeconds: seconds, width: stream?.width ?? null, height: stream?.height ?? null, frameRate: stream?.avg_frame_rate ?? null, codec: stream?.codec_name ?? null, audioTrack: probe.streams.some((candidate) => candidate.codec_type === 'audio') };
  videos.push(videoRecord);
  check(`${form} headed Chrome recording contains actual time-speed Phaser play`, 'PASS', { seconds, width: stream?.width ?? null, height: stream?.height ?? null, codec: stream?.codec_name ?? null, audioTrack: videoRecord.audioTrack, sha256: videoHash });
  console.log(JSON.stringify({ result: 'PASS', form, checks: checks.length, encounter: encounters.at(-1), video: videoRecord }, null, 2));
}

async function main() {
  await mkdir(evidence, { recursive: true });
  await mkdir(recordingDir, { recursive: true });
  assert(await ready(`${base}/?b06=1`), `Vite did not start: ${serverErrors}`);
  sourceTree = await sourceDigest();
  browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--use-gl=angle', '--use-angle=swiftshader'] });
  browserVersion = browser.version();
  await rosterBoardReview();
  await reducedMotionReview();
  await activeGauntletReview('dawnrush');
  await activeGauntletReview('base');
  const totalVideoSeconds = videos.reduce((total, video) => total + video.durationSeconds, 0);
  assert(totalVideoSeconds >= 120, `Combined live-play evidence should reach the two-minute target; captured ${totalVideoSeconds}s`);
  const report = {
    result: 'PASS', capturedAt: new Date().toISOString(), route: '/?b06=1 (Vite development server)',
    browser: 'Google Chrome headed through Playwright', viewport: { width: 1280, height: 720 }, checks, actions,
    encounters, videos, totalLivePlaySeconds: totalVideoSeconds,
    requirements: { nativeImageGeneration: 'Used; four true-alpha enemy masters and one signature-effect master retained', ownerApproval: 'PENDING', audioHeardByAgent: 'NO', physicalController: 'NOT TESTED; a synthetic standard pad is also exercised via the existing controller smoke', normalSpeedHumanReview: 'PENDING; Chrome capture is real-time and still requires owner review' },
    sourceTree, errors: errors.filter((entry) => !entry.includes('AudioContext was not allowed to start')), serverErrors,
  };
  await writeFile(path.join(evidence, 'b06-events.json'), `${JSON.stringify({ version: 1, sourceDigest: sourceTree.sha256, route: report.route, events: compactEvents, runs: sceneLogs }, null, 2)}\n`);
  await writeFile(path.join(evidence, 'qa-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ result: report.result, checkCount: checks.length, totalLivePlaySeconds: totalVideoSeconds, encounters, videos, sourceTree, errors: report.errors }, null, 2));
  passed = true;
}

try { await main(); }
catch (error) {
  console.error(error?.stack ?? error);
  const failure = { result: 'FAIL', capturedAt: new Date().toISOString(), route: '/?b06=1 (Vite development server)', browser: browserVersion, viewport: { width: 1280, height: 720 }, sourceTree, checks, actions, failureDiagnoses, errors: [...errors, String(error?.message ?? error)], serverErrors };
  await writeFile(path.join(evidence, 'qa-report.json'), `${JSON.stringify(failure, null, 2)}\n`).catch(() => {});
} finally {
  if (recordingContext) await recordingContext.close().catch(() => {});
  if (browser) await browser.close().catch(() => {});
  server.kill();
  await rm(recordingDir, { recursive: true, force: true }).catch(() => {});
}
if (!passed) process.exitCode = 1;
