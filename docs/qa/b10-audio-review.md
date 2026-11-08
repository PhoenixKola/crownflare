# B10 Audio Review Handoff

**Audio implementation:** present in the runtime. **System audio captured:** no. **Audio actually heard:** no. **Status:** `AUDIO NOT HEARD / CAPTURE BLOCKED`. No owner audio approval is recorded.

The new Spindle Refuge ambience is `public/assets/audio/b10/spindle-refuge-ambience.wav`. Existing Base/Dawnrush, B06 enemy and B08 boss cues are included in the local audition reel. The WAV builders and asset audits establish files, formats and hashes; they do not establish that the sound mix is pleasant, audible, unclipped or balanced in play.

## Local isolated cue reel

After `npm ci`, run:

```powershell
python tools/audio/build-b10-review-cue-reel.py
```

This writes an ignored `review-evidence/b10/b10-audio-cue-reel.wav` and JSON timing/hash manifest. The reel is mono PCM16 at 44.1 kHz, isolates cues with 450 ms of silence, resamples to a common rate, and does not normalize or layer cues. It contains the Refuge ambience, Base/Dawnrush attacks and transformation, all five B06 enemy archetype cues, and tell/phase cues for all three B08 bosses. Play it in a local media player and compare with actual game playback; the reel by itself does not verify browser unlock, relative in-game levels, or simultaneous cue overload.

## Reproducible owner listening check

1. Run `npm run dev` and open `http://127.0.0.1:5173/` in Chrome. Start in the Spindle Refuge, then start a normal expedition. Also run `/?b06=1` and `/?b08=1` for the development-only roster and boss checks.
2. On Windows, use an available **permitted** loopback method (for example OBS Application Audio Capture if installed and configured). Start capture before the first click/key press, so browser audio has been unlocked. Do not install a capture driver solely for this review or bypass OS permissions.
3. Capture the Refuge, Base light/heavy attacks, Dawnrush transform/Solar Drive/finisher, one tell and hit from each enemy archetype, all three boss tell/phase/strike cues, pause/resume, focus loss/return, mute and master-volume changes. Compare each boss cue against its gameplay tell and recovery, not just the isolated reel.
4. Probe the captured media and confirm it has an audio stream. Listen to the recording at normal speed. Record reviewer, date, output device/headphones, browser, and notes for clipping, masking, volume balance, timing, repetition fatigue and mute/focus behavior.
5. Update this handoff only after actual listening. Keep `AUDIO NOT HEARD / CAPTURE BLOCKED` until a person confirms hearing the captured material; keep owner approval as a separate decision.

## Capture blocker encountered for B10

The prescribed computer-use session could not connect to the Windows native pipe: `Computer Use native pipe is unavailable: failed to connect native pipe: The system cannot find the file specified. (os error 2)`. It failed on two initialization attempts. Installed FFmpeg exposes DirectShow microphone inputs but no loopback/stereo-mix input. The existing B06 and B08 browser WebM files probe as video-only; none is being presented as sound evidence. Therefore this session could not perform the required live playback/listening or produce an audio-bearing gameplay recording.
