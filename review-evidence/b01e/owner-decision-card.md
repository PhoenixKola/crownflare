# Iona Base B01E — owner review

**Recommendation: REVIEW B01E.** This is an opt-in candidate. The normal game still uses its original prototype actor, and the promotion gate remains off. No canonical art, scale, or sound decision has been made.

## Try it

Run `npm run dev`, then open `http://127.0.0.1:5173/?animationLab=1&b01e=1`. Click the game or press a key to unlock browser audio.

- `A` / `D` move; `Space` jumps; `Shift` dashes; `J` performs the buffered combo.
- `T` cycles B01C → B01D → B01E without resetting movement or combat state.
- `1` / `2` / `3` compare 48 / 60 / 72 display sizes. `V` toggles VFX, off by default. `C` cycles backgrounds; `R` opens the comparison board.
- `M` mutes; `[` / `]` adjust volume; `Escape` pauses. Pause, focus loss, and leaving the lab stop playing sounds.

## What changed

Two independent native `image_gen.imagegen` calls produced left- and right-facing four-pose side-kick studies. Eight poses are used at runtime: guard, chamber, kick contact, and recovery in each facing. The added chamber pose gives combo 2 a two-frame 110 ms windup; its existing simulation contact stays at 138 ms inside the same 370 ms action. Six other side-kick frames are replaced. The other 62 E textures are byte-identical to B01D.

The two original sheet IDs and SHA-256 values are recorded in [generation provenance](../../art-source/characters/iona/b01e/generation-provenance.json); the full 70-frame mapping and every runtime hash are in [the B01E manifest](../../art-source/manifests/iona-b01e-candidate-v1.json). Thirteen original 24 kHz WAV cues cover alternating footsteps, jump, landing, dash start/brake, three action whooshes and impacts, and a separate miss sound. They are authored by [this reproducible synthesis script](../../tools/audio/generate-iona-b01e-sfx.py) with no external samples.

## Evidence and limits

- [73.92-second real-time Chrome clip](iona-b01e-review-75s.webm) and [QA report](qa-report.json). Playwright’s WebM has no audio track.
- [In-engine B01C/D/E contact comparison](iona-b01e-review-panel.png), [B01E contact screenshot](iona-b01e-sidekick-contact.png), and [four-pose source export](iona-b01e-sidekick-poses.png).
- Chrome QA observed both run facings, jump/land, dash against the barrier, preserved 15×30 body, B01C/D/E switching at fixed scale, miss without damage, hit sounds, side-kick contact at 138 ms, pause, mute, volume, and no audio after leaving the lab.
- Codex could not play the clip or listen: the native/browser CUA bridge was unavailable. Desktop capture was also unavailable: this FFmpeg build lacks WASAPI loopback and DirectShow exposed microphone/camera inputs only. **ART-MOTION normal-speed review: pending. Audio heard: no. Owner approval: pending.** Please watch the clip and listen in the route before deciding.

Remaining owner decisions: canonical identity and 60 px scale; kick proportion and left/right consistency during motion; sound direction and mix. The B01D starting inventory remains 8 generated run poses + 60 unchanged frames. The LF/CRLF manifest repair is verified by the portable QA command.

Measured repository tree: HEAD before this batch was 67,732,768 bytes across 554 tracked files; this worktree is 76,350,871 bytes across 676 tracked and new non-ignored files (+8,618,103 bytes). The B01E video is 5,187,121 bytes. No historical source or evidence was removed.
