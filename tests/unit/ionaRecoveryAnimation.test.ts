import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { IONA_RECOVERY_CLIPS, IONA_RECOVERY_FRAME_IDS, IONA_RECOVERY_JAB, recoveryAssetKey, recoveryFrameAt, validateRecoveryAnimationAssets } from '../../src/game/animation/ionaRecoveryAnimation.ts';

test('recovery idle and run clips have four distinct reference-guided poses', () => {
  assert.deepEqual(IONA_RECOVERY_CLIPS.idle.map((frame)=>frame.id),['idle-0','idle-1','idle-2','idle-3']);
  assert.deepEqual(IONA_RECOVERY_CLIPS.run.map((frame)=>frame.id),['run-0','run-1','run-2','run-3']);
  assert.equal(recoveryFrameAt(IONA_RECOVERY_CLIPS.idle,0),'idle-0');
  assert.equal(recoveryFrameAt(IONA_RECOVERY_CLIPS.idle,420),'idle-1');
  assert.equal(recoveryFrameAt(IONA_RECOVERY_CLIPS.run,105),'run-1');
  assert.throws(()=>recoveryFrameAt(IONA_RECOVERY_CLIPS.run,-1));
});

test('generated jab phases place the visible contact pose over the combat event', () => {
  assert.equal(IONA_RECOVERY_JAB.frameAtElapsed(0),'jab-0');
  assert.equal(IONA_RECOVERY_JAB.frameAtElapsed(79),'jab-0');
  assert.equal(IONA_RECOVERY_JAB.frameAtElapsed(80),'jab-1');
  assert.equal(IONA_RECOVERY_JAB.frameAtElapsed(129),'jab-1');
  assert.equal(IONA_RECOVERY_JAB.frameAtElapsed(130),'jab-2');
  assert.equal(IONA_RECOVERY_JAB.frameAtElapsed(IONA_RECOVERY_JAB.contactEventMs),'jab-2');
  assert.equal(IONA_RECOVERY_JAB.frameAtElapsed(230),'jab-3');
  assert.equal(IONA_RECOVERY_JAB.frameAtElapsed(350),'idle-3');
  assert.equal(IONA_RECOVERY_JAB.startupMs+IONA_RECOVERY_JAB.activeMs+IONA_RECOVERY_JAB.recoveryMs,490);
});

test('recovery texture validator expects all authored pixels in both directions', () => {
  const complete=IONA_RECOVERY_FRAME_IDS.flatMap((id)=>[-1,1].map((facing)=>recoveryAssetKey(id,facing as -1|1)));
  assert.deepEqual(validateRecoveryAnimationAssets(complete),[]);
  assert.deepEqual(validateRecoveryAnimationAssets(complete.filter((key)=>key!=='iona-recovery-jab-2-left')),['iona-recovery-jab-2-left']);
});

test('recovery manifest ties generated sheets, unique poses and exact runtime hashes together', () => {
  const manifest=JSON.parse(readFileSync('art-source/manifests/iona-b01-recovery-v2.json','utf8')) as {
    status:string; ownerApproval:string; generatedOutputCount:number; generatedOutputs:Array<{sha256:string;sourceFile:string}>;
    runtimeFrames:Array<{id:string;action:string;facing:string;generatedSource:string;generatedSourceSha256:string;sourceCrop:string;sourceCropSha256:string;runtimePng:string;runtimeSha256:string;runtimeCanvas:{width:number;height:number};runtimeAlphaPixels:number;mirrored:boolean}>;
    processing:{alphaThresholdInclusive:number;resize:string;visibleHeightTargetPx:number;manualRedrawCount:number;mirroredFrameCount:number};
  };
  assert.equal(manifest.status,'B01_RECOVERY_PROVISIONAL');
  assert.equal(manifest.ownerApproval,'PENDING');
  assert.equal(manifest.generatedOutputCount,7);
  assert.equal(manifest.generatedOutputs.length,7);
  assert.equal(manifest.runtimeFrames.length,24);
  assert.equal(manifest.processing.alphaThresholdInclusive,192);
  assert.equal(manifest.processing.resize,'nearest-neighbor');
  assert.equal(manifest.processing.visibleHeightTargetPx,60);
  assert.equal(manifest.processing.manualRedrawCount,0);
  assert.equal(manifest.processing.mirroredFrameCount,0);
  for(const output of manifest.generatedOutputs) {
    const bytes=readFileSync(output.sourceFile);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),output.sha256,output.sourceFile+' source hash mismatch');
  }
  for(const frame of manifest.runtimeFrames) {
    assert.equal(frame.runtimeCanvas.width,128);
    assert.equal(frame.runtimeCanvas.height,80);
    assert.ok(frame.runtimeAlphaPixels>200);
    assert.equal(frame.mirrored,false);
    for(const [path,hash] of [[frame.generatedSource,frame.generatedSourceSha256],[frame.sourceCrop,frame.sourceCropSha256],[frame.runtimePng,frame.runtimeSha256]] as const) {
      const bytes=readFileSync(path);
      assert.equal(createHash('sha256').update(bytes).digest('hex'),hash,path+' hash mismatch');
    }
  }
  for(const action of ['idle','run','jab']) for(const facing of ['right','left']) {
    assert.equal(manifest.runtimeFrames.filter((frame)=>frame.action===action&&frame.facing===facing).length,4,`${action}-${facing} should have four source poses`);
  }
});
