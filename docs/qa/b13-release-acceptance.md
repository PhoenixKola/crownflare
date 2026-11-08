# B13 Core Game Completion and Release Acceptance

**Status: CONDITIONAL TECHNICAL CANDIDATE / PUBLIC RELEASE NO-GO.** This record distinguishes automated technical checks from the playtime, visual, audio, physical-controller and owner gates that require a human.

## 1. What the player actually experiences now

The normal intended loop starts at the title, enters Spindle Refuge, presents the short story and run-preparation beat, and starts a two-region expedition. A seeded route includes 11 authored rooms: the fixed opening and connecting/end rooms, a player-selected branch in each region, and two distinct seeded authored templates in each region. Cleared combat and elite rewards can offer deterministic B09 build choices. The route still leads to the existing three-boss Broken Meridian confrontation, ending, results and Refuge return. B13 directly verified the first room, two natural jumps across gaps, a gate transition into the next room, and Continue recovery. A complete normal route was not human-played for this record.

## 2. Exact baseline, changes, commits and clean tree

- Baseline: `main`, `6a5336cef020cd390f8d170ee89db2230003a156`, clean before B13.
- Source changes: B10 boss assets load after the playable scene starts; encounter startup waits for minimum assets; routes visit two distinct seeded templates per region; combat/elite rewards offer build choices; settings persist integer Pixel Perfect or Fit scaling; old B12 saves receive the display default; QA entry/production probes and release instructions were added.
- Commit and push state: see the source handoff for this acceptance run.
- `review-evidence/` is ignored. No source ZIP or public release artifact was created.

## 3. P0 startup issue

B12's representative Chrome smoke timed out before the expedition became active. The source path put the full three-boss art/effect/audio preload in the B10 scene's blocking preload. B13 starts the first room while boss resources load asynchronously, then presents a preparation state if a boss starts before its minimum assets are ready.

Direct headed Chrome evidence: the latest normal New Run reached `sg-breach-steps` in 1.154 seconds with an active scene and all 8 expected room textures; a fresh Continue check reached saved `sg-copper-causeway` with the same run ID. Natural keyboard movement crossed both opening gaps and saved the next-room checkpoint. The probe reported zero page/console errors and zero failed requests. A separate representative B10 run reached the Sundial boss with 42/42 boss assets and 15/15 audio cues loaded; that did not complete the full route.

## 4. Playtime

No human-speed complete run was timed. B12's estimated route budget was about 4:11-5:13 before bosses, Refuge, exploration and retries. Two seeded authored templates now appear per region rather than one, but this content increase does not establish a 30-45 minute typical run. **PLAYTIME TARGET NOT MET / UNVERIFIED.** The 2-4+ hour meaningful-replay target is likewise **NOT VERIFIED**. Do not count seed combinations as measured replayability.

## 5. New gameplay, room, encounter and story content

No new boss, hero form, or art was generated. The route now includes four seeded region templates per run, chosen as two distinct rooms per region from the existing six B12 authored rooms. A unit probe exercised 120+ seeded branch/order compositions against a possible 144. Combat/elite room rewards now expose deterministic B09 choices when claimed. Existing story, bosses, ending and Refuge remain part of the normal route; those later beats were not covered in the B13 direct browser probe.

## 6. Collision and camera / pixel-sharp art comparisons

Phaser keeps the 480x270 logical canvas and nearest-neighbor filtering. The scaling browser matrix measured the rendered canvas:

| Viewport | Pixel Perfect | Canvas placement | Fit mode at 1280x720 |
| --- | ---: | --- | ---: |
| 1280x720 | 2x / 960x540 | centered, 160x90 margins | 2.667x |
| 1920x1080 | 4x / 1920x1080 | fills viewport | — |
| 1366x768 | 2x / 960x540 | centered, 203x114 margins | — |
| 352x266 | 0.733x / 352x198 | centered vertically | — |

The compact view uses fractional scaling because a whole-number scale cannot fit. Automated input crossed two jumps and two gaps; no visual wall, ceiling, lift, hazard, knockback or transformation collision review was performed. **Collision feel and owner pixel-art review remain open.**

## 7. Character / enemy / boss animation review and remaining gaps

Base and Dawnrush use the existing authored animation assets. Existing B08 bosses still rely heavily on distinct pose-frame changes rather than fluid action loops. This milestone did not perform a human normal-speed review with VFX on/off, in both facings, or under reduced motion. **ART / MOTION OWNER REVIEW: PENDING.**

## 8. HUD / menus / accessibility / controller status

The existing B11 UI remains in use; settings now persist the display policy. Fresh New Run and Continue menus passed. Keyboard jump/traversal passed, and a synthetic standard Gamepad API pad passed Refuge focus, settings acceptance and axis movement into the first room. Reduced-motion and contrast accessibility were not visually reviewed. **Physical controller: NOT TESTED.**

Owner physical-pad checklist: movement, jump, dash, light/heavy, special, transform/finisher, interact, branch/upgrade choice, pause/settings, remap persistence, and disconnect/reconnect.

## 9. Audio — heard or not heard, capture method, problems found

