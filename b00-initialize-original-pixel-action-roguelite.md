# CODEX IMPLEMENTATION BATCH — B00: Initialize Original Pixel Action Roguelite

**Project:** Project Crownflare (provisional internal codename, not trademark cleared)  
**Batch:** B00 — one bounded production foundation, no premature content  
**Authority:** `docs/project-crownflare-master-creative-technical-roadmap-and-initial-project-handoff.md` (owner's intact 2026-11-07 v1.0 master specification). Read it **completely before touching code**. The shorter `docs/00–10` operational documents help implementation, but the master wins on any conflict.

## 0. Mandatory source discovery / baseline

You are working on a **NEW AND INDEPENDENT project** `project-crownflare` (source ZIP supplied by owner from ChatGPT or newly initialized directory if no starter was provided). **Never touch, import, modify, reference as code, merge with, or reuse any Veyrshift repository, code, assets, files, story, characters, fonts, visual designs, tools, or save data.** That older project must remain untouched. You may learn from generic failure modes recorded in the master handoff, but cannot carry over anything from its repo.

Before edits: print the actual `pwd`, directory tree / package files, Git status, branch and HEAD **if a commit exists**. If Git HEAD is unborn, state `unborn HEAD`, not an invented hash. Inspect every source module and master spec, check for uncommitted user changes, and preserve any good existing work. Inspect `package.json` and check runtime installed versions. Do **not** assume the starter's Phaser 4 API code compiles; the source-generation environment had no npm registry access. Preserve the repo name and isolation. Never delete or overwrite owner code without understanding it.

Starter baseline (if ZIP supplied) contains: Vite/strict TypeScript/Phaser target, original CSS title screen, Phaser B00 collision-test chamber, typed input intents and gamepad skeleton, deterministic movement/combat event-clock modules, versioned project-local save and 14 passing **dependency-free** Node unit tests, a draft Playwright local Chrome workflow, full `docs/00–10` foundation and the intact master. It **does not** contain a verified `package-lock.json`, installed dependencies, a successful Phaser build/Chrome run, approved sprites, actual audio or a tested normal-speed video. These are **open tasks**, not prior successes. There is no authorized remote or commit. If missing, create foundation from the master; if present, fix and finish, not blindly regenerate.

## 1. Outcome the owner must experience after B00

On the owner's normal Windows PC, from a clean install, one command launches an actual game. The owner sees an **intentional original Crownflare title shell**, clicks **Enter the Spindle**, enters a real Phaser **side-view test chamber**, moves left/right across a solid ground, jumps with responsive input and lands on visible platforms, dashes without clipping through geometry, sees a following camera, pauses/resumes without ghost input and returns cleanly to title. Mouse and keyboard focus are safe. A connected standard controller can perform preliminary move/jump/dash/pause. Basic HUD and **developer-only** telemetry work. The visuals of the title shell should communicate the intended premium direction, but all rectangle/capsule hero and chamber geometry is **B00 programmer art and must be conspicuously labeled TEMPORARY**. B00 is **not** hero art signoff, real combat, or a game release.

## 2. Locked scope / hard exclusions

**IN B00:** independent Git/source structure; Vite + TS strict; a tested **stable Phaser 4** version chosen against real official docs and pinned by exact version in committed `package-lock.json`; tested 480×270 logical 16:9 view and pixel rendering; title/scene/menu lifecycle; solid platforms, horizontal movement/jump/landing/dash, wall/camera/focus/pause; typed keyboard/controller action map; deterministic attack/event state skeleton, local save namespace; tests, real local browser smoke, true README PowerShell commands; full docs pack and asset/provenance/size hygiene; one strong original visual-quality target board for owner review if generation capability is actually available.

**NOT B00:** no second hero, enemy roster, bosses, finished animation catalogs, three transformation gameplay implementations, production enemy fights, fake 3-hit combo, huge VFX spectacle, fake music, massive hand-authored content, backend/accounts/database, broad React app, mobile port, 2.5D/isometric world, asset roulette, scaffold modules with empty classes, unrelated refactors. No protected character or protected franchise design. No Blender or proprietary art-editor prerequisite. Do not draw and label programmer geometry as premium character pixel art. Do not quietly substitute static screenshot/GIF for a real game.

## 3. Engine/install, reproduction and source hygiene

- Inspect live official Phaser 4 release/version/API and `npm` registry. Current initial target **`phaser: 4.2.1`**, source spec suggests Phaser 4 and Phaser package page indicated stable 4.2.1 as of November 7, 2026. Verify the **actual executing install** and pin exact known-good compatible versions of Vite, TypeScript, Playwright. Phaser 4 requires `import * as Phaser from 'phaser'`; check API changes against typings, especially rendering scale config, gamepads, physics, keyboard and camera.
- The initial authored starter declares `vite:7.1.5`, `typescript:5.9.3`, `playwright:1.55.1`, but **DO NOT claim tested**. Adjust only when actual compatibility requires and document why. Run `npm install` once to generate a **real registry-derived package-lock.json** (never synthesize or hand-edit fake integrity fields), then delete `node_modules`, run **clean `npm ci`**, and run the entire test/build/Chrome chain. Commit `package-lock.json` if commits are explicitly authorized; otherwise leave it in user working tree and include it in deliverable ZIP.
- If registry is not available, mark install/build/Chrome **BLOCKED**, provide exact Windows local workflow, and continue only independent source/docs work that can actually be checked. Do not quietly use stale caches or downgrade the engine to mask a temporary access blocker; consider Phaser 3 only for a **proven incompatibility** and record explicit comparison.
- Do not add Git remote or push unless owner specifically supplies and authorizes one. Do not invent commit IDs, successful CI, source URLs or tested downloadable files. If a commit is authorized but no remote, make only local commit after reviewing changes and report actual SHA. No unrelated project modifications.
- Keep one actual source copy of assets, original canonical masters and manifests. Ignore `node_modules`, `dist`, generated/test artifacts, screen recordings, temp art, rejected generations, ZIPs and temporary browser profiles. Don't destroy irreproducible accepted art. Report actual compressed ZIP bytes if you package it.

## 4. Movement, input and state verification (gameplay first)

Keep a single authoritative physics/timing source. Typed actions: A/D/left/right move; W/up/Space jump; S/down planned crouch/drop; Shift dash; LMB/J light, RMB/K heavy, Q special, R transform, F finisher, E interact, Esc pause; only movement/dash/pause are activated in B00. Controller proposed: left stick/D-pad move, south jump, west dash, Start pause; later buttons in `docs/03-combat-and-movement-spec.md`. Gamepad auto connection, dead zones and no stuck buttons after reconnect/focus loss. Test mouse input does not interfere with menus even if combat isn't live. Protect against key repeats and menu/game event overlap.

Test coyote timing, jump buffering and variable jump height, acceleration/stop, facing when direction changes, dash once-per-press and cooldown, collision with floor/platform sides/solid barrier and world edges. Camera follow/deadzone and platform readability in normal window, resize and varied aspect ratios. Set bounds/physics correctly in actual Phaser 4. Input must not inject a ghost jump/attack when closing pause or returning from focus loss. Pause stops the gameplay simulation and relevant timers, not just overlays. Focus loss/tab hidden should pause once. Esc must never double-toggle because both document and scene listeners act at once. Keyboard, mouse and real physical gamepad tests must be distinguished; do not claim physical controller test if hardware is absent.

Review source implementation for correctness: e.g. don't assume runtime scene.create has completed synchronously when adding canvas focus; check `Phaser.Input.Keyboard.addKeys`/`JustDown` and platform collider body offsets with real gameplay. Do not rely on pure unit tests to validate actual collision/dash barriers.

The deterministic combat clock is **scaffold only**: action startup/active/recovery, timestamped event hooks to synchronize eventual contact pose/hitboxes/VFX/audio. No runtime damage/attacks yet. Save namespace `project-crownflare:save:v1`, schema v1 parse/default/permission-error fallback; never use older game's save namespace. Keep code concise and readable, avoid dozens of empty future modules.

## 5. Visual-quality target board and original asset rules

The hero direction is **one protagonist, Iona Rell**, not 20 independent concepts. Base: compact athletic side-view martial courier, clipped pearl-silver hair with single teal lock, deep navy cropped jacket, warm copper wrist parts, pale sash. **Dawnrush:** actual different body/energy-band silhouette, amber-coral pressure filaments. **Stormhalo:** collar fins, split-ring orbit, geometric counterfighter, indigo/ivory electric traces. **Eclipse Warden:** radically different tall hovering masked/plated body with detached orbit blades, energy mantle and void-lens eyes; not a recolor or simply scaled base. All four should be distinguishable **in black silhouette at actual 48–72px game scale with VFX OFF**. See creative bible and master for detailed distinctions and IP exclusions.

**For B00 only**, use supported original image generation/editing tools if available to make ONE curated high-quality concept/silhouette direction board, not hundreds of game sprites. Include four equal-scale silhouettes, a simple palette/material strip and one readable in-context size comparison if possible. If you cannot generate meaningful consistent art in this host, disclose the exact limitation, leave the fully specified B01 visual task and provide a review-ready board using appropriate accessible tools without calling it production game art. Never use unrelated image URLs or existing game character art. Record file names, hashes, source/tool provenance, and label candidate/owner PENDING. Do not replace the B00 rectangle player with badly formed, unapproved pseudo-premium sprites just to say art exists.

Do NOT alter the original reference/costume between poses once approved; that lock is **B01**. No combat animation expansion before owner's B01/B02 visual signoff. VFX, aura and audio must never be used to hide a stiff/inconsistent body. At this batch's end, set clear B01 handoff inputs: proposed canonical hero sheet, silhouette comparisons, 48/60/72 art-scale screenshots and approval request.

## 6. Actual verified browser workflow / evidence

Deliver a reliable `npm run qa:chrome:local` path that works from a user-owned Windows PC with normal local Chrome (Playwright may launch headed Chrome). `qa:chrome:headless` is optional supplemental, never equivalent to owner watching/playing. The QA script MUST use **real Vite/Phaser app**, assert real initial title, click Start, move right/left, jump visibly above floor, dash while respecting the barrier, pause/resume via keyboard and on blur, return to title, capture console/page exceptions. Assertions must not merely call simulation functions or play an offline GIF. If testing is restricted by policy, do not circumvent it: say BLOCKED and give actual local reproducible PowerShell steps. Where permitted, capture a short **normal-speed** actual gameplay clip, include actual source/build hash, representative screenshots and test log in small explicit `review-evidence/` output; leave giant Playwright raw traces ignored/external.

Audio: B00 has **no premium game audio**; do not claim audio passed. For later audio QA, capture **system sound** using authorized OBS/Windows screen recording (Playwright's WebM is often video-only), actually listen and report audio hearing separately. No fake controller feel or owner visual approval claims.

## 7. Mandatory documentation and art-policy results

Maintain intact master under `docs/`. Maintain useful detailed operational files `00-project-charter.md` through `10-decisions-and-change-log.md` (charter, creative vision, hero/forms bible, combat, art/animation, world, architecture, roadmap, QA, provenance, change log). Keep actual project decisions, not empty headings. README must include correct exact Windows PowerShell commands and status note explaining any blocked verification. Add concise B00 QA evidence matrix and B01 handoff note under `docs/qa/`. Provenance/retention manifest schema should include canonical master path/hash, approved status, unique form/action/direction, frame offsets/anchors, runtime atlas, source tool, event IDs, and review clip path.

## 8. Required commands / evidence — run them rather than assuming

From fresh authorized source, capture exact executed commands, exit code, versions and meaningful output:

```powershell
node --version
npm --version
npm install                 # Only if real lockfile absent; generates lockfile from actual registry
npm ci                      # clean install reproducibility, after generating lockfile
npm run typecheck
npm test
npm run build
npm run audit:assets
npm run qa:chrome:local      # actual headed browser (and actual user/local Chrome if available)
npm run qa:chrome:headless   # supplemental, only if possible
```

Also test `npm run dev` manually, resize, camera scale, pause/focus and gamepad if physically possible. If headed/local Chrome policy blocked, do not claim it green because a unit test or screenshot is green. Observe actual game frames at normal speed and check art is correctly labeled provisional. If runtime fails, diagnose and fix in scope. If success is not achieved, B00 remains **INCOMPLETE/BLOCKED**, regardless of number of tests.

Check important assertions: no runtime console errors, player grounded on platforms, correct dash wall collision, pause freeze, jump buffer/coyote behavior, keyboard no double Esc, re-enter after Quit, no pixel blur at integer scaling where supported, 16:9 plus smaller/adapted windows, correct controller reconnect. Measure real asset and final source ZIP sizes, not guess.

## 9. Stage gate and authorized stop

**B00 passes** only after tested real Phaser app runs (title→test room, movement/jump/dash/collisions/camera/pause/quit), `npm ci` reproducible, tests/typecheck/build pass, local real-browser smoke exists, clean docs/asset discipline is in place, and provisional visual board is owner-review ready. The art quality, Base combat and three transformations **DO NOT** pass here. Owner art approval **PENDING** until explicitly granted. Do not start implementing B01–B13 as spillover. If access/registry restrictions persist, provide complete updated source and smallest owner-authorized next action to unblock the exact failed gate.

## 10. Mandatory handoff report format

Give a clear report with these headings, without fictional claims:

1. **WHAT PLAYER SEES AND FEELS** — start, chamber, movement/jump/dash, pause, screenshots/video actually available; note placeholders.
2. **BASELINE & EXACT CHANGES** — source root, actual branch/HEAD (or unborn), tracked/untracked files, changed modules and why, version choices, whether Git commit/push was authorized.
3. **REAL ASSETS / PROVENANCE** — new vs reused, genuine source art generated or not, canonical refs/hashes, whether in runtime, rejected candidates, target-board owner pending.
4. **TEST/BUILD/CHROME EVIDENCE** — command, host, exit code, counts, outcomes, actual exception log, first failure reproduction, video path/hash; not-run and blocked explicitly separate.
5. **STATUS MATRIX** — `TECH PASS/FAIL/BLOCKED`, `ART-MOTION PASS/FAIL/PENDING`, `OWNER APPROVAL APPROVED/CHANGES REQUESTED/PENDING`; no technical pass by self-report if browser wasn't run.
6. **GAPS & SMALLEST NEXT CORRECTION** — exact incomplete items, blockers, bounded repair request.
7. **SOURCE HANDOFF** — verified source ZIP size/path if made; commit hash/remote only if real and permitted; source masters and provenance safely retained; exact PowerShell launch commands.
8. **B01 OWNER VISUAL LOCK REQUEST** — what concrete normal-scale four silhouettes and Iona candidate need owner approval before any mass sprites.

**Final principle:** Build a smaller, spectacular playable hero, not a broad mediocre game. B00 is a technically credible foundation only; every later animation must be genuinely authored, fluid and accepted in real gameplay.
