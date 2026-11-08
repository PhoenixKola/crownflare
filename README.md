# Project Crownflare — B13 pre-release candidate

Crownflare is an original side-view action roguelite. The normal route runs from the title into **Spindle Refuge**, through a short story beat and expedition preparation, then into a two-region branching expedition with seeded room variants, run upgrades and a three-boss confrontation. The run ends at Broken Meridian and returns to the refuge with a results summary. B13 adds two distinct seeded authored rooms per region to each route and separates Pixel Perfect integer scaling from Fit to Window. This remains a **pre-release candidate**: full-run duration, collision/art-motion, audio, physical-controller and owner acceptance gates are still open.

Only Iona's **Base** and **Dawnrush** forms are in the playable build. Stormhalo and Eclipse Warden are post-release concepts. The old B06–B09 QA shortcuts remain development-only.

## Run locally

Requires Node.js 22.12 or later and Python 3 with Pillow for image exports.

```powershell
npm ci
npm run dev
```

Open the Vite URL in Chrome and choose **Enter the Refuge**. In Spindle Refuge, choose **Prepare Expedition** or continue a saved run. Combat uses A/D or arrows to move, Space/W/Up to jump, Shift to dodge, J light attack, K heavy, Q Resonance, R Dawnrush, E to interact, and Esc to pause. Controller bindings and display scaling are available from the refuge. Pixel Perfect uses the largest whole-number scale that fits (with letterboxing); compact windows use a fractional fit fallback. Fit to Window uses the available area with nearest-neighbor filtering.

## Production preview

```powershell
npm ci
npm run build
npm run preview
```

Open the preview URL printed by Vite. Developer routes, collision diagnostics and the read-only QA hook are excluded from the production build.

## Saves

Saves are local to this browser under `project-crownflare:save:v2`. They contain options, the last run summary, first-clear refuge progress and an active run checkpoint. Room checkpoints restore at the beginning of an authored room with the same seed, branch, upgrades, rewards, boss clears and durable resources; active enemies restart at that boundary. Victory and defeat close the active run. A new run resets its seed, room route and build while keeping refuge progress. Controller remaps stay in their separate `project-crownflare:controls:v1` namespace.

Version 1 saves migrate without deleting the old `project-crownflare:save:v1` key. Version 2 writes include a revision and checksum, keep a prior valid snapshot, and preserve an unknown future-version payload before a later write. Storage denial falls back to the current session and reports that persistence is unavailable.

Manual export from Chrome DevTools: `copy(localStorage.getItem('project-crownflare:save:v2'))`, then save the clipboard text outside this repository. To reset only Crownflare game progress, remove `project-crownflare:save:v2`, `project-crownflare:save:v2:previous`, `project-crownflare:save:unrecognized`, and `project-crownflare:save:v1` in Application → Local Storage, then reload. This leaves controller remaps intact. To restore, set the V2 key to an exported JSON value in DevTools and reload. There is no account or cloud sync.

## Verify

```powershell
npm run typecheck
npm test
npm run build
npm run audit:assets
npm run audit:repo
npm audit --audit-level=high
npm run qa:b13:entry
npm run qa:b13:production
```

`npm run qa:b13:entry` uses headed Chrome for fresh normal-menu New Run and Continue flows, keyboard traversal/jump, save recovery, display sizes and a synthetic standard gamepad. `npm run qa:b13:production` checks the production preview route and confirms developer hooks are absent. Reports remain under ignored `review-evidence/b13/`. These checks do not replace a human full-run walkthrough or the remaining review gates in [the B13 acceptance record](docs/qa/b13-release-acceptance.md).

Original Spindle Refuge source masters and their hashes are in [the B10 provenance record](art-source/environments/b10/spindle-refuge/provenance.md). Rebuild the runtime layers and ambient audio with `npm run art:b10:build` and `npm run audio:b10:build`.

## Repository and review evidence

The root `/review-evidence/` folder is ignored. Historical screenshots, recordings and large QA traces belong in a separate local review archive, never in the game source ZIP. To package material for an owner review, make a small curated bundle outside the project; do not copy it back into Git. `npm run audit:repo` reports tracked category sizes and rejects tracked review recordings, ZIPs, browser profiles and accidental oversize files. It does not rewrite Git history, so older historical Git objects still exist in clones. No history cleanup or forced push is part of B10.
