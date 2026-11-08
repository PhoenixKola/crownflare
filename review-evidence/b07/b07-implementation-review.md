# Crownflare B07 implementation review

## 1. WHAT THE PLAYER SEES, PLAYS AND CHOOSES

The dev-only `/?b07=1` expedition starts in **Sunderglass Reach**, moves through a seeded two-choice route, transitions into **Vesper Loomworks**, and ends at a locked B08 threshold with a results card. Production ignores the query and still presents the B00 prototype route.

There are two meaningful route decisions:

- **Copper Causeway** is the low-risk timed-conduit traversal and gives a repair shard. **Conduit Annex** is the moderate-risk Sentry + Shardrunner encounter and gives 24 Resonance.
- **Spindle Lift** is a moving-platform traversal and gives 12 Resonance. **Lattice Hall** is the high-risk Wisp + Bastion elite room with a moving thread press and gives 32 Resonance.

The paths reconverge through Resonance Gallery and the Dawn-to-Vesper gate, then through Condensation Vault to the Night-Side Threshold. Seed `13031988` completed the Base safe path in Chrome: Breach Steps → Copper Causeway → Resonance Gallery → Dawn-to-Vesper Gate → Spindle Lift → Condensation Vault → Night-Side Threshold, with 3 repair charges and 14 Resonance. Seed `556677` exercised the challenge branch and the alternate Vesper elite branch. The threshold clearly says no boss is in this build.

## 2. BASELINE / GIT / DIRTY STATE

Starting branch was `main`, at `cbe200c1c5b3d2db22528ced9d9bcfb7c52a8ea4` (`Implement B06 enemy roster and combat gauntlet`). `origin/main` matched and the starting worktree was clean. The baseline Git tree had 1,215 files and 247,825,609 bytes (236.34 MiB); the independent B06 asset audit had recorded 749 files / 90,154,962 bytes. No owner changes were present to preserve. B05/B06 review evidence and generated B06 manifests touched during regression QA were restored to baseline.

The final change is a coherent B07 commit on `main`; remote push status and final commit ID are reported in the handoff response.

## 3. NATIVE IMAGEGEN CALLS AND SOURCE ART

Native OpenAI ImageGen produced two editable PNG source masters. The model identifier was not exposed in the tool output.

- Background: generation `01a1b353-b750-72f3-9594-c017f1f1a806/exec-1f641f84-f645-455f-a6ce-cf699a90db65`; prompt: “True 16-bit pixel-art videogame background master; Vesper night-side mechanical spindle loom hall; petrol/ink, oxidized jade, dark brass and pearl threads; stepped pixel clusters; no text or characters.” Source: `art-source/environments/b07/vesper-loomworks-source.png`, 1672×941, SHA-256 `8d8c914cf0ecb2c245c27ae23b7d9bce9f2ce83b0adb0ccad2ecc238c85e6240`.
- Modular kit: generation `01a1b353-b750-72f3-9594-c017f1f1a806/exec-8e7ee771-2677-4df3-b47d-a34dfd31ecf0`; prompt: “Transparent Vesper pixel-art modular sprite sheet with ledge, thread bridge, spindle lift, loom press, threshold gate and conduit tile.” Source: `art-source/environments/b07/vesper-kit-source.png`, 1672×941, SHA-256 `16e410ee05b18d72c00270cf5cb94fee35cce4c9a1dd1856544d5720336412fb`.

`tools/art-export/build-b07-world.py` exports nine named runtime textures from these masters using documented crop/trim and nearest-neighbor scaling. `art-source/environments/b07/asset-manifest.json` records generation IDs, prompts, dimensions, runtime keys, byte sizes and SHA-256 hashes. The B07 art audit passed with source/runtime hashes matching.

## 4. REGION 1 / REGION 2 ART AND DESIGN

Sunderglass reuses the B04 source art and warm copper/stone language. Vesper adds a distinct petrol and ink-green night-side loom with oxidized jade, brass, pearl-thread lights, condensation cyan, suspended frames and narrow platform lips. It is not a blue recolor of the Sunderglass arches. Both regions use separate far/mid/foreground parallax layers. Vesper’s powered lift, sliding thread press, cables, loom motion, threshold gate and terrain use actual runtime assets; collision is authored from TypeScript room geometry, not artwork pixels.

