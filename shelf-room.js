import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { canvasTexture, kit, randomGenerator, surface } from './shelf-graphics.js';

export const DECKS = [.983, .734, .485, .236];
export const CASE_FRONT = .245;

function wallFinish(ctx, w, h) {
  const color = ctx.createLinearGradient(0, h * .8, w, h * .19);
  color.addColorStop(0, '#9d9b88');
  color.addColorStop(.36, '#777c70');
  color.addColorStop(1, '#57594e');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  const random = randomGenerator(31);
  for (let y = -5, row = 0; y < h; y += 41, row++) {
    for (let x = row % 2 ? -48 : 0; x < w; x += 96) {
      ctx.fillStyle = random() < .55 ? '#25282013' : '#d2d3a617';
      ctx.fillRect(x + 1, y + 1, 94, 39);
      ctx.fillStyle = '#1a221f39';
      ctx.fillRect(x, y, 96, 1.5);
      ctx.fillRect(x, y + 1, 1.5, 40);
      ctx.fillStyle = '#d0d2b328';
      ctx.fillRect(x + 1, y + 2, 94, 1);
    }
  }
  for (let i = 0; i < 25000; i++) {
    ctx.fillStyle = random() < .44 ? '#31332a1f' : '#efd9b117';
    ctx.fillRect(random() * w, random() * h, 1 + random() * 1.5, 1);
  }
  ctx.save();
  ctx.scale(1, .76);
  const lamp = ctx.createRadialGradient(w * .646, h * .98, 0, w * .646, h * .98, 137);
  lamp.addColorStop(0, '#ffc9817a');
  lamp.addColorStop(.48, '#d3a1642d');
  lamp.addColorStop(1, '#d3a16400');
  ctx.fillStyle = lamp;
  ctx.fillRect(0, 0, w, h * 1.33);
  ctx.restore();
}

