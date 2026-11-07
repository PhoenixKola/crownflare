import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { IONA_B01E_CLIPS, IONA_B01E_FRAME_IDS, IONA_B01E_TEXTURES, ionaB01EAnimationKey, ionaB01EAssetKey, nextIonaLabCandidate, validateIonaB01ETextures } from '../../src/game/animation/ionaB01eAnimation.ts';
import { IONA_B01E_AUDIO_CUES, IonaB01eAudioEventGate, ionaB01eResolutionCue, ionaB01eWhooshForMove, isIonaRunContactFrame } from '../../src/game/audio/ionaB01eAudio.ts';
import { IONA_PROMOTION_CONFIG, canPromoteIona } from '../../src/game/animation/ionaPromotion.ts';

const sha256=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');

test('B01E registers 70 distinct B01C-derived textures and an independent three-way selector',()=>{
  assert.equal(IONA_B01E_FRAME_IDS.length,35);
  assert.equal(IONA_B01E_TEXTURES.length,70);
  const keys=IONA_B01E_TEXTURES.map(({id,facing})=>ionaB01EAssetKey(id,facing));
  assert.equal(new Set(keys).size,70);
  assert.deepEqual(validateIonaB01ETextures(keys),[]);
  assert.deepEqual(validateIonaB01ETextures(keys.slice(1)),[keys[0]]);
  assert.deepEqual([nextIonaLabCandidate('b01c'),nextIonaLabCandidate('b01d'),nextIonaLabCandidate('b01e')],['b01d','b01e','b01c']);
});

test('B01E side-kick windup uses two authored poses while preserving the original 370ms action and 138ms contact',()=>{
  for(const facing of ['left','right'] as const){
    const clip=IONA_B01E_CLIPS.find((candidate)=>candidate.key===ionaB01EAnimationKey(`combo-2-${facing}`));
    assert.deepEqual(clip?.frames.map((frame)=>frame.id),['combo-2-windup','combo-2-windup-1','combo-2-contact','combo-2-recovery']);
    assert.deepEqual(clip?.frames.map((frame)=>frame.durationMs),[55,55,90,170]);
    assert.equal(clip?.frames.reduce((total,frame)=>total+frame.durationMs,0),370);
    assert.equal(clip?.repeat,0);
  }
  const manifest=JSON.parse(readFileSync('art-source/manifests/iona-b01e-candidate-v1.json','utf8')) as {runtimeFrames:Array<{id:string;facing:string;candidateStatus:string;source:string;sourceSha256:string;croppedSourcePath?:string;croppedSourceSha256?:string;runtimePng:string;runtimeSha256:string;contactAnchor?:{contactEventMs:number}|null;durationMs:number;runtimeScale?:number}>;frameMetricsModule:{path:string;sha256:string};sidekickClip:{authoritativeContactMs:number}};
  assert.equal(manifest.runtimeFrames.length,70);
  assert.deepEqual(manifest.runtimeFrames.reduce((counts,row)=>{counts[row.candidateStatus]=(counts[row.candidateStatus]??0)+1;return counts;},{} as Record<string,number>),{NEW_IMAGEGEN_POSE:8,UNCHANGED_REUSED:62});
  assert.equal(manifest.sidekickClip.authoritativeContactMs,138);
  for(const facing of ['left','right']){
    const poses=manifest.runtimeFrames.filter((row)=>row.candidateStatus==='NEW_IMAGEGEN_POSE'&&row.facing===facing);
    assert.equal(poses.length,4);
    assert.equal(new Set(poses.map((row)=>row.croppedSourceSha256)).size,4);
    assert.equal(new Set(poses.map((row)=>row.runtimeScale)).size,1,'all poses in a facing use one scale');
    for(const pose of poses){
      assert.equal(sha256(pose.source),pose.sourceSha256);
      assert.equal(sha256(pose.croppedSourcePath!),pose.croppedSourceSha256);
      assert.equal(sha256(pose.runtimePng),pose.runtimeSha256);
      if(pose.id==='combo-2-contact')assert.equal(pose.contactAnchor?.contactEventMs,138);
    }
  }
  const metrics=readFileSync(manifest.frameMetricsModule.path);
  assert.equal(metrics.includes(0x0d),false);
  assert.equal(sha256(manifest.frameMetricsModule.path),manifest.frameMetricsModule.sha256);
  const normalized=Buffer.from(metrics.toString('utf8').replace(/\n/g,'\r\n').replace(/\r\n/g,'\n'),'utf8');
  assert.deepEqual(normalized,metrics);
  assert.equal(IONA_PROMOTION_CONFIG.readyToPromote,false);
  assert.equal(IONA_PROMOTION_CONFIG.ownerApproval,'PENDING_OWNER_REVIEW');
  assert.equal(canPromoteIona(IONA_PROMOTION_CONFIG),false);
});

test('B01E sound selection separates whoosh, successful contact and non-impacting miss with duplicate suppression',()=>{
  assert.equal(ionaB01eWhooshForMove('iona-base-combo-1'),'palm-whoosh');
  assert.equal(ionaB01eWhooshForMove('iona-base-combo-2'),'kick-whoosh');
  assert.equal(ionaB01eWhooshForMove('iona-base-combo-3'),'forearm-whoosh');
  assert.equal(ionaB01eResolutionCue('iona-base-combo-1','hit'),'palm-hit');
  assert.equal(ionaB01eResolutionCue('iona-base-combo-2','hit'),'kick-hit');
  assert.equal(ionaB01eResolutionCue('iona-base-combo-3','hit'),'forearm-hit');
  assert.equal(ionaB01eResolutionCue('iona-base-combo-2','miss'),'miss');
  const gate=new IonaB01eAudioEventGate();
  assert.equal(gate.accept('action-1-contact'),true);
  assert.equal(gate.accept('action-1-contact'),false);
  assert.equal(gate.accept('action-2-contact'),true);
  assert.equal(isIonaRunContactFrame('run-0'),true);
  assert.equal(isIonaRunContactFrame('run-3'),true);
  assert.equal(isIonaRunContactFrame('run-1'),false);
});

test('B01E authors 13 non-empty, hashed 24kHz WAV source cues with no external samples',()=>{
  const record=JSON.parse(readFileSync('art-source/characters/iona/b01e/audio-provenance.json','utf8')) as {sourceScript:{path:string;sha256:string};externalSamples:string[];assets:Array<{key:string;path:string;sha256:string;bytes:number;durationMs:number;sampleRateHz:number;channels:number}>};
  assert.equal(record.assets.length,13);
  assert.deepEqual(record.externalSamples,[]);
  assert.equal(sha256(record.sourceScript.path),record.sourceScript.sha256);
  assert.deepEqual(record.assets.map((asset)=>asset.key),IONA_B01E_AUDIO_CUES);
  const audioHashes=new Set<string>();
  for(const asset of record.assets){
    const wav=readFileSync(asset.path);
    assert.equal(sha256(asset.path),asset.sha256);
    assert.equal(wav.subarray(0,4).toString('ascii'),'RIFF');
    assert.equal(wav.subarray(8,12).toString('ascii'),'WAVE');
    assert.ok(asset.bytes>3000&&asset.durationMs>50);
    assert.equal(asset.sampleRateHz,24000);
    assert.equal(asset.channels,1);
    assert.ok(wav.subarray(44).some((sample)=>sample!==0),'WAV PCM must not be silent');
    audioHashes.add(asset.sha256);
  }
  assert.equal(audioHashes.size,13,'individual authored actions must remain distinct source cues');
});
