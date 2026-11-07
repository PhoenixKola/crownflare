# Project Crownflare — QA and Acceptance Matrix

## Three independent statuses (mandatory in every report)

| Dimension | Allowed | Source of truth |
|---|---|---|
| TECH | PASS / FAIL / BLOCKED | Actual executed commands/output, real browser interactions, reproducible builds |
| ART-MOTION | PASS / FAIL / PENDING | Real normal-speed live game image sequences and game-scale sprite/animation review |
| OWNER APPROVAL | APPROVED / CHANGES REQUESTED / PENDING | Explicit owner's words only; not Codex self-report |

Do not substitute programmatic PNG/GIF or test counts for motion review. Do not claim WebM contains audio unless verified and listened to. Audio review requires system-audio capture and owner/agent listening. A headed browser on user's desktop is strongly preferred; do not bypass restrictions on remote browser hosts.

## B00 acceptance checklist

Current results and evidence: [`docs/qa/b00-qa-evidence.md`](qa/b00-qa-evidence.md). Marked items reflect the checks actually run; unmarked items need the follow-up noted below.

- [x] Independent root and `main` Git repo; no Veyrshift code, assets, story or runtime dependencies
- [x] `package-lock.json` generated with pinned versions and `npm ci` passes on clean install
- [x] `npm run dev`, `npm run typecheck`, `npm run build`, `npm test` pass on actual sources
- [x] Original title shell shown, B00 status and placeholder art disclosure
- [x] Click Start → player in real 480×270 Phaser game canvas (not mock renderer)
- [x] A/D/arrow movement both directions and static geometry collision
- [x] Space/W/Up jump inputs; Space platform landing, coyote jump and buffered landing; variable-height cut covered by unit tests
- [x] Shift dash triggers once, respects cooldown, blocked by solid barrier
- [x] Camera follow and readable canvas bounds/aspect at 16:9; 4:3 and 21:9 tested
- [x] Escape pause/resume, pause freeze/input clearing, blur handler and no double toggles; actual hidden-tab transition remains a manual check
- [ ] Preliminary controller detected and move/jump/dash/pause/reconnect tested (manual physical controller if available)
- [x] Dev telemetry toggle verified in development; QA hook is excluded from production build
- [x] Dev-only QA hook only observes state (never cheats)
- [x] Save namespace versioned; default, corrupt and storage-permission cases verified
- [x] Actual local Chrome run with no JS console exceptions and readable gameplay
- [x] Normal-speed game clip with source digest, screenshot evidence and no audio claim
- [x] Docs/art pipeline/provenance rules and B01 visual review brief ready
- [x] Owner visual approval explicitly marked PENDING until given

The real browser check verifies a Space jump onto the first raised platform, a coyote jump after walking off its edge, a buffered jump just before floor landing, and W/Up jump aliases. Pure unit tests cover the variable-height cut. Actual tab-hidden transition and physical controller testing remain open.

## Local browser QA procedure

Run in Windows PowerShell: `npm ci; npm run qa:chrome:local`. The script starts actual Vite + Phaser in installed Chrome, checks title/start/movement/Space-W-Up jumps/platform landing/coyote/buffer/resize/dash/pause/blur/quit/re-entry and browser errors, then keeps curated screenshots/video in `review-evidence/`; raw Playwright artifacts remain ignored under `tests/evidence/`. Its blur check dispatches a window-blur event because the automation browser did not mark a second page hidden; a real tab-hidden transition remains a manual check. Supplementary `npm run qa:chrome:headless` cannot prove human feel or physical controller input. Playwright video is not audio evidence.

## B01–B13 animation acceptance record

For *each* state/form/direction: record canonical reference hash, source master and atlas IDs, exact canvas/pivot, silhouette identity, frame coherence, feet/anchors, normal-speed motion, event/hit timing, VFX and audio timing, ordinary-run integration, tested Chrome clip, actual unit/browser commands, `APPROVED/REVISE/PENDING` owner status, and smallest remaining correction. Screenshots are secondary; a clip showing ordinary movement and enemy interplay is mandatory for animation decisions.

## When evidence is inaccessible

Mark `BLOCKED`, name exact blocker and run local workflow with user authorization; do not infer from static code alone, and do not bypass execution policy. No false performance metrics or nonexistent remote URLs.
