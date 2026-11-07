# B01F playable Iona preview

This is a local **development-only** preview. It uses B01E's image-generated Base Iona in the existing 480×270 Phaser chamber. It does not promote art into ordinary gameplay and does not choose a canonical identity or scale.

## Start

```powershell
npm ci
npm run dev
```

Open `http://127.0.0.1:5173/?ionaPreview=1`, click **Enter the Spindle**, then click the game once to unlock audio. The preview is guarded by both the Vite development flag and the explicit query parameter; production builds ignore the route.

## Play

- `A/D` or arrow keys: move; `Space`, `W`, or Up: jump; `Shift`: dash; `J` or left-click: buffered three-hit combo.
- `R`: reset Iona, the moving practice target, its three health points and combat state. `Escape`: pause/resume. Window blur and a hidden tab also pause.
- Use the visible `48 / 60 / 72` buttons to compare the working sprite scale. They do not change the 15×30 physics body.
- The audio controls select and audition each original B01E WAV, mute/unmute, and adjust volume. Click the game once if the browser reports audio locked.
- Gamepad movement, jump, dash and Start/pause use the existing mapping. Physical hardware was not available for this QA pass.

## Two-minute review script

1. Run right, stop and reverse left; watch the run-contact poses and listen for alternating footfalls.
2. Try a short jump and a held jump, land, and dash into the marked solid barrier.
3. Stay just left of the practice target and press `J`, then buffer two further `J` presses during startup/recovery. Confirm palm → side kick → forearm and target health response.
4. Run past the target, face away and press `J` to check that a miss keeps target health and uses the separate miss cue.
5. Use the audio selector to audition all cues one at a time. Then use 48/60/72 and repeat the run and kick in both facings.
6. Pause, resume, quit to title, enter again, and use `R` to restore the preview.

## Evidence in this folder

- `b01f-gameplay-preview.webm`: real headed Chrome gameplay capture. The QA report separates wall-clock action time from estimated video time and marks a 20–40-second calm-background, VFX-off, 60 px section. The agent has not reviewed the clip at normal playback speed. The clip has no audio track.
- `iona-base-owner-compare.png`: crops captured from the real running preview at 48/60/72, both facings, with idle, run, jump, dash and side-kick states.
- `b01f-qa-report.json`: source hash, Chrome build, mapped action timestamps, wall-clock and estimated video intervals, ffprobe streams and frame rate, audio events, errors and limitations.
- `owner-decision-card.md`: four owner decisions, with no preselected answer.
- `../b01d/iona-b01d-four-form-silhouette-references.png`: earlier four-form silhouette board. No form is locked.

## Status

The existing B01E image and audio sources remain provisional. Automated motion and audio-event checks do not replace normal-speed owner viewing or listening. See [`docs/qa/b01f-quality-matrix.md`](../../docs/qa/b01f-quality-matrix.md) and [`docs/qa/b01f-owner-audio-capture.md`](../../docs/qa/b01f-owner-audio-capture.md).
