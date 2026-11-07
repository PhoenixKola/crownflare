# Canonical source + manifest contract
At B01 each approved asset must have `assetId`, `canonicalRefPath`, `sha256`, `ownerApproval`, `createdAt`, `license/provenance`, `canvasPx`, `anchorPx`, `form`, `action`, `direction`, `frameTiming`, `gameEventId`, `runtimePath` and QA result. No generated art is approved merely because it exists.
Archive rejected generations outside the tracked repository; retain irreplaceable accepted sources. `npm run audit:assets` reports SHA-256 and asset sizes.
