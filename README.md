# Project Crownflare — B00 foundation

Project Crownflare is a new, independent original-IP side-view action roguelite project. Crownflare is a provisional codename; commercial name clearance has not been done. The governing creative and production brief is [the master handoff](docs/project-crownflare-master-creative-technical-roadmap-and-initial-project-handoff.md).

## What runs now

The title shell opens a real Phaser 4 side-view collision chamber. In the chamber, A/D or the arrow keys move, Space/W/Up jumps, Shift dashes, and Esc pauses or resumes. The camera follows through the room; the dash barrier is solid; switching browser tabs pauses the simulation. A basic HUD and development-only telemetry are included. Preliminary gamepad mapping is present, but physical controller input was not tested.

The hero, platforms, and chamber are conspicuously **TEMPORARY B00 programmer art**. The separate four-form visual board is conceptual only and is neither runtime sprite art nor owner-approved. Combat inputs are documented but no attacks or damage are implemented. B00 contains no game audio.

## Windows PowerShell

From the repository directory:

```powershell
Set-Location "E:\Programming\Projects\0. Extra\project-crownflare"
node --version
npm --version
npm ci
npm run dev
```

Open `http://127.0.0.1:4173` in Chrome and choose **Enter the Spindle**. Use a second PowerShell window for verification:

```powershell
npm run typecheck
npm test
npm run build
npm run audit:assets
npm audit
npm run qa:chrome:local
npm run qa:chrome:headless  # supplemental; does not replace headed Chrome
```

`npm ci` uses the committed registry-generated `package-lock.json`. The verified environment was Node `v22.22.0`, npm `11.11.0`, Phaser `4.2.1`, Vite `7.3.7`, TypeScript `5.9.3`, Playwright `1.55.1`, and installed Chrome `156.0.8078.80`. Vite is pinned to `7.3.7` because the starter's `7.1.5` fell within active security advisories; the patched version passes `npm audit` with zero vulnerabilities.

The headed smoke opens the actual Vite + Phaser app in installed Chrome, checks title/start, grounded landing, both movement directions, jump/landing, 4:3 and 21:9 window sizing, camera follow, dash collision at the barrier, pause freeze and input reset, tab-switch pause, resume, quit, and browser console/page errors. Curated screenshots, a normal-speed gameplay clip, test result, and source digest are in `review-evidence/`. Playwright video does not establish audio quality or capture system sound.

## Scope and signoff

B00 is a technical foundation, not a release or art signoff. The only planned initial playable character is Iona Rell with Base, Dawnrush, Stormhalo, and Eclipse Warden forms. All names and visuals remain provisional until the owner approves the B01 visual lock. The B00 verification matrix and B01 handoff are in [`docs/qa/`](docs/qa/).
