import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { animationAssetKey, frameAt, IONA_CLIPS, validateIonaAnimationAssets } from '../../src/game/animation/ionaAnimation.ts';

test('idle and run clips loop on authored frame durations', () => {
  assert.equal(frameAt(IONA_CLIPS.idle,0),'idle-0');
  assert.equal(frameAt(IONA_CLIPS.idle,180),'idle-1');
  assert.equal(frameAt(IONA_CLIPS.idle,800),'idle-0');
  assert.equal(frameAt(IONA_CLIPS.run,90),'run-1');
  assert.throws(()=>frameAt(IONA_CLIPS.run,-1));
});

test('animation asset validator finds a missing directional frame', () => {
  const complete=Object.values(IONA_CLIPS).flatMap((clip)=>clip.flatMap((frame)=>[-1,1].map((facing)=>animationAssetKey(frame.id,facing as -1|1))));
  assert.deepEqual(validateIonaAnimationAssets(complete).sort(),['iona-hit-contact-left','iona-hit-contact-right','iona-hit-recover-left','iona-hit-recover-right','iona-hit-windup-left','iona-hit-windup-right']);
});

test('rejected overnight frame manifest is historical transparent art with source and output hashes', () => {
  const manifest=JSON.parse(readFileSync('art-source/manifests/iona-overnight-v1.json','utf8')) as {
    status:string; target:{canvas:number[];visibleCharacterHeightPx:number;origin:number[]};
    frames:Array<{id:string;facing:string;state:string;source:string;sourceSha256:string;outputSha256:string;output:string;pivot:{origin:number[];feet:number[]};alphaPixelCount:number;alphaBounds:number[];transparentCorners:number[]}>;
  };
  assert.equal(manifest.status,'REJECTED_OWNER_ART');
  assert.deepEqual(manifest.target.canvas,[64,64]);
  assert.equal(manifest.target.visibleCharacterHeightPx,60);
  assert.deepEqual(manifest.target.origin,[.5,1]);
  assert.deepEqual(manifest.target.footAnchor,[32,64]);
  assert.equal(manifest.frames.length,44);
  for(const frame of manifest.frames) {
    assert.match(frame.sourceSha256,/^[a-f0-9]{64}$/);
    assert.match(frame.outputSha256,/^[a-f0-9]{64}$/);
    assert.deepEqual(frame.pivot.feet,[32,64]);
    assert.ok(frame.alphaPixelCount>100);
    assert.deepEqual(frame.transparentCorners,[0,0,0,0]);
    const source=readFileSync(frame.source);
    const output=readFileSync(frame.output);
    assert.equal(createHash('sha256').update(source).digest('hex'),frame.sourceSha256,frame.id+' source digest mismatch');
    assert.equal(createHash('sha256').update(output).digest('hex'),frame.outputSha256,frame.id+' PNG digest mismatch');
    assert.equal(output.length>100,true,frame.id+' missing PNG output');
  }
  assert.ok(manifest.frames.some((frame)=>frame.state==='run'));
  assert.ok(manifest.frames.some((frame)=>frame.id==='dawnrush-silhouette-right'));
  assert.ok(manifest.frames.some((frame)=>frame.id==='idle-0-left'));
});
