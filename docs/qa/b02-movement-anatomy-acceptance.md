# B02 movement and anatomy acceptance

## Purpose

B02 keeps provisional Iona on the existing chamber movement and combat state, with a single global render scale and a fixed canvas foot pivot. The 15×30 B00 physics body remains authoritative. Ordinary gameplay still uses the programmer actor until the owner approves Iona explicitly.

## Scale and anchor contract

- Source frames use a common 128×80 canvas and pivot `(0.5, 1)`, corresponding to `(64, 80)` in source pixels.
- The 60px standing reference uses scale `1.0`; the 48px and 72px choices use `0.8` and `1.2` globally.
- Animation frame changes cannot change scale. Alpha bounds describe visible pose height only; they never choose scale or actor position.
- Grounded sprite position follows the physics body's bottom edge. Airborne motion follows the same body reference, with any future explicit offset authored separately.
- The physical body stays 15×30 for every pose and review size.

## Root cause record

The old `fitB01dSpriteToRequestedHeight()` set scale to `reviewSize / currentAlphaHeight` on each scene update. At a 60px review setting, the B01E right-facing alpha bounds measure 60px for idle-0, 67px for run-0, 46px for combo-1 windup, and 39px for dash-3. That formula would therefore vary scale from about `0.896` to `1.538` across those frames, changing the apparent size of the head and torso.

The old fit function was guarded by `b01dMode`. The normal B01F development preview selected B01E through `previewMode`, so it did not execute this old fit function and already held the 60px scale constant. B02 removes the alpha-driven fit from the comparison route too and routes all sprite placement through `IonaPlayerPresentation`. The owner-reported symptom in the B01F preview cannot be attributed to the B01D-only code path alone. A crouch may become shorter as joints bend; the head, torso, limbs, and material detail must still read as the same Iona.

The source bounds prove that pose height differs. They do not measure head diameter, torso width, limb thickness, material consistency, or whether a transition looks like uniform shrinkage. The included still comparison is technical evidence only. Normal-speed owner observation remains the deciding art-motion check.

## Owner visual review

Use the real Chrome preview linked from [`review-evidence/b02/README.md`](../../review-evidence/b02/README.md). Select 60px first, with VFX off and calm background. Review both directions at normal playback speed through:

1. neutral idle, run start/contact/stop, and facing turn;
2. dash compression, extension, brake, and recovery;
3. short jump, held jump, fall, landing crouch, and recovery;
4. palm, side-kick chamber/contact/recovery, and combo-3 windup/contact/recovery.

Keep the ground line, canvas pivot, and 15×30 body overlay visible for the diagnostic route. Check head width and eye line, shoulder/hip breadth, torso mass, elbow and knee placement, forearm/shin/boot thickness, hair, sash, and coat detail. A naturally lower head position or bent legs is acceptable. A uniformly smaller head/torso, changing limb width, material loss, foot teleport, scale pulse, or one-frame art flash fails the art-motion gate and remains B02 work.

The capture in `review-evidence/b02/iona-b02-shrink-before-after.png` compares an earlier B01D alpha-fit landing capture with the fixed-scale B02 landing capture. It demonstrates the scale rule and shared body overlay; it is not a substitute for reviewing motion or approving the art.

## Technical acceptance

- `npm test` checks all 70 B01E directional poses at 48/60/72, their bounds within the common canvas, fixed scale, origin, and ground anchor.
- `npm run qa:b02` samples the real Phaser preview during a headed Chrome play capture and checks scale, pivot, body dimensions, movement, jump arcs, dash barrier, three-hit combat events, focus pause, and production-route gating.
- Inspect [`review-evidence/b02/b02-qa-report.json`](../../review-evidence/b02/b02-qa-report.json) for Chrome version, source/video hashes, active-play duration, sample counts, scale/anchor tolerances, and limitations.
- Synthetic Gamepad API and synthetic blur checks do not count as physical controller or operating-system focus testing.

## Audio listening and capture

The game has 13 original B01E WAV cues, with movement and combat events connected to the current simulation. The automated WebM has no audio track and event logs show that playback was requested, not heard. To record a real listening pass on Windows:

1. Run `npm run dev`, open `http://127.0.0.1:5173/?ionaPreview=1`, enter the chamber, and click the canvas once to unlock audio.
2. In OBS, add Chrome as a Window Capture and enable its supported audio capture, or add an **Application Audio Capture** source for Chrome. Watch its meter while triggering steps, jump, landing, dash, each combo hit, and a miss.
3. Record 90–150 seconds of active play with a hit and a miss. Confirm the recording has both video and audio streams with `ffprobe`; a stream alone does not count as listening approval.
4. Listen on headphones at a comfortable level. Check for clean footstep alternation, distinct takeoff/landing/dash cues, whoosh before contact, impact only on hits, a separate miss sound, balanced volume, clipping, and repeated or overlapping bursts.
5. Keep local recordings in the ignored `review-evidence/b01f/.recordings/` folder unless the owner asks to publish them. Record the capture method and listening decision separately from the silent automated WebM.

See [`docs/qa/b01f-owner-audio-capture.md`](b01f-owner-audio-capture.md) for the longer OBS setup and probing notes.

## Gate status at B02 capture

- **Technical:** PASS. Headed Chrome 156 completed 100.16 seconds of capture with 98.01 estimated active-play seconds; the presentation sampler found zero scale, pivot, or body violations across 518 scene ticks. See [`review-evidence/b02/b02-qa-report.json`](../../review-evidence/b02/b02-qa-report.json).
- **Art-motion:** owner review pending; the Codex native playback bridge was unavailable, so this run does not claim normal-speed inspection.
- **Owner approval:** pending. `readyToPromote` remains false and `ownerApproval` remains `PENDING_OWNER_REVIEW`.
- **Audio:** implemented and event-routed; not heard or captured in the automated run.
