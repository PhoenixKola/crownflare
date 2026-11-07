/** Real headed-Chrome B02 preview test, active-play capture, action log and production-route guard. */
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readdir, rename, stat, unlink, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port=4181;
const previewPort=4182;
const evidence='review-evidence/b02';
const recordings=path.join('tests/evidence','b02-recordings');
const cropDir=path.join('tests/evidence','b02-crops');
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'pipe'});
let previewServer;
let serverErrors='';
server.stderr.on('data',(buffer)=>{serverErrors+=buffer.toString();});
let browser,context,page,lifecycleContext,passed=false;
const errors=[];
const actions=[];
const pauseIntervals=[];
const viewportChecks=[];
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
const snapshot=()=>page.evaluate(()=>window.__CROWNFLARE_QA__?.snapshot());
const previewState=async(targetPage=page)=>targetPage.evaluate(()=>window.__CROWNFLARE_QA__?.snapshot().preview);
const waitPreview=async(targetPage=page)=>targetPage.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().preview!==null,undefined,{timeout:10000});
const waitGrounded=async(targetPage=page)=>{
  await targetPage.evaluate(()=>{window.__B02_GROUNDED_STABLE_SINCE__=0;});
  return targetPage.waitForFunction(()=>{
    const grounded=window.__CROWNFLARE_QA__?.snapshot().preview?.grounded===true;
    if(!grounded){window.__B02_GROUNDED_STABLE_SINCE__=0;return false;}
    const now=performance.now();
    if(!window.__B02_GROUNDED_STABLE_SINCE__){window.__B02_GROUNDED_STABLE_SINCE__=now;return false;}
    return now-window.__B02_GROUNDED_STABLE_SINCE__>=60;
  },undefined,{timeout:5000});
};
const logAction=(label,details={})=>actions.push({seconds:Number(((Date.now()-gameplayStartAt)/1000).toFixed(2)),label,...details});
let gameplayStartAt=0;
let titleAt=0;
let recordingStoppedAt=0;
let focusedStartAt=0;
let focusedEndAt=0;
let pauseStartAt=0;
let gameplayEndAt=0;
let mainVideoPath='';
let mainVideoInfo={};
let comparisonRows=[];
let productionRouteIgnored=false;

async function ready(url){
  for(let index=0;index<80;index++){
    try{const response=await fetch(url);if(response.ok)return true;}catch{}
    await delay(250);
  }
  return false;
}

async function probeVideo(videoPath){
  const result=await new Promise((resolve)=>{
    const child=spawn('ffprobe',['-v','error','-show_entries','format=duration:stream=codec_type,codec_name,width,height,r_frame_rate,avg_frame_rate','-of','json',videoPath],{stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';child.stdout.on('data',(chunk)=>stdout+=chunk.toString());child.stderr.on('data',(chunk)=>stderr+=chunk.toString());
    child.once('error',(error)=>resolve({error:error.message}));child.once('close',(code)=>resolve(code===0?JSON.parse(stdout):{error:stderr||`ffprobe exit ${code}`}));
  });
  if(result.error)throw new Error('ffprobe could not inspect the playable capture: '+result.error);
  const video=result.streams?.find((stream)=>stream.codec_type==='video');
  return {durationSeconds:Number(result.format?.duration??0),audioTrack:(result.streams??[]).some((stream)=>stream.codec_type==='audio'),streams:result.streams??[],width:video?.width??null,height:video?.height??null,rFrameRate:video?.r_frame_rate??null,avgFrameRate:video?.avg_frame_rate??null};
}

async function waitCombatCount(count,targetPage=page,timeout=2500){
  await targetPage.waitForFunction((minimum)=>window.__B02_COMBAT_EVENTS__?.length>=minimum, count,{timeout});
}
const tapKey=async(targetPage,key)=>{await targetPage.keyboard.down(key);await targetPage.waitForTimeout(55);await targetPage.keyboard.up(key);};

async function startPresentationAudit(targetPage=page){
  await targetPage.evaluate(()=>{
    const audit={sampleCount:0,violations:[],maxScaleDelta:0,maxFootXDelta:0,maxFootYDelta:0};
    window.__B02_PRESENTATION_AUDIT__=audit;
    window.addEventListener('crownflare:tick',()=>{
      const state=window.__CROWNFLARE_QA__?.snapshot();
      const preview=state?.preview;
      if(!preview)return;
      audit.sampleCount++;
      const expectedScale=preview.reviewScale/60;
      const scaleDelta=Math.abs(preview.spriteScale-expectedScale);
      const footXDelta=Math.abs(preview.spritePosition.x-preview.physicsAnchor.x);
      const footYDelta=Math.abs(preview.spritePosition.y-preview.physicsAnchor.y);
      audit.maxScaleDelta=Math.max(audit.maxScaleDelta,scaleDelta);
      audit.maxFootXDelta=Math.max(audit.maxFootXDelta,footXDelta);
      audit.maxFootYDelta=Math.max(audit.maxFootYDelta,footYDelta);
      const problems=[];
      if(!Number.isFinite(preview.spriteScale)||scaleDelta>.00001)problems.push(`scale ${preview.spriteScale} expected ${expectedScale}`);
      if(preview.spriteOrigin.x!==.5||preview.spriteOrigin.y!==1)problems.push(`origin ${JSON.stringify(preview.spriteOrigin)}`);
      if(footXDelta>.02||footYDelta>.02)problems.push(`foot pivot delta ${footXDelta},${footYDelta}`);
      if(preview.bodySize.width!==15||preview.bodySize.height!==30)problems.push(`body ${JSON.stringify(preview.bodySize)}`);
      if(problems.length&&audit.violations.length<50)audit.violations.push({frame:preview.frame,reviewScale:preview.reviewScale,problems});
    });
  });
}

async function assertPresentation(targetPage=page){
  const state=await previewState(targetPage);
  assert(state&&Math.abs(state.spriteScale-state.reviewScale/60)<.00001,`Sprite scale differs from the selected global scale: ${JSON.stringify(state)}`);
  assert(state.spriteOrigin.x===.5&&state.spriteOrigin.y===1,`Shared foot pivot changed: ${JSON.stringify(state.spriteOrigin)}`);
  assert(Math.abs(state.spritePosition.x-state.physicsAnchor.x)<.02&&Math.abs(state.spritePosition.y-state.physicsAnchor.y)<.02,`Sprite moved away from the physics foot anchor: ${JSON.stringify(state)}`);
  assert(state.bodySize.width===15&&state.bodySize.height===30,`Physics body changed: ${JSON.stringify(state.bodySize)}`);
  return state;
}

async function captureLandingFrame(targetPage=page){
  await resetPreview(targetPage);
  await targetPage.locator('[data-preview-scale="60"]').click();
  await targetPage.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().preview?.reviewScale===60,undefined,{timeout:1500});
  await targetPage.keyboard.down('d');await targetPage.waitForTimeout(220);await targetPage.keyboard.up('d');await waitGrounded(targetPage);
  await targetPage.keyboard.down('Space');await targetPage.waitForTimeout(320);await targetPage.keyboard.up('Space');
  await targetPage.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().preview?.grounded===false,undefined,{timeout:1200});
  await targetPage.waitForFunction(()=>{
    const value=window.__CROWNFLARE_QA__?.snapshot().preview;
    return value?.grounded===true&&value.frame==='jump-5'&&value.action==='land';
  },undefined,{timeout:3500});
  const landing=await assertPresentation(targetPage);
  assert(landing.reviewScale===60,'Before/after landing comparison must use the global 60px reference');
  const destination=path.join(evidence,'iona-b02-shrink-after.png');
  await targetPage.screenshot({path:destination});
  return {path:destination.replaceAll('\\','/'),frame:landing.frame,action:landing.action,scale:landing.spriteScale,body:landing.bodySize,origin:landing.spriteOrigin,position:landing.spritePosition,player:{x:landing.playerX,y:landing.playerY}};
}

