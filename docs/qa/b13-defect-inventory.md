# B13 Working Defect Inventory

Baseline: clean `main` at `6a5336cef020cd390f8d170ee89db2230003a156` (B12).

| Priority | Finding | State / current evidence |
| --- | --- | --- |
| P0 | B12 representative Chrome attempt timed out before the normal B10 route became active. Scene preload queued the full three-boss art/effect/audio set before gameplay. | **Fixed for route entry.** B10 now begins the room with 8/8 expected textures and streams boss assets after create; boss entry waits for its minimum assets. B13 headed normal-entry check: New Run 1.345 s, Continue 1.485 s, no errors or failed requests. Production check is recorded separately. |
| P1 | B12 seeded route selected one of three authored rooms in each region (9 rooms total); estimates were far below the 30-45 minute target. | **Improved, target remains unmet/unverified.** Each route now visits two distinct seeded templates per region (11 rooms, at least 120 of 144 route/order combinations exercised by unit test). No human-speed full-run timing was recorded. |
| P1 | B11 used fractional FIT scaling at 1280x720 and lacked a persisted integer mode. | **Fixed and browser checked.** Pixel Perfect uses integer zoom at 1280x720 (2x), 1920x1080 (4x), and 1366x768 (2x); 352x266 uses a 0.733x compact fallback. Fit mode at 1280x720 is 2.667x. |
| P1 | B12 had one grounded-feet sample, not the requested wall/ceiling/lift/hazard/knockback audit; B08 boss actions include distinct static pose frames. | **Open.** B13 automated traversal crossed two jumps, but it did not visually inspect collision edges, moving lifts, or normal-speed character/boss motion. Owner visual review remains required. |
| P1 | Full human route duration, real audio listening and physical-controller play are unverified. | **Open.** Automated no-pad and synthetic Gamepad API movement passed. Physical hardware was not available to this check. Audio is `HEARD: NO / BLOCKED`; no auditory approval is implied. |
| P2 | Combat/elite rewards did not consistently offer a build choice. | **Improved.** Claimed combat/elite route-room rewards now generate deterministic B09 choices. Route and save unit tests pass. |
| P2 | No B13 release guide or acceptance record existed. | **Added.** README includes dev/production run steps; `docs/qa/b13-release-acceptance.md` records the current gate matrix. No public release or tag is authorized. |
