# B00 QA evidence and status matrix

**Run date:** 2026-11-07 (local Windows host)  
**Source root:** `E:\Programming\Projects\0. Extra\project-crownflare`  
**Initial Git state:** `.git` was a partial metadata stub: `config`, `HEAD`, hooks and info only, without object/ref databases. Git reported `fatal: not a git repository` for status, branch and HEAD queries. There was no valid baseline commit, remote or trackable dirty-file list. Source files were inspected and preserved before initializing a clean repository.

## Reproduction environment

| Item | Verified value |
|---|---|
| Node.js | `v22.22.0` |
| npm | `11.11.0` |
| Phaser | `4.2.1` |
| Vite | `7.3.7` |
| TypeScript | `5.9.3` |
| Playwright | `1.55.1` |
| Headed browser | Installed Chrome `156.0.8078.80` |

`npm install` generated the real registry-backed lockfile. The initially declared Vite `7.1.5` produced a high-severity npm audit finding; Vite was updated to exact `7.3.7`. A clean `npm ci` from the final lockfile installed 19 packages and reported zero vulnerabilities.

## Command results

| Command | Exit | Result |
|---|---:|---|
| `node --version` | 0 | `v22.22.0` |
| `npm --version` | 0 | `11.11.0` |
| `npm install` | 0 | Generated `package-lock.json` from registry; initial Vite audit finding was then corrected. |
| `npm ci` | 0 | Clean final install; 19 packages added, zero vulnerabilities. |
| `npm run typecheck` | 0 | Strict TypeScript passed. |
| `npm test` | 0 | 17 tests passed, 0 failed. |
| `npm run build` | 0 | Vite production build passed. Non-fatal Phaser bundle warning: 1,396.99 kB minified / 375.57 kB gzip exceeds Vite's 500 kB warning threshold. |
| `npm run audit:assets` | 0 | 4 files / 2,037,045 bytes; 0 files over the 10 MiB per-file budget. |
| `npm audit` | 0 | 0 vulnerabilities. |
| `npm run qa:chrome:local` | 0 | Headed installed Chrome smoke passed; details below. |
| `npm run qa:chrome:headless` | 0 | Supplemental installed-Chrome headless smoke passed. |
| `npm run dev` | Started; stopped with Ctrl+C | Vite 7.3.7 ready in 546 ms at `http://127.0.0.1:4173/`. |
| `Invoke-WebRequest http://127.0.0.1:4173` | 0 | HTTP 200; returned title and start button present. |

## Real browser interaction coverage

The headed command runs the actual Vite + Phaser application in installed Chrome at a 480×270 logical resolution. It passed:

- Title screen, Enter, clean return to title and re-entry.
- Left/right movement and facing; Space jump onto the first raised platform; platform-edge coyote jump; a buffered jump just before floor landing; W and Up jump aliases.
- Responsive canvas bounds and 16:9 game aspect inside 1024×768 and 1680×720 windows.
- Camera follow through the chamber.
- Dash activation against the solid vertical test barrier without crossing it.
- Pause freeze while airborne, keyboard input clearing across resume, and re-entry after quitting.
- No browser console errors or uncaught page exceptions.

**Blur limitation:** the smoke dispatched a `blur` event on the real Chrome page and verified pause/resume. Playwright's second page did not cause the first document to become hidden (`document.hidden` stayed false), so an actual user tab-switch/OS focus-loss transition was not independently observed in automation. The app listens for both `window.blur` and `document.visibilitychange`; verify a real tab switch manually when convenient. No remote-debugging or browser-policy bypass was used.

**Input/audio limitations:** no physical controller test is claimed. B00 has no original game audio; Playwright footage is video-only and was not used as audio evidence.

## Curated headed evidence

- [archived locally: `b00-title.png`](review-evidence-archive.md#root-files) — 428,356 bytes; SHA-256 `80f70bd70924e2d9a6b209db63d21bb06b63c33055f027bd2e78c904fa3ad632`.
- [archived locally: `b00-chamber.png`](review-evidence-archive.md#root-files) — 46,288 bytes; SHA-256 `b5cc2f811e837cb932183a84f581ea28429678f6f908be60b348193e846f2850`.
- [archived locally: `b00-gameplay.webm`](review-evidence-archive.md#root-files) — normal-speed headed browser capture, 1,256,848 bytes; SHA-256 `50f3f798899e55e6d83dc7e9a784c23e180f5cce17fb5ce941831fc171c51be6`.
- [archived locally: `b00-qa.md`](review-evidence-archive.md#root-files) — installed Chrome version, scenario summary, clip hash and aggregate source SHA-256 `9c515668627edf1ead459be29be9ca03619a33f66c48aa2f38f8a2cdb0ce0810`.

## B00 status

| Dimension | Status | Evidence / remaining limit |
|---|---|---|
| TECH | **PASS** | Clean install, strict typecheck, 17 tests, production build, asset audit, zero npm vulnerabilities, headed and headless Chrome; manual Vite HTTP check. Actual tab visibility transition and physical controller were not exercised. |
| ART-MOTION | **PENDING** | B00 only has programmer geometry. One concept board exists; it is not a pixel sprite, true-scale form study or animation. |
| OWNER APPROVAL | **PENDING** | No art or experience approval has been requested or implied. See [`b01-handoff.md`](b01-handoff.md). |

## Remaining technical notes

- The build's Phaser chunk warning is informational and the build exits successfully; 375.57 kB gzip is the measured bundle size for the current B00 foundation.
- The B00 board remains a candidate with its original provenance and SHA-256 in `art-source/manifests/iona-b00-visual-target-board.json`.
- No B01–B13 work has been started.
