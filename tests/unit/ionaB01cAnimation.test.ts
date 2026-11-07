import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { IONA_B01C_CLIPS, IONA_B01C_FRAME_IDS, IONA_B01C_TEXTURES, ionaB01CAnimationKey, ionaB01CAssetKey, validateIonaB01CTextures } from '../../src/game/animation/ionaB01cAnimation.ts';

test('B01C exports complete separately authored frames for both directions', () => {
  assert.equal(IONA_B01C_FRAME_IDS.length,36);
  assert.equal(IONA_B01C_TEXTURES.length,72);
  const textureKeys=IONA_B01C_TEXTURES.map(({id,facing})=>ionaB01CAssetKey(id,facing));
  assert.equal(new Set(textureKeys).size,72);
  assert.deepEqual(validateIonaB01CTextures(textureKeys),[]);
  assert.deepEqual(validateIonaB01CTextures(textureKeys.slice(1)),[textureKeys[0]]);
});

test('B01C Phaser clips keep authored locomotion and three-step combo timing', () => {
  for(const facing of ['left','right'] as const){
    const run=IONA_B01C_CLIPS.find((clip)=>clip.key===ionaB01CAnimationKey(`run-${facing}`));
    assert.deepEqual(run?.frames.map((frame)=>frame.id),['run-0','run-1','run-2','run-3','run-4','run-5']);
    assert.ok(run?.frames.every((frame)=>frame.durationMs===70));
    assert.equal(run?.repeat,-1);
    for(const [index,[windup,contact,recovery]] of [[90,80,170],[110,90,170],[140,100,220]].entries()){
      const clip=IONA_B01C_CLIPS.find((item)=>item.key===ionaB01CAnimationKey(`combo-${index+1}-${facing}`));
      assert.deepEqual(clip?.frames.map((frame)=>frame.id),[`combo-${index+1}-windup`,`combo-${index+1}-contact`,`combo-${index+1}-recovery`]);
      assert.deepEqual(clip?.frames.map((frame)=>frame.durationMs),[windup,contact,recovery]);
      assert.equal(clip?.repeat,0);
    }
  }
});

test('B01C production manifest hashes every transparent 128x80 runtime frame', () => {
  const manifest=JSON.parse(readFileSync('art-source/manifests/iona-b01c-production-v1.json','utf8')) as {
    ownerApproval:string; audit:{runtimeFrameCount:number;allFacingsAuthoredSeparately:boolean;allFramesTransparentAndBinaryAlpha:boolean;allFramesFit128x80:boolean;sourceToRuntimeHashesRecorded:boolean};
    runtimeFrames:Array<{id:string;action:string;facing:string;source:string;sourceSha256:string;trimmedCropSha256:string;runtimePng:string;runtimeSha256:string;runtimeCanvas:{width:number;height:number};anchor:{x:number;feetY:number};runtimeVisibleBounds:number[];mirrored:boolean}>;
  };
  assert.equal(manifest.ownerApproval,'PENDING');
  assert.equal(manifest.runtimeFrames.length,72);
  assert.equal(manifest.audit.runtimeFrameCount,72);
  assert.equal(manifest.audit.allFacingsAuthoredSeparately,true);
  assert.equal(manifest.audit.allFramesTransparentAndBinaryAlpha,true);
  assert.equal(manifest.audit.allFramesFit128x80,true);
  assert.equal(manifest.audit.sourceToRuntimeHashesRecorded,true);
  const byActionAndFacing=new Map<string,Set<string>>();
  for(const frame of manifest.runtimeFrames){
    assert.ok(frame.facing==='left'||frame.facing==='right');
    assert.deepEqual(frame.runtimeCanvas,{width:128,height:80});
    assert.deepEqual(frame.anchor,{x:64,feetY:80});
    assert.equal(frame.runtimeVisibleBounds[3],80);
    assert.equal(frame.mirrored,false);
    for(const [path,hash] of [[frame.source,frame.sourceSha256],[frame.runtimePng,frame.runtimeSha256]] as const){
      assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),hash,path+' hash mismatch');
    }
    const key=frame.action+'-'+frame.facing;
    const ids=byActionAndFacing.get(key)??new Set<string>();
    assert.ok(!ids.has(frame.id),`Duplicate frame ${frame.id} in ${key}`);
    ids.add(frame.id);
    byActionAndFacing.set(key,ids);
  }
  for(const action of ['idle','run','jump','dash','combo-1','combo-2','combo-3','start','stop','turn']){
    assert.ok(byActionAndFacing.has(action+'-left'),`Missing ${action}-left`);
    assert.ok(byActionAndFacing.has(action+'-right'),`Missing ${action}-right`);
  }
});
