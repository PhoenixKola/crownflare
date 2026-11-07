/** Real installed-Chrome, normal-speed smoke for the opt-in B01E motion/audio lab. */
import { spawn } from 'node:child_process';
import { mkdir, readdir, rename, stat, unlink, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port=4178;
const evidence=process.env.CROWNFLARE_QA_B01E_EVIDENCE??'review-evidence/b01e';
const recordings=path.join(evidence,'.recordings');
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'pipe'});
let serverErrors=''; server.stderr.on('data',(buffer)=>{serverErrors+=buffer.toString();});
let browser,context,page,lifecycleContext,passed=false,clipStart=0;
let videoDetails={durationSeconds:0,audioTrack:false};
const errors=[];
const assert=(ok,message)=>{if(!ok)throw new Error(message);};
const snapshot=()=>page.evaluate(()=>window.__CROWNFLARE_QA__?.snapshot());
const waitMode=(mode,timeout=4000)=>page.waitForFunction((expected)=>window.__CROWNFLARE_QA__?.snapshot().lab?.mode===expected,mode,{timeout});
async function waitGrounded(timeout=4000){await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().player?.grounded===true,undefined,{timeout});}
async function screenshot(name){await page.screenshot({path:path.join(evidence,name),animations:'allow'});}
async function approachFromRightOfTarget(){
  let state=await snapshot();
  await page.keyboard.down('d');
  for(let index=0;index<250;index++){
    state=await snapshot();
    if(state?.player?.x>=state.lab.targetX+36&&state.player.grounded&&state.lab.facing===1)break;
    await page.waitForTimeout(35);
  }
  await page.keyboard.up('d'); await waitGrounded(); return await snapshot();
}
async function approachLeftFacingRight(){
  let state=await snapshot();
  if(state.player.x>state.lab.targetX-42){
    await page.keyboard.down('a');
    for(let index=0;index<260;index++){
      state=await snapshot();
      if(state?.player?.x<=state.lab.targetX-42)break;
      await page.waitForTimeout(35);
    }
    await page.keyboard.up('a');
  }
  await page.keyboard.down('d');
  for(let index=0;index<160;index++){
    state=await snapshot();
    const gap=state.lab.targetX-state.player.x;
    if(gap>=33&&gap<=40&&state.player.grounded&&state.lab.facing===1)break;
    if(gap<30)break;
    await page.waitForTimeout(35);
  }
  await page.keyboard.up('d'); await waitGrounded(); return await snapshot();
}
async function runProbe(videoPath){
  const result=await new Promise((resolve)=>{
    const probe=spawn('ffprobe',['-v','error','-show_entries','format=duration','-show_entries','stream=codec_type','-of','json',videoPath],{stdio:['ignore','pipe','pipe']});
    let stdout='',stderr=''; probe.stdout.on('data',(chunk)=>stdout+=chunk.toString());probe.stderr.on('data',(chunk)=>stderr+=chunk.toString());
    probe.once('error',(error)=>resolve({error:error.message}));
    probe.once('close',(code)=>resolve(code===0?JSON.parse(stdout):{error:stderr||`ffprobe exit ${code}`}));
  });
  if(result.error)return {durationSeconds:0,audioTrack:false,probeError:result.error};
  return {durationSeconds:Number(result.format?.duration??0),audioTrack:(result.streams??[]).some((stream)=>stream.codec_type==='audio'),probeError:null};
}

