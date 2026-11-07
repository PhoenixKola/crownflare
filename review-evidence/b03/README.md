# B03 review bundle

Open `http://127.0.0.1:5173/?b03=1` from the Vite dev server to play the actual Phaser encounter. The `b03=1` flag is development-only. The player starts with 5 HP against one 8 HP Fractured Spindle Sentry. Controls are shown along the upper edge and switch between keyboard and controller prompts when a standard controller is active. `R` resets, `E` retries after KO, `Esc`/Start pauses, `C` cycles background contrast, and `V` toggles VFX. OS reduced-motion preference suppresses VFX and camera shake.

`qa-report.json` records the headed Chrome run and includes check results, actions, source-tree digest, route/build details, and the SHA-256 of the playable capture. The 125.6-second `b03-playable-chrome.webm` is 1280Ã—720 VP8 at 25fps and **has no audio track**. It is gameplay evidence only; it is not an audio review. `b03-browser-events.json` records move/contact/damage/audio events. `art-coverage.json` ties native image-generation source hashes to each runtime PNG and states which poses the browser run exercised. Every B03 sheet and runtime action remains unapproved.

Screenshots are actual Phaser canvas captures: title, settings/live controller test, combat entry, combo 1 and 3 contacts, low-kick and hurt pose crops, heavy windup/contact, air contact, Resonance with the generated wave, VFX-off/busy background, enemy telegraph, left-facing action, pause/settings, and the same-scale `b03-anatomy-comparison.png` board. Transparent-source assets and fixed canvas/pivot details are in `art-coverage.json` and `../../art-source/manifests/iona-b03-candidate-v1.json`.

## Checks

- `npm run qa:b03` â€” production build, B03 source/runtime hash and PNG/alpha audit, actual headed Chrome gameplay and settings, synthetic controller, production-route guard, reduced-motion behavior, 90–180-second capture.
- `npm test` â€” 56 unit tests including combat timing/geometry and controller configuration.
- `npm run qa:art:portable` â€” existing B01D/E portable-art regressions.
- `npm run audit:assets` â€” repository asset budget.

Physical Xbox/PlayStation play and subjective audio listening are still pending. The 13 original B01E WAV cues remain integrated, with procedural B03 launcher charge/impact, aerial swing, Resonance charge/release, sentry telegraph, hurt, dodge, and KO accents. To capture audio for review on Windows, open **OBS Studio**, add a Window Capture or Game Capture source for the Chrome window/game, and enable **Capture Audio** where the source offers it. Alternatively add **Application Audio Capture**, choose the Chrome window, and record. The OBS guide says to disable global Desktop Audio when using a per-application source to avoid echo; check the Audio Mixer meters before recording. The official instructions are in the [OBS Application Audio Capture Guide](https://obsproject.com/kb/application-audio-capture-guide). Record 30â€“60 seconds containing movement, a hit, a miss, the sentry tell, a Resonance special, pause, and settings; listen to the exported file before making an audio approval decision.

Use [b03-owner-decision-card.md](../../docs/qa/b03-owner-decision-card.md) and [b03-controller-checklist.md](../../docs/qa/b03-controller-checklist.md) to record owner feedback. No art, audio, or controller gate is owner-approved by this bundle.
