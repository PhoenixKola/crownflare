# B10 Owner Review Handoff

**Candidate:** B10 pre-release loop. **Technical browser gates:** report PASS after the final `qa:b10` run. **Visual-motion owner approval:** not recorded. **Audio:** `AUDIO NOT HEARD / CAPTURE BLOCKED`. **Physical controller:** not tested. Crownflare remains pre-release; this is not release or art/audio approval.

## Player route and inspected views

The normal route begins at the title, enters the illustrated Spindle Refuge, presents a short departure story and preparation choice, then starts or resumes the real B07 two-region expedition with existing B08 bosses and B09 build choices. Victory and defeat return to clear result and hub states; the first victory awards the persistent Beacon modifier, and subsequent runs use fresh seeds. Only Base and Dawnrush are offered.

The B10 QA captures were visually inspected as stills: title, Refuge, departure story and first room. The small-viewport capture was also inspected; it keeps the game at its 16:9 aspect ratio with dark space above/below in portrait orientation. Full normal-speed action playback was not inspectable through this session because the Windows computer-use native pipe was unavailable. Archived B06/B08 video contact sheets were sampled as stills only; this does not satisfy full animation review.

The headed Chromium smoke measured live `requestAnimationFrame` cadence for 1.5 seconds in the Refuge (128 frames; median interval 12.5 ms, p95 12.6 ms, max 16.7 ms; about 80 Hz by interval) and active combat room (295 frames; median 4.2 ms, p95/max 8.4 ms; about 238 Hz by interval). Browser heap was 14.8 MB / 18.2 MB at the Refuge and 25.0 MB / 29.9 MB in combat. This Chromium launch uses software SwiftShader and reports browser frame scheduling, not hardware GPU performance or a capped game FPS guarantee; treat it as a diagnostic sample only.

## Evidence and owner decision matrix

| Scope | Implemented / automated | Visual inspection in this session | Audio actually heard | Owner action |
|---|---|---|---|---|
| Title, Spindle Refuge, departure story, first room | PASS; B10 headed browser smoke | Still captures inspected | No | Review bundled stills and live flow |
| Base idle/run/dash/jump/land, combo/heavy/aerial/Solar Drive/finisher, hurt/KO/reversion, both facings | Existing runtime; combat regression gates passed | BLOCKED for full normal-speed action-by-action review | No | Review at native 480×270 gameplay scale, VFX on/off |
| Dawnrush movement/attacks/transformation/reversion and fixed body scale | Existing runtime; three B06 headed clears passed | BLOCKED for full normal-speed action-by-action review | No | Review against Base, including busy scenes and both facings |
| Shardrunner, Orbit Wisp, Sentry, Bastion, Cantor tells/contact/recovery | Runtime and B06 scenario checks passed | BLOCKED for complete real-time roster review | No | Inspect tells and VFX occlusion at native gameplay scale |
| Sundial Custodian, Spoolheart Regent, Broken Meridian phases/telegraphs/defeat | Existing B08 route; complete B10 victory route passed | BLOCKED for complete real-time phase review | No | Review normal-speed phases and punish windows |
| Small/portrait viewport and reduced motion | Synthetic browser/settings coverage | Portrait screenshot inspected; reduced-motion render was not separately reviewed in B10 | No | Confirm readability and reduced-motion presentation |
| Physical controller | Synthetic Gamepad API coverage only | Not applicable | No | Test real hardware and record layout/feel |

`IMPLEMENTED`, `VISUALLY INSPECTED`, `AUDIO ACTUALLY HEARD`, and `OWNER APPROVED` are independent states. Automated events, source inspection, screenshots and silent WebM recordings cannot substitute for the latter three.

## Bundle and how to review

The separate local review bundle is prepared outside Git at `crownflare-qa-archive/B10-owner-review-20261108/`. It contains B10 screenshots and QA summary, short B06/B08 visual-only excerpts, the isolated audio cue reel and its cue/hash manifest, and this owner checklist with exact capture limitations. The full raw evidence archive remains in `crownflare-qa-archive/B09-before-B10-20261108/`.

For an interactive check from a fresh checkout: run `npm ci`, `npm run dev`, then open `http://127.0.0.1:5173/`. Use `/?b06=1` and `/?b08=1` only for development-only combat review. The production build removes those QA shortcuts. Audio recording and listening instructions are in [B10 Audio Review](b10-audio-review.md).

## Owner signoff checklist

- [ ] I reviewed title, Refuge, story and the first playable room.
- [ ] I reviewed Base and Dawnrush movement, attacks, transformation, reversion, hit/KO and both facings at native gameplay scale.
- [ ] I reviewed all five enemy archetypes and all three bosses through real-time tells, attacks, recovery, phase changes and defeat.
- [ ] I checked VFX on/off, reduced motion, busy combat, fixed scale, foot contact and telegraph visibility.
- [ ] I heard the audio-bearing gameplay capture and cue reel on my chosen output device; notes: __________.
- [ ] I tested a physical controller; model/layout/feel notes: __________.
- [ ] Decision: [ ] approve candidate presentation  [ ] request revisions: __________.

No box is preselected. This document does not record an owner decision.
