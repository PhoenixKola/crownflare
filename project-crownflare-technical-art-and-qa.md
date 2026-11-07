# Project Crownflare — Technical Art & QA Foundation

**This is an operational B00 deliverable, not a replacement for the intact master brief.** Includes the fully detailed technical architecture, art-pipeline, asset retention and acceptance sections below. The complete source ZIP also has their separate `docs/` counterparts.

# Project Crownflare — Technical Architecture (B00–B13)

## Selections and verification notes

- New standalone Vite + strict TypeScript, **Phaser 4.2.1**, Arcade Physics with fixed-step simulation. Exact versions are locked in the registry-generated `package-lock.json`; use `import * as Phaser from 'phaser'`.
- Node.js >=22.12.0, browser-based desktop first, input keyboard/mouse/gamepad; no Blender, database, backend, accounts or cloud requirement.
- Verified dependency versions: `phaser: 4.2.1`, `vite: 7.3.7`, `typescript: 5.9.3`, `playwright: 1.55.1`. Vite was upgraded from 7.1.5 to clear published audit findings; current `npm audit` reports zero vulnerabilities. Node `v22.22.0` and npm `11.11.0` were used.

## Module boundaries

`src/game/scenes`: Phaser scene and camera/collision; `movement`: deterministic pure intent with frame-time/coyote/jump buffer; `input`: typed actions and keyboard/gamepad adapters; `combat`: one event clock for startup/active/recovery (not active attacks yet); `actor/animation`: future state machine and frame manifest-driven timing; `forms`: four separate move/animation architectures after approval; `vfx`/`audio`: reactions to simulation event bus, never damage authority; `rooms`: curated seeded templates; `progression`: data-driven upgrades/meta; `persistence`: versioned local independent save namespace; `src/ui`: focused DOM overlays/menus only when useful. No React framework needed for game loop.

## B00 actual modules (starting code only)

`src/main.ts` controls title/start/quit/pause/focus restoration; `src/game/createGame.ts` boots Phaser; `scenes/ChamberScene.ts` owns a disposable collision-test chamber with platform surfaces, player rectangle and follow camera; `movement/motion.ts` is unit-tested intent logic; `combat/sim.ts` has action phases/events without damage; `input/InputController.ts` maps controls; `persistence/save.ts` validates v1 localStorage state. Developer read-only QA snapshot is only present in Vite development builds. The title uses separate HTML/CSS layout and is **not** approved shipped interface art. No actual hero sprites, enemies, attacks, physics-based hitboxes, saving runs or game audio yet.

## Technical invariants

One authority for attack time/active frames and contact events; sprite frame/VFX/SFX listen to the simulation. Fixed step or bounded deterministic delta; seeded level assembly after B09; stable save version and migrations; pause freezes simulation with audio state, controller reconnect, focus safety, clean scene teardown. Small runtime atlas, crisp source pixels, bounded pools for effects. Clear error/reporting that doesn't dump internals into players' menus.

## QA and CI responsibility

`npm test` uses Node's native test runner for deterministic logic. Current B00 results: clean `npm ci`, strict typecheck, 17/17 unit tests, build, asset audit and headed/headless Chrome all passed. Build reports an informational large Phaser bundle warning (1,396.99 kB minified, 375.57 kB gzip). See `docs/qa/b00-qa-evidence.md` for exact output, screenshots, clip and focus-testing limitation. Physical controller and audio were not reviewed.

## Directories and dependency hygiene

`docs/` canonical production pack + intact master; `art-source/` accepted references, masters and manifests; `public/assets/` only integrated approved runtime art; `tools/` export, audit and local QA; `tests/evidence` ignored, one curated review clip distributed outside Git when applicable. `.gitignore` excludes caches/video/generation scratch ZIPs, does not exclude irreplaceable approved masters. Never modify Veyrshift.

## Useful official docs

