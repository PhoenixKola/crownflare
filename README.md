# Crownflare — Final v1.0 release candidate

Crownflare is an original pixel-art side-scrolling action roguelite starring Iona Rell. From **Spindle Refuge**, each expedition visits **11 authored rooms across Sunderglass Reach and Vesper Loomworks**, includes one branch in each region, run upgrades and discoveries, and leads through the **Sundial Custodian, Spoolheart Regent and Broken Meridian** to the ending and results. Iona has **Base and Dawnrush** forms; Stormhalo and Eclipse Warden remain outside the initial release scope.

B14 completed an agent-driven, headed Chrome route through all 11 rooms and three bosses in **3:11 active game time / 3:33 wall time**. This is direct completion evidence, not human playtesting. The brief's 30–45 minute first-run target is not met; human review of art/game feel, audio and a physical controller is also still open. This is a **conditional release candidate**, not a public release approval.

Only Iona's **Base** and **Dawnrush** forms are in the playable build. Stormhalo and Eclipse Warden are post-release concepts. The old B06–B09 QA shortcuts remain development-only.

## Title art, victory art and app icons

The title, departure-story and victory screens use original ImageGen environment illustrations. The controller settings panel has a generated pixel-art device accent. On the title, Iona plays the existing four-frame idle loop and gently breathes; both movements stop for reduced-motion settings. The favicon is also generated pixel art; its source prompts, originals and hashes are preserved under [`art-source/ui/b14/`](art-source/ui/b14/). The website serves 16px, 32px and 256px PNG icons, a multi-size ICO and an Apple touch icon. Rebuild those outputs with `npm run branding:build-icons`.

`build-resources/crownflare.ico` is the matching Windows icon asset for app packaging. This repository currently contains no Electron application or packaging configuration, so the icon is staged but not wired to or tested in an Electron window.

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
node tools/local-qa/b14-final-candidate-run.mjs
node tools/local-qa/b14-final-candidate-run.mjs --defeat-retry
```

`npm run qa:b13:entry` uses headed Chrome for fresh normal-menu New Run and Continue flows, keyboard traversal/jump, save recovery, display sizes and a synthetic standard gamepad. `npm run qa:b13:production` checks the production preview route and confirms developer hooks are absent. The B14 route command plays a complete 11-room run at real clock speed; add `--record` to capture video. The `--defeat-retry` variant follows the alternate combat branch, records a defeat and starts a new run. Reports and media remain under ignored `review-evidence/`. Automated routes do not replace the owner review in [the B14 acceptance record](docs/qa/b14-final-acceptance.md) and [owner checklist](docs/release/v1-owner-acceptance.md).

Original Spindle Refuge source masters and their hashes are in [the B10 provenance record](art-source/environments/b10/spindle-refuge/provenance.md). Rebuild the runtime layers and ambient audio with `npm run art:b10:build` and `npm run audio:b10:build`.

## Repository and review evidence

The root `/review-evidence/` folder is ignored. Historical screenshots, recordings and large QA traces belong in a separate local review archive, never in the game source ZIP. To package material for an owner review, make a small curated bundle outside the project; do not copy it back into Git. `npm run audit:repo` reports tracked category sizes and rejects tracked review recordings, ZIPs, browser profiles and accidental oversize files. It does not rewrite Git history, so older historical Git objects still exist in clones. No history cleanup or forced push is part of B10.
