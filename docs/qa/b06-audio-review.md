# B06 Audio Review Handoff

**AUDIO HEARD: NO.** The 18 enemy cues are original deterministic procedural synthesis, saved as mono 44.1 kHz PCM16 WAVs. Technical file validation passed; this is not a claim of listening quality or owner approval.

## Local playback check

1. Run `npm run dev` and open `http://127.0.0.1:5173/?b06=1` in Chrome.
2. Enable operating-system loopback/system-audio capture in the recorder; begin capture before the first keyboard or pointer input so Chrome unlocks audio.
3. Play through one Shardrunner tell/strike/recovery, a Wisp charge/shot/block, a Bastion block and guard break, both Cantor patterns, the reward, and the exit. Also listen with VFX disabled and reduced motion.
4. Capture 1–3 minutes at normal playback speed. Listen to the recorded file after capture; verify no clipped peaks, masking of tell tones, repeated-cue fatigue, or uncomfortable impact level. Do not treat browser event logs or waveform generation as hearing.
5. Record reviewer, device/headphones, browser, date, and cue-specific notes. Keep `HEARD: NO` until an actual person has listened and records the result in the owner review.

WAV format, duration, and source/runtime hashes are checked by `npm run audio:b06:build`. The ambient loop is the pre-existing B04 file and remains unchanged.
