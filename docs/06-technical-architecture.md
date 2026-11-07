# Project Crownflare — Technical Architecture (B00–B13)

## Selections and verification notes

- New standalone Vite + strict TypeScript, **Phaser 4.2.1**, Arcade Physics with fixed-step simulation. The project uses `import * as Phaser from 'phaser'`. Phaser 4.2.1 is the stable release verified against the [official Phaser release page](https://phaser.io/download/release/v4.2.1) and current Arcade Physics docs.
- The committed registry-generated lock pins `phaser: 4.2.1`, `vite: 7.3.7`, `typescript: 5.9.3`, and `playwright: 1.55.1`. Vite was raised from the starter's 7.1.5 because the original version matched published security advisories; 7.3.7 passes `npm audit` with zero vulnerabilities.
- Verified local environment on 2026-11-07: Node.js `v22.22.0`, npm `11.11.0`. `npm install` generated the lock from the registry, followed by clean `npm ci`; typecheck, 17 unit tests, build, asset audit, and headed installed-Chrome browser smoke passed. Exact browser details and evidence paths are recorded in [`qa/b00-qa-evidence.md`](qa/b00-qa-evidence.md).

## Module boundaries

`src/game/scenes`: Phaser scene and camera/collision; `movement`: deterministic pure intent with frame-time/coyote/jump buffer; `input`: typed actions and keyboard/gamepad adapters; `combat`: one event clock for startup/active/recovery (not active attacks yet); `actor/animation`: future state machine and frame manifest-driven timing; `forms`: four separate move/animation architectures after approval; `vfx`/`audio`: reactions to simulation event bus, never damage authority; `rooms`: curated seeded templates; `progression`: data-driven upgrades/meta; `persistence`: versioned local independent save namespace; `src/ui`: focused DOM overlays/menus only when useful. No React framework needed for game loop.

## B00 actual modules (starting code only)

`src/main.ts` controls title/start/quit/pause/focus restoration; `src/game/createGame.ts` boots Phaser; `scenes/ChamberScene.ts` owns a disposable collision-test chamber with platform surfaces, player rectangle and follow camera; `movement/motion.ts` is unit-tested intent logic; `combat/sim.ts` has action phases/events without damage; `input/InputController.ts` maps controls; `persistence/save.ts` validates v1 localStorage state. Developer read-only QA snapshot is only present in Vite development builds. The title uses separate HTML/CSS layout and is **not** approved shipped interface art. No actual hero sprites, enemies, attacks, physics-based hitboxes, saving runs or game audio yet.

## Technical invariants

One authority for attack time/active frames and contact events; sprite frame/VFX/SFX listen to the simulation. Fixed step or bounded deterministic delta; seeded level assembly after B09; stable save version and migrations; pause freezes simulation with audio state, controller reconnect, focus safety, clean scene teardown. Small runtime atlas, crisp source pixels, bounded pools for effects. Clear error/reporting that doesn't dump internals into players' menus.

## QA and CI responsibility

`npm test` uses Node's native test runner to validate pure deterministic logic. `npm run qa:chrome:local` starts real Vite and headed installed Chrome through Playwright; `qa:chrome:headless` is supplemental. The local headed pass checks real collisions, paused simulation/input, tab-switch focus safety, camera, viewport fit, and clean scene teardown. It does not prove physical-controller feel or audio review. Each batch records real commands and exit codes; deterministic tests remain separate from visual/gamefeel and listening gates.

## Directories and dependency hygiene

`docs/` canonical production pack + intact master; `art-source/` accepted references, masters and manifests; `public/assets/` only integrated approved runtime art; `tools/` export, audit and local QA; `tests/evidence` ignored, one curated review clip distributed outside Git when applicable. `.gitignore` excludes caches/video/generation scratch ZIPs, does not exclude irreplaceable approved masters. Never modify Veyrshift.

## Useful official docs

- [Phaser 4 release](https://phaser.io/download/release/v4.2.0)
- [Phaser docs](https://docs.phaser.io/)
- [Arcade Physics](https://docs.phaser.io/phaser/concepts/physics/arcade)
- [Phaser package](https://www.npmjs.com/package/phaser)
