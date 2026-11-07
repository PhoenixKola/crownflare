# B05 Dawnrush completion matrix

Candidate: `IONA_B05_DAWNRUSH_GENERATED_FORM_V1` (`?b05=1`, development route only). Owner approval is pending. The native source and runtime hash manifest is [`dawnrush-b05-v1.json`](../../art-source/manifests/dawnrush-b05-v1.json); the repeatable image audit is `npm run art:iona:b05:build`.

## Runtime presentation and coverage

| State/action | Left/right source and runtime keys | Authoritative timing | QA evidence | Audio / visual status |
|---|---|---|---|---|
| Base → Dawnrush | Existing Base anticipation; generated `transform-ignition`, `transform-silhouette`, `transform-ready`; generated key frames in both facings | First safe showcase: 500+600+600 = 1700 ms. Ordinary activation: 200+240+280 = 720 ms. Activation cost 20 gauge. | Live Chrome reports both routes, unchanged 15×30 body, and no transform invulnerability. | Charge/ignition cues route; not human-heard. Candidate art; owner approval pending. |
| Idle / run / turn | Generated `idle-*`, `sprint-start`, `run-*`, `turn-ready`; 24 source-generated left frames across selected locomotion/action states. Other left keys are explicit mirrors. | Idle 210 ms/frame; run 74 ms/frame. | Live transform/movement route and runtime-frame audit. | Direction and scale audit passes; owner normal-speed review pending. |
| Jump / fall / land / dash | Generated `jump-*`, `landing`, `dash-*`; direct left correction where mapped, otherwise manifest-marked mirror. | Existing B02 movement clock; dash wisp only while dash/high speed. | B05 Chrome movement route and inherited B02 regression. | Dash cue routes; human listening pending. |
| Light combo 1 | `light-1-windup/contact/recovery` left and right | startup 66 ms, contact event 91 ms, active 70 ms, recovery 128 ms. Body remains in anticipation until contact event. | Unit contact-time and live buffered 1-2-3 combo checks. | Distinct source pose and authored `light` cue; owner motion review pending. |
| Light combo 2 | `light-2-windup/contact/recovery` left and right | startup 82 ms, contact event 112 ms, active 78 ms, recovery 132 ms. | Unit timing and live buffered 1-2-3 combo checks. | Distinct source pose and authored `light` cue; owner motion review pending. |
| Light combo 3 | `light-3-windup/contact/recovery` left and right | startup 105 ms, contact event 149 ms, active 88 ms, recovery 176 ms. | Unit timing and live combo contact capture. | Distinct raised-kick pose and hit feedback; owner review pending. |
| Heavy | `heavy-windup/contact/recovery` left and right | Contact event 220 ms; 3 damage, lifted target response. | Live B05 first-sentry combat and B03 regression. | Generated pose; heavy cue routed, listening pending. |
| Aerial | `aerial-windup/contact/recovery` left and right | Contact event 130 ms; 2 damage. | Live second-sentry route and B03 regression. | Generated pose; aerial cue routed, listening pending. |
| Solar Drive | `solar-gather/ignite/drive/lash/recovery` left and right | Contact event 251 ms; 32 resonance cost, 1050 ms cooldown. | Live second-sentry route and B03 regression. | Kept distinct from Dawnfall Breaker; generated Solar Drive cue routed, listening pending. |
| Dawnfall Breaker | `finisher-windup/impact/release/recovery` left and right; separate four-frame `fx-finisher-*` ring | 300 ms startup; authoritative hit at 352 ms; 120 ms active; 470 ms recovery; costs 60 resonance + 25 Dawnrush energy; 2800 ms cooldown. | Unit resource, timing, facing, obstruction and collision checks; live earned hit against second sentry. | Generated body/effect art and original `finisher` cue; owner review/listening pending. |
| Hurt / stagger | `hurt-flinch`, `hurt-stagger` left/right where direct source exists; no Base fallback while Dawnrush is active. | Existing hit/hitstop simulation; 430 ms hurt window. | Real sentry contact during transformed combat checks state, frame key, and no fallback. | Dawnrush hurt cue routed; human listening pending. |
| KO / recovery | `hurt-ko`, `hurt-recovery` left/right; transformed KO remains Dawnrush until an actual Base handoff. | KO state persists through existing defeat flow. | Live transformed defeat route captures `b05-dawnrush-ko`; unit gate rejects transform while KO. | Candidate art; owner review pending. |
| Manual / empty-gauge reversion | `revert-contract/release/handoff/ready` left/right; the transition/finisher source sheet includes direct left keys. | Contract 120 + release 140 + handoff 160 = 420 ms; zero gauge follows the same stages. | Live manual return, zero-gauge return, stable body/position, no invulnerability grant. | Reversion cue routed; human listening pending. |
| Aura / hit reaction | Four frames each for `fx-pressure-*`, `fx-orbit-*`, `fx-speed-*`, and `fx-finisher-*`. | Pressure and orbit advance at 116 ms/frame; speed layer follows dash/high velocity; ring only on authoritative finisher hit. | VFX on/off Chrome captures; hit-VFX count must equal successful contacts. Reduced motion suppresses optional layers. | Four original generated effect layers; visual review pending. |

## Scale, facing, and source accounting

- Character canvases are 128×80 with a foot pivot at (64,80); standing visible height audits at 60 px on both facings. The gameplay collision body remains the B00 15×30 Arcade body.
- The manifest contains 124 runtime textures from nine retained source sheets: four earlier B05 masters and five native ImageGen completion masters. Twenty-four runtime poses use source-generated left-facing art; other left entries are marked mechanical mirrors.
- `audit-dawnrush.py` verifies source/runtime hashes, non-empty alpha, foot bounds, 128×80 canvas, texture uniqueness, direct-left provenance, visible difference from mirror, standing height and required runtime keys. It does not claim perceptual owner approval.
- See [`dawnrush-completion-base-dawnrush-48-60-72.png`](../../review-evidence/b05/dawnrush-completion-base-dawnrush-48-60-72.png), [`dawnrush-completion-generated-source-sheets.png`](../../review-evidence/b05/dawnrush-completion-generated-source-sheets.png), [`dawnrush-completion-runtime-contact.png`](../../review-evidence/b05/dawnrush-completion-runtime-contact.png), and the newer live Chrome captures under [`review-evidence/b05-completion/`](../../review-evidence/b05-completion/).

## Gate decisions

| Gate | Status |
|---|---|
| Native source provenance / deterministic export / texture and geometry audit | TECH: PASS — 9 retained source sheets, 124 runtime textures, 24 distinct direct-left frames; standing height 60 px both facings |
| Typecheck / unit suite / build / repository asset audit / npm audit | TECH: PASS — 70/70 unit tests; typecheck/build clean; asset audit 679 files / 81,889,851 bytes / 0 budget violations; npm audit 0 vulnerabilities |
| Actual Chrome playthrough / B00–B04 regressions | TECH: PASS — B00 headless; B02 102.96s headed capture; B03 22 checks / 135.64s; B04 22 checks / 72.12s; B05 37 checks / 143.72s; zero browser errors |
| Normal-speed art, motion, scale, VFX OFF/ON and asymmetry review | OWNER: pending |
| Original audio human listening and mix decision | OWNER: pending; generated and event-routed only |
| Physical controller test | OWNER: pending; synthetic standard-pad route only |
| B06 start | BLOCKED until explicit B05 owner acceptance |
