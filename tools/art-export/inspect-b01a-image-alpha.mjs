/** Inspect generated PNG dimensions and alpha coverage without changing source art. */
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const files = process.argv.slice(2);
if (files.length === 0) throw new Error('Pass one or more PNG paths.');
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  const page = await browser.newPage();
  const images = files.map((path) => ({ path, dataUrl: `data:image/png;base64,${readFileSync(path).toString('base64')}` }));
  const report = await page.evaluate(async (sources) => {
    const output = [];
    for (const source of sources) {
      const image = new Image();
      image.src = source.dataUrl;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Canvas context unavailable');
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const bins = new Array(8).fill(0);
      const thresholds = [1, 32, 64, 96, 128, 160, 192, 224, 250];
      const bounds = thresholds.map(() => ({ x0: canvas.width, y0: canvas.height, x1: -1, y1: -1, count: 0 }));
      for (let i = 0; i < pixels.length; i += 4) {
        const alpha = pixels[i + 3];
        if (!alpha) continue;
        bins[Math.min(7, Math.floor(alpha / 32))] += 1;
        const x = (i / 4) % canvas.width;
        const y = Math.floor(i / 4 / canvas.width);
        thresholds.forEach((threshold, j) => {
          if (alpha < threshold) return;
          const boundsForThreshold = bounds[j];
          boundsForThreshold.count += 1;
          boundsForThreshold.x0 = Math.min(boundsForThreshold.x0, x);
          boundsForThreshold.x1 = Math.max(boundsForThreshold.x1, x);
          boundsForThreshold.y0 = Math.min(boundsForThreshold.y0, y);
          boundsForThreshold.y1 = Math.max(boundsForThreshold.y1, y);
        });
      }
      output.push({ path: source.path, width: canvas.width, height: canvas.height, alphaBins32: bins, boundsAtAlpha: thresholds.map((threshold, j) => ({ threshold, ...bounds[j] })) });
    }
    return output;
  }, images);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
