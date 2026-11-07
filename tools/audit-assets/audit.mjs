import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
const roots = ['public/assets', 'art-source'];
const budget = 10 * 1024 * 1024;
let count = 0, bytes = 0, errors = 0;
function walk(dir) {
  if (!existsSync(dir)) return;
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    if (['rejected','scratch'].includes(item.name)) continue;
    const path = join(dir, item.name);
    if (item.isDirectory()) walk(path);
    else if (item.isFile() && item.name !== '.gitkeep') {
      const size = statSync(path).size; bytes += size; count++;
      if (size > budget) { console.error('OVER BUDGET',path,size); errors++; }
      console.log(`${createHash('sha256').update(readFileSync(path)).digest('hex').slice(0,16)}  ${String(size).padStart(8)}  ${relative('.',path)}`);
    }
  }
}
for (const path of roots) walk(path);
console.log(`Asset audit: ${count} files, ${bytes} bytes, ${errors} individual budget violations; provenance manifests required for approved art (B01+).`);
if (errors) process.exitCode = 1;
