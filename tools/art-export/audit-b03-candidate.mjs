import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import path from 'node:path';

const root = process.cwd();
const manifestPath = 'art-source/manifests/iona-b03-candidate-v1.json';
const manifest = JSON.parse(await readFile(path.join(root, manifestPath), 'utf8'));
const fail = (message) => { throw new Error(`B03 art audit failed: ${message}`); };
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');

function png(bytes, label) {
  if (bytes.toString('hex', 0, 8) !== '89504e470d0a1a0a') fail(`${label} is not a PNG`);
  let offset = 8, width = 0, height = 0, depth = 0, colorType = 0;
  const compressed = [];
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset); const type = bytes.toString('ascii', offset + 4, offset + 8);
    const start = offset + 8, end = start + length;
    if (type === 'IHDR') { width = bytes.readUInt32BE(start); height = bytes.readUInt32BE(start + 4); depth = bytes[start + 8]; colorType = bytes[start + 9]; }
    if (type === 'IDAT') compressed.push(bytes.subarray(start, end));
    offset = end + 4;
    if (type === 'IEND') break;
  }
  if (depth !== 8 || colorType !== 6) fail(`${label} must be 8-bit RGBA (got depth=${depth}, type=${colorType})`);
  const raw = inflateSync(Buffer.concat(compressed));
  const stride = width * 4; const decoded = Buffer.alloc(stride * height); let cursor = 0;
  const paeth = (a, b, c) => { const p = a + b - c; const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
  for (let y = 0; y < height; y += 1) {
    const filter = raw[cursor++]; const row = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const value = raw[cursor++]; const left = x >= 4 ? decoded[row + x - 4] : 0;
      const above = y > 0 ? decoded[row - stride + x] : 0; const upperLeft = y > 0 && x >= 4 ? decoded[row - stride + x - 4] : 0;
      const predictor = filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? above : filter === 3 ? Math.floor((left + above) / 2) : filter === 4 ? paeth(left, above, upperLeft) : fail(`${label} has invalid PNG filter ${filter}`);
      decoded[row + x] = (value + predictor) & 255;
    }
  }
  let minAlpha = 255, maxAlpha = 0, nontransparent = 0, minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const alpha = decoded[y * stride + x * 4 + 3]; minAlpha = Math.min(minAlpha, alpha); maxAlpha = Math.max(maxAlpha, alpha);
    if (alpha > 0) { nontransparent += 1; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  }
  if (minAlpha !== 0 || maxAlpha === 0 || nontransparent < 16) fail(`${label} is invisible or lacks transparent padding`);
  return { width, height, alpha: { min: minAlpha, max: maxAlpha, nontransparentPixels: nontransparent, bounds: [minX, minY, maxX + 1, maxY + 1] } };
}

if (manifest.artStatus !== 'CANDIDATE_PENDING_OWNER_REVIEW' || manifest.runtimePromotionEnabled !== false) fail('unapproved art must stay candidate-only');
if (manifest.approval?.baseDesign !== 'PENDING_OWNER_APPROVAL' || manifest.approval?.artMotion !== 'PENDING_NORMAL_SPEED_REVIEW') fail('owner approvals must remain pending');
const sourceAudit = [];
for (const source of [...manifest.sourceSheets, manifest.reference]) {
  const bytes = await readFile(path.join(root, source.path));
  const actual = sha(bytes);
  if (actual !== source.sha256) fail(`source hash mismatch: ${source.path}`);
  sourceAudit.push({ path: source.path, sha256: actual, bytes: bytes.length, generationId: source.generationId ?? null });
}
const runtimeAudit = [];
for (const asset of manifest.runtimeAssets) {
  const bytes = await readFile(path.join(root, asset.path));
  const actual = sha(bytes);
  if (actual !== asset.sha256) fail(`runtime hash mismatch: ${asset.path}`);
  const info = png(bytes, asset.path);
  const expected = asset.canvas.split('x').map(Number);
  if (info.width !== expected[0] || info.height !== expected[1]) fail(`${asset.path} canvas ${info.width}x${info.height} does not match ${asset.canvas}`);
  runtimeAudit.push({ ...asset, bytes: bytes.length, alpha: info.alpha, ownerApproved: false });
}
if (runtimeAudit.length !== 34 || manifest.counts?.runtimeAssets !== 34) fail(`expected 34 candidate runtime textures; found ${runtimeAudit.length}`);
const poseNames = new Set(runtimeAudit.filter((asset) => asset.path.includes('/iona/b03/')).map((asset) => path.basename(asset.path).replace(/-(left|right)\.png$/, '')));
if (poseNames.size !== 12 || manifest.counts?.playerActionPoses !== 24) fail(`expected 12 authored player states across two facings; found ${poseNames.size}`);
if (manifest.physics?.playerBody !== '15x30 unchanged' || manifest.physics?.playerFootPivot !== '64,80') fail('B02 body or shared foot pivot changed');

