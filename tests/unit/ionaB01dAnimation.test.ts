import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { IONA_B01C_CLIPS, ionaB01CAnimationKey } from '../../src/game/animation/ionaB01cAnimation.ts';
import { IONA_B01D_CLIPS, IONA_B01D_FRAME_IDS, IONA_B01D_TEXTURES, ionaB01DAnimationKey, ionaB01DAssetKey, validateIonaB01DTextures } from '../../src/game/animation/ionaB01dAnimation.ts';
import { canPromoteIona, IONA_PROMOTION_CONFIG } from '../../src/game/animation/ionaPromotion.ts';

const fileHash=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');

test('B01D uses a separate 68-texture candidate and preserves four source-authored run poses per facing',()=>{
  assert.equal(IONA_B01D_FRAME_IDS.length,34);
  assert.equal(IONA_B01D_TEXTURES.length,68);
  const keys=IONA_B01D_TEXTURES.map(({id,facing})=>ionaB01DAssetKey(id,facing));
  assert.equal(new Set(keys).size,68);
  assert.deepEqual(validateIonaB01DTextures(keys),[]);
  assert.deepEqual(validateIonaB01DTextures(keys.slice(1)),[keys[0]]);
  for(const facing of ['left','right'] as const){
    const run=IONA_B01D_CLIPS.find((clip)=>clip.key===ionaB01DAnimationKey(`run-${facing}`));
    assert.deepEqual(run?.frames.map((frame)=>frame.id),['run-0','run-1','run-3','run-2']);
    assert.deepEqual(run?.frames.map((frame)=>frame.durationMs),[105,105,105,105]);
    assert.equal(run?.frames.reduce((total,frame)=>total+frame.durationMs,0),420);
    assert.equal(run?.repeat,-1);
    const oldRun=IONA_B01C_CLIPS.find((clip)=>clip.key===ionaB01CAnimationKey(`run-${facing}`));
    assert.deepEqual(oldRun?.frames.map((frame)=>frame.durationMs),[70,70,70,70,70,70]);
  }
});

test('B01D manifest verifies source-to-runtime hashes, anchors, transparency and unmodified frame reuse',()=>{
  const manifest=JSON.parse(readFileSync('art-source/manifests/iona-b01d-candidate-v1.json','utf8')) as {
    ownerApproval:string;readyToPromote:boolean;physicsBody:{width:number;height:number};runtimeFrameCount:number;frameMetricsModule:{path:string;sha256:string};
    runtimeFrames:Array<{id:string;action:string;actionId:string;facing:string;source:string;sourceSha256:string;runtimePng:string;runtimeSha256:string;runtimeCanvas:{width:number;height:number};runtimeVisibleBounds:number[];anchor:{x:number;feetY:number};durationMs:number;candidateStatus:string;croppedSourcePath?:string;croppedSourceSha256?:string;contactAnchor?:{eventId:string;contactEventMs:number;pixelPoint:null}|null}>;
  };
  assert.equal(manifest.ownerApproval,'PENDING_OWNER_REVIEW');
  assert.equal(manifest.readyToPromote,false);
  assert.deepEqual(manifest.physicsBody,{width:15,height:30,authority:'unchanged B00 Arcade body'});
  assert.equal(manifest.runtimeFrameCount,68);
  assert.equal(manifest.runtimeFrames.length,68);
  assert.equal(fileHash(manifest.frameMetricsModule.path),manifest.frameMetricsModule.sha256,'generated visible-bounds metrics must match the manifest hash');
  for(const frame of manifest.runtimeFrames){
    assert.ok(frame.actionId.startsWith('iona-base-'));
    assert.ok(frame.facing==='left'||frame.facing==='right');
    assert.deepEqual(frame.runtimeCanvas,{width:128,height:80});
    assert.deepEqual(frame.anchor,{x:64,feetY:80});
    assert.equal(frame.runtimeVisibleBounds[3],80);
    assert.equal(fileHash(frame.source),frame.sourceSha256,`${frame.id}/${frame.facing} source hash`);
    assert.equal(fileHash(frame.runtimePng),frame.runtimeSha256,`${frame.id}/${frame.facing} runtime hash`);
    if(frame.candidateStatus==='NEW_IMAGEGEN_POSE'){
      assert.ok(frame.croppedSourcePath&&frame.croppedSourceSha256);
      assert.equal(fileHash(frame.croppedSourcePath),frame.croppedSourceSha256);
      assert.equal(frame.runtimeVisibleBounds[3]-frame.runtimeVisibleBounds[1],67);
      assert.equal(frame.durationMs,105);
    }else{
      const oldPath=`public/assets/characters/iona/b01c/${frame.id}-${frame.facing}.png`;
      assert.deepEqual(readFileSync(frame.runtimePng),readFileSync(oldPath),`${frame.id}/${frame.facing} must stay unchanged from B01C`);
    }
    if(frame.id.endsWith('-contact')) assert.ok(frame.contactAnchor?.eventId==='contact'&&frame.contactAnchor.pixelPoint===null);
  }
  for(const facing of ['left','right']){
    const generated=manifest.runtimeFrames.filter((frame)=>frame.action==='run'&&frame.facing===facing&&frame.candidateStatus==='NEW_IMAGEGEN_POSE');
    assert.equal(generated.length,4);
    assert.equal(new Set(generated.map((frame)=>frame.croppedSourceSha256)).size,4);
  }
});

test('ordinary gameplay promotion remains disabled until the explicit owner marker is changed',()=>{
  assert.equal(IONA_PROMOTION_CONFIG.readyToPromote,false);
  assert.equal(IONA_PROMOTION_CONFIG.ownerApproval,'PENDING_OWNER_REVIEW');
  assert.equal(canPromoteIona(IONA_PROMOTION_CONFIG),false);
  assert.equal(canPromoteIona({...IONA_PROMOTION_CONFIG,readyToPromote:true}),false);
  assert.equal(canPromoteIona({...IONA_PROMOTION_CONFIG,ownerApproval:'OWNER_APPROVED'}),false);
  assert.equal(canPromoteIona({...IONA_PROMOTION_CONFIG,readyToPromote:true,ownerApproval:'OWNER_APPROVED'}),true);
});