At 480×270 logical resolution, the browser captures show Iona and the encounter silhouettes separated from the scenery. I visually reviewed the real Phaser capture and the safe-route recording, including the Sunderglass-to-Vesper change and moving lift. Evidence: `b07-sunderglass-entry-base.png`, `b07-vesper-region-entry.png`, `b07-vesper-lift-moving.png`, `b07-vesper-thread-press-contact.png`, `b07-vl-lattice-elite.png`, and `b07-vesper-b08-threshold.png`. The 480×270 internal direction mock is `b07-vesper-direction-mock.html`.

## 5. ROOM LIBRARY / SEEDED BRANCH GRAPH

The typed room library has nine templates: five Sunderglass rooms (`sg-breach-steps`, `sg-copper-causeway`, `sg-conduit-annex`, `sg-resonance-gallery`, `sg-to-vesper-gate`) and four Vesper rooms (`vl-spindle-lift`, `vl-lattice-hall`, `vl-condensation-vault`, `vl-night-side-threshold`). Each defines its world, platforms, player/exit anchors, spawn/support surfaces, enemies, hazards, reward, visual keys, parallax, ambience and authoring version.

`b07RouteAssembly.ts` uses a seeded PRNG for route instantiation and bounded variation. Same seed and branch inputs reproduce the same route; tests compare identical results. `b07Validation.ts` checks the complete library and the Base movement reachability constraints; all nine templates validate with no reported issues. Seeds `13031988` and `556677` are in the browser evidence.

## 6. PLATFORMS, COLLISION, HAZARDS AND AI GEOMETRY

Room geometry is 960×270 logical pixels with explicit support surfaces, one-way flags, projectile blockers, safe spawn/exit anchors and camera bounds. The Sunderglass charged conduit has warning → active → recovery timing (820 ms warning, 560 ms active in Causeway), and a Base jump crossed it without damage. The Vesper thread press has the same readable state progression; the live Chrome check observed an active collision event for 1 damage and recovery. The Spindle Lift is a true moving Arcade body: the browser lane verified its authored Y position changed from 171.5 to 197.8 during traversal; its travel range is also unit-tested.

B06 now accepts `EnemyWorldContext`: room bounds, projectile bounds, support surfaces, default ground and hover lane replace the arena-only assumptions when a room context is provided; the existing Sunderglass context remains the default fixture. Movement, spawn clamps, guard height, projectile expiry/blocking and attack geometry use that context. `resolveB06MoveTargets` now retains a target after a whiff and deduplicates only a real contact/guard/invulnerability outcome. A focused test moves a target into the still-active contact after the first miss. B06 melee also emits one strike at its authored contact phase. In the B06 gauntlet, thin one-way ledges are no longer treated as full-height enemy navigation walls.

## 7. COMBAT / REWARDS / CONTROLLER / UI

Base Iona and Dawnrush use the existing movement, attack, resonance, form and controller settings. B07 reuses the five B06 archetypes rather than adding a second roster. The standard synthetic gamepad selected the challenge branch; Chrome observed the Sentry telegraph in the assembled room and confirmed Dawnrush activation. The separate Vesper elite run assembled Wisp + Bastion. Route menus support keyboard and mapped controller input, preserve focus while open, and prevent combat input from selecting a second branch. Retry resets route choices, position context, health to 5/5 and the hero to Base. The threshold results do not imply a boss victory.

## 8. AUDIO / VFX

Sunderglass loads the existing B04 ambience WAV at reduced gain. Vesper uses a quiet synthesized three-oscillator Web Audio drone. Enemy tells, impacts, rewards and KO cues reuse the generated B06 WAV set. Hazard state text and static warning cues remain available with reduced motion; glows/alpha motion are reduced. Runtime audio loaded successfully, but no system-audio recording or human listening signoff was performed: `HEARD: NO`.

## 9. TESTS / REAL CHROME / EVIDENCE

