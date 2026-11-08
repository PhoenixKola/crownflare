import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const generalCap = 25 * 1024 * 1024;
const sourceArtCap = 64 * 1024 * 1024;
const largeJsonCap = 8 * 1024 * 1024;
const tracked = spawnSync('git', ['ls-files', '-z'], { encoding: 'buffer' });
if (tracked.status !== 0) throw new Error(`git ls-files failed: ${tracked.stderr?.toString() ?? 'unknown error'}`);
const files = tracked.stdout.toString().split('\0').filter(Boolean).map((value) => value.replaceAll('\\', '/'));
const problems = [];
const categories = new Map();
const proofText = [];

function collectProvenance(folder) {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const target = path.join(folder, entry.name);
    if (entry.isDirectory()) collectProvenance(target);
    else if (entry.isFile() && /\.(json|md)$/i.test(entry.name)) proofText.push(readFileSync(target, 'utf8'));
  }
}
if (existsSync('art-source')) collectProvenance('art-source');

function categoryOf(file) {
  const root = file.split('/')[0];
  return ({ 'art-source': 'canonical source art', public: 'runtime assets', src: 'game source', tests: 'tests', tools: 'tools', docs: 'documentation', 'review-evidence': 'review evidence' })[root] ?? 'project metadata';
}

for (const file of files) {
  const lower = file.toLowerCase();
  if (lower.startsWith('review-evidence/')) problems.push(`Tracked review evidence: ${file}`);
  if (/\.(webm|mp4|mov|mkv|trace|har|zip)$/i.test(file)) problems.push(`Tracked capture/archive artifact: ${file}`);
  if (/(^|\/)(playwright-report|test-results|browser-profile|chrome-profile|user-data-dir)(\/|$)/i.test(file)) problems.push(`Tracked browser profile or test output: ${file}`);
  let bytes;
  try { bytes = statSync(file).size; } catch { problems.push(`Tracked path is missing from the working tree: ${file}`); continue; }
  const category = categoryOf(file);
  categories.set(category, (categories.get(category) ?? 0) + bytes);
  const cap = lower.startsWith('art-source/') ? sourceArtCap : generalCap;
  if (bytes > cap) problems.push(`File exceeds ${Math.round(cap / 1024 / 1024)} MiB cap: ${file} (${bytes} bytes)`);
  if (lower.endsWith('.json') && bytes > largeJsonCap) problems.push(`Large JSON trace/data file exceeds 8 MiB: ${file} (${bytes} bytes)`);
  if (lower.startsWith('art-source/') && bytes > generalCap) {
    const basename = file.split('/').at(-1);
    if (!proofText.some((text) => text.includes(file) || text.includes(basename))) problems.push(`Large source-art master lacks a provenance reference: ${file}`);
  }
}

const totalBytes = [...categories.values()].reduce((sum, bytes) => sum + bytes, 0);
const existing = files.flatMap((file) => { try { return [{ path: file, bytes: statSync(file).size }]; } catch { return []; } });
const maxFile = existing.sort((a, b) => b.bytes - a.bytes)[0] ?? null;
console.log(JSON.stringify({
  result: problems.length ? 'FAIL' : 'PASS',
  trackedFiles: files.length,
  trackedBytes: totalBytes,
  maxFile,
  caps: { generalBytes: generalCap, sourceArtBytes: sourceArtCap, largeJsonBytes: largeJsonCap },
  categories: Object.fromEntries([...categories.entries()].sort((a, b) => b[1] - a[1])),
  problems,
}, null, 2));
if (problems.length) process.exitCode = 1;