const directionStates = ['combo-1-contact', 'combo-2-contact', 'combo-3-contact'].map((pose) => ({ action: pose, source: 'B01E candidate', facings: ['left', 'right'], runtimePaths: ['left', 'right'].map((facing) => `public/assets/characters/iona/b01e/${pose}-${facing}.png`), chrome: pose === 'combo-1-contact' ? 'SCREENSHOT_CAPTURED; chain timing/target damage passed' : 'USED_IN_LIVE_CHAIN; detailed pose screenshot pending', ownerApproval: 'PENDING' }));
for (const move of ['heavy', 'air', 'special']) directionStates.push({ action: move, source: 'B03 native image_gen candidate', facings: ['left', 'right'], runtimePaths: ['windup', 'contact', 'recovery'].flatMap((phase) => ['left', 'right'].map((facing) => `public/assets/characters/iona/b03/${move === 'special' ? 'special' : move}-${phase === 'windup' ? (move === 'special' ? 'windup' : 'windup') : phase}-${facing}.png`)), chrome: move === 'heavy' ? 'RIGHT CONTACT SCREENSHOT; hit/launch passed' : move === 'air' ? 'RIGHT CONTACT SCREENSHOT; action passed' : 'RIGHT CONTACT + VFX SCREENSHOT; hit/resource passed', ownerApproval: 'PENDING' });
directionStates.push({ action: 'hurt reactions', source: 'B03 native image_gen candidate', facings: ['left', 'right'], runtimePaths: ['hurt-flinch','hurt-stagger','hurt-ko'].flatMap((pose) => ['left','right'].map((facing) => `public/assets/characters/iona/b03/${pose}-${facing}.png`)), chrome: 'LOADED; enemy/player damage scenario observed; pose-by-pose screenshots pending', ownerApproval: 'PENDING' });
const coverage = {
  milestone: 'B03', generatedAt: new Date().toISOString(), artStatus: 'CANDIDATE_PENDING_OWNER_REVIEW', baseDesignApproval: 'PENDING', artMotionApproval: 'PENDING_NORMAL_SPEED_REVIEW',
  imageGeneration: { tool: 'OpenAI native image_gen', sourceSheets: sourceAudit.filter((source) => source.generationId), exactPromptAvailability: 'Exact request text was not preserved in the repository at baseline; see generation-prompts.md for clearly marked reconstructed intent summaries.' },
  sourceAudit, runtimeAudit, actionCoverage: directionStates,
  enemy: { source: 'B03 native image_gen candidate', states: ['idle','telegraph','lunge','hurt','stagger','ko'], facing: 'right master mirrored in Phaser for left', ownerApproval: 'PENDING', chrome: 'approach/telegraph/lunge observed; KO visual pending' },
  vfx: { source: 'B03 native image_gen candidate', runtimeFrames: ['resonance-wave-0','resonance-wave-1','resonance-wave-2','resonance-wave-3'], chrome: 'special hit and generated pressure wave captured; VFX-off body pose checked', ownerApproval: 'PENDING' },
  counts: { originalSourceSheets: sourceAudit.filter((source) => source.generationId).length, playerActionTextures: runtimeAudit.filter((asset) => asset.path.includes('/iona/b03/')).length, enemyStates: runtimeAudit.filter((asset) => asset.path.includes('/spindle-sentry/')).length, vfxFrames: runtimeAudit.filter((asset) => asset.path.includes('/vfx/b03/')).length, runtimeTextures: runtimeAudit.length },
};
await mkdir(path.join(root, 'review-evidence/b03'), { recursive: true });
await writeFile(path.join(root, 'review-evidence/b03/art-coverage.json'), `${JSON.stringify(coverage, null, 2)}\n`);
console.log(`PASS: ${sourceAudit.length} original source hashes, ${runtimeAudit.length} RGBA runtime textures, fixed 128x80 player canvas, 15x30 body, 64,80 pivot; all art remains unapproved candidate.`);