function windowView(ctx, w, h) {
  const background = ctx.createLinearGradient(0, 0, 0, h);
  background.addColorStop(0, '#d0e0d0');
  background.addColorStop(.5, '#eff1cb');
  background.addColorStop(1, '#858e62');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, w, h);
  const random = randomGenerator(19);
  ctx.filter = 'blur(4px)';
  for (let i = 0; i < 200; i++) {
    const height = random();
    ctx.fillStyle = ['#acc18d71', '#5c775d61', '#f6e7ac79', '#c9d29382'][i % 4];
    ctx.beginPath();
    ctx.ellipse(w * random(), h * (.38 + height * .68), 12 + random() * 34, 6 + random() * 27, random(), 0, Math.PI * 2);
    ctx.fill();
  }
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
  ctx.fillStyle = '#e4bb7d';
  ctx.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x++) {
    ctx.fillStyle = x % 4 < 2 ? '#764a322b' : '#fff2be35';
    ctx.fillRect(x, 0, 1, h);
  }
  ctx.fillStyle = '#80593537';
  for (let y = 2; y < h; y += 3) ctx.fillRect(0, y, w, 1);
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
    kit.mesh(root, kit.keep(merged), material, 0, 0, 0);
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
  const board = mat('#edcbb0', { roughness: .66 });
  const edge = mat('#edcea9', { roughness: .58 });
  const back = mat('#b19378');
  const floor = mat('#b39a7f');
  const legs = mat('#a18169');
  const brass = mat('#a98a58', { metalness: .32, roughness: .43 });
  const trim = mat('#b9aa8d');
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

  plane(scene, 4.7, 2.8, 0, 1.38, -.033, painted(1024, 640, wallFinish));
  box(scene, 4.7, .075, .021, 0, .038, -.010, trim);
  box(scene, 4.7, .006, .026, 0, .074, -.009, trim);
  for (let i = 0; i < 14; i++) {
    const plank = box(scene, 4.65, .022, .167, 0, -.013, .084 + i * .168, floor);
    plank.receiveShadow = true;
  }
  atFloor(1.22, .73, .07, .23);
  atFloor(.74, .55, .89, .31);
  plane(scene, 1.55, 1.69, .066, .67, -.028, occlusion);

  // The recessed window sits under the ceiling, above the outdoor soil line.
  const well = mat('#626353');
  const windowFrame = mat('#c2bca5');
  const conduit = mat('#575c55', { roughness: .65 });
  box(scene, 4.7, .065, .149, 0, 1.541, .042, well);
  box(scene, 4.7, .018, .08, 0, 1.492, .022, conduit);
  box(scene, .676, .223, .037, -.342, 1.364, .010, well);
  plane(scene, .630, .195, -.342, 1.365, .032, painted(416, 144, windowView));
  box(scene, .676, .019, .061, -.342, 1.260, .048, windowFrame);
  box(scene, .676, .019, .061, -.342, 1.468, .044, windowFrame);
  for (const x of [-.670, -.342, -.014]) box(scene, .020, .206, .045, x, 1.364, .046, windowFrame);
  box(scene, .693, .015, .090, -.342, 1.250, .043, trim);

  const pipe = keep(new THREE.CylinderGeometry(.014, .014, 2.85, 10));
  mesh(scene, pipe, conduit, .135, 1.46, .085).rotation.z = Math.PI / 2;
  for (const x of [-.904, .456, 1.210]) box(scene, .018, .043, .034, x, 1.459, .08, brass);

  const cabinet = new THREE.Group();
  scene.add(cabinet);
  box(cabinet, .691, 1.108, .018, 0, .677, .027, back);
  for (const x of [-.357, .357]) {
    box(cabinet, .029, 1.139, .300, x, .682, .169, board);
    box(cabinet, .011, 1.133, .010, x, .682, .323, edge);
  }
  for (const y of [...DECKS, 1.223]) {
    const shelf = box(cabinet, .743, .020, .321, 0, y - .010, .167, board);
    shelf.receiveShadow = true;
    box(cabinet, .727, .012, .006, 0, y - .006, .331, edge);
    if (y !== 1.223) plane(cabinet, .705, .144, 0, y + .192, .038, occlusion);
  }
  box(cabinet, .707, .091, .27, 0, .164, .165, board);
  box(cabinet, .666, .006, .008, 0, .207, .304, edge);
  for (const x of [-.301, .301]) {
    for (const z of [.070, .267]) {
      const foot = box(cabinet, .041, .145, .041, x, .073, z, legs);
      foot.rotation.z = -Math.sign(x) * .09;
    }
  }
  for (const x of [-.186, .186]) {
    box(cabinet, .065, .009, .017, x, .166, .314, brass);
  }

  const rugTexture = painted(512, 384, (ctx, w, h) => {
    ctx.fillStyle = '#855e4e';
    ctx.fillRect(0, 0, w, h);
    for (const [i, tint] of ['#5f443b', '#bd9069', '#69453a', '#b3825d'].entries()) {
      const inset = 7 + i * 10;
      ctx.strokeStyle = tint;
      ctx.lineWidth = i % 2 ? 3 : 8;
      ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
    }
    const rand = randomGenerator(71);
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = rand() < .48 ? '#d9af8532' : '#2a202334';
      ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 3, 1);
    }
  });
  plane(scene, 1.46, .86, .11, .002, .61, rugTexture).rotation.x = -Math.PI / 2;

  const television = new THREE.Group();
  television.position.set(-.674, .260, .231);
  television.rotation.y = .14;
  scene.add(television);
  const tvShell = mat('#5c5148', { roughness: .65 });
  const tvBezel = mat('#312c27');
  const panel = mat('#867669');
  box(television, .367, .265, .224, 0, .147, 0, tvShell);
  box(television, .378, .272, .041, 0, .147, .120, panel);
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
  const glass = mesh(television, screenMesh, mat('#323e3d', { roughness: .37, emissive: '#193633', emissiveIntensity: .13 }), -.027, .153, .1442);
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
  const lampLight = new THREE.PointLight(0xffb867, .53, 1.5, 2);
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
  batchRoom(scene, k);
  return { shadowTex, dispose() { disposed = true; scene.removeFromParent(); k.dispose(); } };
}
