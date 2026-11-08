# Project Crownflare — B00–B13 Production Roadmap and Owner Gates

**Rule:** Milestones are meaningful production phases, not guaranteed release dates. No new phase starts simply because builds are green. Inside each phase, break corrections into small issue-based Codex batches. Record `TECH`, `ART-MOTION`, `OWNER APPROVAL` separately.

**Release scope (owner direction, 2026-11-08):** the first release ships Iona Base and Dawnrush only. Stormhalo and Eclipse Warden are post-release concepts; do not generate or implement them during B00–B13. B05 technical status remains separate from its pending owner art-motion, audio-listening, and physical-controller gates. The owner explicitly redirected B06 to enemy roster and encounter variety, so B06 proceeds without implying B05 approval. B07 now has a development-only two-region playable route and remains pending owner review.

| Batch | Product-visible deliverable | Gate to next phase |
|---|---|---|
| **B00** Foundation | New standalone Git/source, actual title→test chamber, movement/jump/dash/collision/camera/pause/controller foundation, deterministic core skeleton, docs, QA commands | Real browser loop verified, npm ci/typecheck/build/tests and Chrome smoke green; placeholders correctly labeled; B01 art brief ready |
| **B01** Hero art lock | Original canonical Iona concept/source, left/right and scale studies, first in-engine idle, unique four-form silhouette board | Owner explicitly approves live Base hero design and four silhouette directions at actual scale |
| **B02** Base locomotion | Fully authored idle/run start/loop/stop/turn/jump/fall/land/dodge/hurt/KO, feel-tuned movement, appropriate audio | Real recorded normal-speed locomotion, no identity/foot drift, controller/keyboard feel accepted |
| **B03** Base combat gold | Beautiful 3-hit combo, heavy/launcher, aerial, one special, moving enemy, hit events, sync sound/VFX | Body looks excellent even without VFX; precise combo/contact, normal-speed owner approval |
| **B04** Combat vertical slice | ONE complete beautiful region room, 1–2 enemy types, HUD/reward and original audio/VFX | 1–3-minute normal-speed playable footage + owner visual/feel approval |
| **B05** Dawnrush | Complete Base-to-Dawnrush transformation, combat, audio and HUD candidate | Technical completion does not approve art/audio/controller; owner gates remain explicit |
| **B06** Enemy roster / combat gauntlet | Sentry, three distinct regular enemies, Cantor elite, deterministic mixed combat, playable Sunderglass route | Real Chrome fights, fair locked tells, authored animations, human audio and owner review recorded separately |
| **B07** Region 2 / room assembly | **Technical candidate implemented**: Sunderglass Reach and Vesper Loomworks; seven-room seeded route with two meaningful branches, rewards, hazards, B06 enemies and honest B08 threshold | Real Chrome Base/Dawnrush route, traversal/hazard/controller/accessibility evidence, source-art audit and owner review. Owner approval remains pending |
| **B08** Bosses / events | Region and final bosses with distinct phases, arenas, effects and audio | Fair counterplay, phase transitions, controller playtest and owner review |
| **B09** Build variety | **Technical candidate implemented**: 12 run-only upgrades, seeded three-card rewards, one-claim ledger, authored icon art, and a full dev-only three-boss run | Owner review of run feel/art/audio/controller; keep B06 regression explicitly red until diagnosed or corrected |
| **B10** Hub / story / saves | Iona's initial-release arc, title-to-ending loop, persistence and New Run | Versioned saves, new-run recovery and story/UX walkthrough |
| **B11** Menus / settings / accessibility | Premium title, pause, results, remapping, display/audio/accessibility settings | Keyboard/controller paths, focus/rebind, reduced motion and screen-size audit |
| **B12** Initial-release integration | Full Base + Dawnrush run, enemy/region/boss/build integration, performance and recovery pass | Complete route is stable, readable and evidence-backed on supported desktop/browser targets |
| **B13** Initial-release signoff | Final packaging, licenses/provenance, regression and owner review | Owner explicitly approves the initial release; no technical gate substitutes for signoff |

## Hard signoff gates

1. **Art lock:** canonical original hero & form silhouettes at real size; owner approves before high-volume sprite generation.
2. **First animation:** complete smooth locomotion+combo/special at normal speed, original effects/audio, owner approval; B03 cannot pass on static sheets.
3. **First playable combat slice:** real live room/enemy/sfx, 1–3-minute gameplay clip, owner approves.
4. **Initial-release form scope:** Base and Dawnrush only. Each has separate silhouette/action review, VFX ON/OFF, original audio and run integration; owner approves each independently. Stormhalo and Eclipse Warden remain post-release only.
5. **Content expansion:** enemy and room quality equals hero's approved bar; no quantity padding.
6. **Release:** full unbroken start-to-credits run and robust QA, never a “green tests” substitute.

## After B13

Stormhalo and Eclipse Warden are post-release-only form concepts. Any generation or implementation begins after initial-release signoff and a fresh owner decision; they are not required or included in this release roadmap. Additional playable heroes need separate explicit authorization.