async function composeShrinkComparison(after){
  const beforePath='review-evidence/b01d/iona-b01d-jump-land.png';
  const beforeBytes=await readFile(beforePath);
  const afterBytes=await readFile(after.path);
  const comparisonPage=await browser.newPage({viewport:{width:1600,height:520}});
  await comparisonPage.setContent(`<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;padding:18px;background:#07111e;color:#eaf3f0;font:14px Segoe UI,Arial,sans-serif}.row{display:grid;grid-template-columns:1fr 1fr;gap:14px}.card{border:1px solid #34515a;background:#101c2b;padding:10px}.before{border-color:#db986b}.after{border-color:#62d4bd}h1{font-size:18px;font-weight:600;margin:0 0 12px}.label{font-weight:600;font-size:13px;margin-bottom:8px}.sub{color:#aec0c7;font-size:11px;margin-top:7px}img{display:block;width:100%;height:auto;background:#0c1826}</style><h1>Low-pose scale correction / real Phaser scene captures</h1><div class="row"><section class="card before"><div class="label">BEFORE / B01D alpha-bound fit / selected reference 60 px</div><img src="data:image/png;base64,${beforeBytes.toString('base64')}"><div class="sub">Historical B01D comparison-route capture; sprite scale was derived from each pose's visible alpha height.</div></section><section class="card after"><div class="label">AFTER / B02 fixed global scale / 60 px reference / B00 body 15x30</div><img src="data:image/png;base64,${afterBytes.toString('base64')}"><div class="sub">Captured from the actual B02 Phaser preview with canvas, alpha bounds, grounded foot pivot, body, and scale diagnostics.</div></section></div>`);
  await comparisonPage.screenshot({path:path.join(evidence,'iona-b02-shrink-before-after.png'),fullPage:true});
  await comparisonPage.close();
  return {before:beforePath,after:after.path,composite:'review-evidence/b02/iona-b02-shrink-before-after.png',beforeSourceSha256:createHash('sha256').update(beforeBytes).digest('hex'),afterSourceSha256:createHash('sha256').update(afterBytes).digest('hex'),beforeScaleSource:'B01D route captured reference at 60px by per-frame visible-alpha normalization',afterScale:after.scale,afterFrame:after.frame};
}

async function resetPreview(targetPage=page){
  await targetPage.keyboard.press('r');
  await targetPage.waitForFunction(()=>{
    const value=window.__CROWNFLARE_QA__?.snapshot().preview;
    return value?.playerX<90&&value?.targetHealth===3&&value?.attackPhase==='idle';
  },undefined,{timeout:2500});
  await waitGrounded(targetPage);
}

async function approachTarget(targetPage=page){
  const deadline=Date.now()+7000;
  await targetPage.keyboard.down('d');
  while(Date.now()<deadline){
    const value=await previewState(targetPage);
    const gap=value.targetX-value.playerX;
    if(gap>=18&&gap<=28&&value.grounded&&value.facing===1){await targetPage.keyboard.up('d');await waitGrounded(targetPage);return value;}
    if(gap<10){
      await targetPage.keyboard.up('d');
      await targetPage.keyboard.down('a');await targetPage.waitForTimeout(100);await targetPage.keyboard.up('a');
      await targetPage.keyboard.down('d');await targetPage.waitForTimeout(36);await targetPage.keyboard.up('d');
    }else await targetPage.waitForTimeout(35);
  }
  await targetPage.keyboard.up('d');
  throw new Error('Could not settle at the moving target in right-facing contact range: '+JSON.stringify(await previewState(targetPage)));
}

