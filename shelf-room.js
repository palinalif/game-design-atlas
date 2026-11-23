import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { canvasTexture, kit, randomGenerator, surface } from './shelf-graphics.js';

export const DECKS = [.983, .734, .485, .236];
export const CASE_FRONT = .245;

function paintWash(ctx, x, y, radiusX, radiusY, colorStops) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(radiusX, radiusY);
  const wash = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  for (const [offset, color] of colorStops) wash.addColorStop(offset, color);
  ctx.fillStyle = wash;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
}

function paintedMortar(ctx, width, height) {
  const w = 1024;
  const h = 640;
  ctx.save();
  ctx.scale(width / w, height / h);
  const random = randomGenerator(31);
  for (let y = -5, row = 0; y < h; y += 41, row++) {
    // Filled joints and a low-sheen paint coat soften the block edges.
    const seam = ctx.createLinearGradient(0, y - 1, 0, y + 4);
    seam.addColorStop(0, '#121e1500');
    seam.addColorStop(.45, '#121e1540');
    seam.addColorStop(.76, '#b4bfa311');
    seam.addColorStop(1, '#b4bfa300');
    ctx.fillStyle = seam;
    ctx.fillRect(0, y - 1, w, 5);
    for (let x = row % 2 ? -48 : 0; x < w; x += 96) {
      const offset = Math.round(random() * 4) - 2;
      ctx.fillStyle = random() < .53 ? '#aeb6940d' : '#13241912';
      ctx.fillRect(x + offset + 1, y + 3, 93, 36);
      ctx.fillStyle = '#12241a36';
      ctx.fillRect(x + offset, y + 1, 1, 39);
      ctx.fillStyle = '#b4bfa318';
      ctx.fillRect(x + offset + 1, y + 3, 1, 36);
    }
  }

  for (let i = 0; i < 720; i++) {
    const x = random() * w;
    const y = random() * h;
    const radius = 2 + random() * 11;
    paintWash(ctx, x, y, radius, radius * .69, [
      [0, i % 2 ? '#b1b99a12' : '#07160d1a'],
      [1, '#07160d00'],
    ]);
  }
  for (let i = 0; i < 9500; i++) {
    ctx.fillStyle = i % 2 ? '#e2d9a40e' : '#12241a27';
    ctx.fillRect(random() * w, random() * h, .8 + random(), .85);
  }
  ctx.restore();
}

function blockTexture(ctx, w, h, image) {
  const pattern = ctx.createPattern(image, 'repeat');
  const tileMeters = 1.61;
  pattern.setTransform(new DOMMatrix([
    w * tileMeters / (4.7 * image.naturalWidth), 0, 0,
    h * tileMeters / (2.8 * image.naturalHeight), 0, 17,
  ]));
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = .71;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function wallFinish(ctx, w, h, masonry) {
  const paint = ctx.createLinearGradient(w * .27, h * .56, w * .78, h);
  paint.addColorStop(0, '#344a3e');
  paint.addColorStop(.48, '#2a3d34');
  paint.addColorStop(1, '#182923');
  ctx.fillStyle = paint;
  ctx.fillRect(0, 0, w, h);
  if (!masonry) paintedMortar(ctx, w, h);

  paintWash(ctx, w * .423, h * .55, w * .22, h * .32, [
    [0, '#a4bbc649'],
    [.40, '#84a4b532'],
    [1, '#6c9baa00'],
  ]);
  paintWash(ctx, w * .648, h * .782, w * .123, h * .255, [
    [0, '#f3ba7392'],
    [.27, '#ce935959'],
    [.58, '#b777452c'],
    [1, '#9f674100'],
  ]);

  if (masonry) blockTexture(ctx, w, h, masonry);
}

function windowView(ctx, w, h) {
  const background = ctx.createLinearGradient(0, 0, 0, h);
  background.addColorStop(0, '#adc8ce');
  background.addColorStop(.5, '#b4c5aa');
  background.addColorStop(1, '#61766a');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);
  const random = randomGenerator(19);
  ctx.filter = 'blur(4px)';
  for (let i = 0; i < 200; i++) {
    const height = random();
    ctx.fillStyle = ['#9cb29263', '#3d615b70', '#e4d8a863', '#a7bdac6c'][i % 4];
    ctx.beginPath();
    ctx.ellipse(w * random(), h * (.38 + height * .68), 12 + random() * 34, 6 + random() * 27, random(), 0, Math.PI * 2);
    ctx.fill();
  }
}

