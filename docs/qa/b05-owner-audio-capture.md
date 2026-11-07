# B05 Dawnrush owner audio capture

The automated Playwright WebM is video-only and is not evidence that the audio was heard. The generated B05 WAV files are audited for manifest hash, mono PCM format, sample rate, bit depth, duration and peak range; an owner listening pass is still required.

## Capture on Windows

1. From the project root run `npm run dev`, then open `http://127.0.0.1:5173/?b05=1` in Chrome. Enter the preview and click the game once so the browser can unlock Web Audio.
2. Open OBS. Add Chrome with **Window Capture**; add **Application Audio Capture** for Chrome if supported, or configure **Desktop Audio** for the active playback device. Confirm the OBS audio meter moves when a cue plays.
3. Record about 90 seconds of active play. Include run/dash, all three light contacts, heavy, aerial, Solar Drive, Dawnfall Breaker, transformed hurt and both transformation directions. Include at least one miss to compare its silence against a real hit.
4. Listen to the recording on headphones or speakers. Review for clipping, relative loudness, repetitive fatigue, transient harshness, clear action identity and alignment to contact. Record the listening decision separately from the automated game event log.
5. Check the recording streams with `ffprobe -v error -show_entries stream=codec_type,codec_name -of json <capture-file>`. Keep large local audio/video recordings outside tracked Git unless the owner requests otherwise.

The compact Playwright WebM and its report live in `review-evidence/b05-completion/`; it has no audio track. Current listening status remains **NOT HEARD** until the owner completes this pass.
