/** Installed-Chrome proof for the provisional B01C Base movement and pixel-production pilot. */
import { spawn } from 'node:child_process';
import { mkdir, readdir, rename, stat, unlink, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port=4176;
// Regression runs may target ignored test evidence so they never overwrite the committed owner-review package.
const evidence=process.env.CROWNFLARE_QA_B01C_EVIDENCE??'review-evidence/b01c';
const recordings=path.join(evidence,'.recordings');
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'pipe'});
let serverErrors='';
server.stderr.on('data',(buf)=>{serverErrors+=buf.toString();});
let browser,context,page,passed=false;
let clipStart=0;
const errors=[];
const assert=(ok,message)=>{if(!ok)throw new Error(message);};
const snapshot=()=>page.evaluate(()=>window.__CROWNFLARE_QA__?.snapshot());
const waitMode=(mode,timeout=4000)=>page.waitForFunction((expected)=>window.__CROWNFLARE_QA__?.snapshot().lab?.mode===expected,mode,{timeout});
async function waitForLab(){await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().screen==='animationLab',undefined,{timeout:15000});}
async function approachTargetFromLeft(){
  let state=await snapshot();
  for(let i=0;i<160;i++){
    const gap=state.lab.targetX-state.player.x;
    if(gap>=30&&gap<=42&&state.player.grounded&&state.lab.facing===1)return state;
    const direction=gap>42?'d':'a';
    await page.keyboard.down(direction); await page.waitForTimeout(20); await page.keyboard.up(direction); await page.waitForTimeout(55);
    state=await snapshot();
  }
  return state;
}
async function approachTargetFromRight(){
  let state=await snapshot();
  for(let i=0;i<160;i++){
    const gap=state.lab.targetX-state.player.x;
    if(gap<=-30&&gap>=-42&&state.player.grounded&&state.lab.facing===1)return state;
    const direction=gap<-42?'a':gap>-30?'d':'d';
    await page.keyboard.down(direction); await page.waitForTimeout(20); await page.keyboard.up(direction); await page.waitForTimeout(55);
    state=await snapshot();
  }
  return state;
}
async function approachTargetFromLeftFacingLeft(){
  let state=await snapshot();
  for(let i=0;i<180;i++){
    const gap=state.lab.targetX-state.player.x;
    if(gap>=30&&gap<=42&&state.player.grounded&&state.lab.facing===-1)return state;
    const direction=gap>42?'d':'a';
    await page.keyboard.down(direction); await page.waitForTimeout(20); await page.keyboard.up(direction); await page.waitForTimeout(55);
    state=await snapshot();
  }
  return state;
}
async function screenshot(name){await page.screenshot({path:path.join(evidence,name),animations:'allow'});}
async function waitGrounded(timeout=4000){await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().player?.grounded===true,undefined,{timeout});}
async function probeVideo(videoPath){
  const probe=spawn('ffprobe',['-v','error','-show_entries','format=duration','-show_entries','stream=codec_type','-of','json',videoPath],{stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='';
  probe.stdout.on('data',(chunk)=>{stdout+=chunk.toString();});
  probe.stderr.on('data',(chunk)=>{stderr+=chunk.toString();});
  const exitCode=await new Promise((resolve,reject)=>{probe.once('error',reject);probe.once('close',resolve);});
  if(exitCode!==0)throw new Error('ffprobe failed: '+stderr);
  return JSON.parse(stdout);
}

try {
  await mkdir(recordings,{recursive:true});
  let ready=false;
  for(let i=0;i<60;i++){
    try{const response=await fetch('http://127.0.0.1:'+port);if(response.ok){ready=true;break;}}catch{}
    if(server.exitCode!==null)break;
    await delay(250);
  }
  assert(ready,'Vite did not start: '+serverErrors);
  browser=await chromium.launch({channel:'chrome',headless:false,args:['--use-gl=angle','--use-angle=swiftshader']});
  context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:recordings,size:{width:1280,height:720}}});
  page=await context.newPage();
  page.on('pageerror',(error)=>errors.push('runtime: '+error.message));
  page.on('console',(message)=>{if(message.type()==='error')errors.push('console: '+message.text());});
  await page.goto('http://127.0.0.1:'+port+'/?animationLab=1&b01c=1',{waitUntil:'domcontentloaded'});
  await waitForLab();
  clipStart=Date.now();
  await waitGrounded(5000);
  let state=await snapshot();
  assert(state.lab?.artSource==='b01c-native','B01C did not select its native-image runtime: '+JSON.stringify(state.lab));
  assert(state.lab?.assetCount===72&&state.lab.missingAssets.length===0,'B01C frames missing: '+JSON.stringify(state.lab));
  assert(state.player?.bodySize.width===15&&state.player.bodySize.height===30,'B00 collision body changed: '+JSON.stringify(state.player?.bodySize));
  assert(await page.locator('#hud').evaluate((hud)=>hud.classList.contains('hidden')&&getComputedStyle(hud).display==='none'),'Shipping HUD leaked into the development animation lab');
  await page.waitForTimeout(450);
  assert((await snapshot()).lab?.mode==='idle','B01C idle clip did not become active');
  await screenshot('iona-b01c-idle-right.png');

  // Compare all three treatments over the exact same source pose at 60 logical pixels.
  await page.keyboard.press('r');
  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.reviewVisible===true);
  await screenshot('iona-b01c-methods-60px.png');
  await page.keyboard.press('1'); await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.reviewScale===48); await screenshot('iona-b01c-methods-48px.png');
  await page.keyboard.press('3'); await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.reviewScale===72); await screenshot('iona-b01c-methods-72px.png');
  await page.keyboard.press('2'); await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.reviewScale===60);
  await page.keyboard.press('c'); await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.contrast==='light'); await screenshot('iona-b01c-methods-light.png');
  await page.keyboard.press('c'); await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.contrast==='busy'); await screenshot('iona-b01c-methods-busy.png');
  await page.setViewportSize({width:960,height:540}); await page.waitForTimeout(120); await screenshot('iona-b01c-methods-75-percent.png');
  await page.setViewportSize({width:1280,height:720}); await page.keyboard.press('r');
  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.reviewVisible===false);

  // Idle -> authored start -> six-pose run -> authored stop, in both directions.
  await page.keyboard.down('d');
  await waitMode('start'); await screenshot('iona-b01c-start-right.png');
  await waitMode('run');
  const rightFrames=new Set();
  for(let i=0;i<10;i++){await page.waitForTimeout(55);state=await snapshot();if(state.lab?.mode==='run')rightFrames.add(state.lab.frame);}
  assert(rightFrames.size>=4,'Right run did not advance through at least four of six Phaser frames: '+[...rightFrames].join(','));
  await screenshot('iona-b01c-run-right.png');
  await page.keyboard.up('d'); await waitMode('stop'); await screenshot('iona-b01c-stop-right.png');
  await page.waitForTimeout(180); await waitGrounded();

  await page.keyboard.down('a'); await waitMode('start'); await waitMode('run');
  const leftFrames=new Set();
  for(let i=0;i<10;i++){await page.waitForTimeout(55);state=await snapshot();if(state.lab?.mode==='run')leftFrames.add(state.lab.frame);}
  assert(leftFrames.size>=4,'Left run did not advance through at least four of six Phaser frames: '+[...leftFrames].join(','));
  state=await snapshot(); assert(state.lab?.facing===-1,'Left run did not use its authored left-facing textures');
  await screenshot('iona-b01c-run-left.png');
  await page.keyboard.up('a'); await waitMode('stop'); await screenshot('iona-b01c-stop-left.png');
  await page.waitForTimeout(170);

  // Turn while moving and confirm the reverse-direction transition clip is active.
  await page.keyboard.down('d'); await waitMode('start'); await page.waitForTimeout(80);
  await page.keyboard.down('a'); await page.keyboard.up('d');
  await waitMode('turn'); await screenshot('iona-b01c-turn-left-to-right.png');
  state=await snapshot(); assert(state.lab?.facing===-1||state.lab?.facing===1,'Turn state did not retain a valid facing');
  await page.keyboard.up('a'); await page.waitForTimeout(200);

  // Dedicated jump load/rise/apex/fall/land art, driven by the original movement physics.
  await waitGrounded();
  await page.keyboard.down('Space');
  await page.waitForFunction(()=>{
    const s=window.__CROWNFLARE_QA__?.snapshot();
    return s?.lab?.mode==='jumpRise'&&s.lab.frame.startsWith('jump-');
  },undefined,{timeout:3000});
  state=await snapshot(); assert(state.lab?.frame==='jump-0'||state.lab?.frame==='jump-1'||state.lab?.frame==='jump-2','Takeoff/rise art did not activate: '+JSON.stringify(state.lab));
  await screenshot('iona-b01c-jump-rise.png');
  await waitMode('jumpApex',1800); await screenshot('iona-b01c-jump-apex.png');
  await waitMode('fall',1800); await screenshot('iona-b01c-jump-fall.png');
  await page.keyboard.up('Space');
  await waitMode('land',2500).catch(async(error)=>{
    throw new Error('Jump landing animation was not observed: '+JSON.stringify(await snapshot())+' / '+error.message);
  }); await screenshot('iona-b01c-jump-land.png');
  await waitGrounded(3500);

  // Dedicated dash startup/active/recovery art, with unchanged dash physics and solid barrier.
  await page.keyboard.down('Shift'); await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.mode==='dash',undefined,{timeout:1000});
  await screenshot('iona-b01c-dash-active.png'); await page.keyboard.up('Shift');
  await waitMode('dashRecover',1500).catch(async(error)=>{
    throw new Error('Dash recovery state was not observed: '+JSON.stringify(await snapshot())+' / '+error.message);
  }); await screenshot('iona-b01c-dash-recovery.png');
  assert((await snapshot()).player?.bodySize.width===15,'Dash changed the physics body');

  // Verify a facing miss, then the three authored buffered combo steps and their event-matched contact art.
  await page.evaluate(()=>{
    window.__B01C_COMBAT_EVENTS__=[];
    window.addEventListener('crownflare:combat-event',(event)=>window.__B01C_COMBAT_EVENTS__.push(event.detail));
  });
  state=await approachTargetFromRight();
  assert(state.player&&state.player.x>state.lab.targetX&&state.player.x-state.lab.targetX>=30&&state.player.x-state.lab.targetX<=42&&state.lab.facing===1,'Could not establish a right-facing miss with target behind: '+JSON.stringify(state));
  await page.keyboard.press('j');
  await page.waitForFunction(()=>window.__B01C_COMBAT_EVENTS__?.length===1,undefined,{timeout:1300});
  state=await snapshot(); assert(state.lab?.frame==='combo-1-contact'&&state.lab.targetHealth===3&&state.lab.lastCombatEvent.startsWith('MISS /'),'Wrong-facing combo contact did not visibly miss without damage: '+JSON.stringify(state.lab));
  await screenshot('iona-b01c-combo-miss-right.png');
  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.attackPhase==='idle',undefined,{timeout:1800});

  state=await approachTargetFromLeftFacingLeft();
  assert(state.player&&state.player.x<state.lab.targetX&&state.lab.facing===-1&&state.lab.targetX-state.player.x>=30&&state.lab.targetX-state.player.x<=42,'Could not enter visible left-facing combo range: '+JSON.stringify(state));
  await page.keyboard.press('j');
  await page.waitForTimeout(45); await page.keyboard.press('j');
  await page.waitForFunction(()=>window.__B01C_COMBAT_EVENTS__?.length===2,undefined,{timeout:1300});
  state=await snapshot(); assert(state.lab?.comboStep===1&&state.lab.frame==='combo-1-contact'&&state.lab.targetHealth===3,'Left-facing combo step one did not select its authored contact art: '+JSON.stringify(state.lab));
  await screenshot('iona-b01c-combo-1-contact-left.png');
  await page.waitForFunction(()=>{const s=window.__CROWNFLARE_QA__?.snapshot().lab;return s?.comboStep===2&&s.attackPhase==='startup';},undefined,{timeout:1000});
  await page.keyboard.press('j');
  await page.waitForFunction(()=>window.__B01C_COMBAT_EVENTS__?.length===3,undefined,{timeout:1500});
  state=await snapshot(); assert(state.lab?.comboStep===2&&state.lab.frame==='combo-2-contact'&&state.lab.targetHealth===3,'Left-facing buffered side kick did not select its authored contact art: '+JSON.stringify(state.lab));
  await screenshot('iona-b01c-combo-2-contact-left.png');
  await page.waitForFunction(()=>{const s=window.__CROWNFLARE_QA__?.snapshot().lab;return s?.comboStep===3&&s.attackPhase==='startup';},undefined,{timeout:1000});
  await page.keyboard.press('j');
  await page.waitForFunction(()=>window.__B01C_COMBAT_EVENTS__?.length===4,undefined,{timeout:1500});
  state=await snapshot(); assert(state.lab?.comboStep===3&&state.lab.frame==='combo-3-contact'&&state.lab.targetHealth===3,'Left-facing buffered rising strike did not select its authored contact art: '+JSON.stringify(state.lab));
  await screenshot('iona-b01c-combo-3-contact-left.png');
  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.attackPhase==='idle',undefined,{timeout:2000});

  state=await approachTargetFromLeft();
  assert(state.player&&state.lab?.facing===1&&state.lab.targetX-state.player.x<=42&&state.lab.targetX-state.player.x>0,'Could not enter right-facing combo range: '+JSON.stringify(state));
  await page.keyboard.press('j');
  await page.waitForTimeout(45); await page.keyboard.press('j');
  await page.waitForFunction(()=>window.__B01C_COMBAT_EVENTS__?.length===5,undefined,{timeout:1300});
  state=await snapshot(); assert(state.lab?.comboStep===1&&state.lab.frame==='combo-1-contact'&&state.lab.targetHealth===2,'Combo step one contact art and event did not align: '+JSON.stringify(state.lab));
  await screenshot('iona-b01c-combo-1-contact.png');
  await page.waitForFunction(()=>{const s=window.__CROWNFLARE_QA__?.snapshot().lab;return s?.comboStep===2&&s.attackPhase==='startup';},undefined,{timeout:1000});
  await page.keyboard.press('j');
  await page.waitForFunction(()=>window.__B01C_COMBAT_EVENTS__?.length===6,undefined,{timeout:1500});
  state=await snapshot(); assert(state.lab?.comboStep===2&&state.lab.frame==='combo-2-contact'&&state.lab.targetHealth===1,'Buffered combo step two contact art and event did not align: '+JSON.stringify(state.lab));
  await screenshot('iona-b01c-combo-2-contact.png');
  await page.waitForFunction(()=>{const s=window.__CROWNFLARE_QA__?.snapshot().lab;return s?.comboStep===3&&s.attackPhase==='startup';},undefined,{timeout:1000});
  await page.keyboard.press('j');
  await page.waitForFunction(()=>window.__B01C_COMBAT_EVENTS__?.length===7,undefined,{timeout:1500}).catch(async(error)=>{
    const diagnostic={snapshot:await snapshot(),events:await page.evaluate(()=>window.__B01C_COMBAT_EVENTS__)};
    throw new Error('Buffered combo step three did not emit its contact event: '+JSON.stringify(diagnostic)+' / '+error.message);
  });
  state=await snapshot(); assert(state.lab?.comboStep===3&&state.lab.frame==='combo-3-contact'&&state.lab.targetHealth===0&&state.lab.lastCombatEvent.startsWith('HIT /'),'Combo step three contact art and event did not align: '+JSON.stringify(state.lab));
  await screenshot('iona-b01c-combo-3-contact.png');
  await page.keyboard.down('j');
  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.attackPhase==='idle',undefined,{timeout:2000});
  await page.waitForTimeout(300);
  const combatEvents=await page.evaluate(()=>window.__B01C_COMBAT_EVENTS__);
  assert(combatEvents.length===7,'Held attack repeated unexpectedly or contact event count changed: '+JSON.stringify(combatEvents));
  assert(combatEvents.map((event)=>event.result).join(',')==='miss,miss,miss,miss,hit,hit,hit','Unexpected hit/miss sequence: '+JSON.stringify(combatEvents));
  assert(combatEvents.slice(4).map((event)=>event.moveId).join(',')==='iona-base-combo-1,iona-base-combo-2,iona-base-combo-3','Three unique combo move ids did not resolve: '+JSON.stringify(combatEvents));
  await page.keyboard.up('j');

  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().screen==='paused');
  const frozen=await snapshot(); await page.waitForTimeout(250); state=await snapshot();
  assert(state.player?.x===frozen.player?.x&&state.lab?.frame===frozen.lab?.frame,'Pause failed to freeze the B01C body and animation');
  await page.getByRole('button',{name:'RESUME'}).click();
  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().screen==='animationLab');
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().screen==='paused');
  await page.getByRole('button',{name:'RESUME'}).click();
  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().screen==='animationLab');

  const canvas=page.locator('#game-root canvas');
  for(const size of [{width:1024,height:768},{width:1680,height:720}]){
    await page.setViewportSize(size); await page.waitForTimeout(100);
    const bounds=await canvas.boundingBox();
    assert(bounds&&bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=size.width+1&&bounds.y+bounds.height<=size.height+1,'Canvas clipped at '+size.width+'x'+size.height);
  }
  await page.setViewportSize({width:1280,height:720});
  const elapsed=Date.now()-clipStart;
  if(elapsed<75000)await page.waitForTimeout(75000-elapsed);
  assert(errors.length===0,'Browser errors: '+errors.join(' | '));
  await context.close(); context=null;
  const files=(await readdir(recordings)).filter((file)=>file.endsWith('.webm'));
  assert(files.length>0,'Chrome did not retain a real-time WebM');
  const ordered=await Promise.all(files.map(async(file)=>({file,mtime:(await stat(path.join(recordings,file))).mtimeMs})));
  const newest=path.join(recordings,ordered.sort((a,b)=>b.mtime-a.mtime)[0].file);
  const finalVideo=path.join(evidence,'iona-b01c-60s.webm');
  await rename(newest,finalVideo);
  for(const file of await readdir(recordings))await unlink(path.join(recordings,file)).catch(()=>{});
  const videoProbe=await probeVideo(finalVideo);
  const videoDurationSeconds=Number(videoProbe.format?.duration??0);
  assert(videoDurationSeconds>=60,'Recorded WebM is shorter than 60 seconds: '+videoDurationSeconds.toFixed(2));
  const digestFiles=[
    'src/game/animation/ionaB01cAnimation.ts','src/game/animation/ionaRecoveryAnimation.ts','src/game/combat/sim.ts',
    'src/game/input/InputController.ts','src/game/scenes/ChamberScene.ts','src/game/createGame.ts','src/main.ts',
    'tools/art-export/build-iona-b01c.py','tools/local-qa/iona-b01c-production-smoke.mjs',
    'tests/unit/ionaB01cAnimation.test.ts','art-source/characters/iona/b01c/generation-provenance.json','package.json',
  ].sort();
  const sourceDigest=createHash('sha256');
  for(const file of digestFiles){sourceDigest.update(file);sourceDigest.update(await readFile(file));}
  const videoBytes=await readFile(finalVideo);
  const videoHash=createHash('sha256').update(videoBytes).digest('hex');
  const videoRelativePath=path.relative(process.cwd(),finalVideo).split(path.sep).join('/');
  const report={
    status:'PASS',date:new Date().toISOString(),chrome:browser.version(),sourceSha256:sourceDigest.digest('hex'),video:videoRelativePath,videoSha256:videoHash,videoBytes:videoBytes.length,videoDurationSeconds,
    runtimeFrames:72,bodySize:'15x30',visualChecks:['idle','start/stop/turn','six-pose run left/right','jump load/rise/apex/fall/land','dash active/recovery','same-pose pixel method A/B/C','three-hit combo in both authored facings with event-matched contact frames, misses, input buffer and held-input no loop','pause/resize/contrast'],
    combatEvents,errors,audioTrackCaptured:videoProbe.streams?.some((stream)=>stream.codec_type==='audio')??false,videoAudio:'No audio track is captured by Playwright; audio playback was not confirmed by this run.',
  };
  await writeFile(path.join(evidence,'qa-report.json'),JSON.stringify(report,null,2)+'\n','utf8');
  passed=true;
  console.log('PASS: real Chrome / 72 of 72 B01C textures / 15x30 body / Phaser idle-start-run-stop-turn both ways / dedicated jump and dash / three-hit combo in both facings, event+contact sync, misses, buffer, held-input no loop / pause, resize and review board');
  console.log('Chrome '+browser.version()+' / '+Math.round((Date.now()-clipStart)/1000)+'s normal-speed clip / source SHA-256 '+report.sourceSha256+' / video SHA-256 '+videoHash+' / '+videoBytes.length+' bytes');
  console.log('Evidence: '+evidence);
} finally {
  if(context)await context.close().catch(()=>{});
  if(browser)await browser.close().catch(()=>{});
  server.kill();
  if(!passed)console.error('FAIL: '+errors.join(' | '));
}