**HEARD: NO / BLOCKED.** This environment did not provide an audio-capable capture/listening path. WAV audits and browser playback calls are not listening evidence.

Owner listening checklist: unmute and enter a run; hear Base light/heavy/miss/hit, Dawnrush transform/revert and attacks, enemy tells/impacts, each boss phase cue, both region ambiences, Refuge, rewards and ending. Check relative mix at normal volume, repeat strikes, volume persistence, mute, pause and tab/focus loss.

## 10. Performance / bundle / saves / provenance / repo size

The production build emits a 1,710.41 kB minified JavaScript chunk (459.45 kB gzip) and Vite's existing advisory above 500 kB. B13 startup measured 1.154 seconds in the latest dev-browser check; no architectural split was introduced solely to silence the advisory. Existing canonical art/provenance was preserved; no new art was generated. B12 V2 saves without `pixelScaling` default to Pixel Perfect and retain progress. Asset audit: 882 files and 136,139,367 bytes, zero per-file budget violations. Repository audit: 1,080 tracked files / 138,058,922 bytes, zero policy findings. `npm ci` and `npm audit --audit-level=high` passed with zero vulnerabilities. The B12 world art provenance audit passed.

## 11. Targeted build tests and final hands-on QA matrix

“Hands-on” here means real Chrome UI interactions automated at normal clock speed; there was no human visual/audio or full-run hands-on review. The focused matrix is:

| Check | State | Evidence / limitation |
| --- | --- | --- |
| Typecheck / unit / production build | PASS | `npm run typecheck`, `npm test` (115/115), `npm run build` |
| Clean dependency install / high-severity audit | PASS | `npm ci`; `npm audit --audit-level=high` found 0 vulnerabilities |
| Normal New Run / first room / keyboard movement | PASS | Headed Chrome, 1.154 s, 8/8 textures; gaps and next room reached naturally |
| Continue / checkpoint recovery | PASS | Headed Chrome reload resumed same run at `sg-copper-causeway` |
| First route boss asset readiness | PASS, representative only | One B10 headed attempt observed Sundial with 42/42 boss assets and 15/15 boss audio cues; full route not continued |
| Synthetic controller | PASS | Standard Gamepad API emulation; not physical hardware |
| Scaling matrix and Fit choice | PASS | Measurements in section 6 |
| Production route / dev diagnostics excluded | PASS | Production preview, normal route, query flags ignored, QA hook absent |
| Legacy `qa:b12:smoke` driver | INCONCLUSIVE | It no longer stalled at first-room entry, but its later route expectations predate B13's extra seeded rooms/reward modal and it did not complete as a release campaign. B13's dedicated entry and production probes are the current passing route checks. |
| Asset / B12 world-art / repository / dependency audit | PASS | Asset and world-art provenance checks; repository audit rerun against staged files |
| Full three-boss run, defeat/retry, real run duration | NOT RUN | Human walkthrough required |
| Wall/ceiling/lift/hazard/knockback collision and normal-speed motion | NOT RUN | Human visual inspection required |
| Audio heard | BLOCKED | No audio-capable listening method available |
| Physical controller | NOT TESTED | No connected physical pad verified |
| Owner approval | PENDING | Must be explicit |

Local QA reports are stored under ignored `review-evidence/b13/`; SHA-256:

- `route-entry-smoke.json`: `FB8AAA1D6652B5BB8F7FCD4054A18812103631E2159E311AE51576DE19252036`
- `production-route-smoke.json`: `E08337FB0F180ADE03EEC5427604086588338F13B692B560BAAE4D569CE98D9E`

They are local evidence, not tracked release files.

## 12. Owner acceptance card

Run from a clean clone with Node 22.12+: `npm ci`, `npm run dev`, open the Vite URL in Chrome, choose **Enter the Refuge → Prepare Expedition → begin**. For the built candidate, use `npm ci`, `npm run build`, `npm run preview`, and open the preview URL. `npm run qa:b13:entry` and `npm run qa:b13:production` reproduce the focused browser checks. Development shortcuts are not normal player routes.

Owner decisions still needed:

- [ ] Approve the Base and Dawnrush look and motion at normal speed.
- [ ] Approve collision/game feel after walls, lifts, hazards and bosses are inspected.
- [ ] Complete the audio listening checklist.
- [ ] Test with a physical controller or explicitly accept a keyboard-only evaluation.
- [ ] Play and time a complete normal route; decide whether the shortfall from 30-45 minutes needs more content before release.
- [ ] Approve or reject the candidate for release.

## 13. Release candidate status

**CONDITIONAL private technical candidate; NO-GO for public release.** The entry path, saves, core browser interactions and technical checks pass. Full-route human QA, target playtime, collision/art-motion, audio, physical controller and owner acceptance remain open. Do not tag or publish a release until those gates are resolved and the owner explicitly approves.

## 14. Source handoff

Source remains in this repository on `main`; commit, push result and clean-tree status will be added after the reviewed commit. No ZIP was requested or created. Raw review evidence remains ignored under `review-evidence/b13/`.
