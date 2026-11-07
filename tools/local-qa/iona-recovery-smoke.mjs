/** Installed-Chrome proof that generated-image pixels animate in the real Phaser lab. */
import { spawn } from 'node:child_process';
import { mkdir, readdir, rename, stat, unlink, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port=4175;
const evidence='review-evidence/recovery';
const recordings=path.join(evidence,'.recordings');
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'pipe'});
let serverErrors='';
server.stderr.on('data',(buf)=>{serverErrors+=buf.toString();});
let browser,context,page,passed=false;
let clipStart=0;
const errors=[];
const assert=(ok,message)=>{if(!ok)throw new Error(message);};
const snapshot=()=>page.evaluate(()=>window.__CROWNFLARE_QA__?.snapshot());
async function waitForLab(){await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().screen==='animationLab',undefined,{timeout:15000});}
async function approachTargetFromLeft(){
  let state=await snapshot();
  for(let i=0;i<120;i++){
    const gap=state.lab.targetX-state.player.x;
    if(gap>=30&&gap<=42&&state.player.grounded){
      if(state.lab.facing===1)return state;
      await page.keyboard.down('d'); await page.waitForTimeout(20); await page.keyboard.up('d'); await page.waitForTimeout(75);
      return await snapshot();
    }
    const direction=gap>42?'d':'a';
    await page.keyboard.down(direction); await page.waitForTimeout(20); await page.keyboard.up(direction); await page.waitForTimeout(55);
    state=await snapshot();
  }
  return state;
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
  await page.goto('http://127.0.0.1:'+port+'/?animationLab=1',{waitUntil:'domcontentloaded'});
  await waitForLab();
  clipStart=Date.now();
  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().player?.grounded===true,undefined,{timeout:5000});
  let state=await snapshot();
  assert(state.lab?.artSource==='generated-imagegen','Default lab did not select generated image-source art: '+JSON.stringify(state.lab));
  assert(state.lab?.assetCount===24 && state.lab.missingAssets.length===0,'Recovery frame textures incomplete: '+JSON.stringify(state.lab));
  assert(state.player?.grounded,'B00 physics did not settle onto the chamber floor');
  assert(await page.locator('#hud').evaluate((hud)=>hud.classList.contains('hidden')&&getComputedStyle(hud).display==='none'),'Shipping HUD leaked into the development-only lab');
  await page.waitForTimeout(900);
  assert((await snapshot()).lab?.mode==='idle','Generated idle did not become active');
  await page.screenshot({path:path.join(evidence,'iona-recovery-idle-right.png')});

  // Exercise combat while the actor is still near the fixed training target.
  state=await approachTargetFromLeft();
  assert(state.player && state.player.x<state.lab.targetX && state.lab.facing===1 && state.lab.targetX-state.player.x<=42 && state.lab.targetX-state.player.x>0,'Could not establish a stable right-jab range: '+JSON.stringify(state));
  await page.keyboard.press('j');
  await page.waitForTimeout(175);
  state=await snapshot();
  assert(state.lab?.mode==='attack'&&state.lab.frame==='jab-2','Generated jab contact pose did not activate: '+JSON.stringify(state.lab));
  assert(state.lab?.targetHealth===2&&state.lab.lastCombatEvent.startsWith('HIT /'),'First right jab did not hit on the visible contact pose: '+JSON.stringify(state.lab));
  await page.screenshot({path:path.join(evidence,'iona-recovery-jab-contact-right.png')});

  await page.waitForTimeout(150);
  await page.keyboard.press('j');
  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.targetHealth===1,undefined,{timeout:2000});
  state=await snapshot();
  assert(state.lab?.targetHealth===1&&state.lab.lastCombatEvent.startsWith('HIT /'),'Buffered jab failed to produce exactly one follow-up hit: '+JSON.stringify(state.lab));

  // Turn away and prove the separate authored left jab misses without reducing HP.
  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.attackPhase==='idle',undefined,{timeout:2000});
  for(let i=0;i<24;i++){
    state=await snapshot();
    if(state.player.x<state.lab.targetX-45&&state.lab.facing===-1)break;
    await page.keyboard.down('a'); await page.waitForTimeout(100); await page.keyboard.up('a'); await page.waitForTimeout(45);
  }
  state=await snapshot();
  assert(state.lab?.facing===-1&&state.player?.x<state.lab.targetX-45,'Could not establish a left-facing jab out of target range: '+JSON.stringify(state));
  await page.keyboard.press('j');
  await page.waitForTimeout(175);
  state=await snapshot();
  assert(state.lab?.frame==='jab-2','Left-facing generated contact pose did not activate: '+JSON.stringify(state.lab));
  await page.screenshot({path:path.join(evidence,'iona-recovery-jab-contact-left.png')});
  assert(state.lab?.targetHealth===1&&state.lab.lastCombatEvent.startsWith('MISS /'),'Wrong-facing jab did not miss: '+JSON.stringify(state));

  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.attackPhase==='idle',undefined,{timeout:2000});
  state=await approachTargetFromLeft();
  assert(state.lab?.facing===1&&state.player && state.player.x<state.lab.targetX && state.lab.targetX-state.player.x<=42,'Could not establish mouse-hit approach: '+JSON.stringify(state));
  await page.mouse.click(640,600);
  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.targetHealth===0,undefined,{timeout:2000});
  state=await snapshot();
  assert(state.lab?.targetHealth===0&&state.lab.lastCombatEvent.startsWith('HIT /'),'Mouse attack did not use generated jab/contact timing: '+JSON.stringify(state.lab));

  await page.keyboard.down('d');
  const rightFrames=new Set();
  for(let i=0;i<8;i++){await page.waitForTimeout(70);state=await snapshot();if(state.lab?.mode==='run')rightFrames.add(state.lab.frame);}
  state=await snapshot();
  assert(state.lab?.mode==='run'&&state.lab.facing===1,'Generated right-facing run did not activate: '+JSON.stringify(state.lab));
  assert(rightFrames.size>=2,'Run did not advance through distinct generated poses: '+[...rightFrames].join(','));
  await page.screenshot({path:path.join(evidence,'iona-recovery-run-right.png')});
  await page.keyboard.up('d');

  await page.keyboard.down('a'); await page.waitForTimeout(430);
  state=await snapshot();
  assert(state.lab?.facing===-1,'Player did not switch to generated left-facing art');
  assert(state.lab?.mode==='run','Generated left-facing run did not activate after turn');
  await page.screenshot({path:path.join(evidence,'iona-recovery-run-left.png')});
  await page.keyboard.up('a');

  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().player?.grounded===true,undefined,{timeout:3000});
  await page.keyboard.down('Space');
  await page.waitForFunction(()=>{
    const s=window.__CROWNFLARE_QA__?.snapshot();
    return s?.player?.grounded===false&&s?.lab?.frame==='run-2';
  },undefined,{timeout:2000});
  state=await snapshot();
  assert(state.lab?.frame==='run-2'&&!state.player?.grounded,'Airborne state did not use the generated run flight pose: '+JSON.stringify(state));
  await page.screenshot({path:path.join(evidence,'iona-recovery-airborne-run-pose.png')});
  await page.keyboard.up('Space');
  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().player?.grounded===true,undefined,{timeout:3000});
  await page.keyboard.down('Shift'); await page.waitForTimeout(70); await page.keyboard.up('Shift');
  await page.waitForTimeout(160);
  await page.screenshot({path:path.join(evidence,'iona-recovery-dash-run-fallback.png')});

  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().screen==='paused');
  const frozen=await snapshot(); await page.waitForTimeout(250); state=await snapshot();
  assert(state.player?.x===frozen.player?.x&&state.lab?.frame===frozen.lab?.frame,'Pause failed to freeze body and animation');
  await page.getByRole('button',{name:'RESUME'}).click();
  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().screen==='animationLab');
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().screen==='paused');
  await page.getByRole('button',{name:'RESUME'}).click();
  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().screen==='animationLab');

  await page.keyboard.press('r');
  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.reviewVisible===true);
  await page.screenshot({path:path.join(evidence,'iona-recovery-ab-60.png')});
  await page.keyboard.press('1'); await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.reviewScale===48); await page.screenshot({path:path.join(evidence,'iona-recovery-ab-48.png')});
  await page.keyboard.press('3'); await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.reviewScale===72); await page.screenshot({path:path.join(evidence,'iona-recovery-ab-72.png')});
  await page.keyboard.press('2'); await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.reviewScale===60);
  await page.keyboard.press('c'); await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.contrast==='light'); await page.screenshot({path:path.join(evidence,'iona-recovery-ab-light.png')});
  await page.keyboard.press('c'); await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.contrast==='busy'); await page.screenshot({path:path.join(evidence,'iona-recovery-ab-busy.png')});
  await page.setViewportSize({width:960,height:540}); await page.waitForTimeout(100); await page.screenshot({path:path.join(evidence,'iona-recovery-ab-75-percent.png')});
  await page.keyboard.press('r');

  const canvas=page.locator('#game-root canvas');
  for(const size of [{width:1024,height:768},{width:1680,height:720}]){
    await page.setViewportSize(size); await page.waitForTimeout(100);
    const bounds=await canvas.boundingBox();
    assert(bounds&&bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=size.width+1&&bounds.y+bounds.height<=size.height+1,'Canvas clipped at '+size.width+'x'+size.height);
  }
  await page.setViewportSize({width:1280,height:720});
  const elapsed=Date.now()-clipStart;
  if(elapsed<28000)await page.waitForTimeout(28000-elapsed);
  assert(errors.length===0,'Browser errors: '+errors.join(' | '));
  await context.close(); context=null;
  const files=(await readdir(recordings)).filter((file)=>file.endsWith('.webm'));
  assert(files.length>0,'Chrome did not retain a real-time WebM');
  const ordered=await Promise.all(files.map(async(file)=>({file,mtime:(await stat(path.join(recordings,file))).mtimeMs})));
  const newest=path.join(recordings,ordered.sort((a,b)=>b.mtime-a.mtime)[0].file);
  const finalVideo=path.join(evidence,'iona-recovery-30s.webm');
  await rename(newest,finalVideo);
  for(const file of await readdir(recordings))await unlink(path.join(recordings,file)).catch(()=>{});
  const digestFiles=[
    'src/game/animation/ionaRecoveryAnimation.ts','src/game/combat/sim.ts','src/game/input/InputController.ts',
    'src/game/scenes/ChamberScene.ts','src/game/createGame.ts','src/main.ts',
    'tools/art-export/build-iona-recovery.py','art-source/manifests/iona-b01-recovery-v2.json',
  ].sort();
  const sourceDigest=createHash('sha256');
  for(const file of digestFiles){sourceDigest.update(file);sourceDigest.update(await readFile(file));}
  const videoBytes=await readFile(finalVideo);
  const videoHash=createHash('sha256').update(videoBytes).digest('hex');
  passed=true;
  console.log('PASS: installed Chrome / generated-image default / 24 of 24 directional textures / idle, run both ways, airborne reuse, jab hit+miss+buffer, pause/focus, A/B scales and contrast, resize');
  console.log('Chrome '+browser.version()+' / '+Math.round((Date.now()-clipStart)/1000)+'s normal-speed clip / source SHA-256 '+sourceDigest.digest('hex')+' / video SHA-256 '+videoHash+' / '+videoBytes.length+' bytes');
  console.log('Evidence: '+evidence);
} finally {
  if(context)await context.close().catch(()=>{});
  if(browser)await browser.close().catch(()=>{});
  server.kill();
  if(!passed)console.error('FAIL: '+errors.join(' | '));
}
