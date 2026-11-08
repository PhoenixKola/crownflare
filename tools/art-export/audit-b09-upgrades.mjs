import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const manifest = JSON.parse(await readFile(resolve(root, 'art-source/manifests/b09-upgrade-icons.json'), 'utf8'));
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const source = await readFile(resolve(root, manifest.source));
assert.equal(digest(source), manifest.sourceSha256, 'source atlas hash mismatch');
assert.equal(manifest.icons.length, 12, 'expected twelve authored icons');
for (const icon of manifest.icons) {
  const bytes = await readFile(resolve(root, icon.runtime));
  assert.equal(digest(bytes), icon.runtimeSha256, `${icon.id} runtime hash mismatch`);
  assert.deepEqual([bytes.readUInt32BE(16), bytes.readUInt32BE(20)], [64, 64], `${icon.id} size mismatch`);
  assert.ok(bytes.length < 100_000, `${icon.id} payload unexpectedly large`);
}
console.log(`B09 icon provenance PASS: ${manifest.icons.length} crops, ${source.length.toLocaleString()} source bytes, sha256 ${manifest.sourceSha256}`);
