# Crownflare private Windows v1.0.0 candidate

**Status:** Private x64 Windows candidate. This is not a public release, signed build, name-clearance decision, or owner approval of the final executable. The owner accepts the compact game scope. The earlier automated browser route measured 3:11; this packaging run did not replay the full route.

## Artifact

- Archive: `release-artifacts/Crownflare-v1.0.0-windows-x64.zip`
- Version: `1.0.0`
- Platform: Windows x64
- Electron: `45.3.1`
- electron-builder: `26.18.0`
- ZIP size: `174,061,793` bytes
- Executable size: `250,177,536` bytes
- SHA-256: `9F6691B6C33B46A72BEC921E564FF1F8470B284F594BAFBF7FD3E396851B35A3`
- Build date: `2026-11-12`
- Build host: Windows 11 x64, Node.js `22.22.0`
- Source baseline before packaging changes: `3b8478bb9ff08f1125dba92359c88b5a28c73e53`
- Packaging source commit: `8944f5f5dcfdedbb3e971943ddbc55127116f93b` (documentation-only report commit follows)

The archive contains the self-contained `Crownflare.exe`, packaged `app.asar`, Electron/Chromium support files, `README-WINDOWS.txt`, the application icon, and the Silkscreen OFL notice. It contains no raw `dist/`, `node_modules/`, `.git/`, or development evidence. `Get-AuthenticodeSignature` reports **NotSigned**.

## Verification

All desktop tests below used the executable extracted into a separate folder, not Vite preview or the development Electron target.

Ignored screenshots and machine-readable smoke results are retained in `release-artifacts/qa/windows-20261112/`.

| Check | Result | Evidence |
| --- | --- | --- |
| Extracted `Crownflare.exe` launch | PASS | Opened fullscreen at 1920×1080 and reached the title. |
| Offline/local assets | PASS | Network was disabled for the renderer; title, Refuge, story, and run loaded. Zero external requests, failed resources, or renderer errors. |
| Refuge and settings | PASS | Entered the Refuge and saved display scaling and reduced-motion options. |
| Active game | PASS | Started a new run; keyboard movement moved Iona; light attack input was delivered; Dawnrush reached its transformed HUD and visual state. |
| Pause/settings | PASS | Opened pause and controller settings from a packaged run. |
| Persistence | PASS | Closed the window, relaunched the extracted executable, found the saved settings and Continue checkpoint, and continued into the active game. |
| Full-route victory, room transition, defeat/results | NOT RUN | The browser route baseline is documented in B14; this candidate smoke run stopped after launch, combat inputs, and Continue. |
| F11 window toggle / arbitrary resize | NOT VERIFIED | Initial fullscreen size was verified. The CDP-based keyboard driver did not exercise Electron's native F11 handling. The handler is configured in `electron/main.mjs`. |
| Physical controller / human audio listening | NOT TESTED | No physical gamepad or human listening pass was performed. |

## Build and repository checks

- `npm run typecheck` — PASS
- `npm test` — PASS, 118 tests
- `npm run build` — PASS (Vite reports the existing large JavaScript chunk advisory)
- `npm run audit:assets` — PASS, 958 files, no individual budget violations
- `npm run audit:repo` — PASS
- `npm audit --audit-level=high` — PASS; the report contains six **moderate** transitive `minimatch` advisories in Electron Builder's dependency tree and no high-severity finding.
- ZIP manifest — PASS, 78 entries; required executable, app archive, icon and notices present.

## Remaining owner/public-release decisions

The build is unsigned and may display SmartScreen. The owner still needs to review the exact executable, art and game feel, hear the audio, and test a physical controller. Public name clearance and code-signing/distribution choices remain open. Browser-origin saves are separate from the desktop `Crownflare` save partition; the desktop build does not import Chrome data. Desktop saves/settings use `%APPDATA%\Crownflare\` and persist across launches.

## Launch

1. Extract the full ZIP.
2. Open the extracted folder and double-click `Crownflare.exe`.
