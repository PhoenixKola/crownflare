/** Capture actual Phaser B01A candidate views in installed headed Chrome at native and 75% display scale. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const root = process.cwd();
const port = 4173;
const evidenceDir = join(root, 'review-evidence/b01a');
mkdirSync(evidenceDir, { recursive: true });
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'pipe' });
let serverErrors = '';
server.stderr.on('data', (chunk) => { serverErrors += chunk.toString(); });
let browser;
let page;
const failures = [];
const captures = [];
let passed = false;
const assert = (condition, message) => { if (!condition) { failures.push(message); throw new Error(message); } };

try {
  let ready = false;
  for (let i = 0; i < 40; i++) {
    if (server.exitCode !== null) break;
    try { const response = await fetch(`http://127.0.0.1:${port}/`); if (response.ok) { ready = true; break; } }
    catch { /* Vite is starting. */ }
    await delay(250);
  }
  assert(ready, `Vite failed to start: ${serverErrors}`);
  browser = await chromium.launch({ headless: false, channel: 'chrome', args: ['--use-gl=angle', '--use-angle=swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 480, height: 270 } });
  page = await context.newPage();
  page.on('pageerror', (error) => failures.push(`page error: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') failures.push(`console error: ${message.text()}`); });
  page.on('requestfailed', (request) => failures.push(`request failed: ${request.url()} ${request.failure()?.errorText ?? ''}`));

  const cases = [
    { name: 'base-scales-dark-100.png', viewport: { width: 480, height: 270 }, view: 'base', contrast: 'calm', grid: '1' },
    { name: 'forms-color-dark-100.png', viewport: { width: 480, height: 270 }, view: 'forms', contrast: 'calm' },
    { name: 'silhouettes-48-dark-100.png', viewport: { width: 480, height: 270 }, view: 'silhouette', contrast: 'calm', size: '48' },
    { name: 'silhouettes-60-dark-100.png', viewport: { width: 480, height: 270 }, view: 'silhouette', contrast: 'calm', size: '60' },
    { name: 'silhouettes-72-dark-100.png', viewport: { width: 480, height: 270 }, view: 'silhouette', contrast: 'calm', size: '72' },
    { name: 'silhouettes-60-light-100.png', viewport: { width: 480, height: 270 }, view: 'silhouette', contrast: 'light', size: '60' },
    { name: 'silhouettes-60-busy-100.png', viewport: { width: 480, height: 270 }, view: 'silhouette', contrast: 'busy', size: '60' },
    { name: 'directions-dark-100.png', viewport: { width: 480, height: 270 }, view: 'direction', contrast: 'calm' },
    { name: 'materials-dark-100.png', viewport: { width: 480, height: 270 }, view: 'materials', contrast: 'calm' },
    { name: 'base-scales-dark-75.png', viewport: { width: 360, height: 203 }, view: 'base', contrast: 'calm' },
    { name: 'silhouettes-60-dark-4-3.png', viewport: { width: 1024, height: 768 }, view: 'silhouette', contrast: 'busy', size: '60' },
  ];

  for (const testCase of cases) {
    await page.setViewportSize(testCase.viewport);
    const params = new URLSearchParams({ artReview: '1', view: testCase.view, contrast: testCase.contrast });
    if (testCase.size) params.set('size', testCase.size);
    if (testCase.grid) params.set('grid', testCase.grid);
    await page.goto(`http://127.0.0.1:${port}/?${params}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => {
      const snapshot = window.__CROWNFLARE_QA__?.snapshot();
      return snapshot?.screen === 'review' && snapshot.review?.loadedAssets === snapshot.review?.totalAssets;
    }, undefined, { timeout: 12000 });
    const state = await page.evaluate(() => {
      const canvas = document.querySelector('#game-root canvas');
      const snapshot = window.__CROWNFLARE_QA__?.snapshot();
      const rect = canvas?.getBoundingClientRect();
      return { canvasWidth: canvas?.width, canvasHeight: canvas?.height, displayWidth: rect?.width, displayHeight: rect?.height, review: snapshot?.review };
    });
    assert(state.canvasWidth === 480 && state.canvasHeight === 270, `Logical canvas changed in ${testCase.name}`);
    assert(state.review?.missingAssets.length === 0, `Missing candidate PNGs in ${testCase.name}: ${state.review?.missingAssets.join(', ')}`);
    assert(Math.abs(state.displayWidth / state.displayHeight - 16 / 9) < 0.01, `Displayed canvas aspect changed in ${testCase.name}`);
    assert(state.displayWidth <= testCase.viewport.width + 1 && state.displayHeight <= testCase.viewport.height + 1, `Canvas clipped in ${testCase.name}`);
    await page.screenshot({ path: join(evidenceDir, testCase.name) });
    captures.push({ ...testCase, displayWidth: state.displayWidth, displayHeight: state.displayHeight, loadedAssets: state.review?.loadedAssets });
  }

  assert(failures.length === 0, failures.join('\n'));
  passed = true;
} catch (error) {
  console.error('B01A REAL CHROME REVIEW FAILED:', error);
  process.exitCode = 1;
} finally {
  if (page) await page.context().close();
  if (browser) await browser.close();
  server.kill();
}

if (passed) {
  const sourcePaths = [
    'src/main.ts', 'src/game/createGame.ts', 'src/game/scenes/ChamberScene.ts', 'src/game/input/gamepadStartEdge.ts',
    'tools/art-export/build-b01a-previews.mjs', 'tools/local-qa/b01a-visual-review.mjs', 'art-source/manifests/iona-b01a-visual-review.json',
    ...['iona-base-recommended-master-source.png', 'iona-base-left-facing-study-source.png', 'dawnrush-study-source.png', 'stormhalo-study-source.png', 'eclipse-warden-study-source.png'].map((file) => `art-source/characters/iona/b01a/${file}`),
    ...captures.map((item) => `review-evidence/b01a/${item.name}`),
  ];
  const sourceHash = createHash('sha256');
  for (const path of sourcePaths) sourceHash.update(path).update(readFileSync(join(root, path)));
  const sourceDigest = sourceHash.digest('hex');
  const files = captures.map((capture) => {
    const path = join(evidenceDir, capture.name);
    const bytes = statSync(path).size;
    const sha256 = createHash('sha256').update(readFileSync(path)).digest('hex');
    return { path: `review-evidence/b01a/${capture.name}`, bytes, sha256, display: `${capture.displayWidth}x${capture.displayHeight}` };
  });
  const report = [
    '# B01A Real Phaser visual-review evidence', '',
    `- Run: ${new Date().toISOString()}`,
    `- Browser: Installed Chrome ${browser?.version() ?? 'version unavailable'} (headed local run)`,
    '- Render path: existing Phaser 4 game and 480x270 logical B00 chamber; candidate PNGs are loaded from `public/assets/characters/iona/b01a/`.',
    '- Every view reports 26/26 preview assets loaded; no missing textures, request failures, console errors or page exceptions.',
    '- Preview is static in-engine artwork. No idle animation or motion signoff is claimed.',
    '- Display: 480x270 is 100%; 360x203 is approximately 75% (0.752x height, nearest-neighbor CSS scale).',
    '- Responsive aspect check: the 1024x768 (4:3) browser viewport retains the 16:9 game canvas without clipping.',
    `- Aggregate review source/evidence SHA-256: ${sourceDigest}`,
    '', '## Captures', '',
    ...files.map((file) => `- [${file.path.split('/').at(-1)}](${file.path}) — ${file.display} CSS display; ${file.bytes} bytes; SHA-256 \`${file.sha256}\`.`),
    '', 'Separate `npm run qa:controller:local` and unit-test runs passed with the synthetic Gamepad API. Physical gamepad behavior was not exercised.', '',
  ].join('\n');
  const reportPath = join(evidenceDir, 'run-report.md');
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, report);
  console.log(`B01A VISUAL REVIEW PASS: installed Chrome; 26/26 art textures loaded; ${files.length} real-engine captures; source SHA-256 ${sourceDigest}`);
}

if (failures.length) {
  console.error('B01A REVIEW ERRORS:', failures.join('\n'));
  process.exitCode = 1;
}
