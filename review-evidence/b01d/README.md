# Iona B01D review package

**Candidate:** `IONA_B01D_BASE_V1`<br>
**Owner approval:** PENDING<br>
**Promotion:** disabled<br>
**Review route:** `/?animationLab=1&b01d=1`

## Review status

| Area | Result |
|---|---|
| TECH | **PASS** — install, typecheck, 33 unit tests, build, asset audit, npm audit, B00 Chrome, synthetic controller, B01C regression, and B01D Chrome checks passed. |
| ART-MOTION | **PENDING** — the normal-speed Chrome video exists, but the agent could not play it back in this session. Owner review is required. |
| AUDIO | **NOT-IMPLEMENTED / NOT-HEARD** — the B01D candidate has no audio, and Playwright recorded no audio track. See `docs/qa/b01d-audio-cue-sheet.md`. |
| OWNER APPROVAL | **PENDING** — Base direction, left/right identity, scale, locomotion, combo, Dawnrush and audio decisions remain open. |
| B02 READINESS | **READY-FOR-OWNER-GATE** — typed clip registration, per-frame diagnostics, local QA and disabled promotion gate are in place. This is not B02 acceptance. |

## What changed

B01D changes only the run loop. It adds four separately generated run poses in each facing, normalized to 67 visible source pixels and played at 105ms each in the historical 420ms loop. Its order is contact, compression, opposite-foot contact and passing. All other B01C art remains byte-identical in the candidate runtime.

The in-game lab provides B01C/B01D A/B, VFX off by default, calm/light/busy rooms, a 75% viewport, and exact 48/60/72 visible-height controls. Per-frame visible bounds drive scale and the diagnostic overlay shows the painted bounds, 128×80 canvas, feet pivot and 15×30 physics body. Combat still uses the 112/138/165ms simulation events. Ordinary gameplay does not load B01D.

## Frame coverage

| State | Left facing | Right facing |
|---|---|---|
| Idle/ready | Unchanged B01C | Unchanged B01C |
| Run loop | Four new ImageGen poses | Four new ImageGen poses |
| Start, stop, turn | Unchanged B01C | Unchanged B01C |
| Jump rise/apex/fall/land | Unchanged B01C | Unchanged B01C |
| Dash active/recovery | Unchanged B01C | Unchanged B01C |
| Combo 1/2/3 windup/contact/recovery | Unchanged B01C | Unchanged B01C |

The baseline frame/source/hash map and ranked defects are in [`b01d-baseline-audit.md`](../../docs/qa/b01d-baseline-audit.md). Generation prompts and original sheets are in [`art-source/characters/iona/b01d/`](../../art-source/characters/iona/b01d/); the exact runtime hashes and timing are in [`iona-b01d-candidate-v1.json`](../../art-source/manifests/iona-b01d-candidate-v1.json).

## Chrome evidence

- [Normal-speed Installed Chrome recording](iona-b01d-75s.webm): measured duration 67.68 seconds; 4,593,218 bytes; SHA-256 `b8588efbce7307fffb37ca718a45bd81d2aff489f0aca0194f8ef70b399aee82`.
- [`qa-report.json`](qa-report.json): Chrome 156.0.8078.80; source SHA-256 `6891aa41de9c1bcda75c78a64e0ea6dd8bf2bc93f1a0a3a3a8c6ffde33dae3b2`; zero browser errors; 140 loaded B01D/B01C candidate and baseline textures; body 15×30; measured 48/60/72 visible heights; 7 combat events (4 misses, then 3 hits).
- The video was recorded at normal playback speed. The computer-use/native browser bridge was unavailable, so the agent did not watch it. The Playwright tab-hidden probe also remained unverified: Chrome continued reporting the first tab as visible after the second tab was foregrounded. `realTabHiddenVerified` is therefore `false` in the report.
- Playwright captured no audio track. No claim about audio playback or quality is made.

The unretouched same-action/same-scale comparison is [`iona-b01d-run-right-b01c.png`](iona-b01d-run-right-b01c.png) beside [`iona-b01d-run-right-b01d.png`](iona-b01d-run-right-b01d.png). The raw-pixel cycle comparison is [`iona-b01d-before-after-run-cycle.png`](iona-b01d-before-after-run-cycle.png); the two-facing action sheet is [`iona-b01d-action-contact-sheet.png`](iona-b01d-action-contact-sheet.png); the form silhouettes identify retained B01A studies in [`iona-b01d-four-form-silhouette-references.png`](iona-b01d-four-form-silhouette-references.png).

## Verification performed

| Command | Result |
|---|---|
| `npm ci` | PASS; installed 19 packages, zero vulnerabilities reported |
| `npm run typecheck` | PASS |
| `npm test` | PASS; 33/33 tests |
| `npm run build` | PASS; Phaser bundle 1,442.62 kB minified (existing size warning retained) |
| `npm run audit:assets` | PASS; 358 files, 47,668,004 bytes, no individual budget violations |
| `npm audit` | PASS; zero vulnerabilities |
| `npm run qa:chrome:local` | PASS; Installed Chrome 156, output preserved under ignored `tests/evidence/qa-chrome-local/` |
| `npm run qa:controller:local` | PASS; synthetic Gamepad API only; no physical controller claim |
| `npm run qa:iona:b01c` | PASS; 76-second normal-speed Chrome capture under ignored `tests/evidence/b01c-regression/`; committed B01C evidence was not overwritten |
| `npm run qa:iona:b01d` | PASS; this package's 67.68-second recording and screenshots |

The B01C recording is also video-only and was not watched in this session. Both normal-speed captures still need human playback review.

## Owner review controls

Open `/?animationLab=1&b01d=1`, then use `A`/`D` to move, `Space` to jump, `Shift` to dash, `J` for the combo, `T` for B01C/B01D, `1`/`2`/`3` for exact 48/60/72 painted-pixel heights, `C` to cycle backgrounds, `V` for the optional VFX toggle, `G` for frame/anchor diagnostics and `R` for the scale/background comparison panel.

The videos have no audio. For future system-audio evidence on Windows, open OBS, choose the Chrome window with Window Capture, leave Desktop Audio enabled for the Windows output device, confirm its mixer meter moves during playback, then start recording and play the clip at normal speed. Keep the original video unchanged and label any audio re-recording separately.

The specific human decisions are listed in [`b01d-owner-decision.md`](../../docs/qa/b01d-owner-decision.md). Do not set `readyToPromote` or `OWNER_APPROVED` until the owner explicitly approves the candidate.
