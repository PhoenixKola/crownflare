# B12 Game Feel and Replayability Review

## What changed in play

- Six hand-authored rooms join Sunderglass Reach and Vesper Loomworks: `sg-sunwell-terrace`, `sg-echo-crossing`, `sg-emberwell-circuit`, `vl-counterweight-climb`, `vl-cantor-pressure`, and `vl-echo-condenser`.
- Seeded room selection follows both route choices. Two region choices and three seed-selected variants per region produce 36 route compositions while preserving the short route to the same three bosses.
- Three optional event rooms offer real resource choices: repair versus Dawnrush charge; repair versus combat Resonance; and conditional healing versus combat Resonance. Choices are one-time per room, recorded in B10 checkpoints/run summaries, and older checkpoints without `eventChoices` remain valid.
- Vesper ledges now tile native 96×36 strips cropped from the existing B07 masters. Their art width follows authored geometry without resampling the source pixels. Moving-lift presentation reads the Arcade body after each physics step, and lift velocity is derived from the same deterministic curve as its authored motion.
- F3 opens a development-only collision view for sprite alpha bounds, the 15×30 player body, hip/feet anchors, static and moving platforms, one-way surfaces, enemy/boss attacks, hazards, and camera offset.
- Existing B08 key poses now change at authored telegraph/strike/recovery times and through boss phase changes. Damage and attack simulation remain unchanged.

## Measured registration and rendering

The headed Chrome snapshot at `review-evidence/b12/b12-base-registration.png` showed the initial floor at world Y=241, the player body at X=56.5–71.5 / Y=211–241, and the current idle-frame alpha at X=46.5–83.5 / Y=195–241. A Dawnrush frame measured body X=133.2–148.2 / Y=211–241 and alpha X=121.2–159.2 / Y=181–241. In both samples the visible alpha bottom and physics-body bottom were exactly Y=241. The body stays 15×30; it was not enlarged to match the taller sprite.

The game renders at 480×270. At the reviewed 1280×720 browser viewport, that is 2.667× FIT scaling, so the window is not an integer-scale pixel-perfect presentation. Pixel-art filtering and camera `roundPixels` remain enabled. The screenshot is sharp at the reviewed size; narrow/tall and integer-scale layouts were not covered in this milestone.

The body and feet measurements are an in-game observation, not proof for every jump, wall, ceiling, knockback, hazard, or moving-lift contact. The final headed run recorded Gamepad focus and settings as PASS, then timed out entering B10 gameplay: the B07 scene was inactive and had loaded zero textures after 15 seconds. Therefore, the final run did not cover the expanded route, lift ride, or boss exchange. The ignored `review-evidence/b12/b12-smoke-report.json` records the timeout; the earlier partial capture records the feet measurements and transform.

## Art provenance

Native ImageGen call `01a1b353-b750-72f3-9594-c017f1f1a806` produced `exec-435ea220-e13f-4b72-9096-9906cc9ea74a.png`, retained as [the B12 landmarks atlas](../../art-source/environments/b12/landmarks-atlas.png), SHA-256 `3743d518adc883ee10687c9ab8086236acb16b11ae36a092a162a5bd7020b122`. It is an original 3×2 sheet of six regional landmarks. The generated near-white checkerboard was removed by edge-connected low-chroma flood fill; each 512×512 cell was reduced to 128×128 with nearest-neighbor sampling. [The manifest](../../art-source/manifests/b12-world.json) records the source, transform, runtime hashes, alpha bounds, and source crops for the three Vesper strips.

No new Iona/Boss poses were needed. Base and Dawnrush keep their existing shared identity, fixed pivot, existing separate left/right frames, and native 128×80 runtime canvas. The VFX-off review sheet is ignored at `review-evidence/b12/iona-base-dawnrush-vfx-off.png`; it was composed at 96×60 for inspection only and does not rescale runtime sprites.

## Content budget and remaining target

Each route visits nine rooms. The authored room budgets total 251–313 seconds (4:11–5:13) before boss encounters, Refuge/story, menus, exploration, or retries. These are design estimates, not human playtime. They fall short of the brief’s 25–45 minute normal-run target; B12 does not claim 2–4 hours of proven replay value. The six distinct rooms, branch/seed challenge compositions, three mechanical discoveries, existing upgrade builds, and existing Beacon first-clear reward provide more variation, but B13 must pace full human runs and deepen repeat-run goals if playtest duration remains short.

## Verification and gates

- Focused unit suite: 114/114 passed, including seeded routes, old checkpoint recovery, one-time choices, deterministic lift velocity, and boss presentation timing.
- Typecheck, production build, asset audit, repository audit, dependency audit, and B12 art audit passed. The Vite build still reports a 1,707.48 kB minified JavaScript chunk; no safe split was implemented in this milestone.
- A partial headed Chrome session verified the normal B11 HUD and measured Base/Dawnrush feet registration. The final full-route attempt verified synthetic Gamepad focus/settings but timed out before the B07 scene loaded; the synthetic focus probe was inconsistent across launches. A physical controller was not tested. Do not treat this as moving-lift, full-route, or boss-combat signoff.
- **Audio: NOT HEARD.** Cue calls use bounded per-cue volumes (`0.5–0.62` for B08 and `0.55` for B07); event callbacks and loaded audio assets do not constitute listening approval. Use the local browser walkthrough with speakers/headphones during B13.
- **Reduced motion:** existing setting remains wired to boss effects, warning pulses, and transition effects; this was reviewed in code, not visually compared in the headed pass.
- **Owner review: PENDING.** No approval is implied.

## B13 handoff

Use one real controller, inspect narrow/tall and integer-scale windows, complete a normally paced route through both branch decisions and all three bosses, ride each moving lift in both directions, and record real run duration. Listen to Base/Dawnrush/enemy/boss cues with normal and reduced motion. Confirm wall/ceiling/knockback/hazard contacts and compare VFX on/off before marking art-motion, audio, controller, replayability, or owner gates complete.

Reproduce focused checks with `npm run typecheck`, `npm test`, `npm run build`, `npm run audit:assets`, `npm run audit:repo`, `npm audit --audit-level=high`, `npm run art:b12:audit`, and `npm run qa:b12:smoke`. Raw screenshots and reports stay in ignored `review-evidence/` and are not shipped in the repository.
