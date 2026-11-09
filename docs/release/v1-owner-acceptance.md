# Crownflare v1 owner review

**Candidate status: conditional technical RC. Public release is not approved.** Check each item only after direct review. Automated browser evidence, screenshots and silent video do not count as owner approval or audio listening.

## Review the updated presentation

1. Run `npm ci`, `npm run dev`, and open the local Vite URL in Chrome.
2. Review the generated title art, animated Iona and Crownflare favicon in the browser tab. At a compact viewport, confirm the title and both actions remain visible.
3. Choose **Enter the Refuge**, inspect Refuge and the illustrated “The day broke twice” departure story, then open **Controls / Accessibility** and review the generated controller art, keyboard navigation, remaps, display scaling, reduced motion and sound settings.
4. Start a new run, inspect movement, jumps, combat, discoveries, upgrades, branches, region transition, all bosses, victory results and return to Refuge.
5. Trigger or review the defeat/retry flow and verify that Continue restores the same run while retry starts a fresh seed.

The generated title/victory originals, exact prompts and source hashes are in `art-source/ui/b14/`. Browser evidence and a video-only full-route recording are in the separate owner packet described in [B14 acceptance](../qa/b14-final-acceptance.md). The WebM has no audio track.

## Decisions

- [ ] Approve the title background, typographic layout and animated Iona overlay.
- [ ] Approve the departure story illustration and dialog readability.
- [ ] Approve the controller settings art and compact row/scrollbar layout.
- [ ] Approve the generated Crownflare icon at favicon sizes and the browser metadata.
- [ ] Approve the victory art and results-panel readability.
- [ ] Confirm the Dawnrush bar pulse is noticeable but not distracting; test reduced motion.
- [ ] Review Base and Dawnrush animation, both facings, hit states, VFX, reduced motion and combat at normal speed.
- [ ] Review collision/game feel around platforms, gaps, lifts, hazards, knockback and boss arenas.
- [ ] Test a physical gamepad, including remapping and disconnect/reconnect.
- [ ] Listen to gameplay audio and Refuge ambience on the intended output device; note mix/repetition issues: ____________________
- [ ] Play a complete run and record duration: __________. Compare with 30–45 minute target.
- [ ] Play repeated runs and assess meaningful 2–4 hour variety: ____________________
- [ ] Confirm public project name has been cleared: ____________________
- [ ] Release decision: [ ] approve candidate  [ ] request changes: ____________________

Electron note: this repository does not contain an Electron app or packaging target. `build-resources/crownflare.ico` is the generated icon source to attach when that target is available; this is not a claim of an installed Electron app or tested packaged build.
