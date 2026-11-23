import * as THREE from 'three';
import { canvasTexture, randomGenerator } from './shelf-graphics.js';

export const WINDOW_CENTER = new THREE.Vector3(-.342, 1.364, .105);

function glass(ctx, width, height) {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#91a6ad');
  sky.addColorStop(.52, '#a8b5b8');
  sky.addColorStop(1, '#727b73');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
  const random = randomGenerator(104);

  // Ground level behind the obscured glass.
  ctx.save();
  ctx.filter = 'blur(5px)';
  ctx.fillStyle = '#566c5e';
  ctx.beginPath();
  ctx.moveTo(0, height * .67);
  for (let x = 0; x <= width; x += 14) ctx.lineTo(x, height * (.54 + random() * .18));
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.fill();
  for (let i = 0; i < 115; i++) {
    const x = random() * width;
    const y = height * (.53 + random() * .47);
    ctx.fillStyle = ['#374c48aa', '#6d80677a', '#b1b6a066'][i % 3];
    ctx.beginPath();
    ctx.ellipse(x, y, 3 + random() * 15, 3 + random() * 8, random(), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  for (const [start, end] of [[0, width * .49], [width * .51, width]]) {
    const edges = ctx.createLinearGradient(start, 0, end, 0);
    edges.addColorStop(0, '#232f384b');
    edges.addColorStop(.10, '#28363a00');
    edges.addColorStop(.83, '#28363a00');
    edges.addColorStop(1, '#23323b4d');
    ctx.fillStyle = edges;
    ctx.fillRect(start, 0, end - start, height);
  }
  const haze = ctx.createLinearGradient(0, height * .44, 0, height);
  haze.addColorStop(0, '#acb2a100');
  haze.addColorStop(.69, '#9ba59835');
  haze.addColorStop(1, '#565c4790');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 3900; i++) {
    const x = random() * width;
    const y = random() * height;
    ctx.fillStyle = i % 2 ? '#dce5df35' : '#43534a39';
    ctx.fillRect(x, y, .6 + random(), .6 + random());
  }
  for (let i = 0; i < 34; i++) {
    ctx.fillStyle = i % 2 ? '#bec4b31c' : '#53635325';
    ctx.fillRect(random() * width, height * .59 + random() * height * .39, 1.1, 3 + random() * 13);
  }
}

function revealGeometry() {
  const outer = [[-.350, -.107], [.350, -.107], [.350, .107], [-.350, .107]];
  const inner = [[-.298, -.078], [.298, -.078], [.298, .078], [-.298, .078]];
  const vertices = [];
  const uvs = [];
  for (let side = 0; side < 4; side++) {
    const next = (side + 1) % 4;
    vertices.push(...outer[side], .100, ...outer[next], .100, ...inner[side], .016);
    vertices.push(...outer[next], .100, ...inner[next], .016, ...inner[side], .016);
    uvs.push(0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

export function addBasementWindow(scene, k, mat, painted) {
  const window = new THREE.Group();
  window.position.set(WINDOW_CENTER.x, WINDOW_CENTER.y, 0);
  scene.add(window);
  const sillFinish = k.keep(canvasTexture(256, 96, (ctx, w, h) => {
    const random = randomGenerator(90);
    ctx.fillStyle = '#bbb2a2';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 4700; i++) {
      ctx.fillStyle = i % 2 ? '#493d3260' : '#ede2be45';
      ctx.fillRect(random() * w, random() * h, .6 + random() * 2, 1);
    }
    const residue = ctx.createLinearGradient(0, 0, 0, h);
    residue.addColorStop(0, '#2630275a');
    residue.addColorStop(.20, '#26302717');
    residue.addColorStop(.80, '#26302700');
    residue.addColorStop(1, '#483f2d4d');
    ctx.fillStyle = residue;
    ctx.fillRect(0, 0, w, h);
  }));
  const reveal = mat('#756b5b', { side: THREE.DoubleSide, map: sillFinish });
  const sash = mat('#8b8775', { roughness: .62 });
  const seal = mat('#34352c');
  const latch = mat('#8e795a', { roughness: .43, metalness: .27 });

  k.box(window, .710, .226, .028, 0, 0, -.002, seal);
  k.mesh(window, k.keep(revealGeometry()), reveal, 0, 0, 0);
  k.plane(window, .588, .153, 0, 0, .016, painted(640, 192, glass, { toneMapped: false }));
  for (const x of [-.294, 0, .294]) {
    k.box(window, x ? .018 : .029, .168, .026, x, 0, .031, sash);
    k.box(window, .005, .151, .007, x + (x > 0 ? -.009 : .009), 0, .048, seal);
  }
  for (const y of [-.077, .077]) {
    k.box(window, .601, .016, .028, 0, y, .036, sash);
    k.box(window, .578, .004, .008, 0, y + (y > 0 ? -.006 : .006), .052, seal);
  }
  k.box(window, .057, .010, .015, .144, -.061, .055, latch);
  k.box(window, .020, .012, .020, .17, -.061, .060, latch);
  k.box(window, .717, .013, .137, 0, -.107, .065, reveal);
}

function beamMask(ctx, w, h) {
  const image = ctx.createImageData(w, h);
  const data = image.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const along = 1 - y / (h - 1);
      const widthMask = Math.sin(Math.PI * x / (w - 1)) ** 1.6;
      const lengthMask = Math.sin(Math.PI * along) * (1 - along * .55);
      const index = 4 * (y * w + x);
      data[index] = data[index + 1] = data[index + 2] = 255;
      data[index + 3] = Math.round(255 * widthMask * lengthMask);
    }
  }
  ctx.putImageData(image, 0, 0);
}

export function addWindowDust(scene, k) {
  const beam = new THREE.BufferGeometry();
  beam.setAttribute('position', new THREE.Float32BufferAttribute([
    -.605, 1.39, .11, -.100, 1.39, .11, .487, .54, 1.43, -.341, .54, 1.43,
  ], 3));
  beam.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  beam.setIndex([0, 1, 2, 0, 2, 3]);
  const veil = k.keep(new THREE.MeshBasicMaterial({
    map: k.keep(canvasTexture(64, 96, beamMask)),
    color: '#afbbb4', opacity: .075, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  }));
  k.mesh(scene, k.keep(beam), veil, 0, 0, 0);

  const random = randomGenerator(325);
  const positions = [];
  for (let i = 0; i < 58; i++) {
    const reach = .23 + random() * .71;
    positions.push(
      -.44 + reach * .33 + (random() - .5) * (.43 + reach * .24),
      1.39 - reach * .85 + (random() - .5) * .21,
      .11 + reach * 1.32,
    );
  }
  const scatter = k.keep(new THREE.BufferGeometry());
  scatter.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const sprite = k.keep(canvasTexture(32, 32, (ctx, w, h) => {
    const edge = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    edge.addColorStop(0, '#fff9e3');
    edge.addColorStop(.35, '#fff9e380');
    edge.addColorStop(1, '#fff9e300');
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, w, h);
  }));
  const material = k.keep(new THREE.PointsMaterial({
    map: sprite, color: '#eaddbb', size: .0066, transparent: true, opacity: .51,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  scene.add(new THREE.Points(scatter, material));
}
