/** Deterministically derive hard-alpha nearest-neighbor B01A review sprites from preserved generated sources. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const outputDir = join(root, 'public/assets/characters/iona/b01a');
const sources = [
  { form: 'Base', key: 'base', direction: 'right', assetId: 'iona-b01a-base-recommended', path: 'art-source/characters/iona/b01a/iona-base-recommended-master-source.png', generationRef: 'exec-e3973517-c841-4966-b879-9dcabd8dbfa3', heights: [48, 60, 72] },
  { form: 'Base', key: 'base-left', direction: 'left', assetId: 'iona-b01a-base-left-study', path: 'art-source/characters/iona/b01a/iona-base-left-facing-study-source.png', generationRef: 'exec-295b8eb1-4af6-41d5-84d3-3a805301a449', heights: [60] },
  { form: 'Dawnrush', key: 'dawnrush', direction: 'right', assetId: 'iona-b01a-dawnrush-study', path: 'art-source/characters/iona/b01a/dawnrush-study-source.png', generationRef: 'exec-dce51952-8d1c-4f93-8b6b-01d90a648c5c', heights: [48, 60, 72] },
  { form: 'Stormhalo', key: 'stormhalo', direction: 'right', assetId: 'iona-b01a-stormhalo-study', path: 'art-source/characters/iona/b01a/stormhalo-study-source.png', generationRef: 'exec-19954f3c-aebb-4ee0-bb9c-72e20644abf8', heights: [48, 60, 72] },
  { form: 'Eclipse Warden', key: 'eclipse-warden', direction: 'right', assetId: 'iona-b01a-eclipse-warden-study', path: 'art-source/characters/iona/b01a/eclipse-warden-study-source.png', generationRef: 'exec-08cfe2cb-e86e-4689-962c-62ad852714a5', heights: [48, 60, 72] },
];
const alphaThreshold = 128;
mkdirSync(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
let browserOutput;
try {
  const page = await browser.newPage();
  await page.setContent('<!doctype html><meta charset="utf-8"><title>B01A source processing</title>');
  const input = sources.map((source) => ({
    ...source,
    sourceWidth: undefined,
    sourceHeight: undefined,
    dataUrl: `data:image/png;base64,${readFileSync(join(root, source.path)).toString('base64')}`,
  }));
  browserOutput = await page.evaluate(async ({ items, threshold }) => {
    const results = [];
    for (const item of items) {
      const image = new Image();
      image.src = item.dataUrl;
      await image.decode();
      const sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = image.naturalWidth;
      sourceCanvas.height = image.naturalHeight;
      const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
      if (!sourceContext) throw new Error(`Canvas unavailable for ${item.path}`);
      sourceContext.drawImage(image, 0, 0);
      const pixels = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
      let x0 = sourceCanvas.width, y0 = sourceCanvas.height, x1 = -1, y1 = -1;
      let removed = 0, retained = 0;
      for (let i = 0; i < pixels.data.length; i += 4) {
        const alpha = pixels.data[i + 3];
        if (alpha < threshold) { pixels.data[i + 3] = 0; removed += alpha > 0 ? 1 : 0; continue; }
        pixels.data[i + 3] = 255;
        retained += 1;
        const x = (i / 4) % sourceCanvas.width;
        const y = Math.floor(i / 4 / sourceCanvas.width);
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
      if (x1 < x0 || y1 < y0) throw new Error(`No opaque subject pixels at alpha ${threshold}: ${item.path}`);
      const width = x1 - x0 + 1, height = y1 - y0 + 1;
      const cropped = sourceContext.getImageData(x0, y0, width, height);
      const outputs = [];
      for (const targetHeight of item.heights) {
        const targetWidth = Math.max(1, Math.round(width * targetHeight / height));
        const colorCanvas = document.createElement('canvas');
        colorCanvas.width = targetWidth; colorCanvas.height = targetHeight;
        const colorContext = colorCanvas.getContext('2d', { willReadFrequently: true });
        if (!colorContext) throw new Error('Canvas context unavailable');
        colorContext.imageSmoothingEnabled = false;
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = width; cropCanvas.height = height;
        const cropContext = cropCanvas.getContext('2d');
        if (!cropContext) throw new Error('Crop canvas context unavailable');
        cropContext.putImageData(cropped, 0, 0);
        colorContext.drawImage(cropCanvas, 0, 0, targetWidth, targetHeight);
        const colorPixels = colorContext.getImageData(0, 0, targetWidth, targetHeight);
    const silhouetteCanvas = document.createElement('canvas');
        silhouetteCanvas.width = targetWidth; silhouetteCanvas.height = targetHeight;
        const silhouetteContext = silhouetteCanvas.getContext('2d');
        if (!silhouetteContext) throw new Error('Silhouette canvas context unavailable');
        const silhouettePixels = new ImageData(colorPixels.data.slice(), targetWidth, targetHeight);
        for (let i = 0; i < silhouettePixels.data.length; i += 4) {
          if (!silhouettePixels.data[i + 3]) continue;
          silhouettePixels.data[i] = 5; silhouettePixels.data[i + 1] = 8; silhouettePixels.data[i + 2] = 13; silhouettePixels.data[i + 3] = 255;
        }
        silhouetteContext.putImageData(silhouettePixels, 0, 0);
        colorContext.putImageData(colorPixels, 0, 0);
        outputs.push({
          height: targetHeight, width: targetWidth,
          colorDataUrl: colorCanvas.toDataURL('image/png'),
          silhouetteDataUrl: silhouetteCanvas.toDataURL('image/png'),
        });
      }
      results.push({
        form: item.form, key: item.key, direction: item.direction, assetId: item.assetId, path: item.path, generationRef: item.generationRef,
        sourceDimensions: { width: image.naturalWidth, height: image.naturalHeight },
        hardAlphaBounds: { x: x0, y: y0, width, height }, alphaThreshold: threshold, droppedTranslucentPixels: removed, retainedPixels: retained,
        outputs,
      });
    }
    const paletteCanvas = document.createElement('canvas');
    const base = results.find((result) => result.key === 'base').outputs.find((result) => result.height === 60);
    const paletteImage = new Image(); paletteImage.src = base.colorDataUrl; await paletteImage.decode();
    paletteCanvas.width = paletteImage.naturalWidth; paletteCanvas.height = paletteImage.naturalHeight;
    const paletteContext = paletteCanvas.getContext('2d', { willReadFrequently: true });
    if (!paletteContext) throw new Error('Palette context unavailable');
    paletteContext.drawImage(paletteImage, 0, 0);
    const data = paletteContext.getImageData(0, 0, paletteCanvas.width, paletteCanvas.height).data;
    const counts = new Map();
    for (let i = 0; i < data.length; i += 4) if (data[i + 3]) {
      const hex = `#${[data[i], data[i + 1], data[i + 2]].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
      counts.set(hex, (counts.get(hex) ?? 0) + 1);
    }
    const topColors = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([hex, pixels]) => ({ hex, pixels }));
    return { alphaThreshold: threshold, sources: results, topBaseColors60px: topColors };
  }, { items: input, threshold: alphaThreshold });
} finally {
  await browser.close();
}

const outputAssets = [];
for (const source of browserOutput.sources) {
  for (const output of source.outputs) {
    const baseName = `${source.key}-${output.height}`;
    const colorFile = `${baseName}.png`;
    const silhouetteFile = `${baseName}-silhouette.png`;
    for (const [file, dataUrl, variant] of [
      [colorFile, output.colorDataUrl, 'color'],
      [silhouetteFile, output.silhouetteDataUrl, 'solid-black-silhouette'],
    ]) {
      const buffer = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
      const path = join(outputDir, file);
      writeFileSync(path, buffer);
      outputAssets.push({ assetId: `${source.assetId}-${variant}-${output.height}`, form: source.form, direction: source.direction, variant, targetHeight: output.height, dimensions: `${output.width}x${output.height}`, pivot: { x: 0.5, y: 1 }, sourcePath: source.path, sourceSha256: createHash('sha256').update(readFileSync(join(root, source.path))).digest('hex'), runtimePath: relative(root, path).replaceAll('\\', '/'), sha256: createHash('sha256').update(buffer).digest('hex'), bytes: buffer.length, ownerStatus: 'PENDING_OWNER_REVIEW', runtimeIntegrated: true, integratedScene: 'src/game/scenes/ChamberScene.ts?artReview=1' });
    }
  }
}

const manifest = {
  schemaVersion: 1,
  milestone: 'B01A',
  status: 'PENDING_OWNER_REVIEW',
  ownerApproval: 'PENDING',
  sourceTool: 'OpenAI built-in image_gen; tool model/version not exposed in result metadata',
  sourcePromptRecord: 'art-source/manifests/b01a-image-generation-prompts.md',
  processing: { method: 'Canvas alpha threshold, tight crop, nearest-neighbor resample; no geometric retouching', alphaThreshold, targetHeights: [48, 60, 72] },
  sources: browserOutput.sources.map(({ outputs, ...source }) => ({ ...source, sha256: createHash('sha256').update(readFileSync(join(root, source.path))).digest('hex'), ownerStatus: 'PENDING_OWNER_REVIEW', runtimeIntegratedDirectly: false })),
  previewAssets: outputAssets,
  candidatePalette: [
    { role: 'pearl fabric / hair light', hex: '#E4D7D0' },
    { role: 'deep navy cloth / outline', hex: '#282743' },
    { role: 'cool slate shadow', hex: '#68657B' },
    { role: 'single teal identity accent', hex: '#35AEB0' },
    { role: 'warm copper hardware', hex: '#A8694E' },
    { role: 'warm skin midtone', hex: '#E9A480' },
  ],
  paletteSampleFromBase60px: browserOutput.topBaseColors60px,
  notes: [
    'These generated images are original directional candidates, not canonical/approved art or animation frames.',
    'The full-resolution source PNGs are preserved unchanged. Preview PNGs harden alpha at the recorded threshold and use nearest-neighbor resampling to the stated logical height.',
    'Solid silhouettes are deterministic black masks of the actual cleaned color previews, not replacement character drawings.',
    'B01A review assets are loaded only by the development-only artReview query path; normal B00 gameplay retains its programmer rectangle.',
  ],
};
const manifestPath = join(root, 'art-source/manifests/iona-b01a-visual-review.json');
mkdirSync(dirname(manifestPath), { recursive: true });
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ manifest: 'art-source/manifests/iona-b01a-visual-review.json', alphaThreshold, sources: manifest.sources.map(({ assetId, path, sha256, hardAlphaBounds, droppedTranslucentPixels, retainedPixels }) => ({ assetId, path, sha256, hardAlphaBounds, droppedTranslucentPixels, retainedPixels })), previewFiles: outputAssets.length, bytes: outputAssets.reduce((sum, asset) => sum + asset.bytes, 0), palette: manifest.paletteSampleFromBase60px }, null, 2));
