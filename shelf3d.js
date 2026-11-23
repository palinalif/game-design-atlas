/* PLAYABLE — a tangible game shelf. The catalog and progress state stay in index.html.
   This optional ES module only renders the shelf. No API credentials are involved. */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js';

const stage = document.getElementById('threeShelf');
const viewport = document.getElementById('threeViewport');
const tooltip = document.getElementById('threeTooltip');
const toggle = document.getElementById('threeShelfToggle');
const catalog = document.getElementById('catalog');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
if (!stage || !viewport || !tooltip || !toggle || !catalog) throw new Error('Three.js shelf mount is missing.');

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 650 ? 1.25 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.22;
  renderer.shadowMap.enabled = false; // Ambient lighting, not per-frame shadow passes, for handhelds.
} catch (error) {
  console.info('PLAYABLE 3D unavailable; keeping the accessible 2D shelves.', error);
  // 2D is the original implementation, not an error screen.
}

if (renderer) {
  viewport.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', 'Interactive 3D game shelves. Click a game case to open it, or use the shelf navigation buttons.');
  renderer.domElement.setAttribute('role', 'img');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#d6c6b1');
  scene.fog = new THREE.Fog('#d6c6b1', 30, 82);
  const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 130);
  scene.add(new THREE.HemisphereLight(0xfff7e6, 0x76644b, 2.0));
  const keyLight = new THREE.DirectionalLight(0xffe9c8, 2.4);
  keyLight.position.set(-5, 9, 11); scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xd9e5f2, 0.48);
  fillLight.position.set(7, 1, 8); scene.add(fillLight);
  const wallRoot = new THREE.Group(); scene.add(wallRoot);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const clickables = [];
  const caseById = new Map();
  const artRequests = new Map();
  const textures = new Set();
  const mats = new Set();
  const geometries = new Set();
  const textureLoader = new THREE.TextureLoader();
  textureLoader.setCrossOrigin('anonymous');
  let state = null, structure = '', focusedId = null;
  let wallSpacing = 13, targetX = 0, actualX = 0, cameraDistance = 14, raf = 0;
  let enabled = true, hovered = null, pointerStart = null, renderedOnce = false;
  const palette = ['#506264','#9f7664','#6c6c82','#6e7b64','#a28a62','#7c6575','#536e83','#8d6f55'];
  const roughWood = new THREE.MeshStandardMaterial({ color: 0xa07047, roughness: 0.93 });
  const woodEdge = new THREE.MeshStandardMaterial({ color: 0x6d452b, roughness: 0.93 });
  const warmWall = new THREE.MeshStandardMaterial({ color: 0xd2b99b, roughness: 1 });
  const darkPlastic = new THREE.MeshStandardMaterial({ color: 0x383839, roughness: 0.62, metalness: 0.06 });
  const cableMaterial = new THREE.MeshStandardMaterial({ color: 0x292c2b, roughness: 0.8 });
  const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xffd189 });
  [roughWood,woodEdge,warmWall,darkPlastic,cableMaterial,lightMaterial].forEach(m=>mats.add(m));

  const box = (group,w,h,d,x,y,z,material) => {
    const geometry = new THREE.BoxGeometry(w,h,d); geometries.add(geometry);
    const mesh = new THREE.Mesh(geometry,material); mesh.position.set(x,y,z); group.add(mesh); return mesh;
  };
  function canvasTexture(draw, w=256, h=384) {
    const canvas = document.createElement('canvas'); canvas.width=w; canvas.height=h;
    const ctx=canvas.getContext('2d'); draw(ctx,w,h);
    const tex=new THREE.CanvasTexture(canvas); tex.colorSpace=THREE.SRGBColorSpace; tex.anisotropy=2; textures.add(tex); return tex;
  }
  function labelTexture(title, subtitle, color='#bdb79d', height=96) {
    return canvasTexture((ctx,w,h)=>{
      ctx.fillStyle=color;ctx.fillRect(0,0,w,h);
      ctx.fillStyle='rgba(55,41,22,.07)';for(let i=0;i<200;i++){let x=(i*83)%w,y=(i*137)%h;ctx.fillRect(x,y,1,1)}
      ctx.fillStyle='#413121';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.font='700 35px Georgia,serif';ctx.fillText(title, w/2, h*.38, w*.9);
      ctx.font='700 20px sans-serif';ctx.fillText(subtitle.toUpperCase(),w/2,h*.73,w*.88);
    },512,height);
  }
  function coverTexture(game) {
    const seed=[...game.title].reduce((a,c)=>a+c.charCodeAt(0),0),color=palette[seed%palette.length];
    return canvasTexture((ctx,w,h)=>{
      ctx.fillStyle=color;ctx.fillRect(0,0,w,h);
      ctx.fillStyle='rgba(255,255,255,.09)';for(let i=-w;i<w*2;i+=30){ctx.save();ctx.translate(i,0);ctx.rotate(.24);ctx.fillRect(0,0,6,h*2);ctx.restore()}
      ctx.strokeStyle='#eee1ce';ctx.lineWidth=5;ctx.strokeRect(15,15,w-30,h-30);
      ctx.fillStyle='#fff5e2';ctx.font='bold 15px sans-serif';ctx.textAlign='center';ctx.fillText(game.platform,w/2,40,w-35);
      const words=game.title.split(' ');const lines=[];let line='';for(const word of words){const t=line?line+' '+word:word;if(t.length>17&&line){lines.push(line);line=word}else line=t}if(line)lines.push(line);
      ctx.font='bold 32px Georgia,serif';ctx.textBaseline='middle';lines.slice(0,5).forEach((line,i)=>ctx.fillText(line,w/2,h*.42+(i-(Math.min(5,lines.length)-1)/2)*39,w-38));
      ctx.font='bold 14px sans-serif';ctx.fillText(String(game.year),w/2,h-41);
    });
  }
  function plane(group,w,h,x,y,z,texture,transparent=false) {
    const geometry=new THREE.PlaneGeometry(w,h); geometries.add(geometry);
    const mat=new THREE.MeshBasicMaterial({map:texture,side:THREE.FrontSide,transparent}); mats.add(mat);
    const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y,z);group.add(mesh);return mesh;
  }
  function setGameId(mesh, game) {mesh.userData.gameId=game.id;mesh.userData.gameTitle=game.title;clickables.push(mesh)}
  function makeCase(group, game, system, x, shelfTop, order) {
    const cartridge=['Game Boy','GBA','SNES','N64'].includes(system),jewel=system==='PS1';
    const handheld=system==='Game Boy'||system==='GBA';
    const width=cartridge?(handheld ? .62 : .81):(jewel ? .72 : .69);
    const height=cartridge?(handheld ? .87 : 1.01):(jewel ? 1.05 : 1.13);
    const depth=cartridge ? .22 : (jewel ? .14 : .17);
    const caseGroup=new THREE.Group();
    const wobble=(((order*19+game.year)%13)-6)*.0045;
    caseGroup.position.set(x,shelfTop+height/2+.02,.50);
    caseGroup.rotation.z=wobble;
    group.add(caseGroup);
    const colors={ 'Game Boy':0xbdb8aa,'GBA':0x434a56,'SNES':0xb8ae9a,'N64':0x53575b,'PS1':0xb7b6b5,'PS2':0x232c4d,'GameCube':0x343251,'Wii':0xe7e6e1,'PC & DOS':0x998b78 };
    const bodyMaterial=new THREE.MeshStandardMaterial({ color:colors[system]||0x5b5a55,roughness:cartridge ? .89 : .47,metalness:0.03 });mats.add(bodyMaterial);
    const body=box(caseGroup,width,height,depth,0,0,0,bodyMaterial);setGameId(body,game);
    const cover=coverTexture(game);
    const artWidth=cartridge?width*.80:width*.89;
    const artHeight=cartridge?height*.62:height*.91;
    const artY=cartridge?height*.035:0;
    const front=plane(caseGroup,artWidth,artHeight,0,artY,depth/2+.008,cover);setGameId(front,game);
    if(!cartridge){
      box(caseGroup,.052,height+.01,.015,-width/2+.045,0,depth/2+.013,system==='PS2'?new THREE.MeshStandardMaterial({color:0x263c8a,roughness:.58}):darkPlastic);
    }else{
      box(caseGroup,width*.68,.053,.06,0,-height*.44,depth/2+.013,bodyMaterial);
    }
    // Small sticker on the corner, and occasional scuffed/tape edges.
    if((order+game.year)%4===0){
      const sticker=labelTexture(String(game.year),'used','#ead9b3',128);
      const stickerMesh=plane(caseGroup,.22,.13,width*.23,height*.37,depth/2+.016,sticker);
      setGameId(stickerMesh,game);
    }
    caseById.set(game.id,{game,group:caseGroup,front,artWidth,artHeight,artY,depth,cover,baseY:caseGroup.position.y,baseScale:1,loadedSource:null,loadingSource:null,wall:0});
  }
  function shelfLabel(group,name,index,width,y) {
    const tex=labelTexture(name, index?'MORE FROM THE COLLECTION':'THE COLLECTION','#d7c49d',128);
    plane(group,Math.min(2.5,width*.39),.34,-width*.5+1.7,y+.28,.76,tex);
  }
  function makeControllers(group,width,bottomY,seed) {
    // Physical clutter: old controllers plus their subtly tangled cables, all real geometry.
    if(width<5.4)return;
    const x=width*.5-1.6;
    const y=bottomY+.46;
    const controller=new THREE.Group();controller.position.set(x,y,.77);controller.rotation.set(-.28,.22,-.1);group.add(controller);
    box(controller,.72,.20,.31,0,0,0,darkPlastic);
    for(const sx of [-1,1]){
      const grip=box(controller,.23,.35,.27,sx*.34,-.16,.01,darkPlastic);
      grip.rotation.z=sx*.22;
      const stick=new THREE.Mesh(new THREE.SphereGeometry(.07,9,7),cableMaterial);geometries.add(stick.geometry);stick.position.set(sx*.17,.045,.19);controller.add(stick);
    }
    const button1=new THREE.Mesh(new THREE.SphereGeometry(.035,7,6),lightMaterial);geometries.add(button1.geometry);button1.position.set(.26,.08,.18);controller.add(button1);
    const curve=new THREE.CatmullRomCurve3([
      new THREE.Vector3(x-.08,y+.03,.52),new THREE.Vector3(x-.48,y+.35,.55),
      new THREE.Vector3(x-.80,y+.03,.63),new THREE.Vector3(x-1.04,y+.11,.65),
      new THREE.Vector3(x-1.02,y+.40,.61),new THREE.Vector3(x-.74,y+.38,.62),
      new THREE.Vector3(x-.75,y-.03,.66),new THREE.Vector3(x-.96,y-.11,.66)]);
    const geometry=new THREE.TubeGeometry(curve,44,.017,5,false);geometries.add(geometry);
    group.add(new THREE.Mesh(geometry,cableMaterial));
    if(seed%2===0){
      const spare=new THREE.Group();spare.position.set(-width*.5+.82,y-.18,.74);spare.rotation.set(-.16,.25,.3);group.add(spare);
      box(spare,.57,.17,.29,0,0,0,darkPlastic);
      for(const sx of [-1,1])box(spare,.18,.27,.25,sx*.28,-.12,0,darkPlastic);
    }
  }
  function makeWall(rows,index,perRow,rowsPerWall,width) {
    const group=new THREE.Group();group.position.x=index*wallSpacing;wallRoot.add(group);
    const levelDistance=1.53;
    const yTop=(rowsPerWall-1)*levelDistance/2;
    const wallHeight=rowsPerWall*levelDistance+1.35;
    const bottom=-wallHeight/2;
    box(group,width+.72,wallHeight,.33,0,0,-.42,warmWall);
    box(group,.29,wallHeight+.22,.82,-width/2-.16,0,.02,woodEdge);
    box(group,.29,wallHeight+.22,.82,width/2+.16,0,.02,woodEdge);
    box(group,width+.7,.22,.86,0,wallHeight/2+.02,.02,woodEdge);
    box(group,width+.7,.20,.90,0,bottom-.03,.02,woodEdge);
    // A backdrop with hints of texture and lightly worn corners.
    for(let i=0;i<rowsPerWall;i++){
      const y=yTop-i*levelDistance;
      const shelfY=y-.11;
      box(group,width,.17,1.10,0,shelfY,-.02,roughWood);
      box(group,width+.06,.08,1.15,0,shelfY-.11,.03,woodEdge);
      const row=rows[i];
      if(row){
        // Console title is a paper label fixed to the inside backboard.
        const label=labelTexture(row.platform,row.continuation?'CONTINUED':'GAME COLLECTION','#d9c9ab',128);
        plane(group,Math.min(2.15,width*.36),.30,-width/2+1.25,y+.93,-.19,label);
        const total=row.games.length;
        const step=1.04;
        const start=-((total-1)*step)/2-(total<perRow?Math.min(.6,(perRow-total)*.10):0);
        row.games.forEach((g,j)=>{
          makeCase(group,g,row.platform,start+j*step,shelfY+.10,j+i*perRow);
          caseById.get(g.id).wall=index;
        });
      }else if(i===rows.length&&index===0){
        shelfLabel(group,'A PLACE FOR MORE',0,width,y);
      }
    }
    // Decorative strip with scattered marks under the bottom shelf.
    const marking=labelTexture('PLAYABLE',`SHELF ${String(index+1).padStart(2,'0')}`,'#c7b299',128);
    plane(group,1.55,.34,0,bottom+.29,.76,marking);
    makeControllers(group,width,bottom,index);
    return group;
  }
  function disposeBuiltScene() {
    for(const request of artRequests.values())request.cancelled=true;
    artRequests.clear();
    while(wallRoot.children.length) wallRoot.remove(wallRoot.children[0]);
    for(const material of mats){if(material!==roughWood&&material!==woodEdge&&material!==warmWall&&material!==darkPlastic&&material!==cableMaterial&&material!==lightMaterial)material.dispose()}
    for(const geometry of geometries)geometry.dispose();
    for(const tex of textures)tex.dispose();
    geometries.clear();textures.clear();
    [roughWood,woodEdge,warmWall,darkPlastic,cableMaterial,lightMaterial].forEach(m=>mats.add(m));
    for(const m of [...mats])if(![roughWood,woodEdge,warmWall,darkPlastic,cableMaterial,lightMaterial].includes(m))mats.delete(m);
    clickables.length=0;caseById.clear();
  }
  function loadArtAround(page){
    if(!state)return;
    const colors=new Map(state.covers||[]);
    for(const [id, ref] of caseById){
      if(Math.abs(ref.wall-page)>1)continue;
      const src=colors.get(id);
      if(!src || ref.loadedSource===src || ref.loadingSource===src)continue;
      const req={cancelled:false};artRequests.set(id,req);ref.loadingSource=src;
      textureLoader.load(src,(texture)=>{
        if(req.cancelled || caseById.get(id)!==ref){texture.dispose();return}
        texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=2;
        textures.add(texture);
        ref.front.material.map=texture;ref.front.material.needsUpdate=true;
        ref.loadedSource=src;ref.loadingSource=null;
        artRequests.delete(id);
        requestDraw();
      },undefined,()=>{if(!req.cancelled){ref.loadingSource=null;artRequests.delete(id)}});
    }
  }
  function widthFor(state){return Math.max(4.65,Math.min(11.3,2.0+(state.casesPerRow||5)*1.1))}
  function setCameraSizing(){
    if(!state)return;
    const width=Math.max(1,viewport.clientWidth),height=Math.max(1,viewport.clientHeight);
    camera.aspect=width/height;
    const wallW=widthFor(state)+1.1, wallH=(state.rowsPerWall||3)*1.53+1.95;
    const tan=Math.tan(THREE.MathUtils.degToRad(camera.fov)/2);
    cameraDistance=Math.max(wallH/(2*tan), wallW/(2*tan*camera.aspect))*1.14;
    camera.near=.1;camera.far=Math.max(130,cameraDistance+85);camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,width<650?1.25:1.75));
    renderer.setSize(width,height,false);
    requestDraw();
  }
  function focus(id){
    focusedId=id;
    for(const [gameId,ref] of caseById){
      const active=id===gameId;
      ref.group.position.y=ref.baseY+(active?.12:0);
      ref.group.scale.setScalar(active?1.10:1);
      ref.front.material.color.set(active?'#fff6e3':'#ffffff');
    }
  }
  function rebuild(incoming){
    disposeBuiltScene();
    const rows=incoming.rows||[],rowsPerWall=incoming.rowsPerWall||3,perRow=incoming.casesPerRow||6;
    const pageCount=Math.max(1,Math.ceil(rows.length/rowsPerWall));
    const width=widthFor(incoming);
    wallSpacing=width+2.2;
    for(let page=0;page<pageCount;page++)makeWall(rows.slice(page*rowsPerWall,(page+1)*rowsPerWall),page,perRow,rowsPerWall,width);
    if(!renderedOnce){actualX=(incoming.page||0)*wallSpacing;renderedOnce=true}
    setCameraSizing();
  }
  function draw(){
    raf=0;
    if(!enabled || !state || !stage.isConnected || catalog.hidden || document.hidden || document.getElementById('shelfScene')?.hidden)return;
    const next=reduceMotion.matches?targetX:THREE.MathUtils.lerp(actualX,targetX,.095);
    const travelling=Math.abs(targetX-next)>.008;
    actualX=travelling?next:targetX;
    camera.position.set(actualX+.45,0,cameraDistance);
    camera.lookAt(actualX,0,-.1);
    try {renderer.render(scene,camera)}catch(err){disable3D(err);return}
    if(travelling)requestDraw();
  }
  function disable3D(error){
    console.warn('PLAYABLE: 3D scene unavailable; returning to 2D shelves.', error);
    enabled=false;catalog.classList.remove('three-ready');
    stage.hidden=true;toggle.hidden=true;
    if(raf){cancelAnimationFrame(raf);raf=0}
  }
  function requestDraw(){if(!raf && enabled)raf=requestAnimationFrame(draw)}
  function update(incoming){
    if(!incoming)return;
    state=incoming;
    const signature=JSON.stringify([incoming.rows?.map(row=>[row.platform,row.games.map(g=>g.id)]),incoming.casesPerRow,incoming.rowsPerWall]);
    if(signature!==structure){structure=signature;rebuild(incoming)}
    targetX=(incoming.page||0)*wallSpacing;
    focus(incoming.target?.game?.id||null);
    loadArtAround(incoming.page||0);
    if(reduceMotion.matches)actualX=targetX;
    requestDraw();
  }
  function enable(value){
    enabled=Boolean(value);
    catalog.classList.toggle('three-disabled',!enabled);
    stage.hidden=!enabled;
    toggle.textContent=enabled?'Use 2D shelves':'Use 3D shelves';
    toggle.setAttribute('aria-pressed',String(enabled));
    if(enabled){setCameraSizing();requestDraw()}
  }
  function pick(e){
    const rect=renderer.domElement.getBoundingClientRect();
    if(!rect.width||!rect.height)return null;
    pointer.x=((e.clientX-rect.left)/rect.width)*2-1;
    pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;
    raycaster.setFromCamera(pointer,camera);
    return raycaster.intersectObjects(clickables,false).find(hit=>hit.object.userData.gameId)?.object.userData||null;
  }
  renderer.domElement.addEventListener('pointermove',e=>{
    if(!enabled)return;
    const hit=pick(e);hovered=hit;
    renderer.domElement.style.cursor=hit?'pointer':'default';
    tooltip.hidden=!hit;
    if(hit){tooltip.textContent=`Take ${hit.gameTitle} off the shelf`;tooltip.style.left=Math.max(10,Math.min(e.offsetX+14,viewport.clientWidth-205))+'px';tooltip.style.top=Math.max(10,Math.min(e.offsetY-28,viewport.clientHeight-45))+'px'}
  });
  renderer.domElement.addEventListener('pointerleave',()=>{hovered=null;tooltip.hidden=true;renderer.domElement.style.cursor='default'});
  renderer.domElement.addEventListener('pointerdown',e=>{pointerStart={x:e.clientX,y:e.clientY}});
  renderer.domElement.addEventListener('pointerup',e=>{
    if(!pointerStart)return;
    const moved=Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y);pointerStart=null;
    if(moved>10)return;
    const item=pick(e);if(item?.gameId)window.dispatchEvent(new CustomEvent('playable:open-game',{detail:{id:item.gameId}}));
  });
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();catalog.classList.remove('three-ready');stage.hidden=true;toggle.hidden=true;enabled=false});
  toggle.addEventListener('click',()=>enable(!enabled));
  new ResizeObserver(()=>setCameraSizing()).observe(viewport);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)requestDraw()});
  const initial=window.PLAYABLE_SHELF_3D_STATE;
  let broken=false;
  const safeUpdate=(payload)=>{
    if(broken)return;
    try{update(payload)}catch(error){broken=true;disable3D(error)}
  };
  window.PlayableShelf3D={update:safeUpdate,enable};
  try{
    if(initial)update(initial);
    else {state={rows:[],page:0,casesPerRow:6,rowsPerWall:3};rebuild(state);requestDraw()}
    catalog.classList.add('three-ready');
    stage.hidden=false;
    toggle.hidden=false;
    requestDraw();
  }catch(error){broken=true;disable3D(error)}
}