function glassFinish(ctx, w, h) {
  const tint = ctx.createLinearGradient(w * .1, 0, w * .72, h);
  tint.addColorStop(0, '#374641');
  tint.addColorStop(.48, '#222f2c');
  tint.addColorStop(1, '#151e1c');
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(w * .12, h * .07);
  ctx.transform(1, .06, -.11, 1, 0, 0);
  ctx.filter = 'blur(2px)';
  ctx.fillStyle = '#b2cac24d';
  ctx.fillRect(0, 0, w * .22, h * .11);
  ctx.fillRect(w * .237, 0, w * .16, h * .11);
  ctx.restore();
  paintWash(ctx, w * .26, h * .19, w * .51, h * .43, [
    [0, '#8da9a622'],
    [1, '#8da9a600'],
  ]);
}

function framedPrint(ctx, w, h) {
  ctx.fillStyle = '#e7d5a8';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#caa37e';
  ctx.fillRect(22, 25, w - 44, h - 50);
  ctx.fillStyle = '#bd6d4e';
  ctx.beginPath();
  ctx.arc(w * .64, h * .39, w * .14, 0, Math.PI * 2);
  ctx.fill();
  for (const [height, tint] of [[.54, '#746e59'], [.64, '#4f594e'], [.74, '#343f38']]) {
    ctx.beginPath();
    ctx.moveTo(22, h * (height + .08));
    ctx.lineTo(w * .36, h * (height - .07));
    ctx.lineTo(w * .72, h * (height + .04));
    ctx.lineTo(w - 22, h * height);
    ctx.lineTo(w - 22, h - 25);
    ctx.lineTo(22, h - 25);
    ctx.fillStyle = tint;
    ctx.fill();
  }
}

function shadowMap(ctx, w, h) {
  const shade = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  shade.addColorStop(0, '#20140f');
  shade.addColorStop(.58, '#21160d89');
  shade.addColorStop(1, '#20140f00');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, w, h);
}

function fabricFinish(ctx, w, h) {
  const linen = ctx.createLinearGradient(0, 0, 0, h);
  linen.addColorStop(0, '#b9895d');
  linen.addColorStop(.36, '#e6b97f');
  linen.addColorStop(.76, '#dfaf77');
  linen.addColorStop(1, '#bb8a5d');
  ctx.fillStyle = linen;
  ctx.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x++) {
    ctx.fillStyle = x % 4 < 2 ? '#764a322b' : '#fff2be35';
    ctx.fillRect(x, 0, 1, h);
  }
  ctx.fillStyle = '#80593537';
  for (let y = 2; y < h; y += 3) ctx.fillRect(0, y, w, 1);
  ctx.fillStyle = '#75513266';
  ctx.fillRect(0, 0, w, 2);
  ctx.fillRect(0, h - 3, w, 3);
}

// Merge opaque static meshes by material. Props need no per-object updates.
function batchRoom(root, kit) {
  root.updateMatrixWorld(true);
  const groups = new Map();
  root.traverse(object => {
    if (!object.isMesh || object.material.transparent) return;
    if (!groups.has(object.material)) groups.set(object.material, []);
    groups.get(object.material).push(object);
  });
  for (const [material, objects] of groups) {
    if (objects.length < 2) continue;
    const buffers = objects.map(object => {
      const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
      return geometry.applyMatrix4(object.matrixWorld);
    });
    const merged = mergeGeometries(buffers);
    buffers.forEach(buffer => buffer.dispose());
    if (!merged) continue;
    for (const object of objects) object.removeFromParent();
    const batch = kit.mesh(root, kit.keep(merged), material, 0, 0, 0);
    batch.castShadow = objects[0].castShadow;
    batch.receiveShadow = objects[0].receiveShadow;
  }
}

