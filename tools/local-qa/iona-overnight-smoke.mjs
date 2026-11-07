/** Regression-only Chrome proof for the owner-rejected overnight SVG actor. */
import { spawn } from 'node:child_process';
import { mkdir, readdir, rename, stat, unlink } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const port=4174;
const evidence='review-evidence/overnight';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'pipe'});
let serverErrors='';
server.stderr.on('data',(buf)=>{serverErrors+=buf.toString();});
let browser,context,page,passed=false;
let clipStart=0;
const errors=[];
const assert=(ok,message)=>{if(!ok)throw new Error(message);};
const snapshot=()=>page.evaluate(()=>window.__CROWNFLARE_QA__?.snapshot());
async function waitForLab(){await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().screen==='animationLab',{timeout:15000});}
try {
  await mkdir(evidence,{recursive:true});
  let ready=false;
  for(let i=0;i<60;i++){
    try{const response=await fetch('http://127.0.0.1:'+port);if(response.ok){ready=true;break;}}catch{}
    if(server.exitCode!==null)break;
    await delay(250);
  }
  assert(ready,'Vite did not start: '+serverErrors);
  browser=await chromium.launch({channel:'chrome',headless:false,args:['--use-gl=angle','--use-angle=swiftshader']});
  context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:evidence,size:{width:1280,height:720}}});
  page=await context.newPage();
  page.on('pageerror',(error)=>errors.push('runtime: '+error.message));
  page.on('console',(message)=>{if(message.type()==='error')errors.push('console: '+message.text());});
  await page.goto('http://127.0.0.1:'+port+'/?animationLab=1&oldRejectedArt=1',{waitUntil:'domcontentloaded'});
  await waitForLab();
  clipStart=Date.now();
  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().player?.grounded===true);
  let state=await snapshot();
  assert(await page.locator('#hud').evaluate((hud)=>hud.classList.contains('hidden')&&getComputedStyle(hud).display==='none'),'Shipping HUD leaked into the development-only animation lab');
  assert(state.lab?.assetCount===44 && state.lab.missingAssets.length===0,'Overnight frame texture load is incomplete: '+JSON.stringify(state.lab));
  assert(state.player?.grounded,'B00 physics did not reach the chamber floor');
  await page.screenshot({path:path.join(evidence,'iona-land.png')});

  await page.waitForTimeout(4200);
  state=await snapshot();
  assert(state.lab?.mode==='idle','Idle loop did not settle after the landing transition');
  await page.screenshot({path:path.join(evidence,'iona-idle-calm.png')});
  await page.keyboard.down('d'); await page.waitForTimeout(650); await page.keyboard.up('d');
  await page.screenshot({path:path.join(evidence,'iona-run-right.png')});
  await page.keyboard.down('a'); await page.waitForTimeout(590); await page.keyboard.up('a');
  await page.screenshot({path:path.join(evidence,'iona-run-left.png')});
  await page.keyboard.down('Space'); await page.waitForTimeout(155); await page.keyboard.up('Space');
  await page.waitForTimeout(170); await page.screenshot({path:path.join(evidence,'iona-jump-fall.png')});
  await page.waitForTimeout(360);
  await page.keyboard.down('Shift'); await page.waitForTimeout(75); await page.keyboard.up('Shift');
  await page.waitForTimeout(230);
  await page.screenshot({path:path.join(evidence,'iona-dash.png')});

  // Walk into the dummy's 50px reach from its left, then face right.
  state=await snapshot();
  for(let i=0;i<12 && state.player.x>state.lab.targetX-42;i++){
    await page.keyboard.down('a'); await page.waitForTimeout(130); await page.keyboard.up('a'); await page.waitForTimeout(100); state=await snapshot();
  }
  await page.keyboard.down('d'); await page.waitForTimeout(75); await page.keyboard.up('d'); await page.waitForTimeout(80); state=await snapshot();
  for(let i=0;i<12 && state.lab.targetX-state.player.x>38;i++){
    await page.keyboard.down('d'); await page.waitForTimeout(120); await page.keyboard.up('d'); await page.waitForTimeout(90); state=await snapshot();
  }
  assert(state.player && state.player.x < state.lab.targetX && state.lab.targetX-state.player.x<=42 && state.lab.facing===1,'Could not establish a right-facing strike approach: '+JSON.stringify(state));
  await page.keyboard.press('j');
  await page.waitForTimeout(175);
  await page.screenshot({path:path.join(evidence,'iona-jab-contact.png')});
  await page.waitForTimeout(80);
  await page.keyboard.press('j'); // buffered during recovery
  await page.waitForTimeout(610);
  state=await snapshot();
  assert(state.lab?.targetHealth===1,'Two buffered contacts should remove two dummy hit points: '+JSON.stringify(state.lab));
  assert(state.lab?.lastCombatEvent.startsWith('HIT /'),'Contact was not resolved against the temporary target');

  await page.keyboard.down('a'); await page.waitForTimeout(100); await page.keyboard.up('a');
  await page.keyboard.press('j');
  await page.waitForTimeout(550);
  state=await snapshot();
  assert(state.lab?.lastCombatEvent.startsWith('MISS /'),'Wrong-facing attack should miss: '+JSON.stringify(state.lab));
  for(let i=0;i<12 && state.lab.targetX-state.player.x>38;i++){
    await page.keyboard.down('d'); await page.waitForTimeout(120); await page.keyboard.up('d'); await page.waitForTimeout(90); state=await snapshot();
  }
  assert(state.player && state.player.x<state.lab.targetX && state.lab.facing===1 && state.lab.targetX-state.player.x<=42,'Could not establish a close mouse-attack approach: '+JSON.stringify(state));
  await page.mouse.click(640,600);
  await page.waitForTimeout(560);
  state=await snapshot();
  assert(state.lab?.targetHealth===0&&state.lab.lastCombatEvent.startsWith('HIT /'),'Left mouse did not produce the final in-range hit: '+JSON.stringify(state.lab));

  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().screen==='paused');
  const frozen=await snapshot();
  await page.waitForTimeout(250);
  state=await snapshot();
  assert(state.player?.x===frozen.player?.x && state.lab?.frame===frozen.lab?.frame,'Pause did not freeze actor and animation timers');
  await page.getByRole('button',{name:'RESUME'}).click();
  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().screen==='animationLab');
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().screen==='paused');
  await page.getByRole('button',{name:'RESUME'}).click();
  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().screen==='animationLab');

  await page.keyboard.press('r');
  await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.reviewVisible===true);
  await page.screenshot({path:path.join(evidence,'iona-review-calm.png')});
  await page.keyboard.press('1'); await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.reviewScale===48); await page.screenshot({path:path.join(evidence,'iona-review-base-48.png')});
  await page.keyboard.press('2'); await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.reviewScale===60); await page.screenshot({path:path.join(evidence,'iona-review-base-60.png')});
  await page.keyboard.press('3'); await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.reviewScale===72); await page.screenshot({path:path.join(evidence,'iona-review-base-72.png')});
  await page.keyboard.press('2'); await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.reviewScale===60);
  await page.keyboard.press('c'); await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.contrast==='light'); await page.screenshot({path:path.join(evidence,'iona-review-light.png')});
  await page.keyboard.press('c'); await page.waitForFunction(()=>window.__CROWNFLARE_QA__?.snapshot().lab?.contrast==='busy'); await page.screenshot({path:path.join(evidence,'iona-review-busy.png')});
  await page.setViewportSize({width:960,height:540}); await page.waitForTimeout(100); await page.screenshot({path:path.join(evidence,'iona-review-75.png')});
  await page.setViewportSize({width:1280,height:720}); await page.waitForTimeout(100);
  await page.keyboard.press('r');
  const canvas=page.locator('#game-root canvas');
  for(const size of [{width:1024,height:768},{width:1680,height:720}]){
    await page.setViewportSize(size); await page.waitForTimeout(100);
    const bounds=await canvas.boundingBox();
    assert(bounds && bounds.x>=0 && bounds.y>=0 && bounds.x+bounds.width<=size.width+1 && bounds.y+bounds.height<=size.height+1,'Canvas clipped at '+size.width+'x'+size.height);
  }
  await page.setViewportSize({width:1280,height:720});
  const elapsed=Date.now()-clipStart;
  if(elapsed<20500)await page.waitForTimeout(20500-elapsed);
  assert(errors.length===0,'Browser errors: '+errors.join(' | '));
  await context.close();
  context=null;
  const recordings=await Promise.all((await readdir(evidence)).filter((file)=>file.endsWith('.webm')&&file!=='iona-animation-lab.webm').map(async(file)=>({file,mtime:(await stat(path.join(evidence,file))).mtimeMs})));
  assert(recordings.length>0,'Playwright did not retain a normal-speed WebM recording');
  const newest=path.join(evidence,recordings.sort((a,b)=>b.mtime-a.mtime)[0].file);
  const finalVideo=path.join(evidence,'iona-animation-lab.webm');
  await rename(newest,finalVideo);
  for(const item of recordings)await unlink(path.join(evidence,item.file)).catch(()=>{});
  const digestFiles=[
    'src/game/animation/ionaAnimation.ts','src/game/combat/sim.ts','src/game/input/InputController.ts',
    'src/game/scenes/ChamberScene.ts','src/game/createGame.ts','src/main.ts',
    'tools/art-export/build-iona-overnight.mjs','art-source/manifests/iona-overnight-v1.json',
  ].sort();
  const sourceDigest=createHash('sha256');
  for(const file of digestFiles){sourceDigest.update(file);sourceDigest.update(await readFile(file));}
  const videoBytes=await readFile(finalVideo);
  const videoHash=createHash('sha256').update(videoBytes).digest('hex');
  passed=true;
  console.log('PASS: legacy rejection regression only; 44/44 historical textures; movement/jump/dash; buffered hit/miss; review/resize; '+Math.round((Date.now()-clipStart)/1000)+'s clip');
  console.log('Chrome '+browser.version()+' / source digest '+sourceDigest.digest('hex')+' / video SHA-256 '+videoHash+' / '+videoBytes.length+' bytes');
  console.log('Evidence: '+evidence);
} finally {
  if(context)await context.close().catch(()=>{});
  if(browser)await browser.close().catch(()=>{});
  server.kill();
  if(!passed)console.error('FAIL: '+errors.join(' | '));
}