- [Phaser 4 release](https://phaser.io/download/release/v4.2.0)
- [Phaser docs](https://docs.phaser.io/)
- [Arcade Physics](https://docs.phaser.io/phaser/concepts/physics/arcade)
- [Phaser package](https://www.npmjs.com/package/phaser)

---
# Project Crownflare — Technical Art, Animation & Production Pipeline

## Production principle

Codex can author **real original sprites, sprite edits, impact textures, VFX flips, menus and environment paintings** when its supported image tools are available; check the executing tool capability. Never claim only primitives are possible. However rendered images are *candidates*, not accepted gameplay content. B00 engineer rectangles are strictly disposable and cannot satisfy B01 or B02.

## Canonical original hero system

1. Draft silhouette thumbnails with **four forms** and original line/shape language. Stage them at 48/60/72 game pixels on the actual 480×270 room. No VFX.
2. Generate 1–3 curated Iona base concept masters; choose one **with owner's explicit visual approval**. Record immutable canonical reference path, SHA-256, date, palette and rejection reasons. Body proportions, handedness, hair lock, jacket panels, copper hardware, sash shape become fixed.
3. Produce action storyboard **key poses first** (anticipation, kinetic stretch, contact, follow-through, recovery). Test inside real game at normal speed as soon as first action exists. Add intentional in-between and controlled smears; do not batch 8 loosely related images and label them fluid animation.
4. Preserve consistent pixel scale, canvas dimensions, top-head margin, grounded foot pivot, hand/strike anchor, turning masks and frame event offsets. Correct left asymmetry rather than blindly flip a distinct costume shape.
5. Preview without VFX/audio, then add timed effects and unique sound once body's movement passes. Validate missing/ghost alpha pixels, body/foot drift, attack timing, atlas trim, memory use.
6. Export runtime atlas and manifest with per-frame time, origin, effect anchors and event IDs. Retain canonical source masters outside runtime bundle, not duplicated through many huge directories.
7. Record real game in local authorized Chrome at **normal speed**, original resolution and 75% scaled review. AI can assess but only owner can approve.

## Four form identities

- Base: separate readable head/shoulder/hands/footwork, martial combo and sash secondary motion.
- Dawnrush: real changed upper-body/hair structure + pressure bands, bespoke ground velocity, coral/amber reactive filaments.
- Stormhalo: floating split orbit, collar/coat geometry, angular arm silhouette, precise electric aura, counter animation.
- Eclipse Warden: NEW mask/head, elongated hover body, plated limbs, detached ornaments and energy mantle; full independent attacks, directional art, activation/reversion and staged finisher. NOT a scale or color shift.

**Minimum eventual per-form catalog:** idle/ready, move start/loop/stop, turn, jump rise/apex/fall/land, dash, guard/parry if included, hurt/knockback/KO, interact, light combo 1/2/3, heavy, aerial, special cast/release, finisher anticipation/contact/settle, transform activation/active/reversion/interruption. Frame counts should be artistic, not uniformly four-per-state.

## Asset manifests & retention

Manifest JSON example fields: `assetId`, `form`, `action`, `direction`, `sourceMaster`, `sourceSha256`, `authorTool`, `generationPromptId`, `license`, `canonicalReferenceSha256`, `ownerStatus`, `frameCanvas`, `pivot`, `durationMs`, `hitboxRef`, `eventIds`, `runtimeAtlas`, `integratedScene`, `chromeVideo`, `qaStatus`. Art without provenance or matching runtime integration is not counted as finished. Use `npm run audit:assets` SHA hashes, size checks, cleanup inventory. Exclude scratch, rejected batches, browser videos, ZIPs and redundant previews from Git; archive irreplaceable sources with manifests/checksums. Accept needed large art but measure compressed bundle impact.

## First animation quality gate

Base: idle ↔ run ↔ jump/fall ↔ land ↔ dash, clean L/R, then 3-hit combo plus one first special (original VFX/audio) against an active enemy. Assess real-scale smoothness, face/body identity, feet, limb anatomy, event sync, gamepad and input feel. No expansion until owner says motion looks and plays excellent. If a technique fails twice, evaluate focused manual keyframe correction or alternative method with measurable GO/NO-GO; no endless prompt roulette.

## Motion/VFX accessibility

Aura layers are independent animated choreographies: pressure core, wisps/orbits, reactive ring, particles, shockwave and world lighting. Prioritize readable enemy tells and collision geometry. Screen shake, flashing, bloom, particle counts and backdrop turbulence are adjustable; keep signal even in reduced-flash mode. Source and licensing of audio mandatory; browser WebM may contain **no audio**, and audio quality requires listening on real playback.

---
# Project Crownflare — Asset Provenance, Size and Retention Policy

## Active vs source vs scratch

**Track:** active exported runtime art and code, accepted canonical masters, uniquely reproducible source artwork, manifests+checksums, small approved comparison evidence, docs, scripts. **Ignore/external archive:** rejected generated art, scratch/crops, redundant atlases, test-run WebM, long raw screen captures, noisy screenshots, Playwright traces/profiles, node_modules, dist and ZIPs. **Never delete accepted irreplaceable art without proving it is archived and unused dependencies checked.**

## Initial B00 decisions

- Budget audit tool `npm run audit:assets`: B00 inventory is 4 files / 2,037,045 bytes total, including one 2,035,226-byte provisional visual board and its manifest. No file exceeded the 10 MiB budget; board is not runtime art.
- Manifest tracked by asset ID and immutable canonical hash, license provenance, generation/editing path, form/action/direction, runtime path and acceptance status.
- Single runtime copy of image/atlas, no source/preview runtime duplication. B00 has **no production runtime art**; its test shapes are code-generated geometry.
- Owner receives one curated zipped review bundle of important real motion evidence when available, with source hash and recording method. That bundle is outside source Git and should be sized/measured, not automatically claimed tiny.

## For future generated images

When using Codex image tools, store prompt/tool reference and originating canonical image hash, record explicit ownership/licensing risk review. No protected art tracing. Approved source masters must be recoverable; rejected galleries should be noted in a small rejection ledger outside source ZIP and may be safely archived.

## Change control

`docs/10-decisions-and-change-log.md` logs changes that affect art scale, physics, palette, state coverage or form identity. Revisions must list owner approval impact. `npm run audit:assets` and compressed source ZIP size reported per major phase. Git LFS only by explicit owner approval after storage/access analysis.

---
# Project Crownflare — QA and Acceptance Matrix

## Three independent statuses (mandatory in every report)

| Dimension | Allowed | Source of truth |
|---|---|---|
| TECH | PASS / FAIL / BLOCKED | Actual executed commands/output, real browser interactions, reproducible builds |
| ART-MOTION | PASS / FAIL / PENDING | Real normal-speed live game image sequences and game-scale sprite/animation review |
| OWNER APPROVAL | APPROVED / CHANGES REQUESTED / PENDING | Explicit owner's words only; not Codex self-report |

Do not substitute programmatic PNG/GIF or test counts for motion review. Do not claim WebM contains audio unless verified and listened to. Audio review requires system-audio capture and owner/agent listening. A headed browser on user's desktop is strongly preferred; do not bypass restrictions on remote browser hosts.

## B00 acceptance checklist (mark actual evidence)

- [x] Independent root + Git repo on `main`; project code does not import or depend on Veyrshift
- [x] `package-lock.json` generated with pinned versions; clean `npm ci` passes
- [x] `npm run dev`, `npm run typecheck`, `npm run build`, `npm test` pass on actual sources
- [x] Original title shell shown, B00 status and placeholder art disclosure
- [x] Click Start → player in real 480×270 Phaser game canvas (not mock renderer)
- [x] A/D/arrow movement both directions and chamber geometry collision
- [ ] Space/W/Up buffered/coyote jump, variable height and landing on static geometry
- [x] Shift dash triggers once, respects cooldown, blocked by solid barrier
- [x] Camera follow and canvas bounds/aspect at 16:9; 4:3 and 21:9 viewports tested
- [x] Escape pause/resume, pause freeze/input clearing, blur-handler event and no duplicate toggles tested; actual tab visibility remains a manual check
- [ ] Preliminary controller detected and move/jump/dash/pause/reconnect tested (manual physical controller if available)
- [x] Dev telemetry toggle separate; production builds exclude the QA hook
- [x] Dev-only QA hook only observes state (never cheats)
- [x] Save namespace versioned; default/corrupt/permission cases verified
- [x] Actual installed Chrome run with no JS console exceptions
- [x] Small normal-speed game clip, source digest and screenshots recorded; no audio claim
- [x] Docs/art pipeline/provenance rules and B01 visual review brief ready
- [x] Owner visual approval explicitly marked PENDING

## Local browser QA procedure

Run on Windows PowerShell: `npm ci; npm run qa:chrome:local`. The headed script starts Vite, uses installed Chrome, checks title/start/movement/jump/landing/resizing/dash collision/pause/blur/quit/re-entry and browser errors, and preserves the curated capture in `review-evidence/`. The Playwright second-page attempt did not change `document.hidden`; the script therefore fires a window-blur event directly and the actual tab-hidden transition remains a manual verification item. `npm run qa:chrome:headless` is supplemental and does not prove human feel or controller hardware. Playwright's clip has no audio.

## B01–B13 animation acceptance record

For *each* state/form/direction: record canonical reference hash, source master and atlas IDs, exact canvas/pivot, silhouette identity, frame coherence, feet/anchors, normal-speed motion, event/hit timing, VFX and audio timing, ordinary-run integration, tested Chrome clip, actual unit/browser commands, `APPROVED/REVISE/PENDING` owner status, and smallest remaining correction. Screenshots are secondary; a clip showing ordinary movement and enemy interplay is mandatory for animation decisions.

## When evidence is inaccessible

Mark `BLOCKED`, name exact blocker and run local workflow with user authorization; do not infer from static code alone, and do not bypass execution policy. No false performance metrics or nonexistent remote URLs.
