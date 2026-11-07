# Project Crownflare — Asset Provenance, Size and Retention Policy

## Active vs source vs scratch

**Track:** active exported runtime art and code, accepted canonical masters, uniquely reproducible source artwork, manifests+checksums, small approved comparison evidence, docs, scripts. **Ignore/external archive:** rejected generated art, scratch/crops, redundant atlases, test-run WebM, long raw screen captures, noisy screenshots, Playwright traces/profiles, node_modules, dist and ZIPs. **Never delete accepted irreplaceable art without proving it is archived and unused dependencies checked.**

## Initial B00 decisions

- Budget audit tool `npm run audit:assets`: SHA-256 prefix and byte size per art-source/public asset. B00 tracks one 2,035,226-byte provisional concept board, its manifest, and lightweight asset documentation; none of it is runtime gameplay art. The current audit is 4 files / 2,037,045 bytes total, with no file over the 10 MiB per-file threshold.
- Manifest tracked by asset ID and immutable canonical hash, license provenance, generation/editing path, form/action/direction, runtime path and acceptance status.
- Single runtime copy of image/atlas, no source/preview runtime duplication. B00 has **no production runtime art**; its test shapes are code-generated geometry and the separate board is source reference only.
- Owner receives one curated zipped review bundle of important real motion evidence when available, with source hash and recording method. That bundle is outside source Git and should be sized/measured, not automatically claimed tiny.

## For future generated images

When using Codex image tools, store prompt/tool reference and originating canonical image hash, record explicit ownership/licensing risk review. No protected art tracing. Approved source masters must be recoverable; rejected galleries should be noted in a small rejection ledger outside source ZIP and may be safely archived.

## Change control

`docs/10-decisions-and-change-log.md` logs changes that affect art scale, physics, palette, state coverage or form identity. Revisions must list owner approval impact. `npm run audit:assets` and compressed source ZIP size reported per major phase. Git LFS only by explicit owner approval after storage/access analysis.
