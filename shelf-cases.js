import * as THREE from 'three';
import { canvasTexture, kit, randomGenerator, surface } from './shelf-graphics.js';
import { CASE_FRONT, DECKS } from './shelf-room.js';

const { placeRow } = globalThis.PlayableShelfCatalog;

const sleeveColors = ['#9e4c37', '#526854', '#494d63', '#a28452', '#614556', '#2f6368', '#473836', '#8b775d'];
const gameSeed = game => Array.from(game.id).reduce((sum, char) => sum * 31 + char.charCodeAt(0) >>> 0, 17);

function paperArt(game, packaging, color) {
  const width = 384;
  const height = Math.round(width * packaging.height / packaging.width);
  return canvasTexture(width, height, (ctx, w, h) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    const random = randomGenerator(gameSeed(game));
    ctx.fillStyle = '#f6daad18';
    for (let i = 0; i < 1500; i++) ctx.fillRect(random() * w, random() * h, 1, 1);
    ctx.strokeStyle = '#f1ddae78';
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, w - 24, h - 24);
    ctx.fillStyle = '#fff0cc';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = 'bold 17px system-ui';
    ctx.fillText(packaging.type === 'catalog-card' ? 'COLLECTION REFERENCE' : game.platform.split(' / ')[0].toUpperCase(), w / 2, h * .17, w * .82);
    const lines = [];
    for (const word of game.title.split(' ')) {
      const last = lines.at(-1);
      if (last && (last + word).length < 21) lines[lines.length - 1] += ' ' + word;
      else lines.push(word);
    }
    ctx.font = 'bold 35px Georgia';
    const gap = Math.min(40, h * .46 / lines.length);
    lines.forEach((line, index) => ctx.fillText(line, w * .5, h * .52 + (index - (lines.length - 1) / 2) * gap, w * .84));
    ctx.font = '14px system-ui';
    ctx.fillText(packaging.type === 'catalog-card' ? game.platform : String(game.year), w / 2, h * .84, w * .8);
  });
}

function spineArt(game, packaging, color) {
  return canvasTexture(96, 512, (ctx, w, h) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fae6be20';
    ctx.fillRect(4, 0, 3, h);
    ctx.fillRect(w - 7, 0, 3, h);
    ctx.fillStyle = '#2a231b';
    ctx.fillRect(0, 0, w, 66);
    ctx.fillRect(0, h - 38, w, 38);
    ctx.fillStyle = '#f4dfb5';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 24px system-ui';
    ctx.fillText(game.platform.split(' / ')[0].toUpperCase(), w / 2, 33, w * .85);
    ctx.translate(w / 2, h * .53);
    ctx.rotate(Math.PI / 2);
    ctx.font = 'bold 34px Georgia';
    ctx.fillText(game.title, 0, 0, h * .72);
  });
}

function rowLabel(ctx, w, h, title) {
  ctx.fillStyle = '#927352';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ddcb9d';
  ctx.fillRect(5, 5, w - 10, h - 10);
  ctx.fillStyle = '#463525';
  ctx.font = 'bold 31px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title.toUpperCase(), w / 2, h / 2, w - 26);
}