- `npm run typecheck`: PASS.
- `npm test`: PASS, 86/86 unit tests.
- `npm run build` (also run by `npm run qa:b07`): PASS; Vite reports the existing 1,624.72 kB JavaScript chunk advisory.
- `npm run art:b07:build`: PASS, nine runtime textures and matching hashes.
- `npm run audit:assets`: PASS, 762 assets / 94,000,141 bytes / zero individual budget violations.
- `npm audit`: PASS, zero vulnerabilities.
- `npm run qa:art:portable`: PASS for the existing B01D/B01E portable-art audits.
- `npm run qa:b07`: PASS in headed Playwright Chromium, including resize/pause, safe conduit crossing, moving-lift travel, live Vesper hazard hit/recovery, Base safe route, synthetic controller challenge, Dawnrush/B06 telegraph, defeat/retry reset, alternate Vesper elite, reduced motion, focus pause/title re-entry and the production route guard. Production ignored `/?b07=1`; no browser/runtime/network errors were recorded. Source SHA-256 `ae1d54758b331cc12c4ecd1671d397c8e04b2232f94484b4a0210c5066afa399`; built JS SHA-256 `fefacd6f61ba7e527144c86c615b5f8fe0a6e0a9b490dc75a68d7539539c3f6c`.
- `npm run qa:b05`: PASS in its focused 37-check Chrome lane and production-route smoke; its existing curated evidence was restored after the run.
- `npm run qa:b06`: NOT PASS. Asset/audio audits passed and the reduced-motion/telegraph checks ran, but the Dawnrush gauntlet ended in a legitimate player defeat during wave 3 after five incoming hits; no full four-wave clear is claimed. This unresolved regression is documented for review.

The safe-route WebM `b07-base-safe-expedition.webm` is 47.80 s, 6,429,188 bytes, VP8 video only (no audio stream). `b07-browser-errors.json` is empty. The full curated B07 screenshots and JSON report are in this directory; the main route screenshot list is also recorded in `b07-qa-report.json`.

## 10. ART-MOTION / OWNER / AUDIO / CONTROLLER GATES

- **B07 ART-MOTION:** PASS for internal implementation review: generated source reaches runtime, region silhouettes and Base route geometry are readable in the real 480×270 gameplay, and the captured scene transition/moving lift work. This is not owner approval.
- **OWNER APPROVAL:** PENDING for B07 and still pending for B05 Dawnrush/Base Iona and B06 enemy art-motion.
- **AUDIO:** Implemented/reused as described; **HEARD: NO**, pending a human listen and system-audio capture.
- **PHYSICAL CONTROLLER:** PENDING. Only standard mapped gamepad input was synthesized in Chromium.

## 11. GIT SIZE / CLEANUP / SOURCE HANDOFF

Starting Git tree: 1,215 tracked files / 247,825,609 bytes (236.34 MiB). Current Git tree: 1,263 tracked paths / 263,602,181 working-tree bytes (251.39 MiB). Workspace disk usage excluding `.git`, `node_modules` and `dist`: 833,067,786 bytes (794.48 MiB). The workspace measurement includes ignored local QA files, which are excluded from Git.

The compact review archive at `C:\Users\totik\AppData\Local\Temp\crownflare-b07-review-bundle.zip` contains 17 files: the QA/error JSON, safe-route video, 12 selected screenshots, and Vesper art brief/manifest. The source files total 9,633,542 bytes; the ZIP is 9,541,328 bytes (9.10 MiB). The report remains separately available in this repository. The Git handoff retains source masters, nine runtime images, manifests, code, tests and curated review evidence. Existing B05/B06 review evidence remains byte-for-byte at baseline; failed-attempt screenshot and temporary recordings are ignored, not staged.

## 12. KNOWN GAPS + NEXT MAJOR MILESTONE

B08 is the next major milestone: implement the real bosses beyond the locked threshold. No fake boss, ending, credits, Stormhalo or Eclipse Warden content was added. Before release, rerun and resolve the B06 full-gauntlet QA lane, obtain owner review of Base/Dawnrush/enemy/environment art-motion, capture and listen to system audio, and test a physical controller. The production route remains protected until approved.
