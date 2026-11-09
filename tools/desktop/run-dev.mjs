import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';

const require = createRequire(import.meta.url);
const base = 'http://127.0.0.1:4173/';
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], { stdio: 'inherit' });
let electron;

try {
  let ready = false;
  for (let attempt = 0; attempt < 150; attempt += 1) {
    if (vite.exitCode !== null) throw new Error('Vite stopped before its development server became ready.');
    try { ready = (await fetch(base)).ok; } catch { /* wait for Vite to bind */ }
    if (ready) break;
    await delay(100);
  }
  if (!ready) throw new Error('Vite development server did not become ready within 15 seconds.');
  const electronEnv = { ...process.env };
  // Some developer tools set this globally; Electron then masquerades as plain Node.
  delete electronEnv.ELECTRON_RUN_AS_NODE;
  electron = spawn(require('electron'), ['electron/main.mjs', '--dev'], { stdio: 'inherit', env: electronEnv });
  await new Promise((resolve, reject) => {
    electron.once('error', reject);
    electron.once('exit', (code) => resolve(code ?? 0));
  });
} finally {
  if (electron && electron.exitCode === null) electron.kill();
  if (vite.exitCode === null) vite.kill();
}