export function buildCases(scene, rows, shadowTex, firstPage) {
  const group = new THREE.Group();
  scene.add(group);
  const k = kit();
  const entries = new Map();
  const bodies = [];
  const material = (color, options) => k.keep(surface(color, options));
  const printed = (map, options) => material('#fff3e2', { map: k.keep(map), ...options });
  const contact = k.keep(new THREE.MeshBasicMaterial({
    map: shadowTex, transparent: true, depthWrite: false, opacity: .75,
  }));
  const cardboard = new Map();
  const finish = material('#ede5d4', { roughness: .17, transparent: true, opacity: .15, depthWrite: false });
  const sticker = printed(canvasTexture(128, 64, (ctx, w, h) => {
    ctx.fillStyle = '#dbc097';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#645344';
    ctx.font = 'italic 31px Georgia';
    ctx.fillText('$9.95', 16, 42);
  }));

  for (const [slot, row] of rows.entries()) {
    const y = DECKS[slot];
    const label = printed(canvasTexture(320, 64, (ctx, w, h) => rowLabel(ctx, w, h, row.platform)));
    k.plane(group, .103, .019, 0, y - .0095, .335, label);
    for (const [index, item] of placeRow(row.games, slot).entries()) {
      const { game, packaging, yaw, span, x } = item;
      const { width, height, depth, color, type } = packaging;
      const paper = type === 'cardboard' || type === 'big-box';
      if (!cardboard.has(color)) cardboard.set(color, material(color, { roughness: paper ? .89 : .48 }));
      const ink = sleeveColors[gameSeed(game) % sleeveColors.length];
      const pivot = new THREE.Group();
      const z = CASE_FRONT - (Math.sin(yaw) * width + depth * Math.cos(yaw)) * .45 + (index % 3) * .004;
      const lean = index === 0 ? (slot % 2 ? .035 : -.045) : 0;
      pivot.position.set(x, y + height / 2 + Math.abs(lean) * width / 2, z);
      pivot.rotation.set(0, yaw, lean, 'YXZ');
      group.add(pivot);
      const body = k.box(pivot, width, height, depth, 0, 0, 0, cardboard.get(color));
      body.castShadow = true;
      body.receiveShadow = true;
      body.userData.id = game.id;
      bodies.push(body);
      const frontWidth = width * (type === 'jewel' ? .86 : .97);
      const frontHeight = height * (type === 'jewel' ? .96 : .977);
      const frontX = type === 'jewel' ? width * .052 : 0;
      const front = k.plane(pivot, frontWidth, frontHeight, frontX, 0, depth / 2 + .0005,
        printed(paperArt(game, packaging, ink), { roughness: paper ? .80 : .53 }));

      front.receiveShadow = true;

      if (type !== 'catalog-card') {
        const spine = k.plane(pivot, depth * .92, height * .961, -width / 2 - .0005, 0, 0,
          printed(spineArt(game, packaging, ink)));
        spine.rotation.y = -Math.PI / 2;
        spine.receiveShadow = true;
      }
      if (type === 'jewel') {
        k.box(pivot, width * .075, height * .98, .0015, -width * .447, 0, depth / 2 + .001, cardboard.get(color));
        k.plane(pivot, width * .985, height * .986, 0, 0, depth / 2 + .0019, finish);
      }
      if (paper && slot === 1 && index === 0) {
        const tag = k.plane(pivot, .029, .0145, width * .30, height * .36, depth / 2 + .002, sticker);
        tag.rotation.z = -.14;
      }
      k.plane(group, span * 1.9, .15, x, y + .0004, z, contact).rotation.x = -Math.PI / 2;
      entries.set(game.id, { game, pivot, front, base: pivot.position.clone(), deck: y, span, yaw, lean });
    }
  }

  if (firstPage && rows[0]?.platform === 'Game Boy' && rows[0].games.length === 2) {
    const paper = material('#bcaa8a');
    ['#8e6b54', '#454b4b', '#847650'].forEach((color, i) => {
      const y = DECKS[0] + .003 + i * .008;
      const manual = new THREE.Group();
      manual.position.set(.235, y, .200);
      manual.rotation.y = .10 - i * .08;
      group.add(manual);
      k.box(manual, .102, .004, .078, 0, 0, 0, paper);
      k.box(manual, .105, .0015, .080, 0, .0027, 0, material(color));
    });
    const cartridge = k.box(group, .053, .010, .056, .225, DECKS[0] + .028, .205, material('#85857c'));
    cartridge.rotation.y = .24;
    k.box(cartridge, .039, .001, .028, 0, .005, .003, material('#ab7455'));
  }

  return { entries, bodies, dispose() { group.removeFromParent(); k.dispose(); } };
}

export function updateCover(entry, urls, redraw) {
  const signature = urls.join('\n');
  if (entry.artSignature === signature) return;
  entry.cancelCover?.();
  entry.artSignature = signature;
  const initial = entry.front.material.map;
  let cancelled = false;
  let applied = null;
  entry.cancelCover = () => {
    cancelled = true;
    if (applied) {
      entry.front.material.map = initial;
      applied.dispose();
    }
  };
  async function load() {
    for (const url of urls) {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.src = url;
      try { await image.decode(); } catch { continue; }
      if (cancelled) return;
      applied = canvasTexture(initial.image.width, initial.image.height, (ctx, w, h) => {
        ctx.fillStyle = '#29251f';
        ctx.fillRect(0, 0, w, h);
        const scale = Math.min((w - 6) / image.naturalWidth, (h - 6) / image.naturalHeight);
        const width = image.naturalWidth * scale;
        const height = image.naturalHeight * scale;
        ctx.drawImage(image, (w - width) / 2, (h - height) / 2, width, height);
      });
      entry.front.material.map = applied;
      redraw();
      return;
    }
  }
  load();
}
