# Authorized local Chrome QA, recording and review

On owner's Windows PowerShell with Node >=22.12, local Chrome and a generated genuine `package-lock.json`:

```powershell
cd project-crownflare
npm ci
npm run qa:chrome:local
```

This command launches actual Vite + Phaser with headed installed Chrome where available, performs keyboard interactions, checks a dev-only read-only state snapshot, and records one normal-speed curated clip plus screenshots and a source digest in `review-evidence/`. Raw Playwright artifacts in `tests/evidence/` stay ignored. If you want a physical-controller feel assessment, keep game running with `npm run dev`, connect your controller and manually play all actions. Record controller hardware and connection status; never call a virtual gamepad an actual physical test.

**System sound:** Playwright footage is not audio evidence. When game audio exists in later phases, use OBS Studio Display/Window Capture plus desktop audio or Windows Game Bar capture with audio enabled. Listen to the clip on speakers/headphones and review for mix balance, WebAudio unlock, no clipping, impact timing and distinct forms. Do not claim audio checked in B00 (no original game audio exists).

If a remote/agent host cannot launch Chrome because of browser policy, label QA BLOCKED and use the owner's authorized local Chrome. Do not use unsupported bypass flags; screenshots, headless sweeps and standalone GIFs do not satisfy human gamefeel/animation gates.
