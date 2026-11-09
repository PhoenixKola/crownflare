# B14 final candidate acceptance

**Decision: CONDITIONAL TECHNICAL RELEASE CANDIDATE / PUBLIC RELEASE NO-GO.** Automated route coverage is strong, but the 30–45 minute first-run target, meaningful replayability, owner art/game-feel review, audio listening, physical-controller review, and name clearance remain unresolved.

## Baseline and delivered changes

- Baseline: `main` at `9576a8792c5f724329b08c97a08616df3738172f`, clean before B14.
- The regular route starts from the title and Spindle Refuge, runs through the two authored regions and both route branches, offers discoveries and run-build choices, presents all three bosses, restores the Spindle, and returns to the Refuge.
- Boss artwork loading now continues after scene activation, avoiding the earlier blocking startup observed during route QA.
- The title now uses generated Crownflare environment art, the existing Iona sprite's four-frame idle loop with a gentle breathing motion, and a clearer first-run/menu hierarchy. Both title motions honor saved and system reduced-motion preferences. Victory results use a separate generated environment illustration.
- The first-run departure dialog now opens over generated split-dawn/split-night story art. The controller settings header uses a generated device illustration. The first-clear results panel uses the generated Crownflare emblem and victory background.
- During Dawnrush, the form-energy bar pulses with a copper/gold border glow. The pulse stops for reduced motion.
- Website metadata and favicons now use the current Crownflare name and generated emblem. Website outputs include 16px, 32px and 256px PNGs, a multi-size ICO, and an Apple touch icon. The same multi-size ICO is staged at `build-resources/crownflare.ico` for packaging.
- The compact controller/settings view now uses a palette-matched scrollbar and denser action rows while keeping the save/cancel/reset footer accessible. Existing B11 HUD and ability art remain intact.
- This repository has no Electron application, Electron dependency, or Electron packaging/window configuration. The icon asset is ready for a future wrapper; no Electron runtime integration can be claimed or tested here.
- The production canvas accessibility label and release-facing page title were updated. Development-only playtest labels remain behind their explicit dev routes.

## Complete normal-route run

Headed Chrome at 1280×720 completed the full route using ordinary keyboard movement, combat, branch selection, rewards, story and results controls. The driver did not teleport, mutate game state, or skip gameplay. This is automated play evidence, not a human playtest.

| Measurement | Result |
| --- | --- |
| New-run to first active room | 1.284 s |
| Active run clock | 3:11.245 |
| Wall clock | 3:33.736 |
| Route | 11 rooms, Sunderglass Reach and Vesper Loomworks |
| Selected branches | `safe-recovery`, `spindle-lift` |
| Discoveries | `resonance-to-repair`, `heal` |
| Bosses | Sundial Custodian, Spoolheart Regent, Broken Meridian (3/3) |
| Result | Victory; 7 damage; run build Resonant Reclamation 2 / Radiant Discipline 2 |
| Mid-run Continue | Passed after reload in `vl-spindle-lift`; same run ID, seed, room and health |
| Reduced-motion setting | Persisted through the run |
| Refuge replay | Victory closed the active run and returned to the Refuge |

Room order: `sg-breach-steps`, `sg-copper-causeway`, `sg-echo-crossing`, `sg-emberwell-circuit`, `sg-resonance-gallery`, `sg-to-vesper-gate`, `vl-spindle-lift`, `vl-echo-condenser`, `vl-counterweight-climb`, `vl-condensation-vault`, `vl-night-side-threshold`.

The run is much shorter than B14's 30–45 minute first-run target. A separate controlled playthrough ended at 0:33 when the test driver lost the opening encounter; that is recorded as a driver failure, not a product acceptance run. The `conduit-challenge` alternate branch was also tested separately: save, reload, Continue into the same run and seed, recorded defeat, then a new run with a new ID and seed. That flow passed in 26.5 seconds. A full victory route through the alternate branch was not run.

## Current checks

The final check results are recorded in the commit and local `review-evidence/b14-final/` report. Commands used:

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run audit:assets`
- `npm run audit:repo`
- `npm audit --audit-level=high`
- `npm run branding:build-icons`
- `npm run qa:b14:branding`
- `npm run qa:b14:defeat-retry`
- `npm run qa:b11:smoke`
- `npm run qa:b13:entry`
- `npm run qa:b13:production`

The branding smoke checks actual browser requests for generated title, story, victory and controller art plus website icons; checks the packaged ICO matches the website ICO at six sizes; checks the four-frame title idle and reduced-motion behavior; checks the title at desktop and compact sizes; and renders the victory result layout. The victory overlay part is a visual render check, not a second gameplay victory run. The B11 UI smoke covers the Refuge, story, settings, compact settings, Base/Dawnrush/boss HUD, ability dock, upgrade cards, pause and result surfaces. It also verifies the Dawnrush pulse and reduced-motion override. Electron remains untestable because there is no Electron target.

## Human gates still open

| Gate | Status | Required evidence |
| --- | --- | --- |
| Typical first-run duration | **NOT MET** | Human playthrough and pacing revision to reach the 30–45 minute target |
| Meaningful 2–4 hour replayability | **NOT VERIFIED** | Repeated human runs and build/route variety review |
| Art, animation and collision feel | **OWNER REVIEW PENDING** | Normal-speed review across forms, enemies, bosses, hazards, VFX and reduced motion |
| Audio | **NOT HEARD** | Human listening pass for music, ambiences, attacks, tells, bosses, results and mix |
| Physical gamepad | **NOT TESTED** | Test a real device, remaps, disconnect/reconnect and feel |
| Release name | **NOT CLEARED** | Name/trademark clearance before public/commercial release |
| Electron packaging | **NO APP TARGET** | Add or identify the Electron wrapper, then wire and test `build-resources/crownflare.ico` |

The generated art is included as a visual upgrade, not represented as owner-approved final key art. No public release, public tag, deployment, audio signoff or owner approval is recorded.

## Evidence and owner packet

Machine-readable reports and browser captures live under ignored `review-evidence/b14-final/`. The curated review packet is separate from the repository at `../crownflare-qa-archive/B14-owner-review-20261109/` and includes selected title, Refuge, route, boss, victory and defeat/retry captures, the full headed-run recording, and a hash manifest. It does not claim audible evidence; the WebM has no audio track.
