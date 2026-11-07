# B03 owner decision card

**Build:** B03 development candidate. Test at `http://127.0.0.1:5173/?b03=1` after `npm run dev`. Ordinary and production routes stay on B00.

## Please decide

- **Iona Base design:** Approve / Revise / Pending
- **B03 action motion at normal speed:** Approve / Revise / Pending
- **Fractured Sentry appearance:** Approve / Revise / Pending
- **Resonance pressure imprint and combat readability:** Approve / Revise / Pending
- **Audio:** Heard and approved / Revise / Not heard
- **Xbox/PlayStation controller feel:** Approved / Revise / Not tested
- **B03 milestone:** Accept as candidate / Revise B03 / Keep technical work but replace art/audio

All image-generation outputs are provisional candidates. Codex has not signed off the art, mix, animation quality, or canonical Iona design.

## Review run

1. Enter from the B03 title, settle beside the moving sentry, and test the lead palm → side kick → rising forearm chain.
2. Test K heavy, jump then aerial J, Q Resonance, dash through the sentry tell, and both facings.
3. Toggle VFX with V and cycle backgrounds with C. VFX off should leave distinct player poses. Use R to retry at any time; E retries after KO.
4. Open Controls / Controller from title or pause. Test a physical controller using [b03-controller-checklist.md](b03-controller-checklist.md).
5. Review the candidate sources and hashes in [iona-b03-candidate-v1.json](../../art-source/manifests/iona-b03-candidate-v1.json), generation notes in [iona-b03-generation-prompts.md](../../art-source/manifests/iona-b03-generation-prompts.md), and current Chrome captures in `review-evidence/b03/`.

## Gates at capture

| Gate | Status |
| --- | --- |
| Technical build/unit/asset/browser route | PASS on the recorded run; see `qa-report.json` |
| Art-motion at normal speed / 60px reference | PENDING owner review |
| Audio implemented | YES; existing WAVs plus procedural telegraph/hurt/dodge/KO tones |
| Audio heard by reviewer | NO; Playwright WebM has no audio track |
| Controller | SYNTHETIC Chrome coverage passed; physical feel pending |
| Owner approval | PENDING |

Notes / requested changes:

```text



```
