# B04 playable preview and review status

## Launch

Run `npm run dev`, then open `http://127.0.0.1:5173/?b04=1`. The route is development-only. It starts at the title screen; select **ENTER THE SUNDERGLASS ATRIUM**.

## Controls

- `A` / `D`: move. `Space`: jump. `Shift`: dodge.
- `J`: light combo. `K`: heavy launcher. `Q`: Resonance.
- `E`: claim the shard or enter the open gate. `Esc`: pause.
- Standard controller input uses the existing controller mapping. South confirms contextual actions; Start pauses.

The run has two sentry encounters. Clear the first, walk to the shard near the left side and press `E`, clear the second, then walk to the far gate and press `E`. The shard restores up to two health and wakes the second sentry. Victory and defeat both offer replay or return to title.

Each sentry remains dormant during the long traverse and wakes when Iona comes within 60 world pixels. Once awake, its telegraph and lunge timing matches the B03 combat clock. The windup cue attaches to its chest; a generated three-frame thrust streak appears only during the actual lunge window.

## Evidence and gates

`review-evidence/b04/qa-report.json` is the headed Chrome interaction report. `b04-playable-chrome.webm` is a real-time 1–3 minute browser capture. The viewport screenshots cover entry at 1280×720, small landscape and portrait viewports, 16:10 and ultrawide. PNG masters and crop sources are under `art-source/environments/b04/generation/`; deterministic runtime exports are under `public/assets/environments/b04/`.

- **TECH:** automated route, interaction, asset-load, viewport and regression gates are recorded in the QA report.
- **ART-MOTION:** generated candidate environment art and hit effects are integrated. The candidate still needs owner review and a normal-speed human review of the video.
- **OWNER APPROVAL:** pending. B04 is not accepted as final art.
- **Audio:** the WAV ambience and interaction cues are authored and the event feed is captured. Agent playback/listening was unavailable, so audio remains **NOT HEARD** and needs owner listening approval.
- **Controller:** keyboard and the existing standard gamepad path are wired. A physical controller was **NOT TESTED** for this slice.

The `qa:b04` script uses headed Chrome, captures runtime diagnostics and does not write over B00–B03 evidence.
