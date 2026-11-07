/**
 * Authored Iona Base pose source and deterministic PNG export for B01 overnight.
 * The contours below are new, hand-authored SVG pixel clusters on a 64x64 integer grid.
 * B01A and generated illustrations are identity references only; no illustration is used as a runtime frame.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const sourceDir = path.join(root, 'art-source/characters/iona/overnight');
const framesDir = path.join(sourceDir, 'frames');
const runtimeDir = path.join(root, 'public/assets/characters/iona/overnight');
const manifestDir = path.join(root, 'art-source/manifests');
const outputManifest = path.join(manifestDir, 'iona-overnight-v1.json');
const C = {
  ink: '#191b30', navy: '#282743', shade: '#44435f', slate: '#68657b',
  pearl: '#e4d7d0', light: '#f4eae0', teal: '#35aeb0', tealLight: '#69d0c6',
  copper: '#a8694e', copperLight: '#d88b63', skin: '#e9a480', skinShade: '#bd705f',
  coral: '#ec776f',
};
const hash = (buffer) => createHash('sha256').update(buffer).digest('hex');
const pathShape = (d, fill, stroke = C.ink, width = 2) =>
  '<path d="' + d + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + width + '" stroke-linejoin="miter" stroke-linecap="square" shape-rendering="crispEdges"/>';
const rect = (x, y, w, h, fill, stroke = 'none', width = 0) =>
  '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + width + '" shape-rendering="crispEdges"/>';
const rotate = (deg, x, y, child) => '<g transform="rotate(' + deg + ' ' + x + ' ' + y + ')">' + child + '</g>';
const pts = (points) => points.map(([x,y]) => x + ',' + y).join(' ');
const polygon = (points, fill, stroke = C.ink, width = 2) =>
  '<polygon points="' + pts(points) + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + width + '" stroke-linejoin="miter" shape-rendering="crispEdges"/>';

function leg(back, angle, crouch) {
  const joint = back ? [28, 41] : [37, 41];
  const dy = crouch ? 1 : 0;
  const body = back
    ? polygon([[24,38+dy],[33,39+dy],[34,44+dy],[30,49+dy],[28,56],[25,59],[20,58],[22,53],[24,48]], C.navy)
      + polygon([[26,42+dy],[31,43+dy],[28,49],[26,55],[23,55],[25,49]], C.shade, 'none', 0)
      + polygon([[20,55],[27,55],[29,59],[36,59],[37,62],[18,62],[17,59]], C.navy)
      + polygon([[18,59],[35,59],[37,62],[18,62]], C.pearl)
      + polygon([[29,56],[33,56],[34,59],[28,59]], C.copper, 'none', 0)
    : polygon([[33,38+dy],[42,39+dy],[44,45+dy],[41,49+dy],[41,56],[45,59],[46,62],[30,62],[31,58],[34,54],[32,48],[34,43]], C.navy)
      + polygon([[36,42+dy],[41,43+dy],[39,49],[37,54],[34,54],[36,48]], C.slate, 'none', 0)
      + polygon([[32,47],[42,46],[43,51],[40,55],[34,55]], C.pearl)
      + polygon([[33,48],[40,48],[39,51],[34,52]], C.slate, 'none', 0)
      + polygon([[33,55],[41,55],[44,59],[51,59],[52,62],[30,62],[29,59]], C.navy)
      + polygon([[30,59],[49,59],[52,62],[30,62]], C.pearl)
      + polygon([[39,56],[43,56],[45,59],[39,59]], C.copper, 'none', 0);
  return rotate(angle, joint[0], joint[1], body);
}

function torso(p) {
  const lift = p.lift || 0;
  const body = polygon([[25,22+lift],[31,19+lift],[41,21+lift],[45,26+lift],[43,34+lift],[39,40+lift],[28,39+lift],[23,34+lift],[23,27+lift]], C.navy)
    + polygon([[28,24+lift],[34,22+lift],[39,24+lift],[38,31+lift],[33,35+lift],[27,32+lift]], C.shade, 'none', 0)
    + polygon([[34,23+lift],[40,24+lift],[42,28+lift],[38,31+lift],[34,29+lift]], C.pearl)
    + polygon([[37,25+lift],[40,26+lift],[40,28+lift],[37,28+lift]], C.light, 'none', 0)
    + polygon([[27,31+lift],[36,32+lift],[34,38+lift],[26,36+lift]], C.navy)
    + polygon([[25,36+lift],[40,36+lift],[41,40+lift],[27,41+lift],[23,39+lift]], C.navy)
    + polygon([[27,36+lift],[40,36+lift],[39,38+lift],[27,38+lift]], C.copper)
    + polygon([[32,36+lift],[36,36+lift],[37,40+lift],[31,40+lift]], C.copperLight)
    + polygon([[32,38+lift],[36,38+lift],[36,40+lift],[32,40+lift]], C.ink, 'none', 0);
  const mantle = polygon([[25,23+lift],[30,20+lift],[35,23+lift],[30,27+lift],[25,29+lift],[21,27+lift]], C.pearl)
    + polygon([[23,26+lift],[29,26+lift],[27,29+lift],[23,29+lift]], C.copper, 'none', 0)
    + polygon([[24,25+lift],[28,24+lift],[27,26+lift],[23,27+lift]], C.light, 'none', 0);
  const bracerShoulder = p.dawnrush
    ? polygon([[38,22+lift],[45,22+lift],[49,26+lift],[48,31+lift],[42,30+lift],[39,27+lift]], C.pearl)
      + polygon([[40,24+lift],[45,24+lift],[47,27+lift],[43,27+lift]], C.copper)
    : '';
  return rotate(p.tilt || 0, 33, 32, mantle + body + bracerShoulder);
}

function frontArm(p) {
  const lift = p.lift || 0;
  if (p.punch === 'contact') {
    return polygon([[39,24+lift],[44,23+lift],[48,25+lift],[50,27+lift],[47,30+lift],[43,29+lift],[40,28+lift]], C.skin)
      + polygon([[43,25+lift],[47,26+lift],[48,28+lift],[45,29+lift]], C.skinShade, 'none', 0)
      + polygon([[47,23+lift],[55,21+lift],[59,23+lift],[59,27+lift],[55,29+lift],[49,28+lift],[46,26+lift]], C.copper)
      + polygon([[49,24+lift],[55,22+lift],[57,24+lift],[51,26+lift]], C.coral, 'none', 0)
      + polygon([[53,24+lift],[59,23+lift],[61,25+lift],[59,28+lift],[54,28+lift]], C.navy)
      + polygon([[57,24+lift],[60,25+lift],[59,27+lift],[56,27+lift]], C.skin);
  }
  if (p.punch === 'windup') {
    return polygon([[39,25+lift],[44,27+lift],[45,31+lift],[43,34+lift],[39,32+lift],[37,29+lift]], C.skin)
      + polygon([[42,28+lift],[46,30+lift],[44,34+lift],[40,32+lift]], C.skinShade, 'none', 0)
      + polygon([[41,31+lift],[47,32+lift],[48,37+lift],[43,39+lift],[40,35+lift]], C.copper)
      + polygon([[43,33+lift],[46,34+lift],[46,37+lift],[42,36+lift]], C.coral, 'none', 0)
      + polygon([[44,37+lift],[49,36+lift],[51,39+lift],[48,42+lift],[43,40+lift]], C.navy)
      + polygon([[47,38+lift],[50,39+lift],[48,41+lift],[46,40+lift]], C.skin);
  }
  const arm = polygon([[38,24+lift],[43,25+lift],[46,29+lift],[45,33+lift],[41,34+lift],[38,30+lift]], C.skin)
    + polygon([[41,26+lift],[44,28+lift],[44,31+lift],[41,31+lift]], C.skinShade, 'none', 0)
    + polygon([[42,31+lift],[48,30+lift],[51,33+lift],[50,38+lift],[46,40+lift],[42,37+lift]], C.copper)
    + polygon([[44,32+lift],[48,32+lift],[49,35+lift],[45,36+lift]], C.coral, 'none', 0)
    + polygon([[48,31+lift],[52,32+lift],[54,35+lift],[52,38+lift],[48,37+lift]], C.navy)
    + polygon([[50,33+lift],[52,34+lift],[52,36+lift],[50,36+lift]], C.skin);
  return p.frontSwing ? rotate(p.frontSwing, 40, 27+lift, arm) : arm;
}

function rearArm(p) {
  const lift = p.lift || 0;
  const arm = polygon([[26,24+lift],[31,25+lift],[32,29+lift],[29,33+lift],[27,37+lift],[23,37+lift],[22,33+lift],[24,29+lift]], C.navy)
    + polygon([[25,29+lift],[29,28+lift],[28,33+lift],[25,35+lift]], C.skin)
    + polygon([[23,34+lift],[28,34+lift],[29,39+lift],[26,43+lift],[21,41+lift],[20,38+lift]], C.copper)
    + polygon([[23,36+lift],[26,36+lift],[26,40+lift],[22,39+lift]], C.pearl, 'none', 0)
    + polygon([[21,40+lift],[26,41+lift],[27,44+lift],[24,46+lift],[20,44+lift]], C.navy)
    + polygon([[22,42+lift],[25,42+lift],[25,44+lift],[22,44+lift]], C.skin);
  return p.rearSwing ? rotate(p.rearSwing, 27, 28+lift, arm) : arm;
}

function head(p) {
  const y = (p.headY || 0) + 1;
  const face = polygon([[31,9+y],[37,7+y],[43,10+y],[46,15+y],[44,21+y],[39,25+y],[33,23+y],[29,18+y]], C.skin)
    + polygon([[40,13+y],[44,14+y],[44,17+y],[42,19+y],[39,18+y]], C.skinShade, 'none', 0)
    + rect(39, 14+y, 2, 2, C.ink)
    + polygon([[42,19+y],[46,19+y],[44,21+y],[41,21+y]], C.ink, 'none', 0)
    + polygon([[30,13+y],[35,12+y],[37,16+y],[33,18+y],[29,17+y]], C.skinShade, 'none', 0);
  const hair = polygon([[29,18+y],[25,17+y],[22,14+y],[22,11+y],[17,10+y],[21,8+y],[23,5+y],[29,4+y],[32,2+y],[39,3+y],[44,7+y],[43,11+y],[40,13+y],[38,9+y],[33,8+y],[32,12+y]], C.pearl)
    + polygon([[24,11+y],[29,9+y],[34,9+y],[32,12+y],[28,14+y],[26,17+y],[23,15+y]], C.slate, 'none', 0)
    + polygon([[38,7+y],[43,9+y],[44,13+y],[41,17+y],[39,14+y],[40,10+y]], C.teal)
    + polygon([[40,8+y],[43,10+y],[43,13+y],[41,15+y]], C.tealLight, 'none', 0)
    + polygon([[28,5+y],[34,4+y],[37,6+y],[32,7+y],[29,9+y],[25,9+y]], C.light, 'none', 0);
  return rotate(p.headTilt || 0, 36, 18+y, hair + face);
}

function art(p, facing = 'right', dawnrush = false) {
  const pose = { ...p, dawnrush: dawnrush || p.dawnrush };
  const backSash = polygon([[25,34],[20,34],[16,37],[10,39],[5,45],[3,52],[8,55],[15,51],[20,48],[27,46]], C.navy)
    + polygon([[18,38],[11,41],[7,46],[6,51],[11,50],[17,46],[24,43]], C.pearl, C.ink, 2)
    + polygon([[12,42],[8,46],[8,49],[14,47],[18,44]], C.coral, 'none', 0);
  const waistSash = polygon([[26,33],[32,34],[38,35],[42,38],[39,42],[33,40],[27,39],[23,37]], C.pearl)
    + polygon([[27,35],[32,36],[36,37],[34,39],[28,38]], C.slate, 'none', 0)
    + polygon([[35,35],[39,37],[42,41],[45,45],[42,47],[38,43],[35,40]], C.pearl)
    + polygon([[40,40],[43,43],[43,45],[40,43]], C.coral, 'none', 0);
  const core = backSash
    + leg(true, pose.backLeg || 0, pose.crouch)
    + leg(false, pose.frontLeg || 0, pose.crouch)
    + waistSash
    + rotate(pose.tilt || 0, 33, 32, rearArm(pose) + torso(pose))
    + rotate(pose.tilt || 0, 33, 32, frontArm(pose))
    + head(pose);
  const transform = facing === 'left' ? 'translate(64 0) scale(-1 1)' : '';
  const extras = dawnrush
    ? polygon([[20,21],[25,17],[31,18],[35,22],[32,28],[26,30],[19,27],[14,26]], C.pearl)
      + polygon([[18,23],[25,21],[30,23],[28,26],[21,27],[16,26]], C.copper)
      + polygon([[18,23],[24,22],[27,24],[23,25],[18,25]], C.coral, 'none', 0)
      + polygon([[40,29],[48,27],[55,30],[60,35],[60,41],[57,45],[51,44],[45,41],[42,36]], C.copper)
      + polygon([[45,31],[52,30],[57,34],[59,38],[55,40],[50,37],[45,36]], C.coral, 'none', 0)
      + polygon([[49,29],[52,28],[54,30],[52,32],[49,32]], C.light, 'none', 0)
    : '';
  return '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" shape-rendering="crispEdges"><g>' + (transform ? '<g transform="' + transform + '">' : '') + core + extras + (transform ? '</g>' : '') + '</g></svg>';
}

const poses = [
  { id:'idle-0', state:'idle', durationMs:180, edit:'neutral guard; stable paired boot anchors', p:{frontSwing:0} },
  { id:'idle-1', state:'idle', durationMs:220, edit:'breath lifts chest and head by one pixel; hand settles', p:{lift:-1,headY:-1,frontSwing:-3,rearSwing:2} },
  { id:'idle-2', state:'idle', durationMs:180, edit:'weight returns; lead glove lowers and sash angles back', p:{frontSwing:3,rearSwing:-1} },
  { id:'start-0', state:'start', durationMs:70, edit:'knees compress and shoulders lean into movement', p:{crouch:true,lift:1,tilt:-4,frontLeg:-8,backLeg:9,frontSwing:16,rearSwing:-12} },
  { id:'run-0', state:'run', durationMs:90, edit:'lead foot plants; rear boot drives behind; arms counter-swing', p:{tilt:-5,frontLeg:0,backLeg:-24,frontSwing:30,rearSwing:-24} },
  { id:'run-1', state:'run', durationMs:100, edit:'rear foot plants; lead knee passes through; torso rebounds', p:{tilt:-2,frontLeg:-17,backLeg:0,frontSwing:-20,rearSwing:22,lift:-1} },
  { id:'run-2', state:'run', durationMs:90, edit:'lead foot reaches; pelvis lowers under impact', p:{tilt:-5,frontLeg:16,backLeg:-9,frontSwing:23,rearSwing:-18} },
  { id:'run-3', state:'run', durationMs:100, edit:'weight crosses over planted lead boot; arms pass guard', p:{tilt:-1,frontLeg:0,backLeg:15,frontSwing:-18,rearSwing:17,lift:-1} },
  { id:'stop-0', state:'stop', durationMs:85, edit:'heel braces and hips sit behind stopping force', p:{crouch:true,tilt:5,frontLeg:-14,backLeg:8,frontSwing:-9,rearSwing:8} },
  { id:'turn-0', state:'turn', durationMs:90, edit:'compact guard turns with a one-pixel head and shoulder lead', p:{tilt:3,headTilt:3,frontSwing:-9,rearSwing:7} },
  { id:'jump-rise', state:'jumpRise', durationMs:95, edit:'takeoff draws knees and lifts guarded hands', p:{tilt:-6,frontLeg:-24,backLeg:18,frontSwing:18,rearSwing:-16,lift:-1} },
  { id:'jump-apex', state:'jumpApex', durationMs:115, edit:'apex tucks knees with separated boots and open guard', p:{tilt:-3,frontLeg:-18,backLeg:20,frontSwing:27,rearSwing:-25,lift:-2} },
  { id:'jump-fall', state:'fall', durationMs:100, edit:'falls into forward-facing guard; lead boot reaches down', p:{tilt:4,frontLeg:15,backLeg:-12,frontSwing:8,rearSwing:-5} },
  { id:'land-0', state:'land', durationMs:75, edit:'two knees absorb landing without moving the floor anchor', p:{crouch:true,lift:1,tilt:4,frontLeg:-8,backLeg:10,frontSwing:-7,rearSwing:4} },
  { id:'land-1', state:'land', durationMs:100, edit:'shoulder and cloth recover over planted boots', p:{crouch:true,lift:0,tilt:1,frontLeg:0,backLeg:3,frontSwing:0,rearSwing:0} },
  { id:'dash-0', state:'dash', durationMs:55, edit:'hips and shoulder compress into a low driving shape', p:{crouch:true,lift:1,tilt:-11,frontLeg:-12,backLeg:16,frontSwing:34,rearSwing:-24} },
  { id:'dash-1', state:'dash', durationMs:70, edit:'body extends through a long brace; rear sash streams', p:{lift:-1,tilt:-9,frontLeg:8,backLeg:-17,frontSwing:42,rearSwing:-32} },
  { id:'dash-recover', state:'dashRecover', durationMs:100, edit:'shoulders rise as knees replant after dash', p:{crouch:true,tilt:2,frontLeg:-3,backLeg:3,frontSwing:7,rearSwing:-5} },
  { id:'hit-windup', state:'attack', durationMs:130, edit:'hip turns and armored fist chambers close to ribs', p:{tilt:-5,frontLeg:-5,backLeg:5,punch:'windup',frontSwing:0,rearSwing:-5} },
  { id:'hit-contact', state:'attack', durationMs:90, edit:'shoulder drives extended bracer fist; rear boot pushes', p:{tilt:-8,frontLeg:5,backLeg:-7,punch:'contact',frontSwing:0,rearSwing:-4,lift:-1} },
  { id:'hit-recover', state:'attack', durationMs:260, edit:'arm recoils through guard into measured recovery', p:{tilt:2,frontLeg:0,backLeg:0,punch:'windup',frontSwing:-4,rearSwing:3} },
];

async function main() {
  await Promise.all([mkdir(framesDir,{recursive:true}), mkdir(runtimeDir,{recursive:true}), mkdir(manifestDir,{recursive:true})]);
  const records = [];
  for (const pose of poses) for (const facing of ['right','left']) {
    const id = pose.id + '-' + facing;
    const svg = Buffer.from(art(pose.p,facing));
    const svgPath = path.join(framesDir,id+'.svg');
    await writeFile(svgPath,svg);
    records.push({id,state:pose.state,facing,durationMs:pose.durationMs,edit:pose.edit,pivot:{origin:[0.5,1],feet:[32,64]},eventIds:pose.id==='hit-contact'?['contact']:[],source:'art-source/characters/iona/overnight/frames/'+id+'.svg',sourceSha256:hash(svg)});
  }
  for (const facing of ['right','left']) {
    const svg = Buffer.from(art({p:0},facing,true));
    const svgPath = path.join(framesDir,'dawnrush-silhouette-'+facing+'.svg');
    await writeFile(svgPath,svg);
    records.push({id:'dawnrush-silhouette-'+facing,state:'comparison',facing,durationMs:null,edit:'same Base identity with broader shoulder shell and copper pressure forearm; VFX off',pivot:{origin:[0.5,1],feet:[32,64]},eventIds:[],source:'art-source/characters/iona/overnight/frames/dawnrush-silhouette-'+facing+'.svg',sourceSha256:hash(svg)});
  }
  const browser = await chromium.launch({channel:'chrome',headless:true});
  let rasterizerVersion='unknown';
  try {
    rasterizerVersion=browser.version();
    const page = await browser.newPage({viewport:{width:64,height:64},deviceScaleFactor:1, isMobile:false});
    await page.setContent('<style>html,body{margin:0;width:64px;height:64px;overflow:hidden;background:transparent}</style><img id="sprite" style="display:block;width:64px;height:64px"/>');
    for (const entry of records) {
      const svg = await readFile(path.join(root,entry.source));
      await page.locator('#sprite').evaluate((img,src)=>{img.src='data:image/svg+xml;base64,'+src;},svg.toString('base64'));
      await page.waitForFunction(()=>document.querySelector('#sprite').complete && document.querySelector('#sprite').naturalWidth===64);
      const raster = await page.evaluate(() => {
        const canvas=document.createElement('canvas'); canvas.width=64; canvas.height=64;
        const context=canvas.getContext('2d',{alpha:true});
        if (!context) throw new Error('Canvas 2D unavailable');
        context.imageSmoothingEnabled=false;
        const image=document.querySelector('#sprite');
        context.drawImage(image,0,0,64,64);
        const pixels=context.getImageData(0,0,64,64).data;
        let count=0,minX=64,minY=64,maxX=-1,maxY=-1;
        for(let y=0;y<64;y++)for(let x=0;x<64;x++)if(pixels[(y*64+x)*4+3]>0){count++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
        return {png:canvas.toDataURL('image/png').split(',')[1],alphaPixelCount:count,alphaBounds:[minX,minY,maxX+1,maxY+1],transparentCorners:[3,63*4+3,63*64*4+3,64*64*4-1].map((index)=>pixels[index])};
      });
      if(raster.alphaPixelCount<100||raster.alphaBounds[1]<1||raster.alphaBounds[3]>64||raster.transparentCorners.some((alpha)=>alpha!==0))throw new Error('Invalid alpha bounds or matte for '+entry.id);
      const png=Buffer.from(raster.png,'base64');
      entry.output='public/assets/characters/iona/overnight/'+entry.id+'.png';
      entry.outputSha256=hash(png);
      entry.alphaPixelCount=raster.alphaPixelCount;
      entry.alphaBounds=raster.alphaBounds;
      entry.transparentCorners=raster.transparentCorners;
      await writeFile(path.join(root,entry.output),png);
    }
  } finally { await browser.close(); }
  const sourceRefs = [
    {path:'art-source/characters/iona/b01a/iona-base-recommended-master-source.png',usage:'palette and identity reference; not an animation frame'},
    {path:'art-source/characters/iona/b01a/iona-base-left-facing-study-source.png',usage:'directional asymmetry reference; not used as frame pixels'},
    {path:'art-source/characters/iona/overnight/iona-overnight-base-generated-reference.png',usage:'imagegen composition study; opaque checkerboard is not runtime art',tool:'OpenAI image_gen__imagegen',toolOutputId:'exec-08414fe6-7c68-48c3-bbb0-c6d7eefde2f7',alpha:'opaque; checkerboard baked into RGB'},
    {path:'art-source/characters/iona/overnight/iona-overnight-dawnrush-generated-reference.png',usage:'imagegen mass-distribution study; white background is not runtime art',tool:'OpenAI image_gen__imagegen',toolOutputId:null,alpha:'opaque illustration background; retained for reference only'},
  ];
  for (const ref of sourceRefs) ref.sha256=hash(await readFile(path.join(root,ref.path)));
  const manifest = {
    id:'iona-overnight-v1',version:1,status:'REJECTED_OWNER_ART',runtimeDefault:false,retainedFor:'historical comparison and regression QA only',
    created:'2026-11-07',target:{canvas:[64,64],visibleCharacterHeightPx:60,origin:[0.5,1],footAnchor:[32,64],physicsBodyReference:[15,30]},
    style:{palette:C,outline:'2px deep navy hard edge; all contours use integer coordinates and crisp-edged rasterization',directions:'right pose is authored; left output is a reviewed horizontal counterpart with front bracer and teal lock remaining on the leading side'},
    pipeline:{command:'npm run art:iona:overnight:build',source:'tools/art-export/build-iona-overnight.mjs',rasterizer:'Installed Chrome SVG and Canvas renderer at 64x64/deviceScaleFactor 1; no post-export scaling; transparent PNG',chromeVersion:rasterizerVersion},
    sources:sourceRefs,
    authorship:{frameArtwork:'Manually authored geometric pixel clusters in retained SVG files; generated illustrations are references only.',license:'Original project work; no third-party character art incorporated. Final commercial clearance remains with the project owner.'},
    clips:[
      {id:'base-idle',state:'idle',loop:true,frames:['idle-0','idle-1','idle-2','idle-1'],totalMs:800},
      {id:'base-run',state:'run',loop:true,frames:['run-0','run-1','run-2','run-3'],totalMs:380,cadence:'scaled from measured horizontal velocity'},
      {id:'base-jump-land',states:['jumpRise','jumpApex','fall','land'],loop:false,frames:['jump-rise','jump-apex','jump-fall','land-0','land-1']},
      {id:'base-dash',states:['dash','dashRecover'],loop:false,frames:['dash-0','dash-1','dash-recover']},
      {id:'base-light-hit',moveId:'iona-base-jab',loop:false,phases:{startupMs:130,activeMs:100,recoveryMs:260},frames:['hit-windup','hit-contact','hit-recover'],events:[{id:'contact',atMs:162,frame:'hit-contact',sourceId:'iona-player',targetId:'training-dummy'}]},
    ],
    frames:records,
    comparisons:[
      {id:'base-before',path:'public/assets/characters/iona/b01a/base-60.png',status:'B01A candidate; before'},
      {id:'base-after',path:'public/assets/characters/iona/overnight/idle-0-right.png',status:'hand-authored pixel candidate; after'},
      {id:'stormhalo',path:'public/assets/characters/iona/b01a/stormhalo-60.png',status:'B01A comparison preserved'},
      {id:'eclipse-warden',path:'public/assets/characters/iona/b01a/eclipse-warden-60.png',status:'B01A comparison preserved; atmospheric source is not considered cleaned'},
    ],
    notes:['Dawnrush comparison is a VFX-off silhouette sample only; no full form catalog was produced.','Stormhalo and Eclipse Warden are displayed from unchanged B01A outputs; their cleanup remains incomplete.','All candidate images are provisional and do not approve canonical identity, scale, or motion.']
  };
  const json=JSON.stringify(manifest,null,2)+'\n';
  await writeFile(outputManifest,json);
  console.log('Exported '+records.length+' transparent PNG frames; manifest '+outputManifest);
}
main().catch((error)=>{console.error(error);process.exitCode=1;});