try{
  await mkdir(recordings,{recursive:true});
  let ready=false;
  for(let index=0;index<60;index++){
    try{const response=await fetch(`http://127.0.0.1:${port}`);if(response.ok){ready=true;break;}}catch{}
    if(server.exitCode!==null)break; await delay(250);
  }
  assert(ready,'Vite did not start: '+serverErrors);
  browser=await chromium.launch({channel:'chrome',headless:false,args:['--use-gl=angle','--use-angle=swiftshader']});
  context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:recordings,size:{width:1280,height:720}}});
  page=await context.newPage();
  page.on('pageerror',(error)=>errors.push('runtime: '+error.message));
  page.on('console',(message)=>{if(message.type()==='error')errors.push('console: '+message.text());});
  await page.goto(`http://127.0.0.1:${port}/?animationLab=1&b01e=1`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().screen==='animationLab',undefined,{timeout:15000});
  clipStart=Date.now(); await waitGrounded(5000);
  let state=await snapshot();
  assert(state.lab?.candidateVersion==='B01E'&&state.lab.artSource==='b01e-candidate','The route did not select B01E: '+JSON.stringify(state.lab));
  assert(state.lab?.assetCount===210&&state.lab.missingAssets.length===0,'Expected 70 E + 68 D + 72 C textures without missing assets: '+JSON.stringify(state.lab));
  assert(state.lab?.vfxEnabled===false,'VFX must begin disabled');
  assert(state.lab?.audioEnabled===true&&state.lab.audioVolume>0&&state.lab.audioPaused===false,'Audio should be enabled and ready for user unlock');
  assert(state.lab?.audioAssetsLoaded===13,'All 13 original WAV cues must be in Phaser audio cache: '+JSON.stringify(state.lab));
  assert(state.player?.bodySize.width===15&&state.player.bodySize.height===30,'B00 physics body changed: '+JSON.stringify(state.player?.bodySize));
  assert(await page.locator('#hud').evaluate((hud)=>hud.classList.contains('hidden')&&getComputedStyle(hud).display==='none'),'Shipping HUD leaked into the development lab');
  await page.evaluate(()=>{
    window.__B01E_COMBAT_EVENTS__=[];window.__B01E_AUDIO_EVENTS__=[];
    window.addEventListener('crownflare:combat-event',(event)=>window.__B01E_COMBAT_EVENTS__.push(event.detail));
    window.addEventListener('crownflare:audio-event',(event)=>window.__B01E_AUDIO_EVENTS__.push(event.detail));
  });
  await page.waitForTimeout(420); assert((await snapshot()).lab?.mode==='idle','B01E idle did not start');
  await screenshot('iona-b01e-idle-60.png');

  // The C/D/E selector changes only the displayed textures; combat and physics state remain fixed.
  const beforeSwitch=await snapshot();
  await page.keyboard.press('t'); await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.artSource==='b01c-native');
  await page.keyboard.press('t'); await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.artSource==='b01d-candidate');
  await page.keyboard.press('t'); await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.artSource==='b01e-candidate');
  state=await snapshot();
  assert(state.player.x===beforeSwitch.player.x&&state.player.y===beforeSwitch.player.y&&state.player.facing===beforeSwitch.player.facing&&state.player.bodySize.width===15&&state.player.bodySize.height===30,'A/B/C switch changed movement or collision state');
  assert(state.lab.targetHealth===beforeSwitch.lab.targetHealth&&state.lab.attackPhase==='idle','A/B/C switch changed combat state');
  await screenshot('iona-b01e-ab-cde.png');

  // One global 60px-based scale applies to every version and every pose in this route.
  for(const [key,size,scale] of [['1',48,.8],['2',60,1],['3',72,1.2]]){
    await page.keyboard.press(key);
    await page.waitForFunction((expected)=>Math.abs((window.__CROWNFLARE_QA__?.snapshot().lab?.spriteScale??0)-expected)<.01,scale);
    state=await snapshot(); assert(Math.abs(state.lab.spriteScale-scale)<.01,`Global scale ${size}px was not preserved`);
    if(size!==60)await screenshot(`iona-b01e-scale-${size}.png`);
  }
  await page.keyboard.press('v');await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.vfxEnabled===true);
  await page.keyboard.press('v');await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.vfxEnabled===false);
  await page.keyboard.press('c');await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.contrast==='light');
  await page.keyboard.press('c');await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.contrast==='busy');
  await page.keyboard.press('c');await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.contrast==='calm');
  await page.keyboard.press('r');await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.reviewVisible===true);
  await screenshot('iona-b01e-review-panel.png');
  await page.keyboard.press('r');await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.reviewVisible===false);

  // Any real user key gesture unlocks Phaser audio; M toggles only the lab mix.
  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.audioUnlocked===true,undefined,{timeout:3000});
  assert((await snapshot()).lab.audioEnabled===true,'Audio unexpectedly muted during unlock');
  const volumeBefore=(await snapshot()).lab.audioVolume;
  await page.keyboard.press(']');assert((await snapshot()).lab.audioVolume>volumeBefore,'Volume control did not raise the lab mix');

  // Run startup, contacts and braking in both independently-authored directions.
  await page.keyboard.down('d');await waitMode('start');await waitMode('run');
  const rightFrames=new Set();
  for(let index=0;index<12;index++){await page.waitForTimeout(45);state=await snapshot();if(state.lab.mode==='run')rightFrames.add(state.lab.frame);}
  assert(rightFrames.size>=2,'Right run did not animate across contact and passing frames: '+[...rightFrames]);
  await screenshot('iona-b01e-run-right.png');await page.keyboard.up('d');await waitMode('stop');await page.waitForTimeout(170);
  await page.keyboard.down('a');await waitMode('start');await waitMode('run');
  const leftFrames=new Set();
  for(let index=0;index<12;index++){await page.waitForTimeout(45);state=await snapshot();if(state.lab.mode==='run')leftFrames.add(state.lab.frame);}
  assert(leftFrames.size>=2&&state.lab.facing===-1,'Left run did not use authored left-facing motion: '+JSON.stringify(state.lab));
  await screenshot('iona-b01e-run-left.png');await page.keyboard.up('a');await waitMode('stop');await page.waitForTimeout(170);

  // Movement uses unchanged B00 physics for jump, supported landing and the solid dash barrier.
  await waitGrounded();await page.keyboard.down('Space');await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.mode==='jumpRise',undefined,{timeout:3000});
  await waitMode('jumpApex',1800);await waitMode('fall',1800);await page.keyboard.up('Space');await waitMode('land',2500);await waitGrounded(3500);
  await screenshot('iona-b01e-jump-land.png');
  await page.keyboard.down('d');
  await page.waitForFunction(()=>{const x=window.__CROWNFLARE_QA__?.snapshot().player?.x;return x!==undefined&&x>=1070&&x<1110;},undefined,{timeout:16000});
  await page.keyboard.up('d');await waitGrounded();
  await page.keyboard.down('Shift');await waitMode('dash',1200);await page.keyboard.up('Shift');await waitMode('dashRecover',1500);
  state=await snapshot();assert(state.player.x<=1110&&state.player.bodySize.width===15&&state.player.bodySize.height===30,'Dash crossed the unchanged solid barrier/body: '+JSON.stringify(state.player));

  // Miss has a clear air cue and no confirmed impact; pause freezes an attack windup.
  state=await approachFromRightOfTarget();
  assert(state.player.x>state.lab.targetX&&state.lab.facing===1,'Could not place Iona for a behind-target miss');
  await page.keyboard.press('j');await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.comboStep===1&&window.__CROWNFLARE_QA__?.snapshot().lab?.attackPhase==='startup');
  await page.keyboard.press('Escape');await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().screen==='paused');
  const paused=await snapshot();assert(paused.lab.audioPaused===true&&paused.lab.attackPhase==='startup','Pause did not stop audio / freeze startup');
  await page.waitForTimeout(220);state=await snapshot();assert(state.lab.attackPhase===paused.lab.attackPhase&&state.lab.frame===paused.lab.frame,'Paused windup advanced');
  await page.getByRole('button',{name:'RESUME'}).click();await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().screen==='animationLab');
  assert((await snapshot()).lab.audioPaused===false,'Audio did not resume into a stopped, safe state');
  await page.waitForFunction(()=>window.__B01E_COMBAT_EVENTS__?.length===1,undefined,{timeout:1800});
  state=await snapshot();assert(state.lab.lastCombatEvent.startsWith('MISS /')&&state.lab.targetHealth===3,'Wrong-facing move should miss with no damage');
  let cues=await page.evaluate(()=>window.__B01E_AUDIO_EVENTS__.map((event)=>event.cue));
  assert(cues.includes('palm-whoosh')&&cues.includes('miss')&&!cues.includes('palm-hit'),'Miss audio mismatch; cues='+cues.join(',')+' snapshot='+JSON.stringify(state.lab)+' browserErrors='+errors.join(' | '));
  await screenshot('iona-b01e-combo-miss.png');await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.attackPhase==='idle',undefined,{timeout:1800});

  // A successful side-kick selects the generated windup pair/contact and resolves on the authoritative hit clock.
  state=await approachLeftFacingRight();
  assert(state.player.x<state.lab.targetX&&state.lab.facing===1&&state.lab.targetX-state.player.x<=42,'Could not establish right-facing kick contact range');
  await page.keyboard.press('j');await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.comboStep===1&&window.__CROWNFLARE_QA__?.snapshot().lab?.attackPhase==='startup');
  await page.keyboard.press('j');
  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.comboStep===2&&window.__CROWNFLARE_QA__?.snapshot().lab?.attackPhase==='startup',undefined,{timeout:1600});
  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.frame==='combo-2-windup-1',undefined,{timeout:400});
  state=await snapshot();assert(state.lab.candidateVersion==='B01E'&&state.lab.frame==='combo-2-windup-1','New authored side-kick windup texture was not selected');
  await screenshot('iona-b01e-sidekick-windup-2.png');
  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.frame==='combo-2-contact',undefined,{timeout:500});
  await page.waitForFunction(()=>window.__B01E_COMBAT_EVENTS__?.length>=2,undefined,{timeout:1400}).catch(async(error)=>{
    throw new Error('Side-kick contact event timeout: '+JSON.stringify({snapshot:await snapshot(),events:await page.evaluate(()=>window.__B01E_COMBAT_EVENTS__),audio:await page.evaluate(()=>window.__B01E_AUDIO_EVENTS__.map((event)=>event.cue))})+' / '+error.message);
  });
  state=await snapshot();assert(state.lab.frame==='combo-2-contact'&&state.lab.targetHealth===1&&state.lab.lastCombatEvent.startsWith('HIT /'),'Side-kick image contact and simulation hit did not align: '+JSON.stringify(state.lab));
  cues=await page.evaluate(()=>window.__B01E_AUDIO_EVENTS__.map((event)=>event.cue));
  assert(cues.includes('kick-whoosh')&&cues.includes('kick-hit')&&cues.filter((cue)=>cue==='kick-hit').length===1,'Kick impact was missing or duplicated: '+cues.join(','));
  await screenshot('iona-b01e-sidekick-contact.png');await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.attackPhase==='idle',undefined,{timeout:1800});

  // Mute suppresses all subsequent sounds, and a simulated focus loss pauses the route safely.
  await page.keyboard.press('m');await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.audioEnabled===false);
  const cueCountBeforeMute=(await page.evaluate(()=>window.__B01E_AUDIO_EVENTS__.length));
  await page.keyboard.press('j');await page.waitForTimeout(180);assert((await page.evaluate(()=>window.__B01E_AUDIO_EVENTS__.length))===cueCountBeforeMute,'Muted audio emitted a new event');
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().screen==='paused');
  assert((await snapshot()).lab.audioPaused===true,'Focus loss did not stop the sound manager');
  await page.getByRole('button',{name:'RESUME'}).click();await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().screen==='animationLab');

  // Viewport adaptation is separate from pixel scale; keep the same canvas uncropped.
  const canvas=page.locator('#game-root canvas');
  for(const viewport of [{width:960,height:540},{width:1280,height:720},{width:1680,height:945}]){
    await page.setViewportSize(viewport);await page.waitForTimeout(80);
    const bounds=await canvas.boundingBox();
    assert(bounds&&bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=viewport.width+1&&bounds.y+bounds.height<=viewport.height+1,'Canvas clipped at '+JSON.stringify(viewport));
  }
  await page.setViewportSize({width:1280,height:720});
  const uniqueTokens=await page.evaluate(()=>new Set(window.__B01E_AUDIO_EVENTS__.map((event)=>event.token)).size);
  const audioEvents=await page.evaluate(()=>window.__B01E_AUDIO_EVENTS__);
  const combatEvents=await page.evaluate(()=>window.__B01E_COMBAT_EVENTS__);
  assert(uniqueTokens===audioEvents.length,'A sound presentation token repeated');
  assert(errors.length===0,'Browser errors: '+errors.join(' | '));

  // Extend the capture with active movement in both directions; never pad it at title.
  await page.keyboard.press('m');
  let motionLoop=0;
  while(Date.now()-clipStart<76000){
    for(const direction of ['d','a']){
      if(Date.now()-clipStart>=76000)break;
      await page.keyboard.down(direction);
      if(motionLoop%3===0){await page.keyboard.down('Space');await page.waitForTimeout(260);await page.keyboard.up('Space');}
      if(motionLoop%4===0){await page.keyboard.down('Shift');await page.waitForTimeout(125);await page.keyboard.up('Shift');}
      await page.waitForTimeout(720);await page.keyboard.up(direction);
      if(motionLoop%2===0)await page.keyboard.press('j');
      await page.waitForTimeout(280);motionLoop++;
    }
  }
  const activeGameplayMs=Date.now()-clipStart;
  assert(activeGameplayMs>=75000,'B01E capture did not contain at least 75 seconds of active route time');
  assert(errors.length===0,'Browser errors during B01E gameplay: '+errors.join(' | '));
  await context.close();context=null;
  const files=(await readdir(recordings)).filter((file)=>file.endsWith('.webm'));
  assert(files.length>0,'Chrome did not capture a real-time WebM');
  const latest=(await Promise.all(files.map(async(file)=>({file,mtime:(await stat(path.join(recordings,file))).mtimeMs})))).sort((left,right)=>right.mtime-left.mtime)[0];
  const finalVideo=path.join(evidence,'iona-b01e-gameplay-75s.webm');await rename(path.join(recordings,latest.file),finalVideo);
  for(const file of await readdir(recordings))await unlink(path.join(recordings,file)).catch(()=>{});
  videoDetails=await runProbe(finalVideo);
  assert(videoDetails.durationSeconds>=70,'Active gameplay clip is shorter than 70 seconds: '+JSON.stringify(videoDetails));

  // Verify shutdown/no-post-quit audio in a separate unrecorded route.
  lifecycleContext=await browser.newContext({viewport:{width:1280,height:720}});
  const lifecyclePage=await lifecycleContext.newPage();
  lifecyclePage.on('pageerror',(error)=>errors.push('lifecycle runtime: '+error.message));
  lifecyclePage.on('console',(message)=>{if(message.type()==='error')errors.push('lifecycle console: '+message.text());});
  await lifecyclePage.goto(`http://127.0.0.1:${port}/?animationLab=1&b01e=1`,{waitUntil:'domcontentloaded'});
  await lifecyclePage.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().screen==='animationLab');
  await lifecyclePage.evaluate(()=>{window.__B01E_AUDIO_EVENTS__=[];window.addEventListener('crownflare:audio-event',(event)=>window.__B01E_AUDIO_EVENTS__.push(event.detail));});
  await lifecyclePage.locator('#game-root canvas').click();
  await lifecyclePage.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.audioUnlocked===true,undefined,{timeout:4000});
  await lifecyclePage.selectOption('#preview-audio-cue','jump').catch(()=>{});
  await lifecyclePage.keyboard.press('j');
  await lifecyclePage.waitForTimeout(120);
  await lifecyclePage.keyboard.press('Escape');
  await lifecyclePage.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().screen==='paused');
  await lifecyclePage.getByRole('button',{name:/return to title/i}).click();
  await lifecyclePage.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().screen==='title');
  const cueCountAfterQuit=await lifecyclePage.evaluate(()=>window.__B01E_AUDIO_EVENTS__.length);
  await lifecyclePage.keyboard.press('j');await lifecyclePage.waitForTimeout(220);
  assert(await lifecyclePage.evaluate(()=>window.__B01E_AUDIO_EVENTS__.length)===cueCountAfterQuit,'Input after leaving the lab emitted audio');
  assert(errors.length===0,'Browser errors after lab exit: '+errors.join(' | '));
  await lifecycleContext.close();lifecycleContext=null;
  const digestPaths=[
    'src/game/animation/ionaB01cAnimation.ts','src/game/animation/ionaB01dAnimation.ts','src/game/animation/ionaB01eAnimation.ts','src/game/animation/ionaB01eFrameMetrics.ts',
    'src/game/audio/ionaB01eAudio.ts','src/game/combat/sim.ts','src/game/input/InputController.ts','src/game/scenes/ChamberScene.ts','src/main.ts',
    'tools/art-export/build-iona-b01e.py','tools/art-export/audit-iona-b01e.py','tools/audio/generate-iona-b01e-sfx.py','tools/local-qa/iona-b01e-production-smoke.mjs',
    'art-source/manifests/iona-b01e-candidate-v1.json','art-source/characters/iona/b01e/generation-provenance.json','art-source/characters/iona/b01e/audio-provenance.json',
    'tests/unit/ionaB01eProduction.test.ts','package.json',
  ].sort();
  const sourceDigest=createHash('sha256');
  for(const file of digestPaths){sourceDigest.update(file);sourceDigest.update(await readFile(file));}
  const videoBytes=await readFile(finalVideo),videoHash=createHash('sha256').update(videoBytes).digest('hex');
  const report={
    status:'PASS',date:new Date().toISOString(),chrome:browser.version(),sourceSha256:sourceDigest.digest('hex'),video:path.join(evidence,'iona-b01e-gameplay-75s.webm').replaceAll('\\','/'),videoSha256:videoHash,videoBytes:videoBytes.length,videoDurationSeconds:videoDetails.durationSeconds,activeGameplaySeconds:Number((activeGameplayMs/1000).toFixed(2)),titlePaddingSeconds:0,
    audioTrackCaptured:videoDetails.audioTrack,audioTrackProbeError:videoDetails.probeError??null,agentViewedAtNormalSpeed:false,agentPlaybackBlocker:'CUA reported the native app pipe and browser access host unavailable.',agentListened:false,ownerAudioReview:'PENDING_OWNER_REVIEW',ownerApproval:'PENDING_OWNER_REVIEW',
    runtimeTextures:210,candidateFrames:70,bodySize:'15x30',scaleModes:[48,60,72],selector:['B01C','B01D','B01E'],audioCues:13,audioEvents,combatEvents,errors,syntheticFocusPause:true,
    visualChecks:['B01C/B01D/B01E selector preserves body, facing, health and combo state','same global scale at 48/60/72 without per-frame fitting in the E route','run both authored facings','jump/landing and solid dash barrier with 15x30 body','B01E side-kick second windup and contact texture at the 138ms simulation event','hit and miss audio cues, duplicate event suppression, mute and volume controls','VFX off default/toggle and calm/light/busy backgrounds','pause during startup, simulated focus loss, resize'],
  };
  await writeFile(path.join(evidence,'qa-report-active-gameplay.json'),JSON.stringify(report,null,2)+'\n','utf8');
  passed=true;
  console.log('PASS: real Chrome B01E route / 70 E + 68 D + 68 C textures / 15x30 body / C-D-E selector / movement, jump, barrier dash, sidekick, hit/miss and Phaser audio events');
  console.log(`Chrome ${browser.version()} / ${Math.round(videoDetails.durationSeconds)}s real-time clip / audio stream ${videoDetails.audioTrack?'present':'not captured'} / agent watched and listened NO / source SHA-256 ${report.sourceSha256}`);
  console.log('Evidence: '+evidence);
}finally{
  if(lifecycleContext)await lifecycleContext.close().catch(()=>{});
  if(context)await context.close().catch(()=>{});
  if(browser)await browser.close().catch(()=>{});
  server.kill();
  if(!passed)console.error('FAIL: '+errors.join(' | '));
}
