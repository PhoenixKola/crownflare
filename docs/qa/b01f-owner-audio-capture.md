# B01F owner audio capture and listening

The development preview uses the 13 original B01E WAV cues. Playwright's gameplay WebM is silent; the browser event log confirms that Phaser accepted playback calls, not that a person heard them. This guide is for a real local listening and capture pass.

## Capture the live preview

1. Start `npm run dev` and open `http://127.0.0.1:5173/?ionaPreview=1`. Click **Enter the Spindle**, then click the game canvas once to unlock browser audio.
2. Install or open OBS Studio only if you choose to record. Add a **Window Capture** source for the Chrome preview. On OBS 30.1 or newer, enable **Capture Audio (BETA)** on that source; alternatively, on supported Windows 10 (version 2004+) or Windows 11 systems, add an **Application Audio Capture (BETA)** source for Chrome. OBS documents these options in its [Application Audio Capture guide](https://obsproject.com/kb/application-audio-capture-guide/).
3. Check OBS's Audio Mixer while you trigger a footstep, jump, dash, palm, kick, forearm, hit, and miss. The Chrome/application meter must move. If using a global Desktop Audio device, confirm the selected device in **Settings → Audio**. OBS's [Quick Start Guide](https://obsproject.com/kb/quick-start-guide/) describes the source dock, mixer and recording controls.
4. Record 90–150 seconds while Iona is in active gameplay for nearly the whole clip. Include a hit and a miss, and leave a short pause between the individual cue audition button presses. Do not mix separate WAV files over silent gameplay.
5. Stop recording and probe the resulting file:

   ```powershell
   ffprobe -v error -show_entries format=duration -show_entries stream=codec_type,codec_name,r_frame_rate,avg_frame_rate -of json "C:\path\to\iona-preview.mkv"
   ```

   Confirm a video stream, an audio stream, a 90–150 second duration, and a recorded frame rate. If there is no audio stream, correct OBS routing and record again. A stream proves capture only; the owner must still listen and decide whether the mix is suitable.

Save any owner recording under `review-evidence/b01f/.recordings/` (ignored by Git) unless the owner explicitly asks to publish it. Add the path, probe output, and listening decision to the review package without replacing the automated silent WebM.

## Available preview controls

The visible preview panel selects one of the 13 real WAV files, plays one cue, mutes/unmutes the mix, and adjusts master volume. The game also cues footfalls, jump, landing, dash, combo whoosh and contact/miss from the real simulation events. `Escape`, window blur and hidden-tab pauses stop active sounds.
