/** Confirms the developer-only B05 query does not expose Dawnrush in production. */
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port = 4195;
const url = `http://127.0.0.1:${port}/?b05=1`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'pipe' });
let browser;
const errors = [];

async function ready() {
  for (let i = 0; i < 60; i += 1) {
    try { if ((await fetch(url)).ok) return true; } catch { /* Preview server is starting. */ }
    await delay(200);
  }
  return false;
}

try {
  if (!await ready()) throw new Error('Production preview server failed to start');
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const metadata = await page.locator('#title-metadata').innerText();
  const notice = await page.locator('#preview-notice').innerText();
  const startLabel = await page.locator('#start-button').innerText();
  if (metadata.includes('B05') || notice.includes('DAWNRUSH') || startLabel.includes('DAWNRUSH')) {
    throw new Error(`Production accepted the B05 route: ${metadata} / ${notice} / ${startLabel}`);
  }
  if (await page.evaluate(() => typeof window.__CROWNFLARE_QA__ !== 'undefined')) throw new Error('Development QA hook was exposed in production');
  await page.locator('#start-button').click();
  await page.locator('#game-root canvas').waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForTimeout(500);
  if (errors.length) throw new Error(`Production browser errors: ${errors.join('\n')}`);
  console.log(JSON.stringify({ result: 'PASS', route: '/?b05=1', title: metadata, developmentNotice: notice, startLabel, canvasMounted: true, qaHookExposed: false, errors }, null, 2));
} catch (error) {
  console.error(error?.stack ?? error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  server.kill();
}
