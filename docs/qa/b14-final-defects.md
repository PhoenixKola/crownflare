# B14 final candidate defect and gap register

This register separates observed software defects from unmet release goals and human review work.

| Priority | Item | Finding | State |
| --- | --- | --- | --- |
| P0, fixed | Startup blocked on boss assets | The B10 boss-art preload delayed playable scene activation. Boss assets now load asynchronously after the route scene starts. Headed full-route run reached every boss and cleared the route. | Fixed and route-verified |
| P1, release gate | Typical first run is too short | Agent-driven full completion took 3:11 active / 3:33 wall, below the brief's 30–45 minute target. | Open; needs pacing/content work and human timing |
| P1, release gate | Replayability not measured | Route seeds and builds vary, but 2–4 hours of meaningful replay has not been established through repeated human runs. | Open |
| P1, review gate | Visual/game-feel approval absent | Generated title/victory art upgrades the menu/results; generated art, existing motion, collisions and combat feel have not received owner signoff. | Open |
| P1, review gate | Audio not heard | Assets or playback calls cannot prove listening quality. No audio-capable human review was performed. | Open |
| P1, review gate | Physical gamepad not tested | Synthetic Gamepad API checks are not evidence from a physical controller. | Open |
| P1, release gate | Public name clearance absent | Project documents still identify Crownflare as a working name pending clearance. | Open |
| P2, platform | Electron runtime absent | No Electron app, dependency or package/build configuration exists. A generated multi-size `.ico` is staged for a later wrapper but cannot be wired or runtime-verified here. | Open when an Electron target exists |
| P2, advisory | Large JavaScript bundle | Vite reports a chunk larger than its default 500 kB advisory. The bundle builds and the completed route passed; the advisory is not a failed test. | Documented; review before further scope growth |

## Browser failures and limits

- The selected safe-recovery/spindle-lift 11-room route cleared all three bosses, recorded victory, closed the active checkpoint and returned to the Refuge.
- A mid-run browser reload resumed the same run ID, seed, room and health.
- The separate conduit-challenge flow saved and resumed the same alternate-branch run, recorded defeat, and started a distinct retry run.
- One earlier driver attempt failed during the opening encounter after 33 seconds. It is retained as a driver-failure observation and does not substitute for the successful clear or a human usability test.
- The final run covers the selected branch pair only. Alternate-branch victory balance and repeated-run variety are not proven.
