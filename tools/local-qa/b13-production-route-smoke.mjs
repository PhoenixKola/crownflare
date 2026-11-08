import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port = 4247;
const base = `http://127.0.0.1:${port}`;
const reportPath = 'review-evidence/b13/production-route-smoke.json';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
let browser;
const errors = [];
const failedRequests = [];
const checks = [];

try {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try { if ((await fetch(base)).ok) break; } catch { /* preview is starting */ }
    if (attempt === 99) throw new Error('Vite production preview did not start.');
    await delay(100);
  }
  browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--use-gl=angle', '--use-angle=swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', (request) => failedRequests.push(`${request.url()} / ${request.failure()?.errorText ?? 'failed'}`));
  page.on('response', (response) => { if (response.status() >= 400) failedRequests.push(`HTTP ${response.status()} ${response.url()}`); });

  // Dev-only route flags are deliberately present; a production build must ignore them.
  await page.goto(`${base}/?b06=1&b09=1`, { waitUntil: 'domcontentloaded' });
  const qaHook = await page.evaluate(() => typeof window.__CROWNFLARE_QA__);
  if (qaHook !== 'undefined') throw new Error('Development QA hook leaked into the production build.');
  await page.locator('#start-button').click();
  await page.locator('#hub-new-run').waitFor({ state: 'visible' });
  await page.locator('#hub-new-run').click();
  await page.locator('#hub-begin-run').click();
  const canvas = page.locator('canvas');
  await canvas.waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForFunction(() => {
    const canvasElement = document.querySelector('canvas');
    const hud = document.querySelector('#hud');
    return canvasElement?.width === 480 && canvasElement.height === 270 && hud && !hud.classList.contains('hidden');
  }, undefined, { timeout: 15000 });
  const initial = await canvas.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { width: rect.width, height: rect.height, scaleX: rect.width / element.width, scaleY: rect.height / element.height };
  });
  if (initial.scaleX !== 2 || initial.scaleY !== 2) throw new Error(`Production Pixel Perfect scale was not 2x: ${JSON.stringify(initial)}`);
  const before = createHash('sha256').update(await canvas.screenshot()).digest('hex');
  await page.keyboard.down('d');
  await delay(650);
  await page.keyboard.up('d');
  const after = createHash('sha256').update(await canvas.screenshot()).digest('hex');
  if (before === after) throw new Error('Production canvas did not change during normal keyboard movement.');
  if (errors.length || failedRequests.length) throw new Error([...errors, ...failedRequests].join('\n'));
  checks.push({ route: 'title -> Refuge -> New Run -> first playable room', result: 'PASS', queryFlagsIgnored: ['b06=1', 'b09=1'], qaHook: 'absent', canvas: initial, keyboardMovementChangedFrame: true });
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify({ result: 'PASS', checks, errors, failedRequests }, null, 2)}\n`);
  console.log(JSON.stringify({ result: 'PASS', checks, errors, failedRequests, reportPath }, null, 2));
  await context.close();
} catch (error) {
  await mkdir(path.dirname(reportPath), { recursive: true }).catch(() => {});
  await writeFile(reportPath, `${JSON.stringify({ result: 'FAIL', checks, errors: [...errors, String(error?.message ?? error)], failedRequests }, null, 2)}\n`).catch(() => {});
  throw error;
} finally {
  await browser?.close().catch(() => {});
  server.kill();
}
