/** Focused live-Chrome check for Start-button resume while Phaser is paused. */
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port = 4174;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'pipe' });
let serverErrors = '';
server.stderr.on('data', (chunk) => { serverErrors += chunk.toString(); });
let browser;
let context;
let page;
const failures = [];
const assert = (condition, message) => { if (!condition) throw new Error(message); };

try {
  let ready = false;
  for (let i = 0; i < 40; i++) {
    if (server.exitCode !== null) break;
    try { if ((await fetch(`http://127.0.0.1:${port}/`)).ok) { ready = true; break; } }
    catch { /* Vite is starting. */ }
    await delay(250);
  }
  assert(ready, `Vite failed to start: ${serverErrors}`);
  browser = await chromium.launch({ headless: false, channel: 'chrome', args: ['--use-gl=angle', '--use-angle=swiftshader'] });
  context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  page = await context.newPage();
  page.on('pageerror', (error) => failures.push(`page error: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') failures.push(`console error: ${message.text()}`); });
  page.on('requestfailed', (request) => failures.push(`request failed: ${request.url()}`));

  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /ENTER THE SPINDLE/ }).click();
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().screen === 'playing' && window.__CROWNFLARE_QA__?.snapshot().player?.grounded === true);

  await page.evaluate(() => {
    const syntheticPad = {
      connected: true, index: 0, mapping: 'standard', timestamp: 1, id: 'Synthetic QA pad (not physical)',
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })),
      axes: Array.from({ length: 4 }, () => ({ getValue: () => 0 })),
    };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [syntheticPad] });
    Object.defineProperty(window, '__CROWNFLARE_SYNTHETIC_PAD__', { configurable: true, value: syntheticPad });
  });

  // A held Start at the pause boundary must not undo the pause immediately.
  await page.evaluate(() => { window.__CROWNFLARE_SYNTHETIC_PAD__.buttons[9].pressed = true; });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().screen === 'paused');
  await page.waitForTimeout(100);
  assert((await page.evaluate(() => window.__CROWNFLARE_QA__?.snapshot().screen)) === 'paused', 'Held Start undid the pause boundary');

  // A release followed by a fresh Start press resumes once.
  await page.evaluate(() => { window.__CROWNFLARE_SYNTHETIC_PAD__.buttons[9].pressed = false; });
  await page.waitForTimeout(80);
  await page.evaluate(() => { window.__CROWNFLARE_SYNTHETIC_PAD__.buttons[9].pressed = true; });
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().screen === 'playing', undefined, { timeout: 2000 });
  await page.waitForTimeout(100);
  assert((await page.evaluate(() => window.__CROWNFLARE_QA__?.snapshot().screen)) === 'playing', 'Start caused a double toggle after resume');
  await page.evaluate(() => { window.__CROWNFLARE_SYNTHETIC_PAD__.buttons[9].pressed = false; });

  // Keyboard pause and the UI resume remain available after controller resume.
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().screen === 'paused');
  await page.getByRole('button', { name: /^RESUME/ }).click();
  await page.waitForFunction(() => window.__CROWNFLARE_QA__?.snapshot().screen === 'playing');
  assert(failures.length === 0, failures.join('\n'));
  console.log(`CONTROLLER START RESUME PASS: Installed Chrome ${browser.version()}; held-button edge, pause boundary, fresh Start resume, no double toggle, keyboard/UI resume; synthetic Gamepad API only, no physical controller claim.`);
} catch (error) {
  console.error('CONTROLLER START RESUME FAIL:', error);
  if (failures.length) console.error(failures.join('\n'));
  process.exitCode = 1;
} finally {
  if (context) await context.close();
  if (browser) await browser.close();
  server.kill();
}
