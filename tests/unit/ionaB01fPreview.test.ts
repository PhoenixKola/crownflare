import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shouldEnableIonaPreview } from '../../src/game/preview/ionaPreviewGate.ts';
import { IONA_PROMOTION_CONFIG, canPromoteIona } from '../../src/game/animation/ionaPromotion.ts';

test('Iona playable preview requires both a development build and an explicit query flag',()=>{
  assert.equal(shouldEnableIonaPreview(false,'1'),false,'production builds must ignore the preview URL flag');
  assert.equal(shouldEnableIonaPreview(true,null),false,'ordinary development launch must retain B00');
  assert.equal(shouldEnableIonaPreview(true,'0'),false);
  assert.equal(shouldEnableIonaPreview(true,'1'),true);
  const createGame=readFileSync('src/game/createGame.ts','utf8');
  assert.match(createGame,/import\.meta\.env\.DEV\s*&&\s*options\.ionaPreview\s*===\s*true/,'scene construction must independently enforce the dev-only boundary');
  assert.equal(IONA_PROMOTION_CONFIG.readyToPromote,false);
  assert.equal(IONA_PROMOTION_CONFIG.ownerApproval,'PENDING_OWNER_REVIEW');
  assert.equal(canPromoteIona(IONA_PROMOTION_CONFIG),false,'preview selection cannot promote canonical art');
});

test('development preview uses the real B01E chamber and preserves the 15x30 movement body',()=>{
  const main=readFileSync('src/main.ts','utf8');
  const scene=readFileSync('src/game/scenes/ChamberScene.ts','utf8');
  assert.match(main,/shouldEnableIonaPreview\(import\.meta\.env\.DEV/);
  assert.match(scene,/this\.body\.setSize\(15, 30\)/);
  assert.match(scene,/if\s*\(this\.previewMode\)\s*\{\s*for\s*\(const\s*\{\s*id,\s*facing\s*\}\s*of\s*IONA_B01E_TEXTURES\)/s);
  assert.match(scene,/this\.previewMode \? ionaB01EAssetKey\('idle-0','right'\)/);
  assert.match(scene,/stepMovement\(/,'preview should continue to use the established movement simulation');
  assert.match(scene,/this\.updateB01CCombat\(input\.actions\.light,grounded,dt\)/,'the earlier preview route keeps its authoritative combo clock through the central input mapper');
  assert.match(scene,/if\(this\.b03Mode\)this\.updateB03Combat\(input\.actions,grounded,dt\)/,'B03 must route configurable action edges into its deterministic combat clock');
  assert.match(scene,/private updateB03Animation\(/,'B03 moves must use their selected action poses in the actual player presentation');
});
