import { mkdir, access, readFile, readdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';

const ROOT = process.cwd();
const IONA_SOURCE = 'art-source/characters/iona/b03-candidate/generation';
const ENEMY_SOURCE = 'art-source/characters/enemies/b03-sentry/generation';
const VFX_SOURCE = 'art-source/vfx/b03';
const IONA_OUT = 'public/assets/characters/iona/b03';
const ENEMY_OUT = 'public/assets/enemies/spindle-sentry';
const VFX_OUT = 'public/assets/vfx/b03';
const MANIFEST = 'art-source/manifests/iona-b03-candidate-v1.json';

const actionFrames = [
  { file: 'iona-heavy-6poses.png', folder: IONA_SOURCE, output: IONA_OUT, poses: ['heavy-windup', 'heavy-contact', 'heavy-recovery'] },
  { file: 'iona-aerial-6poses.png', folder: IONA_SOURCE, output: IONA_OUT, poses: ['air-windup', 'air-contact', 'air-recovery'] },
  { file: 'iona-resonance-6poses.png', folder: IONA_SOURCE, output: IONA_OUT, poses: ['special-windup', 'special-contact', 'special-recovery'] },
  { file: 'iona-hurt-6poses.png', folder: IONA_SOURCE, output: IONA_OUT, poses: ['hurt-flinch', 'hurt-stagger', 'hurt-ko'] },
];

async function exportFrame(source, destination, filter) {
  await mkdir(path.dirname(destination), { recursive: true });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', source, '-vf', filter, '-frames:v', '1', destination]);
}

for (const sheet of actionFrames) {
  const source = path.join(ROOT, sheet.folder, sheet.file);
  await access(source);
  for (const [row, facing] of [['0', 'right'], ['1', 'left']]) {
    for (let col = 0; col < 3; col += 1) {
      const pose = sheet.poses[col];
      const x = col * 512;
      const y = Number(row) * 512;
      const output = path.join(ROOT, sheet.output, `${pose}-${facing}.png`);
      const filter = `crop=512:500:${x}:${y},scale=68:64:flags=neighbor,pad=128:80:30:16:color=0x00000000,format=rgba`;
      await exportFrame(source, output, filter);
    }
  }
}

const enemySource = path.join(ROOT, ENEMY_SOURCE, 'spindle-sentry-6poses.png');
await access(enemySource);
const enemyFrames = ['idle', 'telegraph', 'lunge', 'hurt', 'stagger', 'ko'];
for (let i = 0; i < enemyFrames.length; i += 1) {
  const row = Math.floor(i / 3), col = i % 3;
  const x = col * 512, y = row * 512;
  const filter = `crop=512:500:${x}:${y},scale=52:48:flags=neighbor,pad=64:56:6:8:color=0x00000000,format=rgba`;
  await exportFrame(enemySource, path.join(ROOT, ENEMY_OUT, `${enemyFrames[i]}.png`), filter);
}

const vfxSource = path.join(ROOT, VFX_SOURCE, 'resonance-pressure-wave-4frames.png');
await access(vfxSource);
for (let i = 0; i < 4; i += 1) {
  const filter = `crop=543:543:${i * 543}:0,scale=48:48:flags=neighbor,pad=64:64:8:8:color=0x00000000,format=rgba`;
  await exportFrame(vfxSource, path.join(ROOT, VFX_OUT, `resonance-wave-${i}.png`), filter);
}

const sourceRecords = [
  { path: `${IONA_SOURCE}/iona-heavy-6poses.png`, generationId: 'exec-cba1dab3-23ae-4deb-9481-7bff94f93d55', intendedStates: ['heavy-windup', 'heavy-contact', 'heavy-recovery'], facings: ['right', 'left'] },
  { path: `${IONA_SOURCE}/iona-aerial-6poses.png`, generationId: 'exec-24dbf2d6-99dd-48f2-8853-dcd906321cbe', intendedStates: ['air-windup', 'air-contact', 'air-recovery'], facings: ['right', 'left'] },
  { path: `${IONA_SOURCE}/iona-resonance-6poses.png`, generationId: 'exec-6eb8432f-12fa-47fc-ae68-83106c7a55c5', intendedStates: ['special-windup', 'special-contact', 'special-recovery'], facings: ['right', 'left'] },
  { path: `${IONA_SOURCE}/iona-hurt-6poses.png`, generationId: 'exec-7ce2e082-f0e7-48d5-9d04-7956e2ecd325', intendedStates: ['hurt-flinch', 'hurt-stagger', 'hurt-ko'], facings: ['right', 'left'] },
  { path: `${ENEMY_SOURCE}/spindle-sentry-6poses.png`, generationId: 'exec-cd92cbe8-e5be-4c0f-a05b-481226c9a35d', intendedStates: enemyFrames, facings: ['right; Phaser flipX for left'] },
  { path: `${VFX_SOURCE}/resonance-pressure-wave-4frames.png`, generationId: 'exec-6de35d9e-b2cc-4755-a23c-9ab2cfc9a5e9', intendedStates: [0, 1, 2, 3].map((frame) => `resonance-wave-${frame}`), facings: ['right; Phaser flipX for left'] },
];
const sha256 = async (file) => createHash('sha256').update(await readFile(path.join(ROOT, file))).digest('hex');
for (const source of sourceRecords) source.sha256 = await sha256(source.path);
const runtimeFolders = [IONA_OUT, ENEMY_OUT, VFX_OUT];
const runtimeAssets = [];
for (const folder of runtimeFolders) {
  const files = await readdir(path.join(ROOT, folder));
  for (const file of files.filter((name) => name.endsWith('.png')).sort()) {
    const filePath = `${folder}/${file}`;
    runtimeAssets.push({ path: filePath, sha256: await sha256(filePath), canvas: folder === IONA_OUT ? '128x80' : folder === ENEMY_OUT ? '64x56' : '64x64', candidate: true, ownerApproved: false });
  }
}
const reference = 'art-source/characters/iona/b01a/iona-base-recommended-master-source.png';
const manifest = {
  version: 1,
  milestone: 'B03',
  createdAt: new Date().toISOString(),
  artStatus: 'CANDIDATE_PENDING_OWNER_REVIEW',
  runtimePromotionEnabled: false,
  approval: { baseDesign: 'PENDING_OWNER_APPROVAL', artMotion: 'PENDING_NORMAL_SPEED_REVIEW', enemyArt: 'PENDING_OWNER_APPROVAL' },
  generation: { tool: 'OpenAI native image_gen', technique: 'Reference-guided generation from provisional B01A Iona master; transparent 3x2 body-pose sheets and a 1x4 VFX sheet; nearest-neighbor export from fixed sheet cells; no per-pose alpha-bound scaling.' },
  reference: { path: reference, sha256: await sha256(reference) },
  sourceSheets: sourceRecords,
  runtimeAssets,
  counts: { playerActionPoses: 24, enemyStates: 6, vfxFrames: 4, runtimeAssets: runtimeAssets.length },
  physics: { playerBody: '15x30 unchanged', playerCanvas: '128x80', playerFootPivot: '64,80', enemyCanvas: '64x56' },
};
await writeFile(path.join(ROOT, MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(`Exported ${manifest.counts.playerActionPoses} Iona combat/reaction poses, ${manifest.counts.enemyStates} sentry states, and ${manifest.counts.vfxFrames} Resonance VFX frames; wrote ${MANIFEST}.`);
