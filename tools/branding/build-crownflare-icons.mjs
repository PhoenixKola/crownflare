import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const sourcePath = new URL('../../art-source/ui/b14/crownflare-mark-source.png', import.meta.url);
const source = await readFile(sourcePath);
const dataUrl = `data:image/png;base64,${source.toString('base64')}`;
const sizes = [16, 32, 48, 64, 128, 256];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const pngs = [];

try {
  const page = await browser.newPage({ viewport: { width: 256, height: 256 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><style>*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;background:transparent}#icon{position:relative;width:256px;height:256px;overflow:hidden;background:transparent}#icon img{position:absolute;width:100%;height:100%;left:50%;top:50%;transform:translate(-50%,-50%);object-fit:contain;image-rendering:pixelated}</style><div id="icon"><img alt="" src="${dataUrl}"></div>`);
  await page.locator('img').evaluate((image) => image.decode());
  for (const size of sizes) {
    await page.locator('#icon').evaluate((element, width) => { element.style.width = `${width}px`; element.style.height = `${width}px`; }, size);
    const png = await page.locator('#icon').screenshot({ scale: 'css', animations: 'disabled', omitBackground: true });
    pngs.push({ size, png });
    if (size === 16 || size === 32) await writeFile(new URL(`../../public/favicon-${size}.png`, import.meta.url), png);
    if (size === 256) await writeFile(new URL('../../public/favicon.png', import.meta.url), png);
  }
  await page.locator('#icon').evaluate((element) => { element.style.width = '180px'; element.style.height = '180px'; element.style.background = '#081622'; element.style.borderRadius = '22%'; });
  await writeFile(new URL('../../public/apple-touch-icon.png', import.meta.url), await page.locator('#icon').screenshot({ scale: 'css', animations: 'disabled' }));
} finally {
  await browser.close();
}

const directorySize = 6 + pngs.length * 16;
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(pngs.length, 4);
let offset = directorySize;
const entries = [];
const frames = [];
for (const { size, png } of pngs) {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size === 256 ? 0 : size, 0);
  entry.writeUInt8(size === 256 ? 0 : size, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(offset, 12);
  entries.push(entry);
  frames.push(png);
  offset += png.length;
}
const ico = Buffer.concat([header, ...entries, ...frames]);
await mkdir(new URL('../../public', import.meta.url), { recursive: true });
await mkdir(new URL('../../build-resources', import.meta.url), { recursive: true });
await writeFile(new URL('../../public/favicon.ico', import.meta.url), ico);
await writeFile(new URL('../../build-resources/crownflare.ico', import.meta.url), ico);
console.log(JSON.stringify({ sizes, bytes: ico.length, source: 'art-source/ui/b14/crownflare-mark-source.png', website: ['public/favicon-16.png', 'public/favicon-32.png', 'public/favicon.png', 'public/favicon.ico', 'public/apple-touch-icon.png'], packagedAppIcon: 'build-resources/crownflare.ico' }, null, 2));
