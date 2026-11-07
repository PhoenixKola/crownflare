# Project Crownflare — B00–B13 Production Roadmap and Owner Gates

**Rule:** Milestones are meaningful production phases, not guaranteed release dates. No new phase starts simply because builds are green. Inside each phase, break corrections into small issue-based Codex batches. Record `TECH`, `ART-MOTION`, `OWNER APPROVAL` separately.

| Batch | Product-visible deliverable | Gate to next phase |
|---|---|---|
| **B00** Foundation | New standalone Git/source, actual title→test chamber, movement/jump/dash/collision/camera/pause/controller foundation, deterministic core skeleton, docs, QA commands | Real browser loop verified, npm ci/typecheck/build/tests and Chrome smoke green; placeholders correctly labeled; B01 art brief ready |
| **B01** Hero art lock | Original canonical Iona concept/source, left/right and scale studies, first in-engine idle, unique four-form silhouette board | Owner explicitly approves live Base hero design and four silhouette directions at actual scale |
| **B02** Base locomotion | Fully authored idle/run start/loop/stop/turn/jump/fall/land/dodge/hurt/KO, feel-tuned movement, appropriate audio | Real recorded normal-speed locomotion, no identity/foot drift, controller/keyboard feel accepted |
| **B03** Base combat gold | Beautiful 3-hit combo, heavy/launcher, aerial, one special, moving enemy, hit events, sync sound/VFX | Body looks excellent even without VFX; precise combo/contact, normal-speed owner approval |
| **B04** Combat vertical slice | ONE complete beautiful region room, 1–2 enemy types, HUD/reward and original audio/VFX | 1–3-minute normal-speed playable footage + owner visual/feel approval |
| **B05** Dawnrush FULL | Distinct design, locomotion/attacks, aura, transformation/reversion, finisher, HUD/audio | All required states/directions, form meaningfully in normal run, owner approval |
| **B06** Stormhalo FULL | Split-halo redesigned body, precision counter kit and entirely different aura/audio | Silhouette/gameplay differentiate from Base/Dawnrush without VFX, owner approval |
| **B07** Eclipse Warden FULL | Complete metamorphic body and new movement/combos, choreographed ultimate, living dual aura | Standout independent sprite architecture and finisher, tested readable in combat; owner approval |
| **B08** Enemies / elites | Core distinct archetypes, fair tells, unique animations and AI | Mixed encounters readable with largest aura and active movement |
| **B09** World & room assembly | Two strong regions, authored platform chunks, branches, hazards and interactive room beats | Seeded runs consistently fun, platform readability and procedural fairness tested |
| **B10** Bosses & events | Two major bosses plus final boss target, phases/audio/arena staging | Telegraph fairness, boss loops, clear counterplay; real controller/playtest evidence |
| **B11** Build variety | Small balanced upgrades and meaningful combinations, rewards/shops/events | Deterministic synergy/stack tests and actual differing run decisions |
| **B12** Hub / story / UI / saves | Title-to-results full game, complete hero narrative arc, metaprogression, refined menus/settings | New run→ending→next-run flow, versioned save, UX and accessibility walkthrough |
| **B13** First-release verification | Full route/roleless desktop game QA, input/audio/art/animation/perf/recovery review | Owner-visible full run, all required evidence, clean source/art archive, explicit release approval |

## Hard signoff gates

1. **Art lock:** canonical original hero & form silhouettes at real size; owner approves before high-volume sprite generation.
2. **First animation:** complete smooth locomotion+combo/special at normal speed, original effects/audio, owner approval; B03 cannot pass on static sheets.
3. **First playable combat slice:** real live room/enemy/sfx, 1–3-minute gameplay clip, owner approves.
4. **Each form:** silhouette and action animation, VFX OFF/ON, distinct mechanics, actual run integration, original audio, left/right, owner approves independently.
5. **Content expansion:** enemy and room quality equals hero's approved bar; no quantity padding.
6. **Release:** full unbroken start-to-credits run and robust QA, never a “green tests” substitute.

## After B13 (documentation only)

Optional Hero 2 → Hero 3 → optional Hero 4, **maximum 3–4 playable heroes total**, only with new explicit owner authorization after Hero 1's release quality is achieved. Absolutely no production work on these during B00–B13.
