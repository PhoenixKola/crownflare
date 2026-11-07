# B02 playable movement and anatomy review

## Preview and build

Run `npm run dev` and open `http://127.0.0.1:5173/?ionaPreview=1`. Select **Enter the Spindle**. For the technical overlay used in the evidence, open `http://127.0.0.1:5173/?ionaPreview=1&b02diag=1` instead. The overlay shows the 128×80 source canvas, current alpha bounds, the Arcade body, the grounded pivot, and the global reference scale.

This remains a development preview of provisional B01E Iona in the existing chamber. Production continues to use B00 programmer art. `readyToPromote` remains false and owner approval remains pending.

## What changed

`IonaPlayerPresentation` now owns the shared 128×80 pivot and global 48/60/72 scale. At the 60px standing reference it uses scale `1.0`; the other choices use `0.8` and `1.2`. Sprite placement follows the Arcade body's center and bottom. Pose alpha bounds are diagnostics only and cannot change scale. The 15×30 body and existing movement/combat simulation stay in control.

The old alpha-height fit ran only in the B01D comparison route; the B01F playable preview already held scale constant. B02 removes the fit from the comparison route and centralizes the same fixed-scale presentation path for the preview and candidates. Source-frame measurements do not prove that generated head, torso, limb, or material proportions read consistently at normal speed. No new sprite was generated or exported in this batch; existing B01C–B01E masters and manifests remain unchanged. The art-motion gate is therefore still open for the owner's visual review.

The supplied `crownflare-main(7).zip` was not present at the repository root or in the checked Downloads folder. The inspected working baseline was `f004beba0904561757536d37163ff3a64a96385c`.

## Evidence

- [`iona-b02-gameplay.webm`](iona-b02-gameplay.webm) is a 100.16-second headed Chrome 156 capture from the real Phaser/Vite preview. Estimated active gameplay is 98.01 video seconds. It has no audio stream.
- [`iona-b02-shrink-before-after.png`](iona-b02-shrink-before-after.png) compares a historical B01D alpha-fit landing capture with a current B02 fixed-scale landing capture, with the current body/pivot/scale overlays. It demonstrates the scale-rule change; it is not an anatomy approval or a B01F before/after claim.
- [`iona-b02-shrink-after.png`](iona-b02-shrink-after.png) is the full-screen Phaser landing capture at the 60px reference.
- [`iona-base-owner-compare-live.png`](iona-base-owner-compare-live.png) is a real Phaser scene view. Thirty additional scene crops across 48/60/72 and both facings are recorded in the ignored `tests/evidence/b02-crops/manifest.json`.
- [`b02-qa-report.json`](b02-qa-report.json) contains the browser build, source/video hashes, action timestamps, QA results, and limitations. The live sampler recorded 518 ticks with zero scale, pivot, or body violations.
- [`owner-decision-card.md`](owner-decision-card.md) leaves identity, scale, motion, and audio decisions open.

## QA result and gates

`npm run qa:b02` passed in headed Chrome 156. The capture includes 98.01 estimated active-play video seconds, all 70 B01E textures with no missing frames, 48/60/72 selection, a 15×30 body, variable jumps, dash-barrier collision, buffered three-hit combat, a wrong-facing miss, pause/resume, and the production-route guard. It reports a 25fps video-only WebM and 518 presentation samples with no measured scale or anchor violations.

Technical integration passed. Normal-speed playback and audio listening did not: the computer-use playback bridge failed with `Computer Use native pipe is unavailable: failed to connect native pipe: The system cannot find the file specified. (os error 2)`. Frame measurements and scene stills are evidence, not a substitute. Audio events are wired and all 13 original cues loaded/auditioned by the browser automation, but the agent did not hear them; the WebM has no audio track. Owner art-motion and owner approval remain pending.

See [`docs/qa/b02-movement-anatomy-acceptance.md`](../../docs/qa/b02-movement-anatomy-acceptance.md) for the review checklist and Windows audio-capture procedure. If Iona still reads as uniformly smaller in crouch transitions during normal-speed viewing, keep the work in B02 and correct the affected authored poses before starting B03.

## Size and retention

The audited runtime/source art remains 455 files and 50,533,893 bytes; B02 adds no runtime sprites or copied art masters. The B02 work adds 15 files totaling 13,246,786 bytes. The largest is the single owner-facing gameplay WebM at 12,142,003 bytes; the remaining B02 evidence, source, tests, and docs total 1,104,783 bytes. The deliverable file tree grows from 89,967,442 to 103,221,139 bytes (13,253,697 bytes, 14.73%), excluding Git-ignored dependencies and build output. The 98.05 MiB Git object database is unchanged because this B02 work is not committed.