async function captureActorCrop(targetPage,scale,action,facing){
  const value=await previewState(targetPage);
  const player=await targetPage.evaluate(()=>window.__CROWNFLARE_QA__?.snapshot().player);
  const canvas=await targetPage.locator('#game-root canvas').boundingBox();
  assert(value&&player&&canvas,'Preview state or real Phaser canvas is unavailable for the comparison crop');
  const factorX=canvas.width/480,factorY=canvas.height/270;
  const centerX=canvas.x+(value.playerX-player.cameraX)*factorX;
  const bottomY=canvas.y+value.physicsAnchor.y*factorY;
  const width=260,height=250;
  const x=Math.max(0,Math.min(1280-width,Math.round(centerX-width/2)));
  const y=Math.max(0,Math.min(720-height,Math.round(bottomY-height+8)));
  const filename=`${scale}-${action}-${facing}.png`;
  await targetPage.screenshot({path:path.join(cropDir,filename),clip:{x,y,width,height},animations:'allow'});
  comparisonRows.push({scale,action,facing,path:path.join(cropDir,filename).replaceAll('\\','/')});
}

async function face(targetPage,direction){
  await targetPage.keyboard.down(direction);await targetPage.waitForTimeout(160);await targetPage.keyboard.up(direction);await targetPage.waitForTimeout(150);
  await waitGrounded(targetPage);
}

async function makeComparisonBoard(targetPage){
  await targetPage.getByRole('button',{name:/enter the spindle/i}).click();
  await targetPage.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().screen==='ionaPreview',undefined,{timeout:10000});
  await waitPreview(targetPage);await waitGrounded(targetPage);
  for(const scale of [48,60,72]){
    await resetPreview(targetPage);
    await targetPage.locator(`[data-preview-scale="${scale}"]`).click();
    await targetPage.waitForFunction((expected)=>window.__CROWNFLARE_QA__?.snapshot().preview?.reviewScale===expected,scale,{timeout:1500});
    await assertPresentation(targetPage);
    await targetPage.keyboard.down('d');
    await targetPage.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().preview?.playerX>=680,undefined,{timeout:10000});
    await targetPage.keyboard.up('d');
    await waitGrounded(targetPage);
    for(const action of ['idle','run','jump','dash','combo']){
      for(const facing of ['left','right']){
        const direction=facing==='left'?'a':'d';
        await face(targetPage,direction);
        if(action==='run'){
          await targetPage.keyboard.down(direction);await targetPage.waitForTimeout(450);await captureActorCrop(targetPage,scale,action,facing);await targetPage.keyboard.up(direction);
        }else if(action==='jump'){
          await targetPage.keyboard.down(direction);await targetPage.keyboard.down('Space');await targetPage.waitForTimeout(200);await captureActorCrop(targetPage,scale,action,facing);await targetPage.keyboard.up('Space');await targetPage.keyboard.up(direction);await waitGrounded(targetPage);
        }else if(action==='dash'){
          await targetPage.keyboard.down(direction);await targetPage.keyboard.down('Shift');await targetPage.waitForTimeout(65);await captureActorCrop(targetPage,scale,action,facing);await targetPage.keyboard.up('Shift');await targetPage.keyboard.up(direction);await targetPage.waitForTimeout(350);
        }else if(action==='combo'){
          await tapKey(targetPage,'j');
          await targetPage.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().preview?.comboStep===1,undefined,{timeout:1200});
          await tapKey(targetPage,'j');
          await targetPage.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().preview?.comboStep===2,undefined,{timeout:1500});
          await targetPage.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().preview?.frame==='combo-2-contact',undefined,{timeout:700});
          await captureActorCrop(targetPage,scale,action,facing);
          await targetPage.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().preview?.attackPhase==='idle',undefined,{timeout:1800});
        }else{
          await targetPage.waitForTimeout(220);await captureActorCrop(targetPage,scale,action,facing);
        }
      }
    }
  }
}

