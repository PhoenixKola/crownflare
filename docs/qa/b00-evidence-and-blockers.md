# Historical B00 starter-source snapshot — superseded 2026-11-07

This file records the starter's pre-implementation claims and is retained as history. It is **not** the current B00 result. See [`b00-qa-evidence.md`](b00-qa-evidence.md) for the tests, versions, browser evidence and status from this implementation.

## What actually exists

- The starter described a new independent folder and uncommitted Git repository. In the inspected workspace, `.git` was only a partial metadata stub and Git could not read it. The master handoff remained intact under `docs/`.
- Code for intentional HTML/CSS title, Phaser 4 test chamber with platforms and B00 rectangle, keyboard/controller foundation, movement physics intent, pause, HUD/debug telemetry, deterministic action clock, versioned independent local save, QA automation script. This code **has not yet rendered successfully** because required Phaser/Vite/npm modules are unavailable in this creation container.
- One original provisional **concept board** `art-source/characters/iona/b00-provisional-visual-target-board.png` with SHA256 manifest; **not runtime sprites, not at tested logical gameplay scale, not owner-approved**.
- Full operational docs and B00 Codex implementation prompt delivered externally.

## Independent executed checks

| Check | Result | Interpretation |
|---|---|---|
| `node --version` | Historical report — 22.16.0 | Not the runtime in the current verification; see current QA evidence |
| `npm --version` | Historical report — 10.9.2 | Not the npm version in the current verification; see current QA evidence |
| `npm view phaser@4.2.1 version` | **BLOCKED: EAI_AGAIN** | Host cannot resolve registry.npmjs.org; web source independently identified 4.2.1 as stable, **not installed** |
| `npm test` | **PASS 14 / 14** | Actual deterministic Node unit tests only (movement, combat clock, save); does NOT prove Phaser renderer/collision |
| `npm run audit:assets` | **PASS** | Hash/size inventory for 4 files, 0 size-budget violations; no production art |
| `npm ci --offline --ignore-scripts --no-audit` | **EXIT 1, BLOCKED** | EUSAGE: no genuine `package-lock.json`, do not fabricate one |
| `npm run typecheck` | **EXIT 2, BLOCKED** | TS2688: `vite/client` unavailable (deps not installed) |
| `npm run build` | **EXIT 2, BLOCKED** | TS2688: `vite/client` unavailable (deps not installed) |
| `npm run dev` | **BLOCKED** | Vite module not installed |
| `npm run qa:chrome:local` | **EXIT 1, BLOCKED** | ERR_MODULE_NOT_FOUND: `playwright` unavailable; no actual game video |
| Physical gamepad/browser/audio | **NOT RUN** | No successful real game session, no controller or original audio review |

The starter says raw output was copied to `docs/qa/independent-logs/`, but that directory was not present in the inspected workspace. No separate raw-log bundle is included or claimed.

## Historical quality dimensions

- **TECH: BLOCKED** — independent pure-unit results pass, real Phaser/Vite integration not run.
- **ART-MOTION: PENDING** — generated provisional concept board does not show runtime sprites/animation.
- **OWNER APPROVAL: PENDING** — none requested/claimed as obtained.

## Historical next step

The original request was to install dependencies, verify the Phaser API/source, and run the actual local Chrome workflow. Those steps were completed as recorded in `b00-qa-evidence.md`; actual tab-hidden behavior and physical controller input remain unverified, and art approval is still pending.