export function buildRoom(world, redraw) {
  const scene = new THREE.Group();
  world.add(scene);
  const k = kit();
  const { box, plane, mesh, keep } = k;
  const mat = (color, options) => keep(surface(color, options));
  const painted = (w, h, draw, options) => keep(new THREE.MeshBasicMaterial({
    map: keep(canvasTexture(w, h, draw)), ...options,
  }));
  const board = mat('#edc7a7', { roughness: .66 });
  const edge = mat('#f4d6af', { roughness: .58 });
  const back = mat('#bb9d82');
  const floor = mat('#b39a7f');
  const legs = mat('#a18169');
  const brass = mat('#a98a58', { metalness: .32, roughness: .43 });
  const trim = mat('#89745e');
  const shadowTex = keep(canvasTexture(128, 128, shadowMap));
  const contact = keep(new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: .64 }));
  const occlusion = keep(new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: .61 }));
  const atFloor = (w, d, x, z) => plane(scene, w, d, x, .001, z, contact).rotation.x = -Math.PI / 2;
  let disposed = false;
  new THREE.TextureLoader().load('./assets/shelf-wood.webp', texture => {
    if (disposed) return texture.dispose();
    keep(texture);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 4;
    const vertical = keep(texture.clone());
    vertical.center.set(.5, .5);
    vertical.rotation = Math.PI / 2;
    for (const [material, map] of [[board, texture], [edge, texture], [back, vertical], [floor, texture], [legs, vertical]]) {
      material.map = map;
      material.needsUpdate = true;
    }
    redraw();
  }, undefined, () => { /* The wood tones remain available when the map cannot load. */ });

  const wall = painted(1536, 896, (ctx, w, h) => wallFinish(ctx, w, h));
  plane(scene, 4.7, 2.8, 0, 1.38, -.033, wall);
  const wallShadows = keep(new THREE.ShadowMaterial({ opacity: .23, depthWrite: false }));
  plane(scene, 4.7, 2.8, 0, 1.38, -.030, wallShadows).receiveShadow = true;
  const returnMap = keep(wall.map.clone());
  returnMap.repeat.x = .34;
  returnMap.offset.x = .15;
  returnMap.needsUpdate = true;
  const masonry = new Image();
  masonry.src = './assets/shelf-masonry.webp';
  masonry.decode().then(() => {
    if (disposed) return;
    const { image } = wall.map;
    wallFinish(image.getContext('2d'), image.width, image.height, masonry);
    wall.map.needsUpdate = true;
    returnMap.needsUpdate = true;
    redraw();
  }).catch(() => { /* Keep the procedural paint when the masonry photo is unavailable. */ });
  const returnWall = keep(new THREE.MeshBasicMaterial({ map: returnMap, color: '#8a9b91' }));
  plane(scene, 1.59, 2.8, -1.10, 1.38, .76, returnWall).rotation.y = Math.PI / 2;
  box(scene, .018, .075, 1.59, -1.089, .038, .76, trim);
  box(scene, 4.7, .075, .021, 0, .038, -.010, trim);
  box(scene, 4.7, .006, .026, 0, .074, -.009, trim);
  for (let i = 0; i < 14; i++) {
    box(scene, 4.65, .022, .167, 0, -.013, .084 + i * .168, floor);
  }
  atFloor(1.22, .73, .07, .23);
  atFloor(.74, .55, .89, .31);


  // The recessed window sits under the ceiling, above the outdoor soil line.
  const well = mat('#414336');
  const windowFrame = mat('#b1a98e');
  const conduit = mat('#4b5243', { roughness: .73 });
  box(scene, 3.45, .065, .149, .625, 1.541, .042, well);
  box(scene, 3.45, .018, .08, .625, 1.492, .022, conduit);
  box(scene, .153, .065, 1.56, -1.042, 1.541, .806, well);
  box(scene, .079, .018, 1.56, -1.061, 1.492, .806, conduit);
  box(scene, .676, .223, .037, -.342, 1.364, .010, well);
  plane(scene, .630, .195, -.342, 1.365, .032, painted(416, 144, windowView));
  box(scene, .676, .019, .061, -.342, 1.260, .048, windowFrame);
  box(scene, .676, .019, .061, -.342, 1.468, .044, windowFrame);
  for (const x of [-.670, -.342, -.014]) box(scene, .020, .206, .045, x, 1.364, .046, windowFrame);
  box(scene, .693, .015, .090, -.342, 1.250, .043, trim);

  const pipePath = new THREE.CurvePath();
  const start = new THREE.Vector3(-1.018, 1.46, 1.50);
  const bendStart = new THREE.Vector3(-1.018, 1.46, .154);
  const corner = new THREE.Vector3(-1.018, 1.46, .085);
  const bendEnd = new THREE.Vector3(-.949, 1.46, .085);
  const end = new THREE.Vector3(1.56, 1.46, .085);
  pipePath.add(new THREE.LineCurve3(start, bendStart));
  pipePath.add(new THREE.QuadraticBezierCurve3(bendStart, corner, bendEnd));
  pipePath.add(new THREE.LineCurve3(bendEnd, end));
  mesh(scene, keep(new THREE.TubeGeometry(pipePath, 104, .013, 9)), conduit, 0, 0, 0);
  for (const x of [-.904, .456, 1.210]) box(scene, .018, .043, .034, x, 1.459, .08, brass);
  for (const z of [.36, 1.03]) box(scene, .034, .043, .018, -1.023, 1.459, z, brass);

  const cabinet = new THREE.Group();
  scene.add(cabinet);
  box(cabinet, .691, 1.108, .018, 0, .677, .027, back);
  for (const x of [-.357, .357]) {
    box(cabinet, .029, 1.139, .300, x, .682, .169, board);
    box(cabinet, .011, 1.133, .010, x, .682, .323, edge);
  }
  const crown = keep(new RoundedBoxGeometry(.747, .031, .326, 1, .004));
  mesh(cabinet, crown, board, 0, 1.218, .166);
  box(cabinet, .737, .008, .015, 0, 1.22, .329, edge);
  for (const y of DECKS) {
    box(cabinet, .743, .020, .321, 0, y - .010, .167, board);
    box(cabinet, .727, .012, .006, 0, y - .006, .331, edge);
    plane(cabinet, .705, .144, 0, y + .192, .038, occlusion);
  }
  box(cabinet, .700, .087, .25, 0, .164, .145, back);
  const drawer = keep(new RoundedBoxGeometry(.340, .081, .024, 1, .003));
  for (const x of [-.174, .174]) mesh(cabinet, drawer, board, x, .164, .282);
  box(cabinet, .676, .006, .009, 0, .203, .294, edge);
  for (const x of [-.301, .301]) {
    for (const z of [.070, .267]) {
      const foot = box(cabinet, .041, .145, .041, x, .073, z, legs);
      foot.rotation.z = -Math.sign(x) * .09;
    }
  }
  for (const x of [-.174, .174]) {
    box(cabinet, .006, .014, .010, x - .023, .170, .297, brass);
    box(cabinet, .006, .014, .010, x + .023, .170, .297, brass);
    box(cabinet, .055, .009, .007, x, .170, .304, brass);
  }

  const rugTexture = keep(canvasTexture(512, 384, (ctx, w, h) => {
    ctx.fillStyle = '#795144';
    ctx.fillRect(0, 0, w, h);
    for (const [i, tint] of ['#47332c', '#b08761', '#60453d', '#ad805c'].entries()) {
      const inset = 7 + i * 10;
      ctx.strokeStyle = tint;
      ctx.lineWidth = i % 2 ? 3 : 8;
      ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
    }
    // Small repeated diamonds along the selvedge imitate a woven border.
    ctx.fillStyle = '#bf947069';
    for (let x = 39; x < w - 31; x += 12) {
      for (const y of [26, h - 26]) {
        ctx.beginPath();
        ctx.moveTo(x, y - 3);
        ctx.lineTo(x + 4, y);
        ctx.lineTo(x, y + 3);
        ctx.lineTo(x - 4, y);
        ctx.fill();
      }
    }
    const rand = randomGenerator(71);
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = rand() < .48 ? '#d9af8532' : '#2a202334';
      ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 3, 1);
    }
  }));
  const rug = mat('#fff1de', { map: rugTexture });
  plane(scene, 1.46, .86, .11, .002, .61, rug).rotation.x = -Math.PI / 2;

  // The chair arm in the foreground places the viewer in the sitting area.
  const upholstery = keep(canvasTexture(192, 192, (ctx, w, h) => {
    ctx.fillStyle = '#7a503c';
    ctx.fillRect(0, 0, w, h);
    const rand = randomGenerator(72);
    for (let i = 0; i < 18000; i++) {
      ctx.fillStyle = i % 2 ? '#edb9872b' : '#251e284c';
      ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1);
    }
  }));
  const fabric = mat('#cda58d', { map: upholstery });
  const piping = mat('#593929');
  const chair = new THREE.Group();
  chair.position.set(-.943, 0, 1.084);
  chair.rotation.y = .16;
  scene.add(chair);
  mesh(chair, keep(new RoundedBoxGeometry(.32, .289, .53, 2, .047)), fabric, 0, .148, 0);
  mesh(chair, keep(new RoundedBoxGeometry(.113, .104, .51, 2, .036)), fabric, .135, .293, -.012);
  mesh(chair, keep(new RoundedBoxGeometry(.30, .061, .43, 2, .025)), fabric, -.035, .213, .012);
  box(chair, .288, .008, .006, 0, .175, -.262, piping);

  const television = new THREE.Group();
  television.position.set(-.674, .260, .231);
  television.rotation.y = .14;
  scene.add(television);
  const tvShell = mat('#4c4640', { roughness: .68 });
  const tvBezel = mat('#312c27');
  const panel = mat('#827265');
  mesh(television, keep(new RoundedBoxGeometry(.367, .265, .224, 2, .016)), tvShell, 0, .147, 0);
  mesh(television, keep(new RoundedBoxGeometry(.378, .272, .041, 2, .012)), panel, 0, .147, .120);
  const screenShape = new THREE.Shape();
  screenShape.moveTo(-.139, -.076);
  screenShape.quadraticCurveTo(-.138, -.097, -.114, -.100);
  screenShape.quadraticCurveTo(0, -.109, .114, -.100);
  screenShape.quadraticCurveTo(.138, -.097, .139, -.076);
  screenShape.quadraticCurveTo(.145, 0, .139, .076);
  screenShape.quadraticCurveTo(.138, .097, .114, .100);
  screenShape.quadraticCurveTo(0, .109, -.114, .100);
  screenShape.quadraticCurveTo(-.138, .097, -.139, .076);
  screenShape.quadraticCurveTo(-.145, 0, -.139, -.076);
  const screenMesh = keep(new THREE.ShapeGeometry(screenShape, 10));
  mesh(television, screenMesh, tvBezel, -.027, .153, .143);
  const position = screenMesh.attributes.position;
  const uv = screenMesh.attributes.uv;
  for (let index = 0; index < uv.count; index++) {
    uv.setXY(index, .5 + position.getX(index) / .29, .5 + position.getY(index) / .21);
  }
  const glass = mesh(television, screenMesh, painted(256, 192, glassFinish), -.027, .153, .1442);
  glass.scale.set(.92, .90, 1);
  for (let i = 0; i < 7; i++) box(television, .024, .002, .002, .151, .190 - i * .009, .142, tvBezel);
  mesh(television, keep(new THREE.SphereGeometry(.0034, 9, 7)), mat('#7b9864', { emissive: '#576d46' }), .151, .078, .142);
  box(scene, .415, .025, .331, -.674, .256, .215, board);
  for (const x of [-.849, -.499]) box(scene, .033, .245, .30, x, .123, .218, board);
  box(scene, .368, .024, .30, -.674, .072, .216, board);
  const controller = new THREE.Group();
  controller.position.set(-.683, .094, .342);
  controller.rotation.y = -.17;
  scene.add(controller);
  box(controller, .107, .013, .045, 0, 0, 0, panel);
  box(controller, .026, .003, .008, -.029, .008, 0, tvBezel);
  box(controller, .008, .003, .026, -.029, .008, 0, tvBezel);
  const red = mat('#a74b38');
  const button = keep(new THREE.CylinderGeometry(.005, .005, .004, 10));
  for (const x of [.023, .037]) mesh(controller, button, red, x, .008, 0);
  const wire = new THREE.CatmullRomCurve3([
    [-.684,.093,.318],[-.712,.090,.275],[-.756,.097,.241],[-.759,.093,.211],
    [-.713,.094,.206],[-.694,.090,.239],[-.711,.097,.262],[-.733,.095,.252],[-.765,.147,.173],
  ].map(coordinates => new THREE.Vector3(...coordinates)));
  mesh(scene, keep(new THREE.TubeGeometry(wire, 24, .0016, 5)), tvBezel, 0, 0, 0);
  atFloor(.57, .42, -.667, .282);
  const print = new THREE.Group();
  print.position.set(.728, .963, .032);
  print.rotation.z = -.044;
  scene.add(print);
  box(print, .292, .352, .026, 0, 0, 0, legs);
  plane(print, .269, .327, 0, 0, .014, painted(256, 320, framedPrint));

  box(scene, .379, .030, .323, .665, .367, .237, board);
  for (const x of [.504, .826]) {
    for (const z of [.107, .364]) box(scene, .024, .349, .024, x, .175, z, legs);
  }
  const lamp = new THREE.Group();
  lamp.position.set(.704, .384, .223);
  scene.add(lamp);
  const cylinder = (a, b, h, y, material) => mesh(lamp, keep(new THREE.CylinderGeometry(a, b, h, 32)), material, 0, y, 0);
  cylinder(.054, .066, .018, .009, brass);
  cylinder(.007, .013, .228, .124, brass);
  const shade = mat('#ffe5bc', {
    map: keep(canvasTexture(192, 96, fabricFinish)), emissive: '#ec9b50', emissiveIntensity: .25,
    side: THREE.DoubleSide,
  });
  mesh(lamp, keep(new THREE.CylinderGeometry(.068, .119, .150, 36, 1, true)), shade, 0, .258, 0);
  const lampLight = new THREE.PointLight(0xffb267, .42, 1.3, 2);
  lampLight.position.set(.704, .551, .226);
  scene.add(lampLight);
  for (const [i, color] of ['#a85a46', '#baa984', '#6f735d'].entries()) {
    const book = box(scene, .111, .012, .084, .540, .390 + i * .011, .329, mat(color));
    book.rotation.y = .17 * (i - 1);
  }
  const mug = mat('#708879', { roughness: .35, side: THREE.DoubleSide });
  mesh(scene, keep(new THREE.CylinderGeometry(.026, .022, .052, 24, 1, true)), mug, .777, .410, .321);
  mesh(scene, keep(new THREE.CircleGeometry(.024, 24)), mat('#50362b'), .777, .424, .321).rotation.x = -Math.PI / 2;
  mesh(scene, keep(new THREE.TorusGeometry(.016, .004, 8, 18)), mug, .805, .407, .321);
  scene.traverse(object => {
    if (!object.isMesh || !object.material.isMeshStandardMaterial) return;
    object.castShadow = object.material !== floor && object.material !== rug;
    object.receiveShadow = true;
  });
  batchRoom(scene, k);
  return { shadowTex, dispose() { disposed = true; scene.removeFromParent(); k.dispose(); } };
}