try{
  await mkdir(evidence,{recursive:true});await mkdir(recordings,{recursive:true});await mkdir(cropDir,{recursive:true});
  assert(await ready(`http://127.0.0.1:${port}/`),'Vite failed to start: '+serverErrors);
  browser=await chromium.launch({channel:'chrome',headless:false,args:['--use-gl=angle','--use-angle=swiftshader']});
  context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:recordings,size:{width:1280,height:720}}});
  page=await context.newPage();
  page.on('pageerror',(error)=>errors.push('runtime: '+error.message));
  page.on('console',(message)=>{if(message.type()==='error')errors.push('console: '+message.text());});
  const videoStartedAt=Date.now();
  await page.goto(`http://127.0.0.1:${port}/?ionaPreview=1&b02diag=1`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().screen==='title',undefined,{timeout:10000});
  titleAt=Date.now();
  assert(await page.locator('#preview-notice').isVisible(),'The dev-only title notice is missing');
  assert(/PROVISIONAL GAMEPLAY ART/.test(await page.locator('#title-metadata').innerText()),'The title does not disclose provisional artwork');
  await page.screenshot({path:path.join(evidence,'b02-title-preview.png')});
  await page.getByRole('button',{name:/enter the spindle/i}).click();
  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().screen==='ionaPreview',undefined,{timeout:15000});
  await waitPreview();await waitGrounded();
  gameplayStartAt=Date.now();
  const initial=await snapshot();
  assert(initial.preview.loadedTextures===70&&initial.preview.missingTextures.length===0,'Preview must load all 70 B01E textures without missing assets: '+JSON.stringify(initial.preview));
  assert(initial.preview.audioAssetsLoaded===13,'Preview must load all 13 original WAVs');
  assert(initial.player?.bodySize.width===15&&initial.player?.bodySize.height===30,'The existing 15x30 movement body changed');
  assert(initial.preview.reviewScale===60&&initial.preview.vfxEnabled===false&&initial.preview.background==='calm','Preview must start at calm 60px with VFX off');
  await assertPresentation();
  await startPresentationAudit();
  assert(await page.locator('#preview-tools').isVisible(),'The owner-facing scale and audio controls are not visible in play');
  await page.evaluate(()=>{
    window.__B02_COMBAT_EVENTS__=[];window.__B02_AUDIO_EVENTS__=[];
    window.addEventListener('crownflare:combat-event',(event)=>window.__B02_COMBAT_EVENTS__.push(event.detail));
    window.addEventListener('crownflare:audio-event',(event)=>window.__B02_AUDIO_EVENTS__.push(event.detail));
  });
  await page.screenshot({path:path.join(evidence,'b02-preview-start-60px.png')});

  // Real pointer attack from outside range unlocks browser audio and verifies mouse combat support.
  const canvasBox=await page.locator('#game-root canvas').boundingBox();
  await page.mouse.click(canvasBox.x+canvasBox.width-8,canvasBox.y+32);
  await page.waitForFunction(()=>window.__B02_COMBAT_EVENTS__.length>=1,undefined,{timeout:2000});
  let state=await snapshot();
  assert(state.preview.lastCombatEvent.startsWith('MISS /')&&state.preview.targetHealth===3,'Out-of-range pointer attack did not produce a miss');
  logAction('mouse-combo-whiff',{x:state.player.x,targetX:state.preview.targetX});
  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().preview?.audioUnlocked===true,undefined,{timeout:4000}).catch(()=>{});

  // Audio review panel auditions actual, individual WAVs and guards mute/volume.
  const cueNames=['step-a','step-b','jump','land','dash-start','dash-brake','palm-whoosh','palm-hit','kick-whoosh','kick-hit','forearm-whoosh','forearm-hit','miss'];
  assert((await previewState()).audioAssetsLoaded===13,'WAV cache changed before audition');
  const auditionStart=await page.evaluate(()=>window.__B02_AUDIO_EVENTS__.length);
  for(const cue of cueNames){
    await page.selectOption('#preview-audio-cue',cue);
    await page.locator('#preview-audio-play').click();
    await page.waitForTimeout(310);
  }
  const auditionEvents=await page.evaluate((start)=>window.__B02_AUDIO_EVENTS__.slice(start).map((event)=>event.cue),auditionStart);
  assert(cueNames.every((cue)=>auditionEvents.includes(cue)),'Audio audition did not play every cue: '+auditionEvents.join(','));
  await page.locator('#preview-audio-volume').click();
  await page.locator('#preview-audio-volume').evaluate((element)=>{element.value='0.50';element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true}));});
  assert(Math.abs((await previewState()).audioVolume-.5)<.01&&await page.evaluate(()=>document.activeElement===document.querySelector('#game-root canvas')),'Visible audio volume control failed or did not return keyboard focus to the game');
  await page.locator('#preview-audio-toggle').click();
  const beforeMutedPlay=await page.evaluate(()=>window.__B02_AUDIO_EVENTS__.length);
  await page.selectOption('#preview-audio-cue','jump');await page.locator('#preview-audio-play').click();await page.waitForTimeout(120);
  assert((await previewState()).audioEnabled===false&&await page.evaluate(()=>window.__B02_AUDIO_EVENTS__.length)===beforeMutedPlay,'Muted cue audition emitted audio');
  await page.locator('#preview-audio-toggle').click();
  logAction('auditioned-13-original-cues');

  // Scale buttons change only rendered size; the collision body remains 15x30.
  const scaleInvariant={width:initial.player.bodySize.width,height:initial.player.bodySize.height};
  for(const scale of [48,72,60]){
    await page.locator(`[data-preview-scale="${scale}"]`).click();
    await page.waitForFunction((expected)=>window.__CROWNFLARE_QA__?.snapshot().preview?.reviewScale===expected,scale,{timeout:1500});
    state=await snapshot();
    assert(state.player.bodySize.width===scaleInvariant.width&&state.player.bodySize.height===scaleInvariant.height,`Scale ${scale} changed collision dimensions`);
    await assertPresentation();
    if(scale!==60)await page.screenshot({path:path.join(evidence,`b02-scale-${scale}.png`)});
  }
  // 16:9 and 4:3 viewports preserve the game aspect and letterbox the latter.
  const canvas=page.locator('#game-root canvas');
  for(const viewport of [{width:1280,height:720},{width:1024,height:768}]){
    await page.setViewportSize(viewport);await page.waitForTimeout(120);
    const bounds=await canvas.boundingBox();
    assert(bounds&&Math.abs(bounds.width/bounds.height-16/9)<.02,'480x270 stage aspect changed at '+JSON.stringify(viewport));
    assert(bounds.x>=-1&&bounds.y>=-1&&bounds.x+bounds.width<=viewport.width+1&&bounds.y+bounds.height<=viewport.height+1,'Canvas clipped at '+JSON.stringify(viewport));
    const verticalBars=viewport.height-bounds.height;
    viewportChecks.push({viewport,canvas:{x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height},letterboxVerticalPx:verticalBars});
    if(viewport.width===1024)assert(verticalBars>=100,'4:3 viewport should letterbox the 16:9 canvas');
  }
  await page.setViewportSize({width:1280,height:720});

  // Target patrol is deterministic and moving; movement and both jump arcs use the unchanged sim.
  await resetPreview();
  const targetBefore=(await previewState()).targetX;await page.waitForTimeout(700);const targetAfter=(await previewState()).targetX;
  assert(Math.abs(targetAfter-targetBefore)>2,'Practice target did not move');
  const xBefore=(await snapshot()).player.x;
  await page.keyboard.down('d');await page.waitForTimeout(520);await page.keyboard.up('d');
  state=await snapshot();assert(state.player.x>xBefore+35&&state.player.facing===1,'Right movement/facing did not work');
  logAction('run-right',{x:state.player.x});
  const rightX=state.player.x;
  await page.keyboard.down('a');await page.waitForTimeout(520);await page.keyboard.up('a');
  state=await snapshot();assert(state.player.x<rightX-35&&state.player.facing===-1,'Left movement/reversal did not work');
  logAction('run-left-reversal',{x:state.player.x});
  await waitGrounded();await page.keyboard.down('Space');await page.waitForTimeout(90);await page.keyboard.up('Space');
  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().preview?.grounded===false,undefined,{timeout:1000});
  let shortApex=Infinity;
  while(!(await previewState()).grounded){shortApex=Math.min(shortApex,(await previewState()).playerY);await page.waitForTimeout(20);}
  await waitGrounded();
  await page.keyboard.down('Space');
  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().preview?.playerY<190,undefined,{timeout:1800}).catch(async(error)=>{throw new Error('Held jump did not reach the expected rise: '+JSON.stringify(await snapshot())+' / '+error.message);});
  let longApex=Infinity;
  for(let sample=0;sample<18;sample++){longApex=Math.min(longApex,(await previewState()).playerY);await page.waitForTimeout(20);}
  await page.keyboard.up('Space');
  assert(longApex<shortApex,`Held jump should rise higher than the short jump (short minimum y=${shortApex}, held minimum y=${longApex})`);
  await waitGrounded();logAction('short-and-held-jump',{shortApex,longApex});

  // A synthetic focus loss pauses and freezes the real chamber; resume restores canvas focus.
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().screen==='paused');
  pauseStartAt=Date.now();const frozen=(await snapshot()).player.y;
  await page.waitForTimeout(500);
  assert(Math.abs((await snapshot()).player.y-frozen)<.1,'Physics continued during focus-loss pause');
  await page.keyboard.press('Escape');await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().screen==='ionaPreview');
  pauseIntervals.push(Date.now()-pauseStartAt);pauseStartAt=0;
  assert(await page.evaluate(()=>document.activeElement===document.querySelector('#game-root canvas')),'Resume did not restore focus to the game canvas');
  logAction('synthetic-focus-pause-and-resume');

  // Solid barrier and camera are the original chamber geometry, not sprite-only scaling.
  await resetPreview();
  await page.keyboard.down('d');
  await page.waitForFunction(()=>{const x=window.__CROWNFLARE_QA__?.snapshot().player?.x;return x!==undefined&&x>=1070&&x<1113;},undefined,{timeout:14000});
  await page.keyboard.up('d');await waitGrounded();
  await page.keyboard.up('Shift');await page.waitForTimeout(80);await page.keyboard.down('Shift');
  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().player?.dashActive===true,undefined,{timeout:2500}).catch(async(error)=>{throw new Error('Dash did not activate at the barrier: '+JSON.stringify(await snapshot())+' / '+error.message);});
  await page.waitForTimeout(150);await page.keyboard.up('Shift');
  state=await snapshot();
  assert(state.player.x<=1113&&state.player.cameraX>0&&state.player.bodySize.width===15&&state.player.bodySize.height===30,'Dash crossed barrier or altered the player body: '+JSON.stringify(state.player));
  logAction('dash-solid-barrier',{x:state.player.x,cameraX:state.player.cameraX});

  // Holding J is a single press; successive J presses buffer palm -> kick -> forearm.
  await resetPreview();await approachTarget();
  let combatBefore=await page.evaluate(()=>window.__B02_COMBAT_EVENTS__.length);
  await page.keyboard.down('j');await page.waitForTimeout(520);await page.keyboard.up('j');await page.waitForTimeout(420);
  let combat=await page.evaluate(()=>window.__B02_COMBAT_EVENTS__);
  assert(combat.length-combatBefore===1,'Held/repeating J created more than one attack contact: '+JSON.stringify(combat.slice(combatBefore)));
  logAction('held-j-repeat-suppressed',{events:combat.length-combatBefore});
  await resetPreview();
  await page.evaluate(()=>{window.__B02_PREVIOUS_TARGET_X__=window.__CROWNFLARE_QA__?.snapshot().preview?.targetX;});
  await page.waitForFunction(()=>{
    const x=window.__CROWNFLARE_QA__?.snapshot().preview?.targetX;
    const previous=window.__B02_PREVIOUS_TARGET_X__;
    window.__B02_PREVIOUS_TARGET_X__=x;
    return x!==undefined&&previous!==undefined&&x<previous-.02;
  },undefined,{timeout:12000});
  await approachTarget();
  combatBefore=await page.evaluate(()=>window.__B02_COMBAT_EVENTS__.length);
  await tapKey(page,'j');await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().preview?.comboStep===1,undefined,{timeout:1000}).catch(async(error)=>{
    throw new Error('First buffered combo step did not begin: '+JSON.stringify({preview:await previewState(),events:await page.evaluate((start)=>window.__B02_COMBAT_EVENTS__.slice(start),combatBefore),focus:await page.evaluate(()=>document.activeElement?.tagName+'#'+document.activeElement?.id)})+' / '+error.message);
  });
  await tapKey(page,'j');await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().preview?.comboStep===2,undefined,{timeout:1800}).catch(async(error)=>{
    throw new Error('Second buffered combo step did not begin: '+JSON.stringify({preview:await previewState(),events:await page.evaluate((start)=>window.__B02_COMBAT_EVENTS__.slice(start),combatBefore)})+' / '+error.message);
  });
  await tapKey(page,'j');
  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().preview?.comboStep===3,undefined,{timeout:3500}).catch(async(error)=>{
    throw new Error('Third buffered combo step did not begin: '+JSON.stringify({preview:await previewState(),events:await page.evaluate((start)=>window.__B02_COMBAT_EVENTS__.slice(start),combatBefore)})+' / '+error.message);
  });
  await waitCombatCount(combatBefore+3,page,3000);
  combat=await page.evaluate((start)=>window.__B02_COMBAT_EVENTS__.slice(start),combatBefore);
  assert(combat.map((event)=>event.moveId).join(',')==='iona-base-combo-1,iona-base-combo-2,iona-base-combo-3','Buffered combo order differs: '+JSON.stringify(combat));
  assert(combat[0].atMs===112&&combat[1].atMs===138&&combat[2].atMs===165,'Authoritative contact times changed: '+JSON.stringify(combat));
  assert(combat.every((event)=>event.result==='hit'),'Combo should hit the nearby moving target: '+JSON.stringify(combat));
  assert((await previewState()).targetHealth===0,'Target health did not resolve three buffered hits');
  logAction('buffered-three-hit-combo',{contacts:combat.map(({moveId,atMs,result})=>({moveId,atMs,result}))});

  // A wrong-facing whiff leaves target HP unchanged and uses the miss cue, never impact.
  await resetPreview();await approachTarget();
  await page.keyboard.down('d');
  await page.waitForFunction(()=>{const s=window.__CROWNFLARE_QA__?.snapshot();return s?.preview?.playerX>=s?.preview?.targetX+58;},undefined,{timeout:3000});
  await page.keyboard.up('d');state=await snapshot();assert(state.preview.facing===1,'Miss setup should face away from the target');
  combatBefore=await page.evaluate(()=>window.__B02_COMBAT_EVENTS__.length);
  await tapKey(page,'j');await waitCombatCount(combatBefore+1,page,1800);
  const miss=(await page.evaluate((start)=>window.__B02_COMBAT_EVENTS__.slice(start),combatBefore))[0];
  assert(miss.result==='miss'&&(await previewState()).targetHealth===3,'Miss damaged the training target: '+JSON.stringify(miss));
  logAction('wrong-facing-combo-whiff',{result:miss.result,targetHealth:(await previewState()).targetHealth});

  // Thirty-second calm/VFX-off motion section at the initial 60px scale.
  await resetPreview();await page.locator('[data-preview-scale="60"]').click();
  state=await snapshot();assert(state.preview.reviewScale===60&&state.preview.vfxEnabled===false&&state.preview.background==='calm','Focused motion section must be VFX-off/calm/60px');
  focusedStartAt=Date.now();
  let focusLoop=0;
  while(Date.now()-focusedStartAt<28000){
    for(const direction of ['d','a']){
      await page.keyboard.down(direction);
      if(focusLoop%3===0){await page.keyboard.down('Space');await page.waitForTimeout(focusLoop%2===0?210:360);await page.keyboard.up('Space');}
      if(focusLoop%4===0){await page.keyboard.down('Shift');await page.waitForTimeout(125);await page.keyboard.up('Shift');}
      await page.waitForTimeout(680);await page.keyboard.up(direction);
      if(focusLoop%2===0)await tapKey(page,'j');
      await page.waitForTimeout(180);focusLoop++;
      if(Date.now()-focusedStartAt>=28000)break;
    }
  }
  focusedEndAt=Date.now();
  logAction('focused-calm-motion-section',{durationSeconds:Number(((focusedEndAt-focusedStartAt)/1000).toFixed(2)),scale:60,vfx:'off'});

  // The remaining capture time is filled with actual input-driven play, not a title screen or fixed wait.
  while(Date.now()-gameplayStartAt-pauseIntervals.reduce((sum,value)=>sum+value,0)<105000){
    for(const direction of ['d','a']){
      await page.keyboard.down(direction);
      const loop=actions.length;
      if(loop%3===0){await page.keyboard.down('Space');await page.waitForTimeout(240);await page.keyboard.up('Space');}
      if(loop%4===0){await page.keyboard.down('Shift');await page.waitForTimeout(130);await page.keyboard.up('Shift');}
      await page.waitForTimeout(720);await page.keyboard.up(direction);
      if(loop%2===0)await tapKey(page,'j');
      await page.waitForTimeout(220);
      if(Date.now()-gameplayStartAt-pauseIntervals.reduce((sum,value)=>sum+value,0)>=105000)break;
    }
  }
  gameplayEndAt=Date.now();
  const activeGameplaySeconds=Number(((gameplayEndAt-gameplayStartAt-pauseIntervals.reduce((sum,value)=>sum+value,0))/1000).toFixed(2));
  assert(activeGameplaySeconds>=100,'Preview capture contains less than 100 wall-clock seconds of active play');
  const finalPreview=await previewState();
  await assertPresentation();
  const presentationAudit=await page.evaluate(()=>window.__B02_PRESENTATION_AUDIT__);
  assert(presentationAudit.sampleCount>=100,`Presentation monitor sampled too few live Phaser ticks: ${JSON.stringify(presentationAudit)}`);
  assert(presentationAudit.violations.length===0,`Scale/anchor/body changed during movement: ${JSON.stringify(presentationAudit.violations.slice(0,5))}`);
  const audioEvents=await page.evaluate(()=>window.__B02_AUDIO_EVENTS__);
  const combatEvents=await page.evaluate(()=>window.__B02_COMBAT_EVENTS__);
  assert(errors.length===0,'Preview browser errors: '+errors.join(' | '));
  const videoHandle=page.video();
  recordingStoppedAt=Date.now();
  await context.close();context=null;
  const rawVideo=await videoHandle.path();
  mainVideoPath=path.join(evidence,'iona-b02-gameplay.webm');
  await unlink(mainVideoPath).catch(()=>{});
  await rename(rawVideo,mainVideoPath);
  mainVideoInfo=await probeVideo(mainVideoPath);
  assert(mainVideoInfo.durationSeconds>=90&&mainVideoInfo.durationSeconds<=150,'Gameplay WebM duration outside 90-150 seconds: '+JSON.stringify(mainVideoInfo));
  assert(mainVideoInfo.width===1280&&mainVideoInfo.height===720,'Unexpected capture dimensions: '+JSON.stringify(mainVideoInfo));
  const captureElapsedWallClockSeconds=(recordingStoppedAt-videoStartedAt)/1000;
  const videoTimeScale=mainVideoInfo.durationSeconds/captureElapsedWallClockSeconds;
  const estimatedActiveVideoSeconds=activeGameplaySeconds*videoTimeScale;
  const activeVideoFraction=estimatedActiveVideoSeconds/mainVideoInfo.durationSeconds;
  assert(estimatedActiveVideoSeconds>=90&&activeVideoFraction<=1,'Recorded video contains less than 90 estimated active-play seconds: '+JSON.stringify({estimatedActiveVideoSeconds,activeVideoFraction,mainVideoInfo,captureElapsedWallClockSeconds}));

  // Unrecorded shutdown check: quit the preview and prove subsequent keys cannot play sounds.
  lifecycleContext=await browser.newContext({viewport:{width:1280,height:720}});
  const lifecyclePage=await lifecycleContext.newPage();
  lifecyclePage.on('pageerror',(error)=>errors.push('lifecycle runtime: '+error.message));
  lifecyclePage.on('console',(message)=>{if(message.type()==='error')errors.push('lifecycle console: '+message.text());});
  await lifecyclePage.goto(`http://127.0.0.1:${port}/?ionaPreview=1&b02diag=1`,{waitUntil:'domcontentloaded'});
  await lifecyclePage.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().screen==='title');
  await lifecyclePage.getByRole('button',{name:/enter the spindle/i}).click();
  await lifecyclePage.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().screen==='ionaPreview');
  await lifecyclePage.evaluate(()=>{window.__B02_AUDIO_EVENTS__=[];window.addEventListener('crownflare:audio-event',(event)=>window.__B02_AUDIO_EVENTS__.push(event.detail));});
  await lifecyclePage.locator('#game-root canvas').click({position:{x:1100,y:20}});
  await lifecyclePage.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().preview?.audioUnlocked===true,undefined,{timeout:4000});
  await lifecyclePage.keyboard.press('Escape');await lifecyclePage.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().screen==='paused');
  await lifecyclePage.getByRole('button',{name:/return to title/i}).click();
  await lifecyclePage.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().screen==='title');
  const eventCountAfterQuit=await lifecyclePage.evaluate(()=>window.__B02_AUDIO_EVENTS__.length);
  await tapKey(lifecyclePage,'j');await lifecyclePage.waitForTimeout(250);
  assert(await lifecyclePage.evaluate(()=>window.__B02_AUDIO_EVENTS__.length)===eventCountAfterQuit,'Audio fired after quitting the preview');
  await makeComparisonBoard(lifecyclePage);
  const shrinkAfter=await captureLandingFrame(lifecyclePage);
  const shrinkComparison=await composeShrinkComparison(shrinkAfter);
  await lifecyclePage.screenshot({path:path.join(evidence,'iona-base-owner-compare-live.png')});
  await lifecycleContext.close();lifecycleContext=null;

  // A production Vite preview ignores ?ionaPreview=1&b02diag=1 and exposes no development QA hook.
  previewServer=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(previewPort),'--strictPort'],{stdio:'pipe'});
  let previewErrors='';previewServer.stderr.on('data',(buffer)=>previewErrors+=buffer.toString());
  assert(await ready(`http://127.0.0.1:${previewPort}/`),'Vite production preview failed: '+previewErrors);
  const productionContext=await browser.newContext({viewport:{width:1280,height:720}});
  const productionPage=await productionContext.newPage();
  await productionPage.goto(`http://127.0.0.1:${previewPort}/?ionaPreview=1&b02diag=1`,{waitUntil:'domcontentloaded'});
  assert(await productionPage.locator('#preview-notice').evaluate((node)=>node.classList.contains('hidden')),'Production build exposed the preview title notice');
  assert(await productionPage.locator('#preview-tools').evaluate((node)=>node.classList.contains('hidden')),'Production build exposed the preview controls');
  assert(await productionPage.evaluate(()=>window.__CROWNFLARE_QA__===undefined),'Production build exposed the development QA surface');
  await productionPage.getByRole('button',{name:/enter the spindle/i}).click();
  await productionPage.waitForSelector('#game-root canvas');
  assert(await productionPage.locator('#game-root canvas').getAttribute('aria-label')==='Crownflare playable test chamber','Production URL flag selected a non-B00 game scene');
  productionRouteIgnored=true;
  await productionContext.close();previewServer.kill();previewServer=null;

  const videoBytes=await readFile(mainVideoPath);
  const videoSha256=createHash('sha256').update(videoBytes).digest('hex');
  const gameplayStartVideoSeconds=(gameplayStartAt-videoStartedAt)/1000*videoTimeScale;
  const timedActions=actions.map(({seconds,...details})=>({secondsAfterGameplayStartWallClock:seconds,estimatedVideoSeconds:Number((gameplayStartVideoSeconds+seconds*videoTimeScale).toFixed(2)),...details}));
  const sourcePaths=[
    'index.html','package.json','src/style.css','src/main.ts','src/game/createGame.ts','src/game/input/InputController.ts',
    'src/game/movement/motion.ts','src/game/combat/sim.ts','src/game/scenes/ChamberScene.ts','src/game/preview/ionaPreviewGate.ts',
    'src/game/animation/ionaB01eAnimation.ts','src/game/animation/ionaB01eFrameMetrics.ts','src/game/animation/ionaPlayerPresentation.ts','src/game/audio/ionaB01eAudio.ts',
    'tools/audio/audit-iona-b01e-wav.py','tools/local-qa/iona-b02-movement-smoke.mjs','tests/unit/ionaPlayerPresentation.test.ts',
    'art-source/manifests/iona-b01e-candidate-v1.json','art-source/characters/iona/b01e/generation-provenance.json',
    'art-source/characters/iona/b01e/audio-provenance.json','tests/unit/ionaB01eProduction.test.ts','tests/unit/ionaB01fPreview.test.ts',
  ].sort();
  const digest=createHash('sha256');for(const file of sourcePaths)digest.update(file).update(await readFile(file));
  const report={
    status:'PASS',capturedAt:new Date().toISOString(),chrome:browser.version(),gitHeadAtCapture:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceSha256:digest.digest('hex'),
    video:{path:'review-evidence/b02/iona-b02-gameplay.webm',sha256:videoSha256,bytes:videoBytes.length,durationSeconds:mainVideoInfo.durationSeconds,width:mainVideoInfo.width,height:mainVideoInfo.height,rFrameRate:mainVideoInfo.rFrameRate,avgFrameRate:mainVideoInfo.avgFrameRate,audioTrackCaptured:mainVideoInfo.audioTrack,streams:mainVideoInfo.streams},
    recording:{videoCaptureWallClockSeconds:Number(captureElapsedWallClockSeconds.toFixed(2)),videoTimeScale:Number(videoTimeScale.toFixed(3)),titleWallClockSeconds:Number(((gameplayStartAt-titleAt)/1000).toFixed(2)),activeGameplayWallClockSeconds:activeGameplaySeconds,estimatedActiveVideoSeconds:Number(estimatedActiveVideoSeconds.toFixed(2)),pausedWallClockSeconds:Number((pauseIntervals.reduce((sum,value)=>sum+value,0)/1000).toFixed(2)),estimatedActiveVideoFraction:Number(activeVideoFraction.toFixed(3)),timingNote:'Action wall times are mapped to video time using the ratio of ffprobe duration to measured capture wall time; estimated video timestamps account for capture cadence.',focusedMotion:{startAfterGameplayWallClockSeconds:Number(((focusedStartAt-gameplayStartAt)/1000).toFixed(2)),estimatedVideoStartSeconds:Number((gameplayStartVideoSeconds+(focusedStartAt-gameplayStartAt)/1000*videoTimeScale).toFixed(2)),durationWallClockSeconds:Number(((focusedEndAt-focusedStartAt)/1000).toFixed(2)),estimatedVideoDurationSeconds:Number(((focusedEndAt-focusedStartAt)/1000*videoTimeScale).toFixed(2)),background:'calm',vfx:'off',scale:60}},
    preview:{runtimeTextures:finalPreview.loadedTextures,missingTextures:finalPreview.missingTextures,bodySize:finalPreview.bodySize,scaleModes:[48,60,72],targetHealth:finalPreview.targetHealth,audioAssetsLoaded:finalPreview.audioAssetsLoaded,audioCuesAuditioned:cueNames,audioUnlocked:finalPreview.audioUnlocked,productionRouteIgnored},
    presentationAudit,shrinkComparison,viewportChecks,actions:timedActions,combatEvents,audioEvents,errors,physicalController:'NOT TESTED',realTabHidden:'NOT TESTED; only synthetic blur pause was exercised',agentViewedAtNormalSpeed:false,agentPlaybackBlocker:'Native video playback bridge was unavailable; owner review remains pending.',agentListened:false,ownerListening:'PENDING_OWNER_REVIEW',ownerApproval:'PENDING_OWNER_REVIEW',comparisonCrops:comparisonRows.length,comparisonBoard:'review-evidence/b02/iona-base-owner-compare-live.png',screenshots:['b02-title-preview.png','b02-preview-start-60px.png','b02-scale-48.png','b02-scale-72.png','iona-b02-shrink-after.png','iona-b02-shrink-before-after.png'],
  };
  await writeFile(path.join(cropDir,'manifest.json'),JSON.stringify(comparisonRows,null,2)+'\n','utf8');
  await writeFile(path.join(evidence,'b02-qa-report.json'),JSON.stringify(report,null,2)+'\n','utf8');
  passed=true;
  console.log(`PASS: headed Chrome ${browser.version()} B02 playable preview / ${mainVideoInfo.durationSeconds.toFixed(2)}s ${mainVideoInfo.avgFrameRate} capture / estimated active video ${estimatedActiveVideoSeconds.toFixed(2)}s / audio stream ${mainVideoInfo.audioTrack?'present':'not captured'} / ${comparisonRows.length} real runtime comparison crops / production preview route ignored`);
  console.log(`Video SHA-256 ${videoSha256}; source SHA-256 ${report.sourceSha256}; evidence ${evidence}`);
}finally{
  if(lifecycleContext)await lifecycleContext.close().catch(()=>{});
  if(context)await context.close().catch(()=>{});
  if(browser)await browser.close().catch(()=>{});
  if(previewServer)previewServer.kill();
  server.kill();
  if(!passed)console.error('B02 preview smoke did not pass. Server output: '+serverErrors);
}
