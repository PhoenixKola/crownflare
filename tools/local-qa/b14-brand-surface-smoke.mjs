import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port = 4288;
const base = `http://127.0.0.1:${port}`;
const evidence = path.resolve('review-evidence/b14-final');
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
let browser;
const errors = [];
const failedRequests = [];

try {
  const websiteIcon = await readFile('public/favicon.ico');
  const packagedIcon = await readFile('build-resources/crownflare.ico');
  const iconCount = websiteIcon.readUInt16LE(4);
  const iconSizes = Array.from({ length: iconCount }, (_, index) => { const size = websiteIcon.readUInt8(6 + index * 16); return size === 0 ? 256 : size; });
  const iconPackage = { sizes: iconSizes, electronReadyAssetMatchesWebsite: websiteIcon.equals(packagedIcon) };
  if (!iconPackage.electronReadyAssetMatchesWebsite || ![16, 32, 48, 64, 128, 256].every((size) => iconSizes.includes(size))) throw new Error(`Windows icon frame/package mismatch: ${JSON.stringify(iconPackage)}`);
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try { if ((await fetch(base)).ok) break; } catch { /* Vite is starting */ }
    if (attempt === 99) throw new Error('Vite did not start.');
    await delay(100);
  }
  browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--use-gl=angle', '--use-angle=swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('requestfailed', (request) => failedRequests.push(`${request.url()} / ${request.failure()?.errorText ?? 'failed'}`));
  page.on('response', (response) => { if (response.status() >= 400) failedRequests.push(`HTTP ${response.status()} ${response.url()}`); });
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.locator('#start-button').waitFor({ state: 'visible' });
  const metadata = await page.evaluate(async () => {
    const resources = ['/favicon-16.png', '/favicon-32.png', '/favicon.ico', '/favicon.png', '/apple-touch-icon.png', '/assets/ui/b14/crownflare-title.png', '/assets/ui/b14/crownflare-victory.png', '/assets/ui/b14/crownflare-story.png', '/assets/ui/b14/crownflare-controller.png'];
    const checks = await Promise.all(resources.map(async (url) => ({ url, status: (await fetch(url)).status })));
    const title = document.querySelector('.title-screen');
    const hero = document.querySelector('.title-hero img');
    const computed = getComputedStyle(title);
    const imageUrl = computed.backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1] ?? '';
    const image = new Image(); image.src = hero.src; await image.decode();
    return {
      documentTitle: document.title,
      h1: document.querySelector('#game-title')?.innerText,
      button: document.querySelector('#start-button')?.innerText,
      background: computed.backgroundImage,
      backgroundAsset: imageUrl,
      actorSprite: { loaded: image.naturalWidth > 0, width: image.naturalWidth, height: image.naturalHeight },
      canvas: { width: document.querySelector('#game-root canvas')?.width ?? null, height: document.querySelector('#game-root canvas')?.height ?? null },
      resources: checks,
    };
  });
  if (!metadata.documentTitle.includes('Crownflare') || !metadata.h1.includes('CROWN')) throw new Error(`Brand title missing: ${JSON.stringify(metadata)}`);
  if (!metadata.background.includes('crownflare-title.png') || !metadata.actorSprite.loaded) throw new Error('Title environment or Iona sprite did not render.');
  if (metadata.resources.some((resource) => resource.status !== 200)) throw new Error(`Brand resource failed: ${JSON.stringify(metadata.resources)}`);
  const idleAnimation = await page.evaluate(async () => {
    const sprite = document.querySelector('.title-hero img');
    const initial = sprite.src;
    const framesSeen = [sprite.src];
    for (let sample = 0; sample < 6; sample += 1) {
      await new Promise((resolve) => setTimeout(resolve, 260));
      framesSeen.push(sprite.src);
    }
    document.querySelector('#app').classList.add('reduce-motion');
    await new Promise((resolve) => setTimeout(resolve, 450));
    const reduced = sprite.src;
    await new Promise((resolve) => setTimeout(resolve, 950));
    const reducedAfterWait = sprite.src;
    document.querySelector('#app').classList.remove('reduce-motion');
    return { initial, framesSeen: [...new Set(framesSeen)], reduced, reducedAfterWait };
  });
  if (idleAnimation.framesSeen.length < 2 || idleAnimation.reduced !== idleAnimation.reducedAfterWait) throw new Error(`Title idle animation or reduced-motion behavior failed: ${JSON.stringify(idleAnimation)}`);

  await mkdir(evidence, { recursive: true });
  await page.screenshot({ path: path.join(evidence, 'brand-title-1280.png'), animations: 'disabled' });
  await page.setViewportSize({ width: 352, height: 266 });
  const compactTitle = await page.evaluate(() => {
    const screen = document.querySelector('#title-screen').getBoundingClientRect();
    const content = document.querySelector('.title-content').getBoundingClientRect();
    const heading = document.querySelector('#game-title').getBoundingClientRect();
    const actions = document.querySelector('.title-actions').getBoundingClientRect();
    return { screen: { width: screen.width, height: screen.height }, content: { left: content.left, right: content.right, top: content.top, bottom: content.bottom }, heading: { left: heading.left, right: heading.right, top: heading.top, bottom: heading.bottom }, actions: { left: actions.left, right: actions.right, top: actions.top, bottom: actions.bottom } };
  });
  if (compactTitle.heading.left < 0 || compactTitle.heading.right > 352 || compactTitle.actions.left < 0 || compactTitle.actions.right > 352 || compactTitle.actions.bottom > 266) {
    throw new Error(`Compact title layout clips important content: ${JSON.stringify(compactTitle)}`);
  }
  await page.screenshot({ path: path.join(evidence, 'brand-title-352x266.png'), animations: 'disabled' });

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.locator('#start-button').click();
  await page.locator('#hub-screen').waitFor({ state: 'visible' });
  await page.locator('#hub-new-run').click();
  await page.locator('#hub-story').waitFor({ state: 'visible' });
  const storyArt = await page.locator('#hub-story').evaluate((element) => getComputedStyle(element).backgroundImage);
  const controllerArt = await page.locator('.settings-header').evaluate((element) => getComputedStyle(element, '::after').backgroundImage);
  if (!storyArt.includes('crownflare-story.png') || !controllerArt.includes('crownflare-controller.png')) throw new Error(`Generated story/controller art is not applied: ${JSON.stringify({ storyArt, controllerArt })}`);
  await page.screenshot({ path: path.join(evidence, 'brand-story-1280.png'), animations: 'disabled' });
  await page.locator('#hub-story-back').click();
  await page.locator('#hub-controls').click();
  await page.locator('#settings-screen').waitFor({ state: 'visible' });
  const settingsScroll = await page.locator('.settings-panel').evaluate((element) => getComputedStyle(element).scrollbarColor);
  if (!settingsScroll || settingsScroll === 'auto') throw new Error(`Controller settings scrollbar is not themed: ${settingsScroll}`);
  await page.screenshot({ path: path.join(evidence, 'brand-settings-1280.png'), animations: 'disabled' });
  await page.locator('#settings-close').click();

  await page.evaluate(() => {
    document.querySelector('#hub-screen').classList.add('hidden');
    document.querySelector('#hub-screen').setAttribute('aria-hidden', 'true');
    const results = document.querySelector('#b07-results');
    results.dataset.result = 'victory';
    document.querySelector('#b07-result-heading').textContent = 'THE SPINDLE TURNS AGAIN';
    document.querySelector('#b07-result-stats').textContent = 'VICTORY · 3:11 · 11 ROOMS · BOSSES 3/3 · 7 DAMAGE · RUN BUILD RESONANT RECLAMATION 2 / RADIANT DISCIPLINE 2';
    document.querySelector('#b07-result-story').textContent = 'At Broken Meridian, Iona refuses to pin the sky to a single hour. The Lumen Spindle turns again: dawn and night return in their own time.';
    results.classList.remove('hidden');
    results.setAttribute('aria-hidden', 'false');
  });
  const victory = await page.evaluate(() => ({
    background: getComputedStyle(document.querySelector('#b07-results')).backgroundImage,
    heading: document.querySelector('#b07-result-heading')?.innerText,
    panel: getComputedStyle(document.querySelector('#b07-results .b04-results-panel')).backgroundImage,
  }));
  if (!victory.background.includes('crownflare-victory.png')) throw new Error(`Victory artwork not applied: ${JSON.stringify(victory)}`);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.screenshot({ path: path.join(evidence, 'brand-victory-ui.png'), animations: 'disabled' });
  if (errors.length || failedRequests.length) throw new Error([...errors, ...failedRequests].join('\n'));
  const report = { result: 'PASS', method: 'headed Chrome; real browser title, animated Iona idle and reduced-motion behavior, title/story/controller art, favicon/metadata resources, compact layout, themed settings scrollbar and render-only victory overlay', iconPackage, metadata, idleAnimation, compactTitle, storyArt, controllerArt, settingsScroll, victory, errors, failedRequests, screenshots: ['brand-title-1280.png', 'brand-title-352x266.png', 'brand-story-1280.png', 'brand-settings-1280.png', 'brand-victory-ui.png'] };
  await import('node:fs/promises').then(({ writeFile }) => writeFile(path.join(evidence, 'brand-surface.json'), `${JSON.stringify(report, null, 2)}\n`));
  console.log(JSON.stringify(report, null, 2));
  await context.close();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
  server.kill();
}